"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ScanDashboard from "@/components/ScanDashboard";
import { getScan } from "@/lib/api";
import type { ScanReport } from "@/lib/types";

interface ScanReportClientProps {
  scanId: number;
}

export default function ScanReportClient({ scanId }: ScanReportClientProps) {
  const [scan, setScan] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadScan() {
      setLoading(true);
      setError(null);
      try {
        const result = await getScan(scanId);
        if (isMounted) {
          setScan(result);
        }
      } catch (scanError) {
        if (isMounted) {
          const message = scanError instanceof Error ? scanError.message : "Could not load scan.";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadScan();
    return () => {
      isMounted = false;
    };
  }, [scanId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <section className="panel p-8">
          <p className="panel-title">Loading Report</p>
          <p className="mt-3 text-sm text-slate-600">Fetching score, evidence, and source citations.</p>
        </section>
      </main>
    );
  }

  if (error || !scan) {
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

  return <ScanDashboard scan={scan} />;
}
