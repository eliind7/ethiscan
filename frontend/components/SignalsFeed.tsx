import type { Signal } from "@/lib/types";

interface SignalsFeedProps {
  signals: Signal[];
}

function signalTone(sentiment: Signal["sentiment"]): string {
  if (sentiment === "positive") return "border-emerald-200 bg-emerald-50";
  if (sentiment === "negative") return "border-red-200 bg-red-50";
  return "border-slate-200 bg-slate-50";
}

function sentimentLabel(sentiment: Signal["sentiment"]): string {
  if (sentiment === "positive") return "Positive";
  if (sentiment === "negative") return "Negative";
  return "Neutral";
}

export default function SignalsFeed({ signals }: SignalsFeedProps) {
  return (
    <section className="panel p-6">
      <p className="panel-title">Recent Signals</p>
      <div className="mt-4 space-y-3">
        {signals.map((signal) => (
          <article key={signal.id} className={`rounded-xl border p-4 ${signalTone(signal.sentiment)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{signal.title}</h3>
              <span className="metric-chip">
                {sentimentLabel(signal.sentiment)} · Sev {signal.severity}/5
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{signal.quote}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>{new Date(signal.occurred_at).toLocaleDateString()}</span>
              <span>{signal.source_name}</span>
              <a
                className="font-medium text-cyan-700 underline underline-offset-2"
                href={signal.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Open source
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
