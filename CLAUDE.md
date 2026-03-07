# ethiscan

OSINT-based sanctions and ESG risk profiler for Swedish companies. PoC for a broader compliance intelligence platform.

## Pitch Framing

Supplier compliance screening today is slow, expensive, and fragmented. Sanctions lists are official and machine-readable but nobody aggregates them cleanly with news signals into a usable supplier risk profile.

ethiscan pulls from public sanctions databases and news automatically — no supplier cooperation required, results in seconds.

Starting wedge: sanctions screening for Swedish companies. Expansion: full CSRD pillar coverage, PEP screening, ESG signals.

Target user: procurement or compliance manager who needs to vet suppliers against sanctions obligations and regulatory risk.

## PoC Scope

- Sweden only
- Hardcoded list of ~10 Swedish companies with their organisationsnummer
- 3 data sources: OpenSanctions, EU Consolidated Sanctions List, Google News RSS
- Output: risk score + signal breakdown + news feed + source citations

## Stack

- **Frontend**: Next.js + Tailwind CSS + Recharts
- **Backend**: Python FastAPI
- **LLM**: Claude API (news signal extraction and summarization)
- **Scraping/fetching**: httpx + BeautifulSoup
- **Storage**: in-memory (no database needed for PoC)

## Architecture

```
Company selected from list (name + organisationsnummer)
        |
   FastAPI backend
        |
  Parallel data fetch
  /              |              \
OpenSanctions  EU Sanctions   Google News RSS
  \              |              /
      LLM signal extraction
              |
      Score computation
              |
      Next.js dashboard
```

## Company List (Sweden)

| Company | Organisationsnummer | Industry |
|---|---|---|
| H&M | 556042-7220 | Fashion/retail |
| Oriflame | 556001-6356 | Cosmetics |
| Kinnevik | 556047-9742 | Investment |
| Tele2 | 556410-8917 | Telecom |
| Veoneer | 559013-0985 | Auto tech |
| Apoteket | 556138-6532 | Pharmacy |
| Coop | 716416-1048 | Retail/food |
| Axfood | 556542-0824 | Food retail |
| Embracer Group | 556582-6558 | Gaming |
| Swedbank | 502017-7753 | Finance |

## Data Sources

| Source | What we get | How |
|---|---|---|
| OpenSanctions | Aggregated sanctions matches across 100+ lists | REST API (free, no key needed for basic search) |
| EU Consolidated Sanctions List | Official EU sanctions matches | Free XML download from EUR-Lex |
| Google News RSS | Recent news mentions of sanctions/investigations | `news.google.com/rss/search?q=COMPANY+sanctions` |

## Scoring System

Score is 0–100. Higher = more compliant/lower risk.

| Signal | Score impact |
|---|---|
| Match on EU/UN/OFAC sanctions list | -40 |
| Match on secondary/sectoral sanctions list | -20 |
| Executive or owner match on sanctions list | -30 |
| News hit mentioning sanctions or investigation | -10 per hit |
| No matches across all lists | +10 |

Baseline starts at 70. Clamp final score to 0–100.

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

## Development Notes

- Sweden only for PoC — expansion to full EU is the roadmap story
- Company list is hardcoded with organisationsnummer — no free-form search
- OpenSanctions API endpoint: `https://api.opensanctions.org/search/default?q=COMPANY_NAME`
- EU Sanctions XML: download from `https://eur-lex.europa.eu/legal-content/EN/TXT/XML/?uri=OJ:L_202401627`
- LLM is used only for news signal extraction — never for generating facts
- Every score signal must link back to its source URL
- All data sources must be free and open — no paid APIs

## Code Style

- Python: PEP8, async where possible (httpx, FastAPI)
- TypeScript: strict mode on
- Scraping logic isolated in `backend/scrapers/` — one file per source
- Scoring logic isolated in `backend/scoring/`

## Hackathon Priorities

1. Working fetch from OpenSanctions API + Google News RSS
2. Score computation from those signals
3. Clean dashboard: score gauge + signal breakdown + news feed
4. Source citation on every signal
5. Demo-ready: hardcoded companies, no failures live on stage
