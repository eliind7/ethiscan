interface ScanProgressProps {
  steps: string[];
  currentStep: number;
}

export default function ScanProgress({ steps, currentStep }: ScanProgressProps) {
  return (
    <section className="panel p-6 md:p-8">
      <p className="panel-title">Pipeline Status</p>
      <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold">Analyzing OSINT Signals</h2>
      <p className="mt-2 text-sm text-slate-600">
        We are resolving the legal entity, fetching evidence sources, extracting signals, and computing score
        contributions.
      </p>

      <div className="mt-6 space-y-3">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div
              key={step}
              className={`rounded-xl border px-4 py-3 transition ${
                isComplete
                  ? "border-emerald-200 bg-emerald-50"
                  : isActive
                    ? "border-cyan-200 bg-cyan-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">{step}</span>
                <span
                  className={`metric-chip ${
                    isComplete
                      ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                      : isActive
                        ? "border-cyan-300 bg-cyan-100 text-cyan-700"
                        : "bg-white"
                  }`}
                >
                  {isComplete ? "Done" : isActive ? "Running" : "Queued"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
