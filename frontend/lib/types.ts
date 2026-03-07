export interface CreateScanInput {
  company_name: string;
  country?: string;
  sector?: string;
}

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
