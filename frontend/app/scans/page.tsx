"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listScanBatches } from "@/lib/api";
import type { ScanBatch } from "@/lib/types";

function riskLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score <= 20) return "Low";
  if (score <= 40) return "Moderate";
  if (score <= 60) return "Elevated";
  if (score <= 80) return "High";
  return "Critical";
}

export default function ScansPage() {
  const [batches, setBatches] = useState<ScanBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await listScanBatches();
        setBatches(result);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load scan batches.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const summary = useMemo(() => {
    const totalEntries = batches.reduce((sum, batch) => sum + batch.item_count, 0);
    const totalSuccess = batches.reduce((sum, batch) => sum + batch.success_count, 0);
    return {
      totalBatches: batches.length,
      totalEntries,
      totalSuccess
    };
  }, [batches]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <section className="panel p-6 md:p-8">
        <p className="panel-title">Scans</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold">Uploaded Supplier Lists</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="metric-chip">{summary.totalBatches} lists</span>
          <span className="metric-chip">{summary.totalEntries} suppliers</span>
          <span className="metric-chip">{summary.totalSuccess} successful scans</span>
        </div>
      </section>

      {loading ? (
        <section className="panel p-6">
          <p className="text-sm text-slate-600">Loading uploaded scan lists...</p>
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {!loading && !error && batches.length === 0 ? (
        <section className="panel p-6 md:p-8">
          <p className="panel-title">No Uploaded Lists Yet</p>
          <p className="mt-3 text-sm text-slate-600">
            Upload a supplier CSV from the dashboard and each parsed list will appear here as a separate
            container.
          </p>
          <Link href="/" className="mt-4 inline-flex text-sm font-medium text-cyan-700 underline">
            Go to Dashboard
          </Link>
        </section>
      ) : null}

      {!loading &&
        !error &&
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
                <span className="metric-chip">{batch.item_count} suppliers</span>
                <span className="metric-chip">{batch.success_count} done</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {batch.entries.map((entry, index) => {
                const rowContent = (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{entry.company_name}</p>
                      <p className="text-xs text-slate-500">
                        Org Number: {entry.organization_number ?? "Not provided"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="metric-chip">{riskLabel(entry.score)} Risk</span>
                      {entry.score !== null ? <span className="metric-chip">Score {entry.score}</span> : null}
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
                );

                if (entry.scan_id !== null) {
                  return (
                    <Link
                      key={`${batch.id}-${entry.scan_id}-${index}`}
                      href={`/scans/${entry.scan_id}`}
                      className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-cyan-300 hover:bg-cyan-50/30"
                    >
                      {rowContent}
                    </Link>
                  );
                }

                return (
                  <div
                    key={`${batch.id}-${entry.company_name}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    {rowContent}
                    {entry.error ? <p className="mt-1 text-xs text-red-700">{entry.error}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
    </main>
  );
}
