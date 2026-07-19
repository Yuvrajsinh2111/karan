"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Btn, Empty, Field, inputCls, Modal } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";

const blank = { name: "", hsn: "", unit: "KGS", default_rate: 0 };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase().from("products").select("*").eq("active", true).order("name");
    setProducts((data as Product[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const row = { ...blank, ...editing, default_rate: Number(editing.default_rate) || 0 };
    if (editing.id) await supabase().from("products").update(row).eq("id", editing.id);
    else await supabase().from("products").insert(row);
    setBusy(false);
    setEditing(null);
    load();
  }

  async function remove(p: Product) {
    if (!confirm(`Remove ${p.name}?`)) return;
    await supabase().from("products").update({ active: false }).eq("id", p.id);
    load();
  }

  const filtered = products.filter((p) => (p.name + p.hsn).toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell title="Products">
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Search chemical / HSN…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Btn onClick={() => setEditing({ ...blank })}>+ Add</Btn>
        </div>

        {loading ? <Empty text="Loading…" /> : filtered.length === 0 ? (
          <Empty text="No products yet. Add the chemicals you trade." />
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="card p-4 flex justify-between gap-3 items-center">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.hsn && <>HSN: {p.hsn} · </>}{p.unit}
                    {p.default_rate > 0 && <> · ₹{fmtMoney(p.default_rate)}/{p.unit}</>}
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setEditing(p)} className="text-indigo-600 text-sm hover:underline">Edit</button>
                  <button onClick={() => remove(p)} className="text-rose-600 text-sm hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit Product" : "Add Product"}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Chemical name *">
            <input className={inputCls} required value={editing?.name || ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="HSN/SAC">
              <input className={inputCls} value={editing?.hsn || ""}
                onChange={(e) => setEditing({ ...editing, hsn: e.target.value })} />
            </Field>
            <Field label="Unit">
              <input className={inputCls} value={editing?.unit || "KGS"}
                onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            </Field>
            <Field label="Default rate">
              <input className={inputCls} type="number" step="any" value={editing?.default_rate ?? ""}
                onChange={(e) => setEditing({ ...editing, default_rate: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="flex gap-2 justify-end">
            <Btn kind="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Btn>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
