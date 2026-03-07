# ethiscan

OSINT-based supplier sanctions risk profiler. Built for EU companies that need to screen their supplier base against public sanctions lists, PEP watchlists, and adverse media — no manual research required.

## Pitch Framing

Supplier compliance screening today is slow, expensive, and fragmented. Sanctions lists are official and machine-readable but nobody aggregates them cleanly with PEP data and news signals into a usable supplier risk profile.

ethiscan lets a compliance or procurement team upload their supplier list and get a structured risk profile per supplier in seconds — sourced entirely from public data, no supplier cooperation required.

Target user: compliance manager or procurement team at an EU company that needs to screen suppliers against sanctions obligations (EU, UN, OFAC, UK) and flag high-risk relationships before they become a liability.

## PoC Scope

- Upload a CSV of suppliers (any country)
- Screen each supplier against sanctions lists + PEP data + adverse media
- Return per-supplier risk score, risk level, flags, and evidence pack
- Ownership/shell company detection is out of scope for PoC

## Stack

- **Frontend**: Next.js + Tailwind CSS
- **Backend**: Python FastAPI
- **LLM**: Claude API (adverse media signal extraction + severity scoring)
- **Data fetching**: httpx (async)
- **Storage**: in-memory (no database needed for PoC)

## Architecture

```
User uploads CSV (supplier_name, country, sector_category, ...)
        |
   FastAPI POST /api/scan
        |
  Per supplier — parallel fetch
  /           |           \
OpenSanctions  OpenSanctions  Google News RSS
(sanctions)    (PEP)          + Claude extraction
  \           |           /
        Score computation
                |
        Next.js results table
```

## Input (CSV columns)

| Field | Required | Example |
|---|---|---|
| `supplier_name` | Yes | Eastern Metals Trading Ltd |
| `country` | Yes | TR |
| `sector_category` | Yes | Metals trader |
| `website_domain` | No | easternmetals.com |
| `tier` | No | Tier 1 |
| `internal_id` | No | SUP-0042 |

## Output (per supplier)

```json
{
  "supplier_name": "Eastern Metals Trading Ltd",
  "country": "TR",
  "sector_category": "Metals trader",
  "internal_id": "SUP-0042",
  "sanctions_risk_score": 72,
  "risk_level": "High",
  "flags": [
    "Owner is PEP in high-risk jurisdiction",
    "Sanctions-adjacent adverse media only"
  ],
  "sub_scores": {
    "direct_sanctions": 100,
    "pep_exposure": 45,
    "adverse_media": 60
  },
  "evidence_pack": [
    {
      "list_name": "EU Financial Sanctions",
      "entry_id": "EU-FSF-001234",
      "source_type": "sanctions_list",
      "date": "2024-03-01",
      "url": "https://...",
      "snippet": "Entity listed for violations of Regulation...",
      "match_confidence": 0.91,
      "severity": 5
    }
  ]
}
```

Risk levels:
- **Prohibited**: direct sanctions hit (score 0–20)
- **High**: PEP match or strong adverse media (21–45)
- **Medium**: indirect signals (46–65)
- **Low**: clean (66–100)

## Data Sources

| Source | What | How |
|---|---|---|
| OpenSanctions `default` | EU, UN, OFAC, UK + 100 other lists | `GET https://api.opensanctions.org/search/default?q=NAME&schema=Organization` |
| OpenSanctions PEP | Politically exposed persons | `GET https://api.opensanctions.org/search/peps?q=NAME` |
| Google News RSS | Adverse media | `https://news.google.com/rss/search?q="NAME"+sanctions+embargo` |
| Claude API | Signal extraction + severity from news | claude-sonnet-4-6 |

All free, no API keys required except Anthropic.

## Scoring System

Sub-scores (0–100, higher = cleaner):

`direct_sanctions`: No match → 100. Match → `max(0, 100 - match_confidence * 100)`

`pep_exposure`: No match → 100. Match → `max(0, 100 - match_confidence * 80)`

`adverse_media`: 100 minus `sum(severity * 5)` per relevant hit, floored at 0.

Aggregate:
```
sanctions_risk_score = direct_sanctions * 0.50
                     + pep_exposure     * 0.30
                     + adverse_media    * 0.20
```

## LLM Usage

For each Google News article, Claude extracts:
- Is it relevant to: sanctions, embargo, terror financing, dual-use, export control?
- If yes: 1-sentence snippet, severity 1–5, keyword match
- If not relevant: return null (excluded from evidence_pack)

## Key Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## File Structure

```
backend/
  main.py                  # FastAPI app, POST /api/scan, CORS
  models.py                # Pydantic input/output models
  scrapers/
    opensanctions.py       # Sanctions + PEP search
    news.py                # Google News RSS fetch
    llm.py                 # Claude signal extraction
  scoring/
    scorer.py              # Sub-scores, aggregate, risk_level, flags

frontend/
  app/
    page.tsx               # Upload page
    results/
      page.tsx             # Results display
  components/
    FileUpload.tsx         # CSV upload + client-side parse
    ResultsTable.tsx       # Supplier risk table
    EvidenceDrawer.tsx     # Slide-out: evidence_pack per supplier
  lib/
    parse-csv.ts           # papaparse CSV parser
    api.ts                 # POST /api/scan client
```

## Development Notes

- Use `asyncio.gather` to scan all suppliers concurrently
- Use `asyncio.gather` within each supplier to run sanctions + PEP + news in parallel
- Frontend parses CSV client-side with papaparse — no file upload to server
- CORS: allow `http://localhost:3000` in FastAPI dev config
- ANTHROPIC_API_KEY required for Claude news extraction

## Code Style

- Python: PEP8, async where possible (httpx, FastAPI)
- TypeScript: strict mode on
- Scraping logic isolated in `backend/scrapers/` — one file per source
- Scoring logic isolated in `backend/scoring/`

## Hackathon Priorities

1. Working OpenSanctions integration (sanctions + PEP)
2. Google News RSS fetch + Claude extraction
3. Score computation + risk level assignment
4. Results table with evidence drawer
5. Demo-ready with a sample CSV including a known sanctioned entity (e.g. Rosneft)

## Environment Variables

```
ANTHROPIC_API_KEY=your_key_here
```
