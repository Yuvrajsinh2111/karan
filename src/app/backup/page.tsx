"use client";
import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { Btn } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { Bill } from "@/lib/types";
import { fmtMoney } from "@/lib/utils";

// Fetch a whole table in 1000-row chunks — works at any volume (lakhs of rows)
async function fetchTable<T>(table: string, orderCol: string, onProgress?: (n: number) => void): Promise<T[]> {
  const CHUNK = 1000;
  const out: T[] = [];
  for (let i = 0; ; i += CHUNK) {
    const { data, error } = await supabase()
      .from(table).select("*")
      .order(orderCol, { ascending: true }).order("id", { ascending: true })
      .range(i, i + CHUNK - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data as T[]) || []));
    onProgress?.(out.length);
    if (!data || data.length < CHUNK) break;
  }
  return out;
}

async function fetchAll(onProgress?: (label: string) => void) {
  const [settings, parties, products] = await Promise.all([
    supabase().from("settings").select("*"),
    supabase().from("parties").select("*"),
    supabase().from("products").select("*"),
  ]);
  const bills = await fetchTable<Bill>("bills", "bill_date", (n) => onProgress?.(`bills: ${n}…`));
  const bill_items = await fetchTable<object>("bill_items", "bill_id", (n) => onProgress?.(`items: ${n}…`));
  return {
    exported_at: new Date().toISOString(),
    settings: settings.data || [],
    parties: parties.data || [],
    products: products.data || [],
    bills,
    bill_items,
  };
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BackupPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase().from("settings").select("last_backup_at").eq("id", 1).single()
      .then(({ data }) => setLastBackup(data?.last_backup_at || null));
  }, []);

  async function markBackedUp() {
    const now = new Date().toISOString();
    await supabase().from("settings").update({ last_backup_at: now }).eq("id", 1);
    setLastBackup(now);
  }

  async function exportJSON() {
    setBusy("json"); setMsg("");
    const data = await fetchAll((l) => setMsg("Fetching " + l));
    download(`laxmichem-backup-${data.exported_at.slice(0, 10)}.json`,
      new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
    await markBackedUp();
    setBusy(""); setMsg("Full backup downloaded. Keep it in Google Drive or a safe folder.");
  }

  async function exportExcel() {
    setBusy("xlsx"); setMsg("");
    const XLSX = await import("xlsx");
    const data = await fetchAll((l) => setMsg("Fetching " + l));
    const wb = XLSX.utils.book_new();
    const billRows = (data.bills as Bill[]).map((b) => ({
      "Bill No": b.bill_no,
      Type: b.type,
      Date: b.bill_date,
      FY: b.fy,
      Party: (b.type === "purchase_order" ? b.supplier?.name : b.bill_to?.name) || "",
      GSTIN: (b.type === "purchase_order" ? b.supplier?.gstin : b.bill_to?.gstin) || "",
      "Taxable Value": b.subtotal,
      CGST: b.cgst, SGST: b.sgst, IGST: b.igst,
      "Round Off": b.round_off,
      Total: b.total,
      Commission: b.commission_total,
      Paid: b.paid ? "Yes" : "No",
      Notes: b.notes,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(billRows), "Bills");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.bill_items as object[]), "Bill Items");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.parties as object[]), "Parties");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.products as object[]), "Products");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    download(`laxmichem-bills-${new Date().toISOString().slice(0, 10)}.xlsx`,
      new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    await markBackedUp();
    setBusy(""); setMsg("Excel exported — share it with your accountant or keep as backup.");
  }

  async function restore(file: File) {
    if (!confirm("Restore will ADD the backup's parties, products and bills into the current database. Existing rows with the same IDs are updated. Continue?")) return;
    setBusy("restore"); setMsg("");
    try {
      const data = JSON.parse(await file.text());
      if (!data.bills || !data.parties) throw new Error("Not a valid Laxmichem backup file.");
      // Chunked upserts so large backups (lakhs of rows) restore reliably
      const putChunked = async (table: string, rows: object[]) => {
        const CHUNK = 500;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const { error } = await supabase().from(table).upsert(rows.slice(i, i + CHUNK));
          if (error) throw error;
          setMsg(`Restoring ${table}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}…`);
        }
      };
      if (data.settings?.length) await putChunked("settings", data.settings);
      if (data.parties?.length) await putChunked("parties", data.parties);
      if (data.products?.length) await putChunked("products", data.products);
      if (data.bills?.length) await putChunked("bills", data.bills);
      if (data.bill_items?.length) await putChunked("bill_items", data.bill_items);
      setMsg(`Restored: ${data.bills?.length || 0} bills, ${data.parties?.length || 0} parties, ${data.products?.length || 0} products.`);
    } catch (e) {
      setMsg("Restore failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setBusy("");
  }

  return (
    <AppShell title="Backup & Export">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="card p-4 text-sm">
          Last backup:{" "}
          <b>{lastBackup ? new Date(lastBackup).toLocaleString("en-IN") : "never"}</b>
          <p className="text-xs text-gray-500 mt-1">
            Take a backup at least once a month and keep the file in Google Drive.
            This protects your records even if the Supabase free project is ever removed.
          </p>
        </div>

        <div className="card p-4 space-y-3">
          <div>
            <h2 className="font-bold text-sm">Excel export (.xlsx)</h2>
            <p className="text-xs text-gray-500">All bills, items, parties and products in readable sheets — for your accountant or GST filing.</p>
          </div>
          <Btn onClick={exportExcel} disabled={!!busy}>{busy === "xlsx" ? "Exporting…" : "Download Excel"}</Btn>
        </div>

        <div className="card p-4 space-y-3">
          <div>
            <h2 className="font-bold text-sm">Full backup (.json)</h2>
            <p className="text-xs text-gray-500">Complete snapshot of everything. Use this file with Restore to reload your data.</p>
          </div>
          <Btn onClick={exportJSON} disabled={!!busy}>{busy === "json" ? "Backing up…" : "Download full backup"}</Btn>
        </div>

        <div className="card p-4 space-y-3">
          <div>
            <h2 className="font-bold text-sm">Restore from backup</h2>
            <p className="text-xs text-gray-500">Pick a previously downloaded .json backup file to load it back in.</p>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          <Btn kind="secondary" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === "restore" ? "Restoring…" : "Choose backup file"}
          </Btn>
        </div>

        {msg && <p className="text-sm font-semibold text-green-700">{msg}</p>}
        <p className="text-[11px] text-gray-400">₹ amounts in Excel are raw numbers (e.g. {fmtMoney(53619)}) so formulas work.</p>
      </div>
    </AppShell>
  );
}
