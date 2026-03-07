import type { SourceRecord } from "@/lib/types";

interface SourcesPanelProps {
  sources: SourceRecord[];
}

function statusStyle(status: string): string {
  if (status.includes("listed") || status.includes("found")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status.includes("no_") || status.includes("not_")) {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function SourcesPanel({ sources }: SourcesPanelProps) {
  return (
    <section className="panel p-6">
      <p className="panel-title">Source Coverage</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Reliability</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-b border-slate-100">
                <td className="px-2 py-3 font-medium text-slate-900">{source.source_name}</td>
                <td className="px-2 py-3 text-slate-600">{source.source_type}</td>
                <td className="px-2 py-3 text-slate-600">{source.reliability}</td>
                <td className="px-2 py-3">
                  <span className={`rounded-full border px-2 py-1 text-xs ${statusStyle(source.status)}`}>
                    {source.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <a
                    className="text-cyan-700 underline underline-offset-2"
                    href={source.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
