"use client";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

const LINKS = [
  { href: "/products", label: "Products", desc: "Chemicals you trade — names, HSN, rates" },
  { href: "/settings", label: "Settings", desc: "Firm details, GSTIN, bank, bill prefixes" },
  { href: "/backup", label: "Backup & Export", desc: "Excel export, full backup, restore" },
];

export default function MorePage() {
  return (
    <AppShell title="More">
      <div className="max-w-xl mx-auto space-y-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="block card p-4 hover:bg-gray-50">
            <div className="font-semibold">{l.label}</div>
            <div className="text-xs text-slate-500">{l.desc}</div>
          </Link>
        ))}
        <button
          onClick={() => supabase().auth.signOut()}
          className="w-full text-left card p-4 hover:bg-gray-50 text-rose-600 font-semibold">
          Sign out
        </button>
      </div>
    </AppShell>
  );
}
