import { supabase } from "@/lib/supabase";
import type {
  BatchEntry,
  ScanBatch,
  ScanHistoryEntry,
  SupplierInput,
  SupplierResult,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// --- Real backend calls ---

export async function scanSuppliers(suppliers: SupplierInput[]): Promise<SupplierResult[]> {
  const resp = await fetch(`${API_BASE}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(suppliers),
  });
  if (!resp.ok) {
    throw new Error(`Scan failed: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

export async function scanSingle(input: SupplierInput): Promise<SupplierResult> {
  const results = await scanSuppliers([input]);
  return results[0];
}

// --- Scan history (Supabase) ---

export async function addToHistory(result: SupplierResult): Promise<ScanHistoryEntry> {
  const { data, error } = await supabase
    .from("scan_history")
    .insert({ supplier_name: result.supplier_name, result })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, result: data.result, scanned_at: data.scanned_at };
}

export async function getHistoryEntry(id: number): Promise<ScanHistoryEntry | null> {
  const { data, error } = await supabase
    .from("scan_history")
    .select()
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return { id: data.id, result: data.result, scanned_at: data.scanned_at };
}

export async function listHistory(limit = 20): Promise<ScanHistoryEntry[]> {
  const { data, error } = await supabase
    .from("scan_history")
    .select()
    .order("scanned_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, result: row.result, scanned_at: row.scanned_at }));
}

// --- Batch tracking (Supabase) ---

export async function saveBatch(fileName: string, entries: BatchEntry[]): Promise<ScanBatch> {
  const { data, error } = await supabase
    .from("scan_batches")
    .insert({ file_name: fileName, entries })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, file_name: data.file_name, created_at: data.created_at, entries: data.entries };
}

export async function listBatches(limit = 30): Promise<ScanBatch[]> {
  const { data, error } = await supabase
    .from("scan_batches")
    .select()
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, file_name: row.file_name, created_at: row.created_at, entries: row.entries }));
}
