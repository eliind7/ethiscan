// Matches backend/models.py SupplierInput
export interface SupplierInput {
  supplier_name: string;
  country: string;
  sector_category: string;
  website_domain?: string;
  tier?: string;
  internal_id?: string;
  org_number?: string;
}

// Matches backend/models.py EvidenceItem
export interface EvidenceItem {
  list_name: string;
  entry_id: string | null;
  source_type: string; // "sanctions_list" | "pep" | "adverse_media"
  date: string | null;
  url: string;
  snippet: string;
  match_confidence: number | null;
  severity: number;
  keyword_match?: string | null;
}

// Matches backend/models.py SubScores
export interface SubScores {
  direct_sanctions: number;
  pep_exposure: number;
  adverse_media: number;
}

// Matches backend/models.py PersonScreened
export interface PersonScreened {
  name: string;
  role: string;
  pep_hit: boolean;
  match_confidence: number | null;
}

// Matches backend/models.py SupplierResult
export interface SupplierResult {
  supplier_name: string;
  canonical_name: string | null;
  country: string;
  sector_category: string;
  internal_id: string | null;
  sanctions_risk_score: number;
  risk_level: string; // "Low" | "Medium" | "High" | "Prohibited"
  flags: string[];
  sub_scores: SubScores;
  evidence_pack: EvidenceItem[];
  key_people_screened: PersonScreened[];
}

// Frontend-only: for scan history in localStorage
export interface ScanHistoryEntry {
  id: number;
  result: SupplierResult;
  scanned_at: string;
}

// Frontend-only: batch upload tracking
export interface BatchEntry {
  supplier_name: string;
  org_number: string;
  status: "queued" | "scanning" | "done" | "error";
  result?: SupplierResult;
  error?: string;
}

export interface ScanBatch {
  id: number;
  file_name: string;
  created_at: string;
  entries: BatchEntry[];
}
