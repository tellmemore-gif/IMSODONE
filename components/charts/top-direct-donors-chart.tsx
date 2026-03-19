"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactCurrency } from "@/lib/format";
import type { DonorAggregateRow } from "@/lib/types";

export default function TopDirectDonorsChart({ data }: { data: DonorAggregateRow[] }) {
  const { openEvidence } = useEvidence();

  const rows = data.slice(0, 12).map((row) => ({
    donorName: row.donorName,
    totalToCandidate: row.totalToCandidate,
    overlapStatus: row.overlapStatus,
    evidence: row.evidence[0]
  }));
  const hasData = rows.length > 0;

  return (
    <ChartShell title="Top Direct Donors" subtitle="Largest contributors giving directly to Maxine">
      {hasData ? (
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 6 }}>
              <CartesianGrid stroke="#1f3f31" strokeDasharray="3 4" />
              <XAxis type="number" tick={{ fill: "#8ac9a6", fontSize: 11 }} />
              <YAxis dataKey="donorName" type="category" width={140} tick={{ fill: "#8ac9a6", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#07120d", border: "1px solid #1f3f31", color: "#d2f9e2", fontSize: 12 }}
                formatter={(value: number) => formatCompactCurrency(value)}
              />
              <Bar dataKey="totalToCandidate" radius={[0, 4, 4, 0]} onClick={(entry: any) => entry?.evidence && openEvidence(entry.evidence)}>
                {rows.map((row, index) => (
                  <Cell key={`${row.donorName}-${index}`} fill={row.overlapStatus ? "#ffc857" : "#39ff88"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState />
      )}
    </ChartShell>
  );
}
