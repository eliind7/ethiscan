export interface CreateScanInput {
  company_name: string;
  country?: string;
  sector?: string;
}

export type BatchEntryStatus = "done" | "error";

export interface Subscore {
  category: string;
  score: number;
  weight: number;
}

export interface Signal {
  id: number;
  signal_type: string;
  title: string;
  quote: string;
  source_name: string;
  source_url: string;
  severity: number;
  sentiment: "negative" | "positive" | "neutral";
  occurred_at: string;
}

export interface SourceRecord {
  id: number;
  source_name: string;
  source_url: string;
  source_type: string;
  reliability: number;
  status: string;
  fetched_at: string;
}

export interface ScanSummary {
  id: number;
  company_name: string;
  country: string | null;
  sector: string | null;
  score: number;
  grade: string;
  confidence: number;
  status: string;
  created_at: string;
}

export interface ScanReport extends ScanSummary {
  subscores: Subscore[];
  signals: Signal[];
  sources: SourceRecord[];
}

export interface ReportLibraryItem extends ScanSummary {
  source_count: number;
  signal_count: number;
}

export interface ScanBatchEntry {
  company_name: string;
  organization_number: string | null;
  status: BatchEntryStatus;
  scan_id: number | null;
  score: number | null;
  grade: string | null;
  confidence: number | null;
  error: string | null;
}

export interface ScanBatch {
  id: number;
  file_name: string;
  created_at: string;
  item_count: number;
  success_count: number;
  entries: ScanBatchEntry[];
}

export interface CreateScanBatchInput {
  file_name: string;
  entries: ScanBatchEntry[];
}
