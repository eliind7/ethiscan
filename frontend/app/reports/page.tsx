"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getScan, listReportLibrary } from "@/lib/api";
import type { ReportLibraryItem, ScanReport } from "@/lib/types";

type RiskFilter = "all" | "low" | "moderate" | "elevated" | "high" | "critical";

function riskBand(score: number): RiskFilter {
  if (score <= 20) return "low";
  if (score <= 40) return "moderate";
  if (score <= 60) return "elevated";
  if (score <= 80) return "high";
  return "critical";
}

function riskLabel(level: RiskFilter): string {
  if (level === "low") return "Low";
  if (level === "moderate") return "Moderate";
  if (level === "elevated") return "Elevated";
  if (level === "high") return "High";
  if (level === "critical") return "Critical";
  return "All";
}

function escapeCsv(value: string | number | null): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
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

function byNewest(a: ReportLibraryItem, b: ReportLibraryItem): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportLibraryItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const library = await listReportLibrary(250);
        const sorted = [...library].sort(byNewest);
        setReports(sorted);
        setSelectedReportId(sorted[0]?.id ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load report library.");
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, []);

  useEffect(() => {
    async function loadPreview() {
      if (selectedReportId === null) {
        setSelectedReport(null);
        return;
      }
      setLoadingPreview(true);
      try {
        const report = await getScan(selectedReportId);
        setSelectedReport(report);
      } catch {
        setSelectedReport(null);
      } finally {
        setLoadingPreview(false);
      }
    }

    void loadPreview();
  }, [selectedReportId]);

  const sectorOptions = useMemo(() => {
    const values = Array.from(new Set(reports.map((report) => report.sector).filter(Boolean) as string[]));
    return values.sort();
  }, [reports]);

  const countryOptions = useMemo(() => {
    const values = Array.from(new Set(reports.map((report) => report.country).filter(Boolean) as string[]));
    return values.sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const createdAt = new Date(report.created_at);
      const passesRisk = riskFilter === "all" || riskBand(report.score) === riskFilter;
      const passesSector = sectorFilter === "all" || report.sector === sectorFilter;
      const passesCountry = countryFilter === "all" || report.country === countryFilter;
      const passesConfidence = report.confidence >= confidenceMin;
      const passesStart = !startDate || createdAt >= new Date(`${startDate}T00:00:00`);
      const passesEnd = !endDate || createdAt <= new Date(`${endDate}T23:59:59`);
      return passesRisk && passesSector && passesCountry && passesConfidence && passesStart && passesEnd;
    });
  }, [reports, riskFilter, sectorFilter, countryFilter, confidenceMin, startDate, endDate]);

  const citationCompleteness = useMemo(() => {
    if (!selectedReport || selectedReport.sources.length === 0) {
      return 0;
    }
    const citedSources = selectedReport.sources.filter((source) =>
      ["found", "listed", "submission_found"].includes(source.status)
    ).length;
    return Math.round((citedSources / selectedReport.sources.length) * 100);
  }, [selectedReport]);

  const handleExportFiltered = () => {
    triggerCsvDownload("veriscan-report-library.csv", [
      ["Company", "Score", "Grade", "Confidence", "Country", "Sector", "Signals", "Sources", "Created At"],
      ...filteredReports.map((report) => [
        report.company_name,
        report.score,
        report.grade,
        report.confidence,
        report.country,
        report.sector,
        report.signal_count,
        report.source_count,
        report.created_at
      ])
    ]);
  };

  const handleExportSingle = () => {
    if (!selectedReport) {
      return;
    }
    const subscoreRows = selectedReport.subscores.map((item) => [item.category, item.score, item.weight]);
    triggerCsvDownload(`veriscan-report-${selectedReport.id}.csv`, [
      ["Company", selectedReport.company_name],
      ["Score", selectedReport.score],
      ["Grade", selectedReport.grade],
      ["Confidence", selectedReport.confidence],
      ["Country", selectedReport.country],
      ["Sector", selectedReport.sector],
      [""],
      ["Category", "Score", "Weight"],
      ...subscoreRows
    ]);
  };

  const handleCopyShareLink = async () => {
    if (!selectedReport) {
      return;
    }
    const url = `${window.location.origin}/scans/${selectedReport.id}`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <section className="panel p-6 md:p-8">
        <p className="panel-title">Reports</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold">Report Library & Audit Trail</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">
          Browse generated reports, filter by risk and confidence, preview evidence, and export compliance-ready
          outputs.
        </p>
      </section>

      <section className="panel p-6">
        <p className="panel-title">Filters</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <label className="text-sm text-slate-700">
            Risk
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="elevated">Elevated</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Sector
            <select
              value={sectorFilter}
              onChange={(event) => setSectorFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {sectorOptions.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Country
            <select
              value={countryFilter}
              onChange={(event) => setCountryFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Min Confidence
            <input
              type="number"
              min={0}
              max={100}
              value={confidenceMin}
              onChange={(event) => setConfidenceMin(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="panel-title">Report Library</p>
            <span className="metric-chip">{filteredReports.length} reports</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading report library...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Company</th>
                    <th className="px-2 py-2">Risk</th>
                    <th className="px-2 py-2">Grade</th>
                    <th className="px-2 py-2">Confidence</th>
                    <th className="px-2 py-2">Sources</th>
                    <th className="px-2 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className={`cursor-pointer border-b border-slate-100 ${
                        selectedReportId === report.id ? "bg-cyan-50/60" : "bg-transparent"
                      }`}
                      onClick={() => setSelectedReportId(report.id)}
                    >
                      <td className="px-2 py-3 font-medium text-slate-900">{report.company_name}</td>
                      <td className="px-2 py-3 text-slate-700">{riskLabel(riskBand(report.score))}</td>
                      <td className="px-2 py-3 text-slate-700">{report.grade}</td>
                      <td className="px-2 py-3 text-slate-700">{report.confidence}%</td>
                      <td className="px-2 py-3 text-slate-700">{report.source_count}</td>
                      <td className="px-2 py-3 text-slate-700">
                        {new Date(report.created_at).toLocaleDateString()}
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
            {loadingPreview ? (
              <p className="mt-3 text-sm text-slate-600">Loading selected report...</p>
            ) : selectedReport ? (
              <>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{selectedReport.company_name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedReport.country ?? "EU"} | {selectedReport.sector ?? "unknown"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="metric-chip">Score {selectedReport.score}</span>
                  <span className="metric-chip">Grade {selectedReport.grade}</span>
                  <span className="metric-chip">Confidence {selectedReport.confidence}%</span>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedReport.subscores.map((subscore) => (
                    <div key={subscore.category}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>{subscore.category}</span>
                        <span>{subscore.score}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-slate-700" style={{ width: `${subscore.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/scans/${selectedReport.id}`}
                  className="mt-4 inline-flex text-sm font-medium text-cyan-700 underline"
                >
                  Open full report
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Select a report from the library to preview it.</p>
            )}
          </section>

          <section className="panel p-6">
            <p className="panel-title">Export Actions</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleExportSingle}
                disabled={!selectedReport}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                Export Selected (CSV)
              </button>
              <button
                type="button"
                onClick={handleExportFiltered}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Export Filtered List (CSV)
              </button>
              <button
                type="button"
                onClick={() => void handleCopyShareLink()}
                disabled={!selectedReport}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Copy Share Link
              </button>
            </div>
          </section>

          <section className="panel p-6">
            <p className="panel-title">Compliance Audit</p>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>
                Methodology Version: <span className="font-semibold">mvp-0.2</span>
              </p>
              <p>
                Generated At:{" "}
                <span className="font-semibold">
                  {selectedReport ? new Date(selectedReport.created_at).toLocaleString() : "-"}
                </span>
              </p>
              <p>
                Citation Completeness: <span className="font-semibold">{citationCompleteness}%</span>
              </p>
              <p>
                Source Freshness Window: <span className="font-semibold">Last 12 months (MVP default)</span>
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
