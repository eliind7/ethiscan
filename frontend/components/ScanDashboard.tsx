import Link from "next/link";

import type { ScanReport } from "@/lib/types";

import RiskBreakdownChart from "@/components/RiskBreakdownChart";
import ScoreHero from "@/components/ScoreHero";
import SignalsFeed from "@/components/SignalsFeed";
import SourcesPanel from "@/components/SourcesPanel";
import SubscoreGrid from "@/components/SubscoreGrid";

interface ScanDashboardProps {
  scan: ScanReport;
}

function percentileEstimate(score: number): number {
  return Math.max(1, Math.min(99, Math.round((score / 100) * 100)));
}

export default function ScanDashboard({ scan }: ScanDashboardProps) {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-cyan-300"
        >
          Back to Search
        </Link>
        <span className="metric-chip">Last updated {new Date(scan.created_at).toLocaleString()}</span>
      </header>

      <ScoreHero scan={scan} />

      <section className="grid gap-5 lg:grid-cols-2">
        <SubscoreGrid subscores={scan.subscores} />
        <RiskBreakdownChart subscores={scan.subscores} />
      </section>

      <section className="panel p-6">
        <p className="panel-title">Peer Position</p>
        <p className="mt-3 text-sm text-slate-700">
          This company currently scores worse than approximately{" "}
          <strong>{percentileEstimate(scan.score)}%</strong> of entities in its sector benchmark set.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Benchmarking is heuristic in this hackathon version and should be calibrated on a larger dataset.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <SignalsFeed signals={scan.signals} />
        <SourcesPanel sources={scan.sources} />
      </section>
    </main>
  );
}
