import os
from dataclasses import dataclass

import httpx

OPENSANCTIONS_BASE = "https://api.opensanctions.org"

# Minimum match confidence to include a result
SANCTIONS_MIN_SCORE = 0.5
PEPS_MIN_SCORE = 0.6


@dataclass
class SanctionsMatch:
    entity_id: str
    entity_name: str
    source_type: str  # "sanctions_list" or "pep"
    datasets: list[str]
    topics: list[str]
    match_confidence: float
    url: str
    snippet: str
    severity: int  # 1-5


def _build_headers() -> dict:
    api_key = os.getenv("OPENSANCTIONS_API_KEY")
    if api_key:
        return {"Authorization": f"ApiKey {api_key}"}
    return {}


def _severity_from_topics(topics: list[str]) -> int:
    if "sanction" in topics:
        return 5
    if "sanction.linked" in topics:
        return 4
    if "debarment" in topics:
        return 3
    if "watchlist" in topics:
        return 2
    return 1


async def search_sanctions(name: str, country: str | None = None) -> list[SanctionsMatch]:
    """Search all sanctions lists via OpenSanctions default dataset (EU, UN, OFAC, UK + 100 others)."""
    params: dict = {"q": name, "schema": "Organization", "limit": 10}
    if country:
        params["filter:country"] = country.lower()

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{OPENSANCTIONS_BASE}/search/default",
            params=params,
            headers=_build_headers(),
        )
        resp.raise_for_status()
        data = resp.json()

    matches = []
    for result in data.get("results", []):
        score = result.get("score", 0)
        if score < SANCTIONS_MIN_SCORE:
            continue

        topics = result.get("properties", {}).get("topics", [])
        # Only include results with sanctions-relevant topics
        if not any(t in topics for t in ["sanction", "sanction.linked", "debarment", "watchlist"]):
            continue

        datasets = result.get("datasets", [])
        matches.append(SanctionsMatch(
            entity_id=result["id"],
            entity_name=result.get("caption", name),
            source_type="sanctions_list",
            datasets=datasets,
            topics=topics,
            match_confidence=score,
            url=f"https://www.opensanctions.org/entities/{result['id']}/",
            snippet=f"Listed on: {', '.join(datasets[:3])}",
            severity=_severity_from_topics(topics),
        ))

    return matches


async def search_peps(name: str) -> list[SanctionsMatch]:
    """Search PEP (Politically Exposed Persons) dataset for individuals linked to this company."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{OPENSANCTIONS_BASE}/search/peps",
            params={"q": name, "limit": 10},
            headers=_build_headers(),
        )
        resp.raise_for_status()
        data = resp.json()

    matches = []
    for result in data.get("results", []):
        score = result.get("score", 0)
        if score < PEPS_MIN_SCORE:
            continue

        topics = result.get("properties", {}).get("topics", [])
        datasets = result.get("datasets", [])
        caption = result.get("caption", name)

        matches.append(SanctionsMatch(
            entity_id=result["id"],
            entity_name=caption,
            source_type="pep",
            datasets=datasets,
            topics=topics,
            match_confidence=score,
            url=f"https://www.opensanctions.org/entities/{result['id']}/",
            snippet=f"PEP match: {caption}",
            severity=3,
        ))

    return matches
