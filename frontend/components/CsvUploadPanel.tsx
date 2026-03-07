"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";

import { createScan } from "@/lib/api";
import type { ScanReport, ScanSummary } from "@/lib/types";

interface CsvUploadPanelProps {
  onBatchCompleted?: () => Promise<void> | void;
}

interface ParsedSupplier {
  companyName: string;
  organizationNumber: string;
}

type BatchStatus = "queued" | "scanning" | "done" | "error";

interface BatchItem extends ParsedSupplier {
  id: string;
  status: BatchStatus;
  scan?: ScanSummary;
  error?: string;
}

const COMPANY_HEADER_KEYS = [
  "company name",
  "company",
  "supplier name",
  "supplier",
  "legal name",
  "organization name",
  "organisation name",
  "name"
];

const ORG_HEADER_KEYS = [
  "organization number",
  "organisation number",
  "org number",
  "org no",
  "org nr",
  "orgnr",
  "registration number",
  "registration no",
  "company number",
  "registration id"
];

function detectDelimiter(content: string): "," | ";" {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsvMatrix(content: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  for (let headerIndex = 0; headerIndex < headers.length; headerIndex += 1) {
    const header = headers[headerIndex];
    for (const candidate of candidates) {
      if (header === candidate || header.includes(candidate)) {
        return headerIndex;
      }
    }
  }
  return -1;
}

function extractSuppliers(rows: string[][]): ParsedSupplier[] {
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  const companyIndex = findHeaderIndex(headers, COMPANY_HEADER_KEYS);
  const orgIndex = findHeaderIndex(headers, ORG_HEADER_KEYS);
  const hasHeader = companyIndex !== -1 || orgIndex !== -1;

  const startRow = hasHeader ? 1 : 0;
  const companyColumn = companyIndex !== -1 ? companyIndex : 0;
  const orgColumn = orgIndex !== -1 ? orgIndex : 1;

  const suppliers: ParsedSupplier[] = [];
  const seen = new Set<string>();

  for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const companyName = (row[companyColumn] ?? "").trim();
    const organizationNumber = (row[orgColumn] ?? "").trim();
    if (!companyName) {
      continue;
    }

    const dedupeKey = `${companyName.toLowerCase()}|${organizationNumber.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    suppliers.push({ companyName, organizationNumber });
  }

  return suppliers;
}

function toSummary(report: ScanReport): ScanSummary {
  return {
    id: report.id,
    company_name: report.company_name,
    country: report.country,
    sector: report.sector,
    score: report.score,
    grade: report.grade,
    confidence: report.confidence,
    status: report.status,
    created_at: report.created_at
  };
}

function riskLabel(score: number): string {
  if (score <= 20) return "Low";
  if (score <= 40) return "Moderate";
  if (score <= 60) return "Elevated";
  if (score <= 80) return "High";
  return "Critical";
}

function statusChipClass(status: BatchStatus): string {
  if (status === "done") return "border-emerald-300 bg-emerald-100 text-emerald-700";
  if (status === "scanning") return "border-cyan-300 bg-cyan-100 text-cyan-700";
  if (status === "error") return "border-red-300 bg-red-100 text-red-700";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

export default function CsvUploadPanel({ onBatchCompleted }: CsvUploadPanelProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  const completedCount = useMemo(
    () => batchItems.filter((item) => item.status === "done" || item.status === "error").length,
    [batchItems]
  );

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setParseError(null);
    setBatchItems([]);

    try {
      const content = await file.text();
      const delimiter = detectDelimiter(content);
      const rows = parseCsvMatrix(content, delimiter);
      const suppliers = extractSuppliers(rows);

      if (suppliers.length === 0) {
        setParseError(
          "No supplier rows were detected. Include at least one company column and optional organization number."
        );
        return;
      }

      const queuedItems: BatchItem[] = suppliers.map((supplier, index) => ({
        id: `${Date.now()}-${index}`,
        companyName: supplier.companyName,
        organizationNumber: supplier.organizationNumber,
        status: "queued"
      }));

      setBatchItems(queuedItems);
      setIsScanning(true);

      for (const item of queuedItems) {
        setBatchItems((previous) =>
          previous.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "scanning",
                  error: undefined
                }
              : entry
          )
        );

        try {
          const report = await createScan({ company_name: item.companyName });
          const summary = toSummary(report);
          setBatchItems((previous) =>
            previous.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "done",
                    scan: summary
                  }
                : entry
            )
          );
        } catch (scanError) {
          const message = scanError instanceof Error ? scanError.message : "Scan failed.";
          setBatchItems((previous) =>
            previous.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "error",
                    error: message
                  }
                : entry
            )
          );
        }
      }

      await onBatchCompleted?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not parse CSV file.";
      setParseError(message);
    } finally {
      setIsScanning(false);
      event.target.value = "";
    }
  };

  return (
    <section className="panel p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="panel-title">Bulk Supplier Scan</p>
          <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold">
            Upload Supplier CSV
          </h2>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void handleFileUpload(event)}
            disabled={isScanning}
          />
          {isScanning ? "Scanning..." : "Upload CSV"}
        </label>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        Expected columns: company name and organization number. Header variants such as
        <span className="font-medium"> `Company Name`</span>, <span className="font-medium">`Org Number`</span>,
        and semicolon-separated CSV are supported.
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
            <span>
              {completedCount}/{batchItems.length} processed
            </span>
          </div>

          <div className="space-y-3">
            {batchItems.map((item) => {
              const content = (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.companyName}</p>
                    <p className="text-xs text-slate-500">
                      Org Number: {item.organizationNumber || "Not provided"}
                    </p>
                    {item.error ? <p className="mt-1 text-xs text-red-700">{item.error}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.scan ? (
                      <>
                        <span className="metric-chip">{riskLabel(item.scan.score)} Risk</span>
                        <span className="metric-chip">Score {item.scan.score}</span>
                      </>
                    ) : null}
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusChipClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              );

              if (item.scan) {
                return (
                  <Link
                    key={item.id}
                    href={`/scans/${item.scan.id}`}
                    className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-cyan-300 hover:bg-cyan-50/30"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
