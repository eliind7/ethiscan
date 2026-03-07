"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { addToHistory, saveBatch, scanSingle } from "@/lib/api";
import type { BatchEntry, SupplierInput } from "@/lib/types";

interface ScanIntakePanelProps {
  isSubmittingSingle: boolean;
  onSubmitSingle: (payload: SupplierInput) => Promise<void> | void;
  onBatchCompleted?: () => void;
}

interface ParsedSupplier {
  companyName: string;
  organizationNumber: string;
  country: string;
  sectorCategory: string;
}

const COMPANY_HEADER_KEYS = [
  "company name", "company", "supplier name", "supplier",
  "legal name", "organization name", "organisation name", "name"
];

const ORG_HEADER_KEYS = [
  "organization number", "organisation number", "org number",
  "org no", "org nr", "orgnr", "org_number"
];

const COUNTRY_HEADER_KEYS = ["country", "land"];
const SECTOR_HEADER_KEYS = ["sector", "sector category", "sector_category", "industry"];

function detectDelimiter(content: string): "," | ";" {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  return (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length ? ";" : ",";
}

function parseCsvMatrix(content: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') { field += '"'; i += 1; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (char === delimiter && !inQuotes) { row.push(field.trim()); field = ""; continue; }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i += 1;
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = []; field = ""; continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i += 1) {
    for (const candidate of candidates) {
      if (headers[i] === candidate || headers[i].includes(candidate)) return i;
    }
  }
  return -1;
}

function extractSuppliers(rows: string[][]): ParsedSupplier[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);
  const companyIdx = findHeaderIndex(headers, COMPANY_HEADER_KEYS);
  const orgIdx = findHeaderIndex(headers, ORG_HEADER_KEYS);
  const countryIdx = findHeaderIndex(headers, COUNTRY_HEADER_KEYS);
  const sectorIdx = findHeaderIndex(headers, SECTOR_HEADER_KEYS);
  const hasHeader = companyIdx !== -1 || orgIdx !== -1;
  const startRow = hasHeader ? 1 : 0;

  const suppliers: ParsedSupplier[] = [];
  const seen = new Set<string>();
  for (let i = startRow; i < rows.length; i += 1) {
    const row = rows[i];
    const companyName = (row[companyIdx !== -1 ? companyIdx : 0] ?? "").trim();
    const organizationNumber = orgIdx !== -1 ? (row[orgIdx] ?? "").trim() : "";
    const country = countryIdx !== -1 ? (row[countryIdx] ?? "").trim() : "SE";
    const sectorCategory = sectorIdx !== -1 ? (row[sectorIdx] ?? "").trim() : "General";
    if (!companyName) continue;
    const key = companyName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suppliers.push({ companyName, organizationNumber, country, sectorCategory });
  }
  return suppliers;
}

