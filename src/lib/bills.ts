"use client";
import { supabase } from "./supabase";
import { Bill, BillItem, BillType } from "./types";
import { computeTotals, itemAmount } from "./utils";

// Preview only (shown while typing) — the real number is allocated atomically at save
export async function nextSeq(type: BillType, fy: string): Promise<number> {
  const { data } = await supabase()
    .from("bill_counters").select("last_seq").eq("type", type).eq("fy", fy).maybeSingle();
  if (data) return data.last_seq + 1;
  const { data: mx } = await supabase()
    .from("bills").select("seq").eq("type", type).eq("fy", fy)
    .order("seq", { ascending: false }).limit(1);
  return mx && mx.length ? mx[0].seq + 1 : 1;
}

// Atomic allocation via Postgres function — safe under any concurrency
export async function allocateSeq(type: BillType, fy: string): Promise<{ seq?: number; error?: string }> {
  const { data, error } = await supabase().rpc("next_bill_seq", { p_type: type, p_fy: fy });
  if (error) return { error: error.message + " — run supabase/scale.sql in the SQL Editor." };
  return { seq: data as number };
}

export interface BillDraft {
  id?: string;
  type: BillType;
  fy: string;
  seq: number;
  bill_no: string;
  bill_date: string;
  bill_to_id: string | null;
  bill_to: Bill["bill_to"];
  ship_to_id: string | null;
  ship_to: Bill["ship_to"];
  supplier_id: string | null;
  supplier: Bill["supplier"];
  tax_type: "cgst_sgst" | "igst";
  gst_rate: number;
  paid: boolean;
  notes: string;
  extra: Bill["extra"];
  items: BillItem[];
}

export async function saveBill(draft: BillDraft): Promise<{ id?: string; error?: string }> {
  const items = draft.items
    .filter((i) => i.description.trim() !== "")
    .map((i, idx) => ({
      ...i,
      pos: idx + 1,
      qty: Number(i.qty) || 0,
      rate: Number(i.rate) || 0,
      disc_pct: Number(i.disc_pct) || 0,
      base_rate: i.base_rate === null || i.base_rate === undefined || (i.base_rate as unknown) === "" ? null : Number(i.base_rate),
      amount: itemAmount(Number(i.qty) || 0, Number(i.rate) || 0, Number(i.disc_pct) || 0),
      due_on: i.due_on || null,
    }));
  if (items.length === 0) return { error: "Add at least one item." };

  const totals = computeTotals(items, draft.tax_type, draft.gst_rate);
  const row = {
    type: draft.type, fy: draft.fy, seq: draft.seq, bill_no: draft.bill_no,
    bill_date: draft.bill_date,
    bill_to_id: draft.bill_to_id, bill_to: draft.bill_to,
    ship_to_id: draft.ship_to_id, ship_to: draft.ship_to,
    supplier_id: draft.supplier_id, supplier: draft.supplier,
    tax_type: draft.tax_type, gst_rate: draft.gst_rate,
    subtotal: totals.subtotal, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst,
    round_off: totals.round_off, total: totals.total, total_qty: totals.total_qty,
    commission_total: totals.commission_total,
    paid: draft.paid, notes: draft.notes, extra: draft.extra,
  };

  let billId = draft.id;
  if (billId) {
    const { error } = await supabase().from("bills").update(row).eq("id", billId);
    if (error) return { error: error.message };
    await supabase().from("bill_items").delete().eq("bill_id", billId);
  } else {
    const { data, error } = await supabase().from("bills").insert(row).select("id").single();
    if (error) {
      if (error.code === "23505") return { error: "Bill number already used — the number was refreshed, please save again." };
      return { error: error.message };
    }
    billId = data!.id as string;
  }

  const { error: itemsErr } = await supabase().from("bill_items").insert(
    items.map((i) => ({
      bill_id: billId, pos: i.pos, product_id: i.product_id, description: i.description,
      hsn: i.hsn, qty: i.qty, unit: i.unit, rate: i.rate, disc_pct: i.disc_pct,
      amount: i.amount, due_on: i.due_on, base_rate: i.base_rate,
    }))
  );
  if (itemsErr) return { error: itemsErr.message };
  return { id: billId };
}

export async function getBill(id: string): Promise<Bill | null> {
  const { data } = await supabase()
    .from("bills").select("*, bill_items(*)").eq("id", id).single();
  if (!data) return null;
  const bill = data as Bill;
  bill.bill_items?.sort((a, b) => a.pos - b.pos);
  return bill;
}
