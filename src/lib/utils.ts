import { BillType, BillItem, Settings } from "./types";

// Financial year for a date: Apr 2026–Mar 2027 -> "26-27"
export function financialYear(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  const a = String(start % 100).padStart(2, "0");
  const b = String((start + 1) % 100).padStart(2, "0");
  return `${a}-${b}`;
}

export function formatBillNo(type: BillType, fy: string, seq: number, s: Settings): string {
  if (type === "direct") return `${s.direct_prefix}/${fy}/${String(seq).padStart(3, "0")}`;
  if (type === "purchase_order") return `${s.po_prefix}-${fy}-${String(seq).padStart(3, "0")}`;
  return `${seq}`; // commission bills use plain numbers (No: 6)
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function itemAmount(qty: number, rate: number, discPct: number): number {
  return round2(qty * rate * (1 - (discPct || 0) / 100));
}

export interface BillTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  round_off: number;
  total: number;
  total_qty: number;
  commission_total: number;
}

export function computeTotals(
  items: BillItem[],
  taxType: "cgst_sgst" | "igst",
  gstRate: number
): BillTotals {
  const subtotal = round2(items.reduce((s, i) => s + itemAmount(i.qty, i.rate, i.disc_pct), 0));
  const total_qty = round2(items.reduce((s, i) => s + (Number(i.qty) || 0), 0));
  let cgst = 0, sgst = 0, igst = 0;
  if (taxType === "cgst_sgst") {
    cgst = round2((subtotal * gstRate) / 200);
    sgst = cgst;
  } else {
    igst = round2((subtotal * gstRate) / 100);
  }
  const exact = subtotal + cgst + sgst + igst;
  const total = Math.round(exact);
  const round_off = round2(total - exact);
  const commission_total = round2(
    items.reduce((s, i) => {
      if (i.base_rate == null) return s;
      return s + (i.rate - i.base_rate) * i.qty;
    }, 0)
  );
  return { subtotal, cgst, sgst, igst, round_off, total, total_qty, commission_total };
}

// Indian number formatting: 1,98,240.00
export function fmtMoney(n: number, decimals = 2): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtQty(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return (tens[Math.floor(n / 10)] + " " + ones[n % 10]).trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = "";
  if (h) out = ones[h] + " Hundred";
  if (r) out += (out ? " " : "") + twoDigits(r);
  return out;
}

// Indian system: Crore, Lakh, Thousand, Hundred
export function numberToWordsIndian(num: number): string {
  if (num === 0) return "Zero";
  let n = Math.floor(Math.abs(num));
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(twoDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (n) parts.push(threeDigits(n));
  return parts.join(" ");
}

export function amountInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  let out = "INR " + numberToWordsIndian(rupees);
  if (paise) out += " and " + numberToWordsIndian(paise) + " Paise";
  return out + " Only";
}

// dd-MMM-yy like 16-Jul-26
export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return `${d.getDate()}-${m}-${String(d.getFullYear() % 100).padStart(2, "0")}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function emptyItem(pos: number): BillItem {
  return {
    pos, product_id: null, description: "", hsn: "", qty: 0, unit: "KGS",
    rate: 0, disc_pct: 0, amount: 0, due_on: null, base_rate: null,
  };
}
