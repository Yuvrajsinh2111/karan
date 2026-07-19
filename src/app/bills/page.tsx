"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Btn, Empty, Field, inputCls } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { Bill, BillType, BILL_TYPE_SHORT, Party } from "@/lib/types";
import { financialYear, fmtDate, fmtMoney, todayISO } from "@/lib/utils";

const PAGE = 25;

interface Filters {
  type: string;
  partyId: string;
  fy: string;
  from: string;
  to: string;
  paid: string;
  minAmt: string;
  maxAmt: string;
  q: string;
}

const blankFilters: Filters = { type: "", partyId: "", fy: "", from: "", to: "", paid: "", minAmt: "", maxAmt: "", q: "" };

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [parties, setParties] = useState<Party[]>([]);
  const [f, setF] = useState<Filters>(blankFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase().from("parties").select("*").order("name").then(({ data }) => setParties((data as Party[]) || []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase().from("bills").select("*", { count: "exact" });
    if (f.type) q = q.eq("type", f.type);
    if (f.partyId) q = q.or(`bill_to_id.eq.${f.partyId},supplier_id.eq.${f.partyId},ship_to_id.eq.${f.partyId}`);
    if (f.fy) q = q.eq("fy", f.fy);
    if (f.from) q = q.gte("bill_date", f.from);
    if (f.to) q = q.lte("bill_date", f.to);
    if (f.paid) q = q.eq("paid", f.paid === "paid");
    if (f.minAmt) q = q.gte("total", Number(f.minAmt));
    if (f.maxAmt) q = q.lte("total", Number(f.maxAmt));
    if (f.q) q = q.ilike("bill_no", `%${f.q}%`);
    const { data, count: c } = await q
      .order("bill_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    setBills((data as Bill[]) || []);
    setCount(c || 0);
    setLoading(false);
  }, [f, page]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setPage(0);
  };

  const curFy = financialYear(todayISO());
  const fyOptions = [curFy];
  {
    const [a] = curFy.split("-").map(Number);
    for (let i = 1; i <= 4; i++) {
      const s = a - i;
      fyOptions.push(`${String(s).padStart(2, "0")}-${String(s + 1).padStart(2, "0")}`);
    }
  }
  const activeCount = Object.values(f).filter((v) => v !== "").length;
  const pages = Math.ceil(count / PAGE);

  return (
    <AppShell title="Bills">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Search bill number…" value={f.q} onChange={set("q")} />
          <Btn kind={activeCount > (f.q ? 1 : 0) ? "primary" : "secondary"} onClick={() => setShowFilters(!showFilters)}>
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Btn>
        </div>

        {showFilters && (
          <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Type">
              <select className={inputCls} value={f.type} onChange={set("type")}>
                <option value="">All</option>
                <option value="direct">Tax Invoice</option>
                <option value="commission">Commission</option>
                <option value="purchase_order">Purchase Order</option>
              </select>
            </Field>
            <Field label="Party">
              <select className={inputCls} value={f.partyId} onChange={set("partyId")}>
                <option value="">All</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Financial year">
              <select className={inputCls} value={f.fy} onChange={set("fy")}>
                <option value="">All</option>
                {fyOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Payment">
              <select className={inputCls} value={f.paid} onChange={set("paid")}>
                <option value="">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </Field>
            <Field label="From date"><input className={inputCls} type="date" value={f.from} onChange={set("from")} /></Field>
            <Field label="To date"><input className={inputCls} type="date" value={f.to} onChange={set("to")} /></Field>
            <Field label="Min amount"><input className={inputCls} type="number" value={f.minAmt} onChange={set("minAmt")} /></Field>
            <Field label="Max amount"><input className={inputCls} type="number" value={f.maxAmt} onChange={set("maxAmt")} /></Field>
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <Btn kind="ghost" onClick={() => { setF(blankFilters); setPage(0); }}>Clear all</Btn>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500">{count} bill{count === 1 ? "" : "s"}</div>

        {loading ? <Empty text="Loading…" /> : bills.length === 0 ? (
          <Empty text="No bills match. Create your first bill from the + New Bill tab." />
        ) : (
          <div className="space-y-2">
            {bills.map((b) => {
              const party = b.type === "purchase_order" ? b.supplier : b.bill_to;
              return (
                <Link key={b.id} href={`/bills/${b.id}`}
                  className="block card p-4 hover:shadow-md transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          b.type === "direct" ? "bg-indigo-100 text-indigo-600"
                          : b.type === "commission" ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"}`}>
                          {BILL_TYPE_SHORT[b.type as BillType]}
                        </span>
                        <span className="font-semibold truncate">{b.bill_no}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {party?.name || "—"} · {fmtDate(b.bill_date)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold">₹{fmtMoney(b.total)}</div>
                      <span className={`text-[10px] font-bold ${b.paid ? "text-emerald-600" : "text-amber-600"}`}>
                        {b.paid ? "PAID" : "UNPAID"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center items-center gap-3 pt-2">
            <Btn kind="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</Btn>
            <span className="text-sm text-slate-600">Page {page + 1} of {pages}</span>
            <Btn kind="secondary" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next →</Btn>
          </div>
        )}
      </div>
    </AppShell>
  );
}
