from typing import Optional
from pydantic import BaseModel


class SupplierInput(BaseModel):
    supplier_name: str
    country: str
    sector_category: str
    website_domain: Optional[str] = None
    tier: Optional[str] = None
    internal_id: Optional[str] = None


class EvidenceItem(BaseModel):
    list_name: str
    entry_id: Optional[str] = None
    source_type: str  # "sanctions_list" | "pep" | "adverse_media"
    date: Optional[str] = None
    url: str
    snippet: str
    match_confidence: Optional[float] = None
    severity: int
    keyword_match: Optional[str] = None


class SubScores(BaseModel):
    direct_sanctions: int
    pep_exposure: int
    adverse_media: int


class SupplierResult(BaseModel):
    supplier_name: str
    country: str
    sector_category: str
    internal_id: Optional[str] = None
    sanctions_risk_score: int
    risk_level: str
    flags: list[str]
    sub_scores: SubScores
    evidence_pack: list[EvidenceItem]
