"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Btn, Empty, Field, inputCls, Modal } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { Party } from "@/lib/types";

const blank = { name: "", address: "", gstin: "", state_name: "Gujarat", state_code: "24", contact: "" };

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Party> | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase().from("parties").select("*").eq("active", true).order("name");
    setParties((data as Party[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const row = { ...blank, ...editing };
    if (editing.id) {
      await supabase().from("parties").update(row).eq("id", editing.id);
    } else {
      await supabase().from("parties").insert(row);
    }
    setBusy(false);
    setEditing(null);
    load();
  }

  async function remove(p: Party) {
    if (!confirm(`Remove ${p.name}? Existing bills keep their copy of the details.`)) return;
    await supabase().from("parties").update({ active: false }).eq("id", p.id);
    load();
  }

  const filtered = parties.filter((p) =>
    (p.name + p.gstin + p.address).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell title="Parties">
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Search name / GSTIN…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Btn onClick={() => setEditing({ ...blank })}>+ Add</Btn>
        </div>

        {loading ? <Empty text="Loading…" /> : filtered.length === 0 ? (
          <Empty text="No parties yet. Add your customers, suppliers and companies here." />
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="card p-4 flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-500 whitespace-pre-line">{p.address}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {p.gstin && <>GSTIN: <span className="font-mono">{p.gstin}</span> · </>}
                    {p.state_name} ({p.state_code}){p.contact && <> · {p.contact}</>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => setEditing(p)} className="text-indigo-600 text-sm hover:underline">Edit</button>
                  <button onClick={() => remove(p)} className="text-rose-600 text-sm hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit Party" : "Add Party"}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Name *">
            <input className={inputCls} required value={editing?.name || ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </Field>
          <Field label="Address">
            <textarea className={inputCls} rows={3} value={editing?.address || ""}
              onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GSTIN">
              <input className={inputCls} value={editing?.gstin || ""}
                onChange={(e) => setEditing({ ...editing, gstin: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Contact / Mobile">
              <input className={inputCls} value={editing?.contact || ""}
                onChange={(e) => setEditing({ ...editing, contact: e.target.value })} />
            </Field>
            <Field label="State">
              <input className={inputCls} value={editing?.state_name || ""}
                onChange={(e) => setEditing({ ...editing, state_name: e.target.value })} />
            </Field>
            <Field label="State Code">
              <input className={inputCls} value={editing?.state_code || ""}
                onChange={(e) => setEditing({ ...editing, state_code: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-slate-400">
            State code decides tax: same as yours → CGST+SGST, different → IGST.
          </p>
          <div className="flex gap-2 justify-end">
            <Btn kind="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Btn>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
