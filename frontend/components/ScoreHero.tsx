import type { ScanReport } from "@/lib/types";

interface ScoreHeroProps {
  scan: ScanReport;
}

function riskBand(score: number): string {
  if (score <= 20) return "Low Risk";
  if (score <= 40) return "Moderate Risk";
  if (score <= 60) return "Elevated Risk";
  if (score <= 80) return "High Risk";
  return "Critical Risk";
}

export default function ScoreHero({ scan }: ScoreHeroProps) {
  return (
    <section className="panel overflow-hidden p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="panel-title">Company Risk Snapshot</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold md:text-4xl">
            {scan.company_name}
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            {(scan.country ?? "EU scope").toUpperCase()} · {(scan.sector ?? "unknown sector").toUpperCase()}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="metric-chip">Grade {scan.grade}</span>
            <span className="metric-chip">{riskBand(scan.score)}</span>
            <span className="metric-chip">Confidence {scan.confidence}%</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute h-52 w-52 rounded-full bg-gradient-to-br from-cyan-200/70 via-orange-100/60 to-white blur-2xl" />
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-8 border-slate-900 bg-white shadow-lg">
            <div className="text-center">
              <p className="font-[var(--font-display)] text-5xl font-semibold leading-none">{scan.score}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">out of 100</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
