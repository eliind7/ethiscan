import asyncio
import os

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.models import SupplierInput, SupplierResult, EvidenceItem, SubScores
from backend.scrapers.opensanctions import search_sanctions, search_peps, SanctionsMatch
from backend.scrapers.news import fetch_news, is_sanctions_relevant
from backend.scrapers.llm import extract_signal
from backend.scoring.scorer import compute_score

app = FastAPI(title="ethiscan", description="Supplier sanctions risk profiler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _sanctions_match_to_evidence(match: SanctionsMatch) -> EvidenceItem:
    return EvidenceItem(
        list_name=", ".join(match.datasets[:3]) if match.datasets else match.source_type,
        entry_id=match.entity_id,
        source_type=match.source_type,
        url=match.url,
        snippet=match.snippet,
        match_confidence=match.match_confidence,
        severity=match.severity,
    )


async def _scan_supplier(supplier: SupplierInput) -> SupplierResult:
    # Fetch all sources in parallel
    sanctions_matches, pep_matches, articles = await asyncio.gather(
        search_sanctions(supplier.supplier_name, supplier.country),
        search_peps(supplier.supplier_name),
        fetch_news(supplier.supplier_name),
    )

    # Run LLM extraction on relevant articles in parallel
    relevant_articles = [a for a in articles if is_sanctions_relevant(a["title"] + " " + a["summary"])]
    media_signals = await asyncio.gather(
        *[extract_signal(supplier.supplier_name, article) for article in relevant_articles]
    )
    media_signals = [s for s in media_signals if s is not None]

    # Compute score
    score_result = compute_score(sanctions_matches, pep_matches, media_signals)

    # Build evidence pack
    evidence_pack = (
        [_sanctions_match_to_evidence(m) for m in sanctions_matches]
        + [_sanctions_match_to_evidence(m) for m in pep_matches]
        + [EvidenceItem(**s) for s in media_signals]
    )

    return SupplierResult(
        supplier_name=supplier.supplier_name,
        country=supplier.country,
        sector_category=supplier.sector_category,
        internal_id=supplier.internal_id,
        sanctions_risk_score=score_result["sanctions_risk_score"],
        risk_level=score_result["risk_level"],
        flags=score_result["flags"],
        sub_scores=SubScores(**score_result["sub_scores"]),
        evidence_pack=evidence_pack,
    )


@app.post("/api/scan", response_model=list[SupplierResult])
async def scan(suppliers: list[SupplierInput]) -> list[SupplierResult]:
    """Scan a list of suppliers against sanctions lists, PEP data, and adverse media."""
    results = await asyncio.gather(*[_scan_supplier(s) for s in suppliers])
    return list(results)


@app.get("/health")
async def health():
    return {"status": "ok"}
