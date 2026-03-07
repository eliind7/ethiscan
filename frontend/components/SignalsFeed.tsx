import type { EvidenceItem } from "@/lib/types";

interface EvidenceFeedProps {
  evidence: EvidenceItem[];
}

function sourceTypeStyle(type: string): string {
  if (type === "sanctions_list") return "border-red-200 bg-red-50";
  if (type === "pep") return "border-amber-200 bg-amber-50";
  if (type === "adverse_media") return "border-slate-200 bg-slate-50";
  return "border-slate-200 bg-slate-50";
}

function sourceTypeLabel(type: string): string {
  if (type === "sanctions_list") return "Sanctions List";
  if (type === "pep") return "PEP Match";
  if (type === "adverse_media") return "Adverse Media";
  return type;
}

export default function EvidenceFeed({ evidence }: EvidenceFeedProps) {
  if (evidence.length === 0) {
    return (
      <section className="panel p-6">
        <p className="panel-title">Evidence Pack</p>
        <p className="mt-3 text-sm text-slate-600">No evidence items found. This entity appears clean.</p>
      </section>
    );
  }

  return (
    <section className="panel p-6">
      <p className="panel-title">Evidence Pack</p>
      <div className="mt-4 space-y-3">
        {evidence.map((item, index) => (
          <article key={index} className={`rounded-xl border p-4 ${sourceTypeStyle(item.source_type)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{item.list_name}</h3>
              <span className="metric-chip">
                {sourceTypeLabel(item.source_type)} · Sev {item.severity}/5
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{item.snippet}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              {item.date ? <span>{item.date}</span> : null}
              {item.match_confidence ? <span>Confidence: {Math.round(item.match_confidence * 100)}%</span> : null}
              {item.url ? (
                <a
                  className="font-medium text-cyan-700 underline underline-offset-2"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View source
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
