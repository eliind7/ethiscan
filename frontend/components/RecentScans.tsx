import Link from "next/link";

import type { ScanSummary } from "@/lib/types";

interface RecentScansProps {
  scans: ScanSummary[];
}

function riskLabel(score: number): string {
  if (score <= 20) return "Low";
  if (score <= 40) return "Moderate";
  if (score <= 60) return "Elevated";
  if (score <= 80) return "High";
  return "Critical";
}

export default function RecentScans({ scans }: RecentScansProps) {
  return (
    <section className="panel p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="panel-title">Recent Scans</p>
        <span className="text-xs text-slate-500">{scans.length} entries</span>
      </div>

      {scans.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No scans yet. Run your first company risk check above.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {scans.map((scan) => (
            <Link
              key={scan.id}
              href={`/scans/${scan.id}`}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-cyan-300 hover:bg-cyan-50/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{scan.company_name}</p>
                  <p className="text-xs text-slate-500">
                    {scan.country ?? "EU"} | {scan.sector ?? "unknown"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="metric-chip">{riskLabel(scan.score)} Risk</span>
                  <span className="metric-chip">Score {scan.score}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
