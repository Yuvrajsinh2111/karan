"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, Field, inputCls } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { allocateSeq, BillDraft, nextSeq, saveBill } from "@/lib/bills";
import { Bill, BillItem, BillType, Party, PartySnap, Product, Settings, BILL_TYPE_LABEL } from "@/lib/types";
import { computeTotals, emptyItem, financialYear, fmtMoney, formatBillNo, itemAmount, todayISO } from "@/lib/utils";

function snap(p: Party | PartySnap | null): PartySnap | null {
  if (!p) return null;
  return { name: p.name, address: p.address, gstin: p.gstin, state_name: p.state_name, state_code: p.state_code, contact: p.contact };
}

function PartyPicker({ label, parties, value, valueId, onChange }: {
  label: string;
  parties: Party[];
  value: PartySnap | null;
  valueId: string | null;
  onChange: (id: string | null, snap: PartySnap | null) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={inputCls}
        value={valueId || ""}
        onChange={(e) => {
          const p = parties.find((x) => x.id === e.target.value) || null;
          onChange(p ? p.id : null, snap(p));
        }}>
        <option value="">— select party —</option>
        {parties.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {value && (
        <div className="text-xs text-slate-500 mt-1 whitespace-pre-line">
          {value.address}{value.gstin ? `\nGSTIN: ${value.gstin} · ${value.state_name} (${value.state_code})` : ""}
        </div>
      )}
    </Field>
  );
}

export default function BillForm({ type, existing, dup }: { type: BillType; existing?: Bill; dup?: Bill }) {
  const src = existing ?? dup;
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [billDate, setBillDate] = useState(existing?.bill_date || todayISO());
  const [fy, setFy] = useState(existing?.fy || financialYear(todayISO()));
  const [seq, setSeq] = useState(existing?.seq || 0);
  const [billNo, setBillNo] = useState(existing?.bill_no || "");
  const [billNoTouched, setBillNoTouched] = useState(!!existing);
  const [billToId, setBillToId] = useState<string | null>(src?.bill_to_id || null);
  const [billTo, setBillTo] = useState<PartySnap | null>(src?.bill_to || null);
  const [shipToId, setShipToId] = useState<string | null>(src?.ship_to_id || null);
  const [shipTo, setShipTo] = useState<PartySnap | null>(src?.ship_to || null);
  const [supplierId, setSupplierId] = useState<string | null>(src?.supplier_id || null);
  const [supplier, setSupplier] = useState<PartySnap | null>(src?.supplier || null);
  const [taxType, setTaxType] = useState<"cgst_sgst" | "igst">(src?.tax_type || "cgst_sgst");
  const [taxTouched, setTaxTouched] = useState(!!existing);
  const [gstRate, setGstRate] = useState(src?.gst_rate ?? 18);
  const [paid, setPaid] = useState(existing?.paid || false);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [extra, setExtra] = useState<Bill["extra"]>(src?.extra || {});
  const [items, setItems] = useState<BillItem[]>(
    src?.bill_items?.length
      ? src.bill_items.map((it) => (existing ? it : { ...it, id: undefined, bill_id: undefined }))
      : [emptyItem(1)]
  );

  // load masters
  useEffect(() => {
    supabase().from("settings").select("*").eq("id", 1).single().then(({ data }) => {
      const s = data as Settings;
      setSettings(s);
      if (!src) setGstRate(s.default_gst_rate);
    });
    supabase().from("parties").select("*").eq("active", true).order("name")
      .then(({ data }) => setParties((data as Party[]) || []));
    supabase().from("products").select("*").eq("active", true).order("name")
      .then(({ data }) => setProducts((data as Product[]) || []));
  }, [existing]);

  // auto bill number for new bills (re-runs if date moves to another FY)
  const refreshNumber = useCallback(async (s: Settings, dateStr: string) => {
    const f = financialYear(dateStr);
    const n = await nextSeq(type, f);
    setFy(f); setSeq(n);
    setBillNo(formatBillNo(type, f, n, s));
  }, [type]);

  useEffect(() => {
    if (existing || !settings) return;
    refreshNumber(settings, billDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  function onDateChange(d: string) {
    setBillDate(d);
    if (!existing && settings && financialYear(d) !== fy && !billNoTouched) {
      refreshNumber(settings, d);
    }
  }

  // derive tax type from counterparty state vs our state
  const counterparty = type === "purchase_order" ? supplier : billTo;
  useEffect(() => {
    if (taxTouched || !settings || !counterparty) return;
    setTaxType(counterparty.state_code && counterparty.state_code !== settings.state_code ? "igst" : "cgst_sgst");
  }, [counterparty, settings, taxTouched]);

  const totals = useMemo(
    () => computeTotals(items.filter((i) => i.description.trim() !== ""), taxType, gstRate),
    [items, taxType, gstRate]
  );

  function setItem(idx: number, patch: Partial<BillItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function pickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) { setItem(idx, { product_id: null }); return; }
    setItem(idx, {
      product_id: p.id, description: p.name, hsn: p.hsn, unit: p.unit,
      rate: items[idx].rate || p.default_rate,
    });
  }

  async function submit() {
    if (!settings) return;
    setErr("");
    const needsParty = type === "purchase_order" ? supplier : billTo;
    if (!needsParty) { setErr(type === "purchase_order" ? "Select the supplier." : "Select the party to bill."); return; }
    setBusy(true);
    // New bills: allocate the number atomically in the database (concurrency-safe)
    let finalSeq = seq;
    let finalNo = billNo;
    if (!existing) {
      const alloc = await allocateSeq(type, fy);
      if (alloc.error || !alloc.seq) { setBusy(false); setErr(alloc.error || "Could not allocate bill number."); return; }
      finalSeq = alloc.seq;
      if (!billNoTouched) finalNo = formatBillNo(type, fy, alloc.seq, settings);
    }
    const draft: BillDraft = {
      id: existing?.id, type, fy, seq: finalSeq, bill_no: finalNo, bill_date: billDate,
      bill_to_id: billToId, bill_to: billTo, ship_to_id: shipToId, ship_to: shipTo,
      supplier_id: supplierId, supplier, tax_type: taxType, gst_rate: Number(gstRate) || 0,
      paid, notes, extra, items,
    };
    const res = await saveBill(draft);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      if (res.error.includes("already used") && settings) refreshNumber(settings, billDate);
      return;
    }
    router.replace(`/bills/${res.id}`);
  }

  const isCommission = type === "commission";
  const isPO = type === "purchase_order";
  const setX = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setExtra((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-28">
      {/* number + date */}
      <section className="card p-4 grid grid-cols-2 gap-3">
        <Field label={isPO ? "Voucher No." : "Invoice No."}>
          <input className={inputCls} value={billNo}
            onChange={(e) => { setBillNo(e.target.value); setBillNoTouched(true); }} />
        </Field>
        <Field label="Date">
          <input className={inputCls} type="date" value={billDate} onChange={(e) => onDateChange(e.target.value)} />
        </Field>
      </section>

      {/* parties */}
      <section className="card p-4 grid md:grid-cols-2 gap-3">
        {type === "direct" && (
          <>
            <PartyPicker label="Buyer (Bill to) *" parties={parties} value={billTo} valueId={billToId}
              onChange={(id, s) => { setBillToId(id); setBillTo(s); }} />
            <PartyPicker label="Consignee (Ship to)" parties={parties} value={shipTo} valueId={shipToId}
              onChange={(id, s) => { setShipToId(id); setShipTo(s); }} />
          </>
        )}
        {isCommission && (
          <>
            <PartyPicker label="Bill to Party *" parties={parties} value={billTo} valueId={billToId}
              onChange={(id, s) => { setBillToId(id); setBillTo(s); }} />
            <PartyPicker label="Ship to Party (optional)" parties={parties} value={shipTo} valueId={shipToId}
              onChange={(id, s) => { setShipToId(id); setShipTo(s); }} />
          </>
        )}
        {isPO && (
          <PartyPicker label="Supplier (Bill from) *" parties={parties} value={supplier} valueId={supplierId}
            onChange={(id, s) => { setSupplierId(id); setSupplier(s); }} />
        )}
        <p className="text-xs text-slate-400 md:col-span-2">
          Party missing? Add it in <a href="/parties" className="text-indigo-600 underline">Parties</a> first.
          {isPO && " Invoice To / Consignee print as your own firm from Settings."}
        </p>
      </section>

      {/* type-specific transport/reference fields */}
      <section className="card p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {isCommission ? (
          <>
            <Field label="Transport mode"><input className={inputCls} value={extra.transport_mode || ""} onChange={setX("transport_mode")} /></Field>
            <Field label="Vehicle number"><input className={inputCls} value={extra.vehicle_no || ""} onChange={setX("vehicle_no")} /></Field>
            <Field label="Place of supply"><input className={inputCls} value={extra.place_of_supply || ""} onChange={setX("place_of_supply")} /></Field>
          </>
        ) : (
          <>
            <Field label="Reference No."><input className={inputCls} value={extra.reference_no || ""} onChange={setX("reference_no")} /></Field>
            {type === "direct" && <Field label="Buyer's Order No."><input className={inputCls} value={extra.buyer_order_no || ""} onChange={setX("buyer_order_no")} /></Field>}
            <Field label="Dispatched through"><input className={inputCls} value={extra.dispatched_through || ""} onChange={setX("dispatched_through")} /></Field>
            <Field label="Destination"><input className={inputCls} value={extra.destination || ""} onChange={setX("destination")} /></Field>
            <Field label="Terms of Delivery"><input className={inputCls} value={extra.terms_of_delivery || ""} onChange={setX("terms_of_delivery")} /></Field>
          </>
        )}
      </section>

      {/* items */}
      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-sm text-slate-700">Goods</h2>
        {items.map((it, idx) => (
          <div key={idx} className="border rounded-lg p-3 space-y-2 relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Field label="Product" className="col-span-2">
                <select className={inputCls} value={it.product_id || ""} onChange={(e) => pickProduct(idx, e.target.value)}>
                  <option value="">— pick or type below —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Description *" className="col-span-2">
                <input className={inputCls} value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })} />
              </Field>
              <Field label="HSN/SAC"><input className={inputCls} value={it.hsn} onChange={(e) => setItem(idx, { hsn: e.target.value })} /></Field>
              <Field label="Qty"><input className={inputCls} type="number" step="any" value={it.qty || ""} onChange={(e) => setItem(idx, { qty: Number(e.target.value) })} /></Field>
              <Field label="Unit"><input className={inputCls} value={it.unit} onChange={(e) => setItem(idx, { unit: e.target.value })} /></Field>
              {isCommission && (
                <Field label="Company rate (base)">
                  <input className={inputCls} type="number" step="any" value={it.base_rate ?? ""}
                    onChange={(e) => setItem(idx, { base_rate: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
              )}
              <Field label={isCommission ? "Final rate (with commission)" : "Rate"}>
                <input className={inputCls} type="number" step="any" value={it.rate || ""} onChange={(e) => setItem(idx, { rate: Number(e.target.value) })} />
              </Field>
              {type === "direct" && (
                <Field label="Disc %"><input className={inputCls} type="number" step="any" value={it.disc_pct || ""} onChange={(e) => setItem(idx, { disc_pct: Number(e.target.value) })} /></Field>
              )}
              {isPO && (
                <Field label="Due on"><input className={inputCls} type="date" value={it.due_on || ""} onChange={(e) => setItem(idx, { due_on: e.target.value })} /></Field>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="text-slate-600">
                Amount: <b>₹{fmtMoney(itemAmount(it.qty, it.rate, it.disc_pct))}</b>
                {isCommission && it.base_rate != null && it.qty > 0 && (
                  <span className="ml-3 text-green-700">
                    Commission: ₹{fmtMoney((it.rate - it.base_rate) * it.qty)}
                  </span>
                )}
              </div>
              {items.length > 1 && (
                <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                  className="text-rose-600 text-xs hover:underline">Remove</button>
              )}
            </div>
          </div>
        ))}
        <Btn kind="secondary" onClick={() => setItems((p) => [...p, emptyItem(p.length + 1)])}>+ Add item</Btn>
      </section>

      {/* tax + totals */}
      <section className="card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tax">
            <select className={inputCls} value={taxType}
              onChange={(e) => { setTaxType(e.target.value as "cgst_sgst" | "igst"); setTaxTouched(true); }}>
              <option value="cgst_sgst">CGST + SGST (within state)</option>
              <option value="igst">IGST (other state)</option>
            </select>
          </Field>
          <Field label="GST rate (total %)">
            <input className={inputCls} type="number" step="any" value={gstRate}
              onChange={(e) => setGstRate(Number(e.target.value))} />
          </Field>
        </div>
        <div className="text-sm space-y-1 border-t pt-3">
          <Row l="Taxable value" v={totals.subtotal} />
          {taxType === "cgst_sgst" ? (
            <>
              <Row l={`CGST @ ${gstRate / 2}%`} v={totals.cgst} />
              <Row l={`SGST @ ${gstRate / 2}%`} v={totals.sgst} />
            </>
          ) : (
            <Row l={`IGST @ ${gstRate}%`} v={totals.igst} />
          )}
          <Row l="Round off" v={totals.round_off} />
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span><span>₹{fmtMoney(totals.total)}</span>
          </div>
          {isCommission && totals.commission_total !== 0 && (
            <div className="flex justify-between text-green-700 font-semibold">
              <span>Your commission</span><span>₹{fmtMoney(totals.commission_total)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4" />
            Mark as paid
          </label>
        </div>
        <Field label="Notes (private, not printed)">
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </section>

      {err && <p className="text-rose-600 text-sm font-semibold">{err}</p>}

      <div className="fixed bottom-[4.75rem] md:bottom-0 inset-x-0 md:left-60 bg-white/85 backdrop-blur-xl border-t border-slate-200/70 p-3 flex gap-2 justify-end z-10">
        <Btn kind="secondary" onClick={() => router.back()}>Cancel</Btn>
        <Btn onClick={submit} disabled={busy || !settings}>
          {busy ? "Saving…" : existing ? "Update " + BILL_TYPE_LABEL[type] : "Save " + BILL_TYPE_LABEL[type]}
        </Btn>
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: number }) {
  return (
    <div className="flex justify-between text-slate-700">
      <span>{l}</span><span>₹{fmtMoney(v)}</span>
    </div>
  );
}
