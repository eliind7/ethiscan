"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import RecentScans from "@/components/RecentScans";
import ScanIntakePanel from "@/components/ScanIntakePanel";
import ScanProgress from "@/components/ScanProgress";
import { addToHistory, listHistory, scanSingle } from "@/lib/api";
import type { ScanHistoryEntry, SupplierInput } from "@/lib/types";

const PIPELINE_STEPS = [
  "Resolving company identity via registry",
  "Screening sanctions lists (EU, UN, OFAC, UK)",
  "Screening key people against PEP databases",
  "Fetching adverse media from news sources",
  "Extracting risk signals with LLM analysis",
  "Computing weighted risk score"
];

const MIN_PROGRESS_MS = 6000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function HomePage() {
  const router = useRouter();
  const [recentScans, setRecentScans] = useState<ScanHistoryEntry[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunningScan, setIsRunningScan] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const loadRecentScans = useCallback(async () => {
    setLoadingScans(true);
    try {
      setRecentScans(await listHistory());
    } finally {
      setLoadingScans(false);
    }
  }, []);

  useEffect(() => {
    loadRecentScans();
  }, [loadRecentScans]);

  const progressSteps = useMemo(() => PIPELINE_STEPS, []);

  const handleCreateScan = async (payload: SupplierInput) => {
    setRunError(null);
    setIsRunningScan(true);
    setCurrentStep(0);

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setCurrentStep((previous) => Math.min(previous + 1, progressSteps.length - 1));
    }, MIN_PROGRESS_MS / progressSteps.length);

    try {
      const result = await scanSingle(payload);
      const entry = addToHistory(result);
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_PROGRESS_MS) {
        await wait(MIN_PROGRESS_MS - elapsed);
      }
      router.push(`/scans/${entry.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed.";
      setRunError(message);
      setIsRunningScan(false);
    } finally {
      window.clearInterval(intervalId);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      {isRunningScan ? (
        <ScanProgress steps={progressSteps} currentStep={currentStep} />
      ) : (
        <ScanIntakePanel
          isSubmittingSingle={isRunningScan}
          onSubmitSingle={handleCreateScan}
          onBatchCompleted={loadRecentScans}
        />
      )}

      {runError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {runError}
        </section>
      ) : null}

      {loadingScans ? (
        <section className="panel p-6">
          <p className="panel-title">Recent Scans</p>
          <p className="mt-3 text-sm text-slate-600">Loading previous reports...</p>
        </section>
      ) : (
        <RecentScans scans={recentScans} />
      )}
    </main>
  );
}
