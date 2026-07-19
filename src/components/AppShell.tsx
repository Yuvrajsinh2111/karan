"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const ICONS = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  bills: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  parties: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  products: "M12 2 4 6v12l8 4 8-4V6l-8-4zm6 5.09L12 10 6 7.09 12 4.18l6 2.91zM6 9.27l5 2.5v7.05l-5-2.5V9.27zm7 9.55v-7.05l5-2.5v7.05l-5 2.5z",
  settings: "M19.14 12.94a7.14 7.14 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.63 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.14 7.14 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.61.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54a7.03 7.03 0 0 0 1.63-.94l2.39.96c.21.1.48.01.61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z",
  backup: "M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",
  more: "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
};

// Desktop sidebar — everything visible, no "More"
const SIDEBAR = [
  { href: "/", label: "Dashboard", icon: ICONS.dashboard },
  { href: "/bills", label: "Bills", icon: ICONS.bills },
  { href: "/bills/new", label: "New Bill", icon: ICONS.plus },
  { href: "/parties", label: "Parties", icon: ICONS.parties },
  { href: "/products", label: "Products", icon: ICONS.products },
  { href: "/settings", label: "Settings", icon: ICONS.settings },
  { href: "/backup", label: "Backup & Export", icon: ICONS.backup },
];

// Mobile bottom nav — 5 slots max, so the rest lives under More
const MOBILE_NAV = [
  { href: "/", label: "Dashboard", icon: ICONS.dashboard },
  { href: "/bills", label: "Bills", icon: ICONS.bills },
  { href: "/bills/new", label: "New Bill", icon: ICONS.plus, accent: true },
  { href: "/parties", label: "Parties", icon: ICONS.parties },
  { href: "/more", label: "More", icon: ICONS.more },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/bills") return pathname === "/bills" || (/^\/bills\/(?!new)/.test(pathname));
  if (href === "/bills/new") return pathname.startsWith("/bills/new");
  if (href === "/more") return ["/more", "/settings", "/backup", "/products"].some((p) => pathname.startsWith(p));
  return pathname.startsWith(href);
}

export default function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured()) { setReady(true); return; }
    supabase().auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
    const { data: sub } = supabase().auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!supabaseConfigured()) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md card p-6 text-sm space-y-3">
          <h1 className="text-lg font-bold">Setup needed</h1>
          <p>Supabase is not connected yet. Copy <code className="bg-gray-100 px-1 rounded">.env.local.example</code> to <code className="bg-gray-100 px-1 rounded">.env.local</code> and fill in your project URL and anon key from supabase.com, then restart the app.</p>
          <p>Also run <code className="bg-gray-100 px-1 rounded">supabase/schema.sql</code> in the Supabase SQL Editor.</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen">
      {/* Desktop sidebar */}
      <aside className="no-print hidden md:flex md:flex-col w-60 shrink-0 bg-white/80 backdrop-blur border-r border-slate-200/70 sticky top-0 h-screen">
        <div className="px-5 py-6 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/25">T</span>
          <div>
            <div className="font-bold leading-tight">TradeLedger</div>
            <div className="text-slate-400 text-[11px] font-medium tracking-wide uppercase">ERP</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {SIDEBAR.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current opacity-90"><path d={n.icon} /></svg>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="m-4 space-y-2">
          <button
            onClick={() => supabase().auth.signOut()}
            className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition">
            Sign out
          </button>
          <p className="text-center text-[10px] text-slate-400">
            Powered by <span className="font-semibold text-slate-500">Yuvrajsinh Borasiya</span>
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col pb-24 md:pb-0 min-w-0">
        {title && (
          <header className="no-print sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3.5 md:px-8">
            <h1 className="text-lg md:text-xl font-bold tracking-tight">{title}</h1>
          </header>
        )}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>

      {/* Mobile bottom nav — floating pill */}
      <nav className="no-print md:hidden fixed bottom-3 inset-x-3 z-20 bg-white/90 backdrop-blur-xl border border-slate-200/70 rounded-2xl shadow-xl shadow-slate-900/10 flex px-1 py-1.5"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
        {MOBILE_NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link key={n.href} href={n.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl text-[10px] font-medium transition ${
                active && !n.accent ? "text-indigo-600" : "text-slate-500"}`}>
              {n.accent ? (
                <span className="bg-gradient-to-br from-indigo-600 to-sky-500 text-white rounded-full p-2.5 -mt-6 shadow-lg shadow-indigo-600/30 ring-4 ring-white">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d={n.icon} /></svg>
                </span>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d={n.icon} /></svg>
              )}
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
