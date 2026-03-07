import Link from "next/link";

import type { SupplierResult } from "@/lib/types";

import EvidenceFeed from "@/components/SignalsFeed";
import KeyPeoplePanel from "@/components/SourcesPanel";
import RiskBreakdownChart from "@/components/RiskBreakdownChart";
import ScoreHero from "@/components/ScoreHero";
import SubscoreGrid from "@/components/SubscoreGrid";

interface ScanDashboardProps {
  result: SupplierResult;
}

export default function ScanDashboard({ result }: ScanDashboardProps) {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-cyan-300"
        >
          Back to Search
        </Link>
        <span className="metric-chip">{result.evidence_pack.length} evidence items</span>
      </header>

      <ScoreHero result={result} />

      <section className="grid gap-5 lg:grid-cols-2">
        <SubscoreGrid subScores={result.sub_scores} />
        <RiskBreakdownChart subScores={result.sub_scores} />
      </section>

      {result.flags.length > 0 ? (
        <section className="panel p-6">
          <p className="panel-title">Flags</p>
          <ul className="mt-3 space-y-2">
            {result.flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-amber-500">●</span>
                {flag}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <EvidenceFeed evidence={result.evidence_pack} />
        <KeyPeoplePanel people={result.key_people_screened} />
      </section>
    </main>
  );
}
