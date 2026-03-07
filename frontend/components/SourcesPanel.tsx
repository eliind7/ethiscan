import type { PersonScreened } from "@/lib/types";

interface KeyPeoplePanelProps {
  people: PersonScreened[];
}

export default function KeyPeoplePanel({ people }: KeyPeoplePanelProps) {
  if (people.length === 0) {
    return (
      <section className="panel p-6">
        <p className="panel-title">Key People Screened</p>
        <p className="mt-3 text-sm text-slate-600">
          No key people data available. Provide a Swedish org number to screen board members.
        </p>
      </section>
    );
  }

  return (
    <section className="panel p-6">
      <p className="panel-title">Key People Screened</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">PEP Status</th>
              <th className="px-2 py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="px-2 py-3 font-medium text-slate-900">{person.name}</td>
                <td className="px-2 py-3 text-slate-600">{person.role}</td>
                <td className="px-2 py-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${
                      person.pep_hit
                        ? "border-red-300 bg-red-100 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {person.pep_hit ? "PEP Hit" : "Clear"}
                  </span>
                </td>
                <td className="px-2 py-3 text-slate-600">
                  {person.match_confidence ? `${Math.round(person.match_confidence * 100)}%` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
