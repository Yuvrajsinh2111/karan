"use client";
import { useEffect } from "react";

export function Field({ label, children, className = "" }: {
  label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400 transition placeholder:text-slate-400";

export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold tracking-tight">{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg leading-none transition">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Btn({ children, onClick, kind = "primary", type = "button", disabled, className = "" }: {
  children: React.ReactNode; onClick?: () => void;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit"; disabled?: boolean; className?: string;
}) {
  const styles = {
    primary: "bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/25",
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm",
    danger: "bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-md shadow-rose-600/25",
    ghost: "text-indigo-600 hover:bg-indigo-50",
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-14">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-slate-300"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-3 15H8v-2h3v2zm5-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
      </div>
      <p className="text-slate-400 text-sm">{text}</p>
    </div>
  );
}
