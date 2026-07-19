"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Empty, Field, inputCls } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { Bill, BillType, BILL_TYPE_SHORT } from "@/lib/types";
import { financialYear, fmtDate, fmtMoney, todayISO } from "@/lib/utils";

type SlimBill = Pick<Bill, "id" | "type" | "bill_no" | "bill_date" | "total" | "paid" | "bill_to" | "supplier">;

interface Stats {
  total_sales: number;
  sales_count: number;
  gst: number;
  commission: number;
  unpaid: number;
  counts: Record<string, number>;
  monthly: { month: string; value: number }[];
  top_parties: { name: string; value: number }[];
  top_products: { name: string; value: number }[];
}

function periodRange(p: string, from: string, to: string): [string, string] {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (p === "month") return [iso(new Date(y, m, 1)), todayISO()];
  if (p === "quarter") return [iso(new Date(y, m - (m % 3), 1)), todayISO()];
  if (p === "fy") {
    const start = m >= 3 ? y : y - 1;
    return [`${start}-04-01`, todayISO()];
  }
  if (p === "lastfy") {
    const start = (m >= 3 ? y : y - 1) - 1;
    return [`${start}-04-01`, `${start + 1}-03-31`];
  }
  if (p === "custom") return [from, to];
  return ["", ""]; // all time
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("fy");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [recent, setRecent] = useState<SlimBill[]>([]);
  const [rawStats, setRawStats] = useState<Stats | null>(null);
  const [statsErr, setStatsErr] = useState("");
  const [lastBackup, setLastBackup] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [start, end] = periodRange(period, from, to);

  const load = useCallback(async () => {
    setLoading(true);
    setStatsErr("");
    // All aggregates computed inside Postgres — one small JSON, any data volume
    const statsQ = supabase().rpc("dashboard_stats", {
      p_from: start || null,
      p_to: end || null,
    });
    let rq = supabase().from("bills").select("id,type,bill_no,bill_date,total,paid,bill_to,supplier");
    if (start) rq = rq.gte("bill_date", start);
    if (end) rq = rq.lte("bill_date", end);
    const [statsRes, recentRes] = await Promise.all([
      statsQ,
      rq.order("bill_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    ]);
    if (statsRes.error) {
      setStatsErr(statsRes.error.message + " — run supabase/scale.sql in the SQL Editor.");
      setRawStats(null);
    } else {
      setRawStats(statsRes.data as Stats);
    }
    setRecent((recentRes.data as SlimBill[]) || []);
    setLoading(false);
  }, [start, end]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase().from("settings").select("last_backup_at").eq("id", 1).single()
      .then(({ data }) => setLastBackup(data?.last_backup_at ?? null));
  }, []);

  const stats = useMemo(() => ({
    totalSales: rawStats?.total_sales ?? 0,
    salesCount: rawStats?.sales_count ?? 0,
    gst: rawStats?.gst ?? 0,
    commission: rawStats?.commission ?? 0,
    unpaid: rawStats?.unpaid ?? 0,
    counts: { direct: 0, commission: 0, purchase_order: 0, ...(rawStats?.counts || {}) },
  }), [rawStats]);

  const monthly = useMemo(() =>
    (rawStats?.monthly || []).map((m) => {
      const [yy, mm] = m.month.split("-");
      return {
        key: m.month,
        label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(mm) - 1] + " " + yy.slice(2),
        value: m.value,
      };
    }), [rawStats]);
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.value));

  const topParties = useMemo(() =>
    (rawStats?.top_parties || []).map((p) => [p.name, p.value] as [string, number]), [rawStats]);
  const topProducts = useMemo(() =>
    (rawStats?.top_products || []).map((p) => [p.name, p.value] as [string, number]), [rawStats]);

  const backupOverdue = lastBackup === null ||
    (typeof lastBackup === "string" && Date.now() - new Date(lastBackup).getTime() > 30 * 86400_000);

  return (
    <AppShell title="Dashboard">
      <div className="max-w-4xl mx-auto space-y-4">
        {lastBackup !== undefined && backupOverdue && (
          <Link href="/backup" className="block bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm">
            <b>Backup reminder:</b> {lastBackup ? `last backup was ${Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400_000)} days ago` : "no backup taken yet"} — tap to export now.
          </Link>
        )}

        {/* period selector */}
        <div className="flex flex-wrap gap-2 items-end">
          {[["month", "This month"], ["quarter", "This quarter"], ["fy", `FY ${financialYear(todayISO())}`], ["lastfy", "Last FY"], ["all", "All time"], ["custom", "Custom"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${period === v ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border"}`}>
              {l}
            </button>
          ))}
          {period === "custom" && (
            <div className="flex gap-2 w-full md:w-auto">
              <Field label="From"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
          )}
        </div>

        {statsErr && (
          <div className="card border-rose-200 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">{statsErr}</div>
        )}
        {loading ? <Empty text="Loading…" /> : (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile label="Total sales" value={`₹${fmtMoney(stats.totalSales, 0)}`} sub={`${stats.salesCount} bills`} />
              <Tile label="Commission earned" value={`₹${fmtMoney(stats.commission, 0)}`} sub={`${stats.counts.commission} commission bills`} />
              <Tile label="GST collected" value={`₹${fmtMoney(stats.gst, 0)}`} sub="CGST + SGST + IGST" />
              <Tile label="Unpaid" value={`₹${fmtMoney(stats.unpaid, 0)}`} sub="pending payments" warn={stats.unpaid > 0} />
            </div>

            {/* counts by type */}
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Tax Invoices" value={String(stats.counts.direct)} />
              <Tile label="Commission Bills" value={String(stats.counts.commission)} />
              <Tile label="Purchase Orders" value={String(stats.counts.purchase_order)} />
            </div>

            {/* monthly trend — single-series bar */}
            {monthly.length > 1 && (
              <section className="card p-4">
                <h2 className="font-bold text-sm text-slate-700 mb-3">Monthly sales</h2>
                <div className="flex items-end gap-1.5 h-36">
                  {monthly.map((m) => (
                    <div key={m.key} className="flex-1 flex flex-col justify-end items-center gap-1 group relative h-full">
                      <div className="absolute -top-7 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                        ₹{fmtMoney(m.value, 0)}
                      </div>
                      <div className="w-full max-w-[28px] bg-indigo-600 rounded-t"
                        style={{ height: `${Math.max(3, (m.value / maxMonthly) * 88)}%` }} />
                      <div className="text-[9px] text-slate-500 whitespace-nowrap">{m.label}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid md:grid-cols-2 gap-3">
              <RankList title="Top parties" rows={topParties} />
              <RankList title="Top products" rows={topProducts} />
            </div>

            {/* recent bills */}
            <section className="card p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-sm text-slate-700">Recent bills</h2>
                <Link href="/bills" className="text-indigo-600 text-xs font-semibold hover:underline">View all →</Link>
              </div>
              {recent.map((b) => (
                <Link key={b.id} href={`/bills/${b.id}`} className="flex justify-between items-center py-2 border-b last:border-0 text-sm hover:bg-gray-50 -mx-2 px-2 rounded">
                  <span className="truncate">
                    <span className="text-[10px] font-bold text-slate-400 mr-2">{BILL_TYPE_SHORT[b.type as BillType]}</span>
                    {b.bill_no} · {(b.type === "purchase_order" ? b.supplier : b.bill_to)?.name || "—"}
                  </span>
                  <span className="shrink-0 ml-2 text-right">
                    <span className="font-semibold">₹{fmtMoney(b.total, 0)}</span>
                    <span className="block text-[10px] text-slate-400">{fmtDate(b.bill_date)}</span>
                  </span>
                </Link>
              ))}
              {recent.length === 0 && <Empty text="No bills in this period." />}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Tile({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${warn ? "text-amber-600" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function RankList({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <section className="card p-4">
      <h2 className="font-bold text-sm text-slate-700 mb-2">{title}</h2>
      {rows.length === 0 && <div className="text-xs text-slate-400 py-4 text-center">No data</div>}
      {rows.map(([name, amt]) => (
        <div key={name} className="py-1.5">
          <div className="flex justify-between text-sm">
            <span className="truncate">{name}</span>
            <span className="font-semibold shrink-0 ml-2">₹{fmtMoney(amt, 0)}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded mt-1">
            <div className="h-1.5 bg-indigo-600 rounded" style={{ width: `${(amt / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}
