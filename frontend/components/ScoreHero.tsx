import type { SupplierResult } from "@/lib/types";

interface ScoreHeroProps {
  result: SupplierResult;
}

function riskColor(level: string): string {
  if (level === "Prohibited") return "border-red-600";
  if (level === "High") return "border-orange-500";
  if (level === "Medium") return "border-amber-400";
  return "border-emerald-500";
}

export default function ScoreHero({ result }: ScoreHeroProps) {
  return (
    <section className="panel overflow-hidden p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="panel-title">Sanctions Risk Snapshot</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold md:text-4xl">
            {result.canonical_name ?? result.supplier_name}
          </h1>
          {result.canonical_name ? (
            <p className="mt-1 text-sm text-slate-500">Input: {result.supplier_name}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            {result.country.toUpperCase()} · {result.sector_category}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="metric-chip">{result.risk_level}</span>
            <span className="metric-chip">{result.key_people_screened.length} people screened</span>
            <span className="metric-chip">{result.evidence_pack.length} evidence items</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute h-52 w-52 rounded-full bg-gradient-to-br from-cyan-200/70 via-orange-100/60 to-white blur-2xl" />
          <div className={`relative flex h-40 w-40 items-center justify-center rounded-full border-8 ${riskColor(result.risk_level)} bg-white shadow-lg`}>
            <div className="text-center">
              <p className="font-[var(--font-display)] text-5xl font-semibold leading-none">{result.sanctions_risk_score}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">out of 100</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
