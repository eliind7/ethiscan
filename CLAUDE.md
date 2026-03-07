# ethiscan

OSINT-based ethical risk profiler for EU companies, focused on animal welfare scoring. Built for a hackathon.

## Project Overview

ethiscan lets users input a company name and receive an ethical risk score based on publicly available data — with a focus on animal testing and animal welfare violations. Output is a dashboard with a score breakdown, source citations, and recent news.

## Stack

- **Frontend**: Next.js + Tailwind CSS + Recharts
- **Backend**: Python FastAPI
- **LLM**: Claude API (news analysis, summarization, signal extraction)
- **Scraping**: httpx + BeautifulSoup
- **Storage**: SQLite (or in-memory for hackathon speed)

## Architecture

```
User input (company name)
        |
   FastAPI backend
        |
  Parallel data fetch
  /       |        \
News   Databases  Registries
  \       |        /
   LLM analysis (Claude)
        |
   Score computation
        |
   Next.js dashboard
```

## Data Sources (free, open)

| Source | Usage |
|---|---|
| Leaping Bunny / CCIC | Cruelty-free certifications |
| PETA Beauty Without Bunnies | Brand cruelty-free status |
| ECHA (EU Chemicals Agency) | Chemical substance animal test data |
| EU Cosmetics Regulation DB | Animal test ban compliance |
| OpenCorporates | EU company registration data |
| Google News RSS | Recent news scraping |
| GDELT / MediaCloud | News event data |
| Wikipedia | Company overview and controversies |

## Scoring System

Score is 0–100. Lower = more ethical.

| Dimension | Weight |
|---|---|
| Known animal testing (cosmetics, pharma, food) | High |
| Cruelty-free certifications | Negative (positive offset) |
| EU regulatory violations | High |
| News mentions of animal abuse/testing | High |
| Industry sector baseline risk | Medium |
| Supply chain country exposure | Low modifier |

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

- EU companies only (scope constraint)
- All data sources must be free and open — no paid APIs
- LLM is used for signal extraction from unstructured text (news, filings), not for hallucinated facts — always cite sources
- Score explanations must link back to source data

## Code Style

- Python: follow PEP8, use async where possible (httpx, FastAPI)
- TypeScript: strict mode on
- Keep scraping logic isolated in `backend/scrapers/` — one file per source
- Keep scoring logic isolated in `backend/scoring/`
- No hardcoded company data — everything must be fetched live or cached

## Hackathon Priorities

1. Working score computation from at least 2–3 real data sources
2. Clean dashboard with score gauge + breakdown chart
3. Source citations on every data point
4. News feed with LLM-extracted animal welfare signals