function statusChipClass(status: BatchEntry["status"]): string {
  if (status === "done") return "border-emerald-300 bg-emerald-100 text-emerald-700";
  if (status === "scanning") return "border-cyan-300 bg-cyan-100 text-cyan-700";
  if (status === "error") return "border-red-300 bg-red-100 text-red-700";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

export default function ScanIntakePanel({
  isSubmittingSingle,
  onSubmitSingle,
  onBatchCompleted
}: ScanIntakePanelProps) {
  const [mode, setMode] = useState<"single" | "csv">("single");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("SE");
  const [sectorCategory, setSectorCategory] = useState("General");
  const [orgNumber, setOrgNumber] = useState("");
  const [isScanningList, setIsScanningList] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<(BatchEntry & { id: string })[]>([]);

  const completedCount = useMemo(
    () => batchItems.filter((item) => item.status === "done" || item.status === "error").length,
    [batchItems]
  );

  const handleSingleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = companyName.trim();
    if (!name) return;
    await onSubmitSingle({
      supplier_name: name,
      country: country || "SE",
      sector_category: sectorCategory || "General",
      org_number: orgNumber.trim() || undefined,
    });
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setBatchItems([]);

    try {
      const content = await file.text();
      const rows = parseCsvMatrix(content, detectDelimiter(content));
      const suppliers = extractSuppliers(rows);

      if (suppliers.length === 0) {
        setParseError("No supplier rows detected. Include at least a company name column.");
        return;
      }

      const queued = suppliers.map((s, i) => ({
        id: `${Date.now()}-${i}`,
        supplier_name: s.companyName,
        org_number: s.organizationNumber,
        status: "queued" as const,
      }));

      setBatchItems(queued);
      setIsScanningList(true);

      const batchResults: BatchEntry[] = queued.map((item) => ({ ...item }));

      for (let i = 0; i < suppliers.length; i++) {
        const s = suppliers[i];
        const itemId = queued[i].id;

        setBatchItems((prev) =>
          prev.map((e) => (e.id === itemId ? { ...e, status: "scanning" } : e))
        );

        try {
          const input: SupplierInput = {
            supplier_name: s.companyName,
            country: s.country,
            sector_category: s.sectorCategory,
            org_number: s.organizationNumber || undefined,
          };
          const result = await scanSingle(input);
          addToHistory(result);

          setBatchItems((prev) =>
            prev.map((e) => (e.id === itemId ? { ...e, status: "done", result } : e))
          );
          batchResults[i] = { ...batchResults[i], status: "done", result };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Scan failed.";
          setBatchItems((prev) =>
            prev.map((e) => (e.id === itemId ? { ...e, status: "error", error: message } : e))
          );
          batchResults[i] = { ...batchResults[i], status: "error", error: message };
        }
      }

      saveBatch(file.name, batchResults);
      onBatchCompleted?.();
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Could not parse CSV file.");
    } finally {
      setIsScanningList(false);
      event.target.value = "";
    }
  };

  return (
    <section className="panel p-6 md:p-8">
      <p className="panel-title">Start a Scan</p>
      <h1 className="mt-2 font-[var(--font-display)] text-3xl font-semibold md:text-4xl">
        Sanctions Risk Screening
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
        Screen a single company or upload a CSV of suppliers. Each company is checked against sanctions lists, PEP databases, and adverse media.
      </p>

      <div className="mt-6 inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            mode === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Single Company
        </button>
        <button
          type="button"
          onClick={() => setMode("csv")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            mode === "csv" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Upload CSV
        </button>
      </div>

      {mode === "single" ? (
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSingleSubmit}>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Company Name
            </span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-cyan-100"
              placeholder="Volvo, Ericsson, Saab..."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Country</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-cyan-100"
              placeholder="SE"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Sector</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-cyan-100"
              placeholder="Manufacturing, Defense, Electronics..."
              value={sectorCategory}
              onChange={(e) => setSectorCategory(e.target.value)}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Org Number (optional, Swedish)
            </span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ocean focus:ring-2 focus:ring-cyan-100"
              placeholder="5560125790"
              value={orgNumber}
              onChange={(e) => setOrgNumber(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmittingSingle}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmittingSingle ? "Running scan..." : "Run Sanctions Scan"}
          </button>
        </form>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => void handleCsvUpload(event)}
                disabled={isScanningList}
              />
              {isScanningList ? "Scanning list..." : "Upload CSV"}
            </label>
            <Link href="/scans" className="text-sm font-medium text-cyan-700 underline">
              View Uploaded Lists
            </Link>
          </div>

          <p className="mt-3 text-sm text-slate-600">
            Expected columns: supplier_name, country, sector_category, org_number (optional).
          </p>

          {parseError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {parseError}
            </p>
          ) : null}

          {batchItems.length > 0 ? (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>{batchItems.length} suppliers loaded</span>
                <span>{completedCount}/{batchItems.length} processed</span>
              </div>
              <div className="space-y-3">
                {batchItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item.supplier_name}</p>
                        <p className="text-xs text-slate-500">Org: {item.org_number || "N/A"}</p>
                        {item.error ? <p className="mt-1 text-xs text-red-700">{item.error}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.result ? (
                          <>
                            <span className="metric-chip">{item.result.risk_level}</span>
                            <span className="metric-chip">Score {item.result.sanctions_risk_score}</span>
                          </>
                        ) : null}
                        <span className={`rounded-full border px-3 py-1 text-xs ${statusChipClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
