"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ScanDashboard from "@/components/ScanDashboard";
import { getHistoryEntry } from "@/lib/api";
import type { SupplierResult } from "@/lib/types";

interface ScanReportClientProps {
  scanId: number;
}

export default function ScanReportClient({ scanId }: ScanReportClientProps) {
  const [result, setResult] = useState<SupplierResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getHistoryEntry(scanId)
      .then((entry) => {
        if (entry) {
          setResult(entry.result);
        } else {
          setError("Report was not found.");
        }
      })
      .finally(() => setLoading(false));
  }, [scanId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <section className="panel p-8">
          <p className="panel-title">Loading Report</p>
          <p className="mt-3 text-sm text-slate-600">Fetching scan results.</p>
        </section>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <section className="panel p-8">
          <p className="panel-title">Scan Unavailable</p>
          <p className="mt-3 text-sm text-red-700">{error ?? "Report was not found."}</p>
          <Link href="/" className="mt-5 inline-block text-sm font-medium text-cyan-700 underline">
            Return to search
          </Link>
        </section>
      </main>
    );
  }

  return <ScanDashboard result={result} />;
}
