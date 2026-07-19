"use client";
import { Suspense, use, useEffect, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BillForm from "@/components/BillForm";
import { Bill, BILL_TYPE_LABEL, BillType } from "@/lib/types";

function NewBillInner({ type }: { type: BillType }) {
  const search = useSearchParams();
  const isDup = search.get("dup") === "1";
  const [dup, setDup] = useState<Bill | undefined>(undefined);
  const [ready, setReady] = useState(!isDup);

  useEffect(() => {
    if (!isDup) return;
    const raw = sessionStorage.getItem("duplicate_bill");
    if (raw) {
      try { setDup(JSON.parse(raw) as Bill); } catch { /* ignore bad data */ }
      sessionStorage.removeItem("duplicate_bill");
    }
    setReady(true);
  }, [isDup]);

  if (!ready) return null;
  return <BillForm type={type} dup={dup} />;
}

export default function NewTypedBillPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  if (!["direct", "commission", "purchase_order"].includes(type)) notFound();
  const t = type as BillType;
  return (
    <AppShell title={`New ${BILL_TYPE_LABEL[t]}`}>
      <Suspense>
        <NewBillInner type={t} />
      </Suspense>
    </AppShell>
  );
}
