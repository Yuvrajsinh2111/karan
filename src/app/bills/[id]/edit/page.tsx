"use client";
import { use, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import BillForm from "@/components/BillForm";
import { getBill } from "@/lib/bills";
import { Bill, BILL_TYPE_LABEL } from "@/lib/types";

export default function EditBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [bill, setBill] = useState<Bill | null>(null);

  useEffect(() => { getBill(id).then(setBill); }, [id]);

  if (!bill) return <AppShell title="Edit Bill"><p className="text-sm text-gray-400">Loading…</p></AppShell>;

  return (
    <AppShell title={`Edit ${BILL_TYPE_LABEL[bill.type]} ${bill.bill_no}`}>
      <BillForm type={bill.type} existing={bill} />
    </AppShell>
  );
}
