"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getHistoryEntry, listHistory } from "@/lib/api";
import type { ScanHistoryEntry, SupplierResult } from "@/lib/types";

function escapeCsv(value: string | number | null): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function triggerCsvDownload(fileName: string, rows: Array<Array<string | number | null>>): void {
  const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedResult, setSelectedResult] = useState<SupplierResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    const history = listHistory(200);
    setEntries(history);
    if (history.length > 0) setSelectedId(history[0].id);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId === null) { setSelectedResult(null); return; }
    const entry = getHistoryEntry(selectedId);
    setSelectedResult(entry?.result ?? null);
  }, [selectedId]);

  const filteredEntries = useMemo(() => {
    if (riskFilter === "all") return entries;
    return entries.filter((e) => e.result.risk_level === riskFilter);
  }, [entries, riskFilter]);

  const handleExportFiltered = () => {
    triggerCsvDownload("ethiscan-reports.csv", [
      ["Company", "Canonical Name", "Country", "Sector", "Score", "Risk Level", "Evidence Items", "Scanned At"],
      ...filteredEntries.map((e) => [
        e.result.supplier_name,
        e.result.canonical_name,
        e.result.country,
        e.result.sector_category,
        e.result.sanctions_risk_score,
        e.result.risk_level,
        e.result.evidence_pack.length,
        e.scanned_at,
      ]),
    ]);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <section className="panel p-6 md:p-8">
        <p className="panel-title">Reports</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold">Report Library</h1>
      </section>

      <section className="panel p-6">
        <p className="panel-title">Filters</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-sm text-slate-700">
            Risk Level
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Prohibited">Prohibited</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleExportFiltered}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="panel-title">Scan History</p>
            <span className="metric-chip">{filteredEntries.length} reports</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Company</th>
                    <th className="px-2 py-2">Risk</th>
                    <th className="px-2 py-2">Score</th>
                    <th className="px-2 py-2">Evidence</th>
                    <th className="px-2 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`cursor-pointer border-b border-slate-100 ${
                        selectedId === entry.id ? "bg-cyan-50/60" : "bg-transparent"
                      }`}
                      onClick={() => setSelectedId(entry.id)}
                    >
                      <td className="px-2 py-3 font-medium text-slate-900">
                        {entry.result.canonical_name ?? entry.result.supplier_name}
                      </td>
                      <td className="px-2 py-3 text-slate-700">{entry.result.risk_level}</td>
                      <td className="px-2 py-3 text-slate-700">{entry.result.sanctions_risk_score}</td>
                      <td className="px-2 py-3 text-slate-700">{entry.result.evidence_pack.length}</td>
                      <td className="px-2 py-3 text-slate-700">
                        {new Date(entry.scanned_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <section className="panel p-6">
            <p className="panel-title">Report Preview</p>
            {selectedResult ? (
              <>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {selectedResult.canonical_name ?? selectedResult.supplier_name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedResult.country} · {selectedResult.sector_category}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="metric-chip">Score {selectedResult.sanctions_risk_score}</span>
                  <span className="metric-chip">{selectedResult.risk_level}</span>
                  <span className="metric-chip">{selectedResult.key_people_screened.length} people</span>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    { label: "Sanctions", score: selectedResult.sub_scores.direct_sanctions },
                    { label: "PEP Exposure", score: selectedResult.sub_scores.pep_exposure },
                    { label: "Adverse Media", score: selectedResult.sub_scores.adverse_media },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>{item.label}</span>
                        <span>{item.score}/100</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-slate-700" style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/scans/${selectedId}`}
                  className="mt-4 inline-flex text-sm font-medium text-cyan-700 underline"
                >
                  Open full report
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Select a report from the list to preview it.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
