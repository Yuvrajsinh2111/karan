"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { inputCls } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
    else router.replace("/");
  }

  if (!supabaseConfigured()) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm">
        Supabase not configured — fill .env.local first.
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white items-center justify-center font-black text-2xl shadow-xl shadow-indigo-600/30 mb-4">T</span>
          <h1 className="text-2xl font-bold tracking-tight">TradeLedger</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>
        <form onSubmit={signIn} className="card p-6 space-y-4">
          <input
            type="email" required placeholder="Email" value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          <input
            type="password" required placeholder="Password" value={password} autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          {err && <p className="text-sm text-rose-600 font-medium">{err}</p>}
          <button disabled={busy}
            className="w-full bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl py-3 text-sm font-semibold shadow-md shadow-indigo-600/25 transition active:scale-[0.99] disabled:opacity-50">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-4">
          Create your user in Supabase → Authentication → Users.
        </p>
        <p className="text-[11px] text-slate-400 text-center mt-6">
          Powered by <span className="font-semibold text-slate-500">Yuvrajsinh Borasiya</span>
        </p>
      </div>
    </div>
  );
}
