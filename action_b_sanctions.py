import json
import time
import requests

# ── OpenSanctions config ─────────────────────────────────────────────────────
OPENSANCTIONS_BASE = "https://api.opensanctions.org"
OPENSANCTIONS_DATASET = "default"   # covers EU, UN, OFAC, UK, and more

# Optional: paste your free API key here to avoid the 200 req/day rate limit
# Register at https://www.opensanctions.org/api/
OPENSANCTIONS_API_KEY = None        # e.g. "os-XXXXXXXXXXXXXXXX"

HEADERS = {}
if OPENSANCTIONS_API_KEY:
    HEADERS["Authorization"] = f"ApiKey {OPENSANCTIONS_API_KEY}"

# ── Thresholds ───────────────────────────────────────────────────────────────
MATCH_SCORE_THRESHOLD = 0.70        # OpenSanctions returns 0.0–1.0 confidence


def search_entity(name: str, schema: str = "Company") -> list[dict]:
    """
    Searches OpenSanctions for an entity by name.
    schema = "Company" for organisations, "Person" for individuals.
    Returns a list of matches above the confidence threshold.
    """
    url = f"{OPENSANCTIONS_BASE}/search/{OPENSANCTIONS_DATASET}"
    params = {"q": name, "schema": schema, "limit": 5}

    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        return [{"error": str(e)}]

    hits = []
    for result in data.get("results", []):
        score = result.get("score", 0)
        if score < MATCH_SCORE_THRESHOLD:
            continue

        datasets = result.get("datasets", [])
        props    = result.get("properties", {})

        hits.append({
            "matched_name":   props.get("name", [None])[0],
            "match_score":    round(score, 3),
            "schema":         result.get("schema"),
            "datasets":       datasets,            # e.g. ["eu_fsf", "us_ofac_sdn"]
            "country":        props.get("country", []),
            "notes":          props.get("notes", []),
            "opensanctions_id": result.get("id"),
            "source_url":     f"https://www.opensanctions.org/entities/{result.get('id')}/",
        })

    return hits


def screen_supplier(identity: dict) -> dict:
    """
    Takes a single Action A identity dict and runs:
      1. Company-level sanctions check
      2. Per-person sanctions/PEP check for every key person
    Returns a structured Action B result.
    """
    canonical_name = identity.get("canonical_name", "Unknown")
    key_people     = identity.get("key_people", [])

    print(f"  [B] Checking company:  {canonical_name}")
    company_hits = search_entity(canonical_name, schema="Company")
    time.sleep(0.4)   # stay well under rate limits

    people_hits = {}
    for person_entry in key_people:
        # person_entry format: "Martin Lundstedt (Verkställande direktör)"
        person_name = person_entry.split("(")[0].strip()
        print(f"  [B] Checking person:   {person_name}")
        hits = search_entity(person_name, schema="Person")
        if hits:
            people_hits[person_entry] = hits
        time.sleep(0.4)

    # Build a flat list of all flagged datasets for summary
    all_datasets = set()
    for h in company_hits:
        all_datasets.update(h.get("datasets", []))
    for hits in people_hits.values():
        for h in hits:
            all_datasets.update(h.get("datasets", []))

    return {
        "canonical_name":  canonical_name,
        "company_hits":    company_hits,
        "people_hits":     people_hits,
        "flagged_lists":   sorted(all_datasets),
        "is_flagged":      bool(company_hits or people_hits),
    }


def run_action_b(cache_path: str = "action_a_results.json") -> list[dict]:
    import os
    if not os.path.exists(cache_path):
        print(f"[!] Cache file '{cache_path}' not found.")
        print("[!] Please run action_a_identity.py first to generate the cache.")
        return []

    print(f"\n=== Ethiscan: Action B – loading Action A cache from {cache_path} ===\n")
    with open(cache_path, encoding="utf-8-sig") as f:
        action_a_results = json.load(f)

    print("=== Ethiscan: Action B – OpenSanctions screening ===\n")
    action_b_results = []

    for item in action_a_results:
        supplier_name = item.get("input_supplier", "Unknown")
        a_result      = item.get("action_a_result", {})

        if not a_result.get("found"):
            print(f"\n[!] Skipping {supplier_name} – identity not resolved")
            action_b_results.append({
                "supplier": supplier_name,
                "action_b": None,
                "reason":   "Action A failed",
            })
            continue

        print(f"\n[→] Screening: {supplier_name}")
        b_result = screen_supplier(a_result.get("identity", {}))
        action_b_results.append({
            "supplier": supplier_name,
            "action_b": b_result,
        })

    return action_b_results


def print_result(supplier: str, b: dict):
    if not b:
        print(f"[-] {supplier}: skipped")
        return
    status = "🔴 FLAGGED" if b["is_flagged"] else "🟢 CLEAR"
    print(f"\n{status}  {supplier}")
    if b["flagged_lists"]:
        print(f"   Lists hit: {', '.join(b['flagged_lists'])}")
    if b["company_hits"]:
        print(f"   Company matches ({len(b['company_hits'])}):")
        for h in b["company_hits"]:
            if "error" in h:
                print(f"     • [API error: {h['error']}]")
                continue
            print(f"     • {h.get('matched_name')} | score={h.get('match_score')} | {h.get('source_url')}")
    if b["people_hits"]:
        print(f"   People matches:")
        for person, hits in b["people_hits"].items():
            for h in hits:
                if "error" in h:
                    print(f"     • [{person}] [API error: {h['error']}]")
                    continue
                print(f"     • [{person}] → {h.get('matched_name')} | score={h.get('match_score')} | {h.get('source_url')}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ethiscan Action B – Sanctions Screener")
    parser.add_argument("--name", type=str, help="Canonical company name to screen (e.g. 'SSAB AB')")
    parser.add_argument("--org",  type=str, help="Org number to look up from action_a_results.json cache")
    args = parser.parse_args()

    # ── Single-entity mode ────────────────────────────────────────────────────
    if args.name:
        print(f"\n=== Ethiscan Action B: Single entity screen ===\n")
        print(f"[→] Screening: {args.name}")
        # Screen the company name only (no key_people available in CLI mode)
        result = screen_supplier({"canonical_name": args.name, "key_people": []})
        print_result(args.name, result)

    elif args.org:
        # Look up canonical name from the Action A cache and screen it
        import os
        cache = "action_a_results.json"
        if not os.path.exists(cache):
            print(f"[!] Cache not found. Run action_a_identity.py first.")
        else:
            with open(cache, encoding="utf-8-sig") as f:
                cached = json.load(f)
            match = next((item for item in cached if item.get("input_org_number", "").replace("-","") == args.org.replace("-","")), None)
            if not match:
                print(f"[!] Org number '{args.org}' not found in cache.")
            else:
                identity = match["action_a_result"].get("identity", {})
                supplier_name = match.get("input_supplier", identity.get("canonical_name", args.org))
                print(f"\n=== Ethiscan Action B: Single entity screen ===\n")
                print(f"[→] Screening: {supplier_name} ({identity.get('canonical_name')})")
                result = screen_supplier(identity)
                print_result(supplier_name, result)

    # ── Batch mode (default) ──────────────────────────────────────────────────
    else:
        results = run_action_b("action_a_results.json")
        print("\n\n=== Action B: Sanctions Screening Results ===\n")
        for item in results:
            print_result(item.get("supplier"), item.get("action_b"))

        with open("action_b_results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print("\n[✓] Full results saved to action_b_results.json")
