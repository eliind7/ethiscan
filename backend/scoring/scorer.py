try:
    # Supports `uvicorn backend.main:app` from repo root.
    from backend.scrapers.opensanctions import SanctionsMatch
except ModuleNotFoundError:
    # Supports `uvicorn main:app` when cwd is `backend/`.
    from scrapers.opensanctions import SanctionsMatch

# Aggregate weights
WEIGHT_DIRECT = 0.50
WEIGHT_PEP = 0.30
WEIGHT_MEDIA = 0.20


def _score_direct_sanctions(matches: list[SanctionsMatch]) -> int:
    """100 = clean, drops based on best match confidence."""
    if not matches:
        return 100
    best = max(m.match_confidence for m in matches)
    return max(0, round(100 - best * 100))


def _score_pep(matches: list[SanctionsMatch]) -> int:
    """100 = clean, drops less steeply than direct sanctions."""
    if not matches:
        return 100
    best = max(m.match_confidence for m in matches)
    return max(0, round(100 - best * 80))


def _score_adverse_media(signals: list[dict]) -> int:
    """100 = no relevant media, deduct severity * 5 per hit."""
    if not signals:
        return 100
    deduction = sum(s.get("severity", 1) * 5 for s in signals)
    return max(0, 100 - deduction)


def _risk_level(score: int) -> str:
    if score <= 20:
        return "Prohibited"
    if score <= 45:
        return "High"
    if score <= 65:
        return "Medium"
    return "Low"


def _build_flags(
    sanctions_matches: list[SanctionsMatch],
    pep_matches: list[SanctionsMatch],
    media_signals: list[dict],
) -> list[str]:
    flags = []

    if sanctions_matches:
        best = max(sanctions_matches, key=lambda m: m.match_confidence)
        datasets = ", ".join(best.datasets[:2])
        flags.append(f"Direct hit on sanctions list ({datasets})")

    if pep_matches:
        flags.append("Match in PEP / politically exposed persons dataset")

    if media_signals and not sanctions_matches and not pep_matches:
        flags.append("Sanctions-adjacent adverse media only")
    elif media_signals:
        flags.append("Corroborating adverse media found")

    if not flags:
        flags.append("No sanctions signals detected")

    return flags


def compute_score(
    sanctions_matches: list[SanctionsMatch],
    pep_matches: list[SanctionsMatch],
    media_signals: list[dict],
) -> dict:
    """
    Compute the full risk profile for a supplier.

    Returns:
        sanctions_risk_score: int (0-100, higher = cleaner)
        risk_level: str (Low / Medium / High / Prohibited)
        flags: list[str]
        sub_scores: dict
    """
    direct = _score_direct_sanctions(sanctions_matches)
    pep = _score_pep(pep_matches)
    media = _score_adverse_media(media_signals)

    aggregate = round(
        direct * WEIGHT_DIRECT +
        pep * WEIGHT_PEP +
        media * WEIGHT_MEDIA
    )
    aggregate = max(0, min(100, aggregate))

    return {
        "sanctions_risk_score": aggregate,
        "risk_level": _risk_level(aggregate),
        "flags": _build_flags(sanctions_matches, pep_matches, media_signals),
        "sub_scores": {
            "direct_sanctions": direct,
            "pep_exposure": pep,
            "adverse_media": media,
        },
    }
