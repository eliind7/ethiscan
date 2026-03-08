import asyncio
import os

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    # Supports `uvicorn backend.main:app` from repo root.
    from backend.models import SupplierInput, SupplierResult, EvidenceItem, SubScores, PersonScreened
    from backend.scrapers.opensanctions import search_sanctions, search_peps, SanctionsMatch
    from backend.scrapers.news import fetch_news, is_sanctions_relevant
    from backend.scrapers.llm import extract_signal
    from backend.scrapers.identity import resolve_identity
    from backend.scoring.scorer import compute_score
except ModuleNotFoundError:
    # Supports `uvicorn main:app` when cwd is `backend/`.
    from models import SupplierInput, SupplierResult, EvidenceItem, SubScores, PersonScreened
    from scrapers.opensanctions import search_sanctions, search_peps, SanctionsMatch
    from scrapers.news import fetch_news, is_sanctions_relevant
    from scrapers.llm import extract_signal
    from scrapers.identity import resolve_identity
    from scoring.scorer import compute_score

app = FastAPI(title="ethiscan", description="Supplier sanctions risk profiler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    # Allow local dev servers on alternate ports (e.g. 3001/5173).
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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


async def _screen_key_people(people: list[dict]) -> tuple[list[SanctionsMatch], list[PersonScreened]]:
    """Screen each key person against PEP lists in parallel."""
    if not people:
        return [], []

    pep_results = await asyncio.gather(
        *[search_peps(p["name"], role=p.get("role_en")) for p in people]
    )

    all_matches = []
    people_screened = []
    for person, matches in zip(people, pep_results):
        hit = len(matches) > 0
        best_conf = max((m.match_confidence for m in matches), default=None)
        people_screened.append(PersonScreened(
            name=person["name"],
            role=person.get("role_en", ""),
            pep_hit=hit,
            match_confidence=best_conf,
        ))
        all_matches.extend(matches)

    return all_matches, people_screened


async def _scan_supplier(supplier: SupplierInput) -> SupplierResult:
    # Step 1: Resolve identity via ABPI if org_number provided
    canonical_name = supplier.supplier_name
    key_people = []

    if supplier.org_number:
        identity = await resolve_identity(supplier.org_number)
        if identity:
            canonical_name = identity["canonical_name"]
            key_people = identity["key_people"]

    # Step 2: Fetch sanctions + news in parallel (PEP done per-person separately)
    sanctions_matches, articles = await asyncio.gather(
        search_sanctions(canonical_name, supplier.country),
        fetch_news(canonical_name),
    )

    # Step 3: Screen key people against PEP lists in parallel
    pep_matches, people_screened = await _screen_key_people(key_people)

    # Step 4: Run LLM extraction on relevant articles in parallel
    relevant_articles = [a for a in articles if is_sanctions_relevant(a["title"] + " " + a["summary"])]
    media_signals = await asyncio.gather(
        *[extract_signal(canonical_name, article) for article in relevant_articles]
    )
    media_signals = [s for s in media_signals if s is not None]

    # Step 5: Compute score
    score_result = compute_score(sanctions_matches, pep_matches, media_signals)

    # Step 6: Build evidence pack
    evidence_pack = (
        [_sanctions_match_to_evidence(m) for m in sanctions_matches]
        + [_sanctions_match_to_evidence(m) for m in pep_matches]
        + [EvidenceItem(**s) for s in media_signals]
    )

    return SupplierResult(
        supplier_name=supplier.supplier_name,
        canonical_name=canonical_name,
        country=supplier.country,
        sector_category=supplier.sector_category,
        internal_id=supplier.internal_id,
        sanctions_risk_score=score_result["sanctions_risk_score"],
        risk_level=score_result["risk_level"],
        flags=score_result["flags"],
        sub_scores=SubScores(**score_result["sub_scores"]),
        evidence_pack=evidence_pack,
        key_people_screened=people_screened,
    )


@app.post("/api/scan", response_model=list[SupplierResult])
async def scan(suppliers: list[SupplierInput]) -> list[SupplierResult]:
    """Scan a list of suppliers against sanctions lists, PEP data, and adverse media."""
    results = await asyncio.gather(*[_scan_supplier(s) for s in suppliers])
    return list(results)


@app.get("/health")
async def health():
    return {"status": "ok"}
