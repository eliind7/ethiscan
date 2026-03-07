import Link from "next/link";

import type { ScanHistoryEntry } from "@/lib/types";

interface RecentScansProps {
  scans: ScanHistoryEntry[];
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
                  <p className="font-semibold text-slate-900">
                    {scan.result.canonical_name ?? scan.result.supplier_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {scan.result.country} · {scan.result.sector_category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="metric-chip">{scan.result.risk_level}</span>
                  <span className="metric-chip">Score {scan.result.sanctions_risk_score}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
