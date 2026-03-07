"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Subscore } from "@/lib/types";

interface RiskBreakdownChartProps {
  subscores: Subscore[];
}

function colorByScore(score: number): string {
  if (score <= 20) return "#10B981";
  if (score <= 40) return "#84CC16";
  if (score <= 60) return "#F59E0B";
  if (score <= 80) return "#F97316";
  return "#EF4444";
}

export default function RiskBreakdownChart({ subscores }: RiskBreakdownChartProps) {
  return (
    <section className="panel p-6">
      <p className="panel-title">Visual Breakdown</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={subscores}>
            <XAxis dataKey="category" tick={{ fontSize: 12 }} interval={0} angle={-18} textAnchor="end" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="score" radius={[8, 8, 0, 0]}>
              {subscores.map((entry) => (
                <Cell key={entry.category} fill={colorByScore(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
