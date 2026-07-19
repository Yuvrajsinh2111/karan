-- Laxmichem Billing App — run this once in Supabase SQL Editor

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  firm_name text not null default 'LAXMICHEM ENTERPRISE',
  address text not null default 'Plot No.A1/449 ,Office No.T/2, James Plaza Square,GIDC, Ankleshwar-393002',
  gstin text not null default '24EZFPP8492B1Z4',
  state_name text not null default 'Gujarat',
  state_code text not null default '24',
  contact text not null default '8469868697',
  mobile text not null default '+91 8734912316',
  bank_name text not null default 'THE MEHSANA URBAN CO-OP BANK LTD',
  bank_ac text not null default '039110100000416',
  bank_ifsc text not null default 'MSNU0000039',
  declaration text not null default 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
  direct_prefix text not null default 'LE',
  po_prefix text not null default 'Po',
  default_gst_rate numeric not null default 18,
  last_backup_at timestamptz
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists parties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  address text not null default '',
  gstin text not null default '',
  state_name text not null default 'Gujarat',
  state_code text not null default '24',
  contact text not null default '',
  active boolean not null default true
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  hsn text not null default '',
  unit text not null default 'KGS',
  default_rate numeric not null default 0,
  active boolean not null default true
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('direct','commission','purchase_order')),
  fy text not null,                -- e.g. '26-27'
  seq int not null,                -- per type per fy
  bill_no text not null,           -- e.g. 'LE/26-27/008'
  bill_date date not null,
  -- party links (nullable per type) + denormalized snapshots so old bills never change
  bill_to_id uuid references parties(id),
  bill_to jsonb,                   -- {name,address,gstin,state_name,state_code,contact}
  ship_to_id uuid references parties(id),
  ship_to jsonb,
  supplier_id uuid references parties(id),
  supplier jsonb,
  tax_type text not null default 'cgst_sgst' check (tax_type in ('cgst_sgst','igst')),
  gst_rate numeric not null default 18,   -- total rate (split half/half for cgst_sgst)
  subtotal numeric not null default 0,    -- taxable value
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  igst numeric not null default 0,
  round_off numeric not null default 0,
  total numeric not null default 0,
  total_qty numeric not null default 0,
  commission_total numeric not null default 0,  -- commission bills: your margin
  paid boolean not null default false,
  notes text not null default '',
  extra jsonb not null default '{}'::jsonb,     -- transport mode, vehicle no, refs, etc.
  unique (type, fy, seq)
);
create index if not exists bills_date_idx on bills (bill_date desc);
create index if not exists bills_type_idx on bills (type);
create index if not exists bills_billto_idx on bills (bill_to_id);
create index if not exists bills_fy_idx on bills (fy);

create table if not exists bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  pos int not null default 1,
  product_id uuid references products(id),
  description text not null,
  hsn text not null default '',
  qty numeric not null default 0,
  unit text not null default 'KGS',
  rate numeric not null default 0,
  disc_pct numeric not null default 0,
  amount numeric not null default 0,
  due_on date,                      -- purchase orders
  base_rate numeric                 -- commission bills: company rate before your margin
);
create index if not exists bill_items_bill_idx on bill_items (bill_id);

-- Table-level grants (needed when the project lacks default grants for the API roles)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

-- Row Level Security: any signed-in user has full access
alter table settings enable row level security;
alter table parties enable row level security;
alter table products enable row level security;
alter table bills enable row level security;
alter table bill_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','parties','products','bills','bill_items'] loop
    execute format('drop policy if exists "auth full access" on %I', t);
    execute format('create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
-- Scale upgrade: atomic bill numbering + database-side dashboard stats.
-- Run this ONCE in Supabase SQL Editor (safe to re-run).

-- 1) Atomic per-type per-FY bill number allocation
create table if not exists bill_counters (
  type text not null,
  fy text not null,
  last_seq int not null default 0,
  primary key (type, fy)
);
alter table bill_counters enable row level security;
drop policy if exists "auth full access" on bill_counters;
create policy "auth full access" on bill_counters for all to authenticated using (true) with check (true);
grant select, insert, update, delete on bill_counters to authenticated;

create or replace function next_bill_seq(p_type text, p_fy text)
returns int
language sql
as $$
  insert into bill_counters (type, fy, last_seq)
  values (
    p_type, p_fy,
    coalesce((select max(seq) from bills where type = p_type and fy = p_fy), 0) + 1
  )
  on conflict (type, fy)
  do update set last_seq = bill_counters.last_seq + 1
  returning last_seq;
$$;
grant execute on function next_bill_seq(text, text) to authenticated;

-- 2) Dashboard aggregates computed in the database
create or replace function dashboard_stats(p_from date default null, p_to date default null)
returns jsonb
language sql
stable
as $$
  with b as (
    select id, type, bill_date, total, cgst, sgst, igst, commission_total, paid, bill_to
    from bills
    where (p_from is null or bill_date >= p_from)
      and (p_to is null or bill_date <= p_to)
  ),
  sales as (select * from b where type <> 'purchase_order')
  select jsonb_build_object(
    'total_sales', coalesce((select sum(total) from sales), 0),
    'sales_count', (select count(*) from sales),
    'gst', coalesce((select sum(cgst + sgst + igst) from sales), 0),
    'commission', coalesce((select sum(commission_total) from b), 0),
    'unpaid', coalesce((select sum(total) from sales where not paid), 0),
    'counts', coalesce(
      (select jsonb_object_agg(type, c) from (select type, count(*) c from b group by type) t),
      '{}'::jsonb),
    'monthly', coalesce(
      (select jsonb_agg(jsonb_build_object('month', m, 'value', v) order by m)
       from (select to_char(bill_date, 'YYYY-MM') m, sum(total) v
             from sales group by 1 order by 1 desc limit 12) t),
      '[]'::jsonb),
    'top_parties', coalesce(
      (select jsonb_agg(jsonb_build_object('name', n, 'value', v) order by v desc)
       from (select bill_to->>'name' n, sum(total) v
             from sales where bill_to is not null group by 1 order by 2 desc limit 5) t),
      '[]'::jsonb),
    'top_products', coalesce(
      (select jsonb_agg(jsonb_build_object('name', n, 'value', v) order by v desc)
       from (select i.description n, sum(i.amount) v
             from bill_items i join sales s on s.id = i.bill_id
             group by 1 order by 2 desc limit 5) t),
      '[]'::jsonb)
  );
$$;
grant execute on function dashboard_stats(date, date) to authenticated;

-- 3) Fast unpaid lookups at volume
create index if not exists bills_unpaid_idx on bills (bill_date) where not paid;
