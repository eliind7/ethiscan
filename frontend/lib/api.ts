import type {
  BatchEntry,
  ScanBatch,
  ScanHistoryEntry,
  SupplierInput,
  SupplierResult,
} from "@/lib/types";

const API_BASE = "http://localhost:8000";
const HISTORY_KEY = "ethiscan_history";
const BATCH_KEY = "ethiscan_batches";

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

// --- Local history (localStorage) ---

function loadHistory(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: ScanHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export function addToHistory(result: SupplierResult): ScanHistoryEntry {
  const history = loadHistory();
  const id = history.length > 0 ? Math.max(...history.map((e) => e.id)) + 1 : 1;
  const entry: ScanHistoryEntry = {
    id,
    result,
    scanned_at: new Date().toISOString(),
  };
  saveHistory([entry, ...history]);
  return entry;
}

export function getHistoryEntry(id: number): ScanHistoryEntry | null {
  return loadHistory().find((e) => e.id === id) ?? null;
}

export function listHistory(limit = 20): ScanHistoryEntry[] {
  return loadHistory().slice(0, limit);
}

// --- Batch tracking (localStorage) ---

function loadBatches(): ScanBatch[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(BATCH_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveBatches(batches: ScanBatch[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BATCH_KEY, JSON.stringify(batches));
}

export function saveBatch(fileName: string, entries: BatchEntry[]): ScanBatch {
  const batches = loadBatches();
  const id = batches.length > 0 ? Math.max(...batches.map((b) => b.id)) + 1 : 1;
  const batch: ScanBatch = {
    id,
    file_name: fileName,
    created_at: new Date().toISOString(),
    entries,
  };
  saveBatches([batch, ...batches]);
  return batch;
}

export function listBatches(limit = 30): ScanBatch[] {
  return loadBatches().slice(0, limit);
}
