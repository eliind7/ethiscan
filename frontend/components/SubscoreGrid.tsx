import type { Subscore } from "@/lib/types";

interface SubscoreGridProps {
  subscores: Subscore[];
}

function barColor(score: number): string {
  if (score <= 20) return "bg-emerald-500";
  if (score <= 40) return "bg-lime-500";
  if (score <= 60) return "bg-amber-500";
  if (score <= 80) return "bg-orange-500";
  return "bg-red-500";
}

export default function SubscoreGrid({ subscores }: SubscoreGridProps) {
  return (
    <section className="panel p-6">
      <p className="panel-title">Subscore Breakdown</p>
      <div className="mt-4 space-y-4">
        {subscores.map((subscore) => (
          <div key={subscore.category}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800">{subscore.category}</span>
              <span className="text-slate-600">
                {subscore.score} · weight {Math.round(subscore.weight * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${barColor(subscore.score)}`}
                style={{ width: `${subscore.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
