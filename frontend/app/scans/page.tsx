"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listBatches } from "@/lib/api";
import type { ScanBatch } from "@/lib/types";

export default function ScansPage() {
  const [batches, setBatches] = useState<ScanBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setBatches(listBatches());
    setLoading(false);
  }, []);

  const summary = useMemo(() => {
    const totalEntries = batches.reduce((sum, b) => sum + b.entries.length, 0);
    const totalSuccess = batches.reduce((sum, b) => sum + b.entries.filter((e) => e.status === "done").length, 0);
    return { totalBatches: batches.length, totalEntries, totalSuccess };
  }, [batches]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <section className="panel p-6 md:p-8">
        <p className="panel-title">Scans</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold">Uploaded Supplier Lists</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="metric-chip">{summary.totalBatches} lists</span>
          <span className="metric-chip">{summary.totalEntries} suppliers</span>
          <span className="metric-chip">{summary.totalSuccess} successful</span>
        </div>
      </section>

      {loading ? (
        <section className="panel p-6">
          <p className="text-sm text-slate-600">Loading...</p>
        </section>
      ) : null}

      {!loading && batches.length === 0 ? (
        <section className="panel p-6 md:p-8">
          <p className="panel-title">No Uploaded Lists Yet</p>
          <p className="mt-3 text-sm text-slate-600">
            Upload a supplier CSV from the dashboard and each list will appear here.
          </p>
          <Link href="/" className="mt-4 inline-flex text-sm font-medium text-cyan-700 underline">
            Go to Dashboard
          </Link>
        </section>
      ) : null}

      {!loading &&
        batches.map((batch) => (
          <section key={batch.id} className="panel p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="panel-title">CSV List #{batch.id}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{batch.file_name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Uploaded {new Date(batch.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="metric-chip">{batch.entries.length} suppliers</span>
                <span className="metric-chip">
                  {batch.entries.filter((e) => e.status === "done").length} done
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {batch.entries.map((entry, index) => (
                <div
                  key={`${batch.id}-${index}`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{entry.supplier_name}</p>
                      <p className="text-xs text-slate-500">Org: {entry.org_number || "N/A"}</p>
                      {entry.error ? <p className="mt-1 text-xs text-red-700">{entry.error}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.result ? (
                        <>
                          <span className="metric-chip">{entry.result.risk_level}</span>
                          <span className="metric-chip">Score {entry.result.sanctions_risk_score}</span>
                        </>
                      ) : null}
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          entry.status === "done"
                            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                            : "border-red-300 bg-red-100 text-red-700"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
    </main>
  );
}
