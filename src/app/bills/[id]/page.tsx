"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import DirectBill from "@/components/print/DirectBill";
import CommissionBill from "@/components/print/CommissionBill";
import PurchaseOrderDoc from "@/components/print/PurchaseOrderDoc";
import { Btn } from "@/components/ui";
import { getBill } from "@/lib/bills";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/lib/useSettings";
import { Bill, BILL_TYPE_LABEL } from "@/lib/types";

export default function BillViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const settings = useSettings();
  const [bill, setBill] = useState<Bill | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    getBill(id).then((b) => (b ? setBill(b) : setMissing(true)));
  }, [id]);

  async function togglePaid() {
    if (!bill) return;
    await supabase().from("bills").update({ paid: !bill.paid }).eq("id", bill.id);
    setBill({ ...bill, paid: !bill.paid });
  }

  async function remove() {
    if (!bill) return;
    if (!confirm(`Delete ${bill.bill_no}? This cannot be undone.`)) return;
    await supabase().from("bills").delete().eq("id", bill.id);
    router.replace("/bills");
  }

  function duplicate() {
    if (!bill) return;
    sessionStorage.setItem("duplicate_bill", JSON.stringify(bill));
    router.push(`/bills/new/${bill.type}?dup=1`);
  }

  if (missing) return <AppShell title="Bill"><p className="text-sm text-gray-500">Bill not found.</p></AppShell>;
  if (!bill || !settings) return <AppShell title="Bill"><p className="text-sm text-gray-400">Loading…</p></AppShell>;

  return (
    <AppShell>
      <div className="no-print max-w-[210mm] mx-auto mb-3 flex flex-wrap gap-2 items-center">
        <div className="mr-auto">
          <div className="font-bold">{bill.bill_no}</div>
          <div className="text-xs text-gray-500">{BILL_TYPE_LABEL[bill.type]} · {bill.bill_date}</div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${bill.paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {bill.paid ? "PAID" : "UNPAID"}
        </span>
        <Btn kind="secondary" onClick={togglePaid}>{bill.paid ? "Mark unpaid" : "Mark paid"}</Btn>
        <Btn kind="secondary" onClick={duplicate}>Duplicate</Btn>
        <Btn kind="secondary" onClick={() => router.push(`/bills/${bill.id}/edit`)}>Edit</Btn>
        <Btn kind="danger" onClick={remove}>Delete</Btn>
        <Btn onClick={() => window.print()}>Print / PDF</Btn>
      </div>

      {bill.type === "direct" && <DirectBill bill={bill} settings={settings} />}
      {bill.type === "commission" && <CommissionBill bill={bill} settings={settings} />}
      {bill.type === "purchase_order" && <PurchaseOrderDoc bill={bill} settings={settings} />}
    </AppShell>
  );
}
