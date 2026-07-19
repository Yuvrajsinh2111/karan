"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Btn, Field, inputCls } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase().from("settings").select("*").eq("id", 1).single()
      .then(({ data }) => setS(data as Settings));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    await supabase().from("settings").update({ ...s, default_gst_rate: Number(s.default_gst_rate) }).eq("id", 1);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setS((p) => (p ? { ...p, [k]: e.target.value } : p));

  if (!s) return <AppShell title="Settings"><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell title="Settings">
      <form onSubmit={save} className="max-w-2xl mx-auto space-y-5">
        <section className="card p-4 space-y-3">
          <h2 className="font-bold text-sm text-gray-700">Firm details (printed on every bill)</h2>
          <Field label="Firm name"><input className={inputCls} value={s.firm_name} onChange={set("firm_name")} /></Field>
          <Field label="Address"><textarea className={inputCls} rows={3} value={s.address} onChange={set("address")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GSTIN"><input className={inputCls} value={s.gstin} onChange={set("gstin")} /></Field>
            <Field label="Contact"><input className={inputCls} value={s.contact} onChange={set("contact")} /></Field>
            <Field label="State name"><input className={inputCls} value={s.state_name} onChange={set("state_name")} /></Field>
            <Field label="State code"><input className={inputCls} value={s.state_code} onChange={set("state_code")} /></Field>
            <Field label="Mobile (commission bill header)"><input className={inputCls} value={s.mobile} onChange={set("mobile")} /></Field>
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="font-bold text-sm text-gray-700">Bank details (commission bill)</h2>
          <Field label="Bank name"><input className={inputCls} value={s.bank_name} onChange={set("bank_name")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account no."><input className={inputCls} value={s.bank_ac} onChange={set("bank_ac")} /></Field>
            <Field label="IFSC"><input className={inputCls} value={s.bank_ifsc} onChange={set("bank_ifsc")} /></Field>
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="font-bold text-sm text-gray-700">Billing defaults</h2>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Invoice prefix"><input className={inputCls} value={s.direct_prefix} onChange={set("direct_prefix")} /></Field>
            <Field label="PO prefix"><input className={inputCls} value={s.po_prefix} onChange={set("po_prefix")} /></Field>
            <Field label="Default GST %"><input className={inputCls} type="number" step="any" value={s.default_gst_rate} onChange={set("default_gst_rate")} /></Field>
          </div>
          <Field label="Declaration (printed at bottom of tax invoice)">
            <textarea className={inputCls} rows={2} value={s.declaration} onChange={set("declaration")} />
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Btn>
          {saved && <span className="text-green-600 text-sm font-semibold">Saved ✓</span>}
        </div>
      </form>
    </AppShell>
  );
}
