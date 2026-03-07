import type {
  CreateScanBatchInput,
  CreateScanInput,
  ReportLibraryItem,
  ScanBatch,
  ScanReport,
  ScanSummary
} from "@/lib/types";

const STORAGE_KEY = "ethiscan_scans";
const BATCH_STORAGE_KEY = "ethiscan_scan_batches";

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

function normalizeSector(sector?: string): string {
  return (sector ?? "cosmetics").toLowerCase();
}

function grade(score: number): string {
  if (score <= 20) return "A";
  if (score <= 40) return "B";
  if (score <= 60) return "C";
  if (score <= 80) return "D";
  return "F";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function loadScans(): ScanReport[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ScanReport[];
  } catch {
    return [];
  }
}

function saveScans(scans: ScanReport[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
}

function loadScanBatches(): ScanBatch[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(BATCH_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ScanBatch[];
  } catch {
    return [];
  }
}

function saveScanBatches(batches: ScanBatch[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batches));
}

function createMockScan(payload: CreateScanInput, id: number): ScanReport {
  const seed = hash(`${payload.company_name}|${payload.country ?? ""}|${payload.sector ?? ""}`);
  const sector = normalizeSector(payload.sector);
  const baselineMap: Record<string, number> = {
    "pharma/biotech": 70,
    cosmetics: 55,
    "food/agriculture": 45,
    chemical: 60,
    "tech/retail": 10
  };
  const baseline = baselineMap[sector] ?? 55;
  const jitter = (offset: number) => ((seed >> offset) % 21) - 10;

  const testing = clamp(baseline + jitter(1) + ((seed & 1) === 1 ? 18 : -8));
  const violations = clamp(35 + jitter(3) + ((seed & 4) === 4 ? 22 : 0));
  const news = clamp(baseline + jitter(5));
  const sectorBaseline = clamp(baseline);

  const subscores = [
    { category: "Testing Practices", score: testing, weight: 0.4 },
    { category: "Violations & Fines", score: violations, weight: 0.3 },
    { category: "News Sentiment", score: news, weight: 0.2 },
    { category: "Sector Baseline", score: sectorBaseline, weight: 0.1 }
  ];

  const score = clamp(subscores.reduce((sum, item) => sum + item.score * item.weight, 0));
  const confidence = clamp(58 + ((seed >> 7) % 32));
  const createdAt = new Date().toISOString();

  const signals = [
    {
      id: id * 10 + 1,
      signal_type: "animal_testing_claim",
      title: `${payload.company_name} linked to testing-policy discussion`,
      quote: "Coverage references animal-testing related policy exposure in regulated markets.",
      source_name: "Reuters",
      source_url: "https://www.reuters.com",
      severity: 4,
      sentiment: "negative" as const,
      occurred_at: createdAt
    },
    {
      id: id * 10 + 2,
      signal_type: "welfare_commitment",
      title: `${payload.company_name} publishes animal welfare roadmap`,
      quote: "The company published updated commitments intended to reduce testing reliance.",
      source_name: "Bloomberg",
      source_url: "https://www.bloomberg.com",
      severity: 2,
      sentiment: "positive" as const,
      occurred_at: createdAt
    }
  ];

  const sources = [
    {
      id: id * 10 + 1,
      source_name: "OpenCorporates",
      source_url: "https://opencorporates.com",
      source_type: "registry",
      reliability: 95,
      status: "found",
      fetched_at: createdAt
    },
    {
      id: id * 10 + 2,
      source_name: "Leaping Bunny",
      source_url: "https://www.leapingbunny.org",
      source_type: "certification",
      reliability: 90,
      status: (seed & 1) === 1 ? "listed" : "not_listed",
      fetched_at: createdAt
    },
    {
      id: id * 10 + 3,
      source_name: "ECHA",
      source_url: "https://echa.europa.eu",
      source_type: "regulatory",
      reliability: 92,
      status: (seed & 2) === 2 ? "submission_found" : "no_submission",
      fetched_at: createdAt
    }
  ];

  return {
    id,
    company_name: payload.company_name,
    country: payload.country ?? null,
    sector,
    score,
    grade: grade(score),
    confidence,
    status: "completed",
    created_at: createdAt,
    subscores,
    signals,
    sources
  };
}

export async function createScan(payload: CreateScanInput): Promise<ScanReport> {
  const scans = loadScans();
  const id = scans.length > 0 ? Math.max(...scans.map((item) => item.id)) + 1 : 1;
  const scan = createMockScan(payload, id);
  saveScans([scan, ...scans]);
  return scan;
}

export async function getScan(scanId: number): Promise<ScanReport> {
  const scan = loadScans().find((item) => item.id === scanId);
  if (!scan) {
    throw new Error("Scan not found.");
  }
  return scan;
}

export async function listScans(limit = 12): Promise<ScanSummary[]> {
  return loadScans()
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      company_name: item.company_name,
      country: item.country,
      sector: item.sector,
      score: item.score,
      grade: item.grade,
      confidence: item.confidence,
      status: item.status,
      created_at: item.created_at
    }));
}

export async function listReportLibrary(limit = 200): Promise<ReportLibraryItem[]> {
  return loadScans()
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      company_name: item.company_name,
      country: item.country,
      sector: item.sector,
      score: item.score,
      grade: item.grade,
      confidence: item.confidence,
      status: item.status,
      created_at: item.created_at,
      source_count: item.sources.length,
      signal_count: item.signals.length
    }));
}

export async function createScanBatch(payload: CreateScanBatchInput): Promise<ScanBatch> {
  const batches = loadScanBatches();
  const nextId = batches.length > 0 ? Math.max(...batches.map((batch) => batch.id)) + 1 : 1;
  const successCount = payload.entries.filter((entry) => entry.status === "done").length;
  const batch: ScanBatch = {
    id: nextId,
    file_name: payload.file_name,
    created_at: new Date().toISOString(),
    item_count: payload.entries.length,
    success_count: successCount,
    entries: payload.entries
  };
  saveScanBatches([batch, ...batches]);
  return batch;
}

export async function listScanBatches(limit = 30): Promise<ScanBatch[]> {
  return loadScanBatches().slice(0, limit);
}
