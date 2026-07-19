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
