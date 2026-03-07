"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { SubScores } from "@/lib/types";

interface RiskBreakdownChartProps {
  subScores: SubScores;
}

function colorByScore(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#84CC16";
  if (score >= 40) return "#F59E0B";
  if (score >= 20) return "#F97316";
  return "#EF4444";
}

export default function RiskBreakdownChart({ subScores }: RiskBreakdownChartProps) {
  const data = [
    { category: "Sanctions", score: subScores.direct_sanctions },
    { category: "PEP", score: subScores.pep_exposure },
    { category: "Media", score: subScores.adverse_media },
  ];

  return (
    <section className="panel p-6">
      <p className="panel-title">Visual Breakdown</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="score" radius={[8, 8, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.category} fill={colorByScore(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
