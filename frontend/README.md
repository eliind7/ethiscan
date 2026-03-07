# Frontend (Next.js + Tailwind + Recharts)

## Run

```bash
npm install
npm run dev
```

## UI Components

- Unified scan intake (`components/ScanIntakePanel.tsx`)
- Pipeline progress (`components/ScanProgress.tsx`)
- Recent scan list (`components/RecentScans.tsx`)
- Score hero and grade card (`components/ScoreHero.tsx`)
- Subscore progress bars (`components/SubscoreGrid.tsx`)
- Recharts breakdown (`components/RiskBreakdownChart.tsx`)
- Signals feed (`components/SignalsFeed.tsx`)
- Source coverage table (`components/SourcesPanel.tsx`)

## Data Mode (for now)

- This setup is frontend-only.
- `lib/api.ts` uses browser `localStorage` mock data so the full UI flow works without backend/Python.
