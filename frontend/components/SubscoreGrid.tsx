import type { SubScores } from "@/lib/types";

interface SubscoreGridProps {
  subScores: SubScores;
}

const SUBSCORE_CONFIG = [
  { key: "direct_sanctions" as const, label: "Direct Sanctions", weight: 50 },
  { key: "pep_exposure" as const, label: "PEP Exposure", weight: 30 },
  { key: "adverse_media" as const, label: "Adverse Media", weight: 20 },
];

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-lime-500";
  if (score >= 40) return "bg-amber-500";
  if (score >= 20) return "bg-orange-500";
  return "bg-red-500";
}

export default function SubscoreGrid({ subScores }: SubscoreGridProps) {
  return (
    <section className="panel p-6">
      <p className="panel-title">Subscore Breakdown</p>
      <p className="mt-1 text-xs text-slate-500">Higher = cleaner</p>
      <div className="mt-4 space-y-4">
        {SUBSCORE_CONFIG.map((item) => {
          const score = subScores[item.key];
          return (
            <div key={item.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">{item.label}</span>
                <span className="text-slate-600">
                  {score}/100 · weight {item.weight}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${barColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
