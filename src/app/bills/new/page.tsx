"use client";
import Link from "next/link";
import AppShell from "@/components/AppShell";

const TYPES = [
  { href: "/bills/new/direct", title: "Direct Customer Bill", desc: "Tax Invoice to your customer (LE/26-27/xxx)", color: "from-indigo-500 to-indigo-700 shadow-indigo-600/30" },
  { href: "/bills/new/commission", title: "Commission Bill", desc: "Company-to-company bill with your commission in between", color: "from-emerald-500 to-emerald-700 shadow-emerald-600/30" },
  { href: "/bills/new/purchase_order", title: "Purchase Order", desc: "PO to your supplier (Po-26/27-xxx)", color: "from-amber-500 to-amber-600 shadow-amber-600/30" },
];

export default function NewBillPage() {
  return (
    <AppShell title="New Bill">
      <div className="max-w-xl mx-auto space-y-3">
        {TYPES.map((t) => (
          <Link key={t.href} href={t.href}
            className="flex items-center gap-4 card p-5 hover:-translate-y-0.5 hover:shadow-lg transition">
            <span className={`bg-gradient-to-br ${t.color} text-white rounded-2xl w-12 h-12 flex items-center justify-center font-bold text-lg shrink-0 shadow-lg`}>
              {t.title[0]}
            </span>
            <span>
              <span className="block font-semibold">{t.title}</span>
              <span className="block text-xs text-gray-500">{t.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
