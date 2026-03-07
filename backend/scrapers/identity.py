import json
import os
import re
from typing import Optional

import httpx

# ABPI.se free API for Swedish company registry data
ABPI_URL = "https://abpi.se/api/{org_number}/data"

# Cached results file (PoC fallback when API is rate-limited)
CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "action_a_results.json")

# Swedish role translations for evidence display
ROLE_TRANSLATIONS = {
    "Verkställande direktör": "CEO",
    "Extern verkställande direktör": "CEO (external)",
    "Ordförande": "Chairman",
    "Ledamot": "Board member",
    "Suppleant": "Deputy",
    "Vice verkställande direktör": "Deputy CEO",
    "Extern vice verkställande direktör": "Deputy CEO (external)",
}


def _parse_person(entry: str) -> Optional[dict]:
    """Parse 'Full Name (Role)' into {name, role, role_en}. Filters out redacted entries."""
    if "Personuppgift Skyddad" in entry:
        return None
    match = re.match(r"^(.+?)\s*\(([^)]+)\)$", entry)
    if not match:
        return None
    name = match.group(1).strip()
    role_sv = match.group(2).strip()
    role_en = ROLE_TRANSLATIONS.get(role_sv, role_sv)
    return {"name": name, "role_sv": role_sv, "role_en": role_en}


def _format_org_number(org_number: str) -> str:
    """Ensure org number has the hyphen format (e.g. 556012-5790)."""
    org_number = org_number.strip().replace("-", "")
    if len(org_number) == 10:
        return f"{org_number[:6]}-{org_number[6:]}"
    return org_number


def _load_cache() -> dict:
    """Load cached Action A results, keyed by org_number (stripped of hyphens)."""
    if not os.path.exists(CACHE_FILE):
        return {}
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            entries = json.load(f)
        cache = {}
        for entry in entries:
            org = entry.get("input_org_number", "").replace("-", "")
            identity = entry.get("action_a_result", {}).get("identity")
            if org and identity:
                cache[org] = identity
        return cache
    except Exception:
        return {}


_CACHE = _load_cache()


def _parse_cached_identity(identity: dict) -> Optional[dict]:
    """Convert cached Action A identity to the same format as a live lookup."""
    canonical_name = identity.get("canonical_name")
    if not canonical_name:
        return None

    raw_people = identity.get("key_people", [])
    seen_names = set()
    key_people = []
    for entry in raw_people:
        parsed = _parse_person(entry)
        if parsed and parsed["name"] not in seen_names:
            seen_names.add(parsed["name"])
            key_people.append(parsed)

    return {
        "canonical_name": canonical_name,
        "org_number": identity.get("org_number", ""),
        "location": identity.get("location", ""),
        "key_people": key_people,
    }


async def resolve_identity(org_number: str) -> Optional[dict]:
    """
    Look up a Swedish company by org number.
    Tries cached results first, falls back to ABPI.se API.
    """
    # Try cache first (PoC: avoids rate-limit issues)
    stripped = org_number.strip().replace("-", "")
    if stripped in _CACHE:
        return _parse_cached_identity(_CACHE[stripped])

    # Fall back to live API
    formatted = _format_org_number(org_number)
    url = ABPI_URL.format(org_number=formatted)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"Accept": "application/json"})
            if resp.status_code != 200:
                return None
            data = resp.json()
    except Exception:
        return None

    basic_info = data.get("basic_info", {})
    canonical_name = basic_info.get("legal_name") or basic_info.get("name")
    if not canonical_name:
        return None

    location = data.get("location", {}).get("municipality", "")

    raw_people = []
    roles_data = data.get("roles", {})
    if roles_data and isinstance(roles_data, dict):
        for group in roles_data.get("role_groups", []):
            group_name = group.get("name", "")
            if group_name in ("Management", "Board"):
                for r in group.get("roles", []):
                    person_name = r.get("name")
                    person_role = r.get("role")
                    if person_name and person_role:
                        raw_people.append(f"{person_name} ({person_role})")

    contact = data.get("contact_person")
    if contact and contact.get("name"):
        raw_people.append(f"{contact['name']} ({contact.get('role', 'Contact')})")

    seen_names = set()
    key_people = []
    for entry in raw_people:
        parsed = _parse_person(entry)
        if parsed and parsed["name"] not in seen_names:
            seen_names.add(parsed["name"])
            key_people.append(parsed)

    return {
        "canonical_name": canonical_name,
        "org_number": formatted,
        "location": location,
        "key_people": key_people,
    }
