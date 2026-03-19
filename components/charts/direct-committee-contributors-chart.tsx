"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactCurrency } from "@/lib/format";
import type { DonorAggregateRow } from "@/lib/types";

export default function DirectCommitteeContributorsChart({ data }: { data: DonorAggregateRow[] }) {
  const { openEvidence } = useEvidence();

  const rows = data.slice(0, 14).map((row) => ({
    label: row.donorName,
    amount: row.totalToCandidate,
    evidence: row.evidence[0]
  }));
  const hasData = rows.length > 0;

  return (
    <ChartShell
      title="Direct PAC / Committee Contributions"
      subtitle="Committees and PAC-style contributors giving directly to Maxine"
    >
      {hasData ? (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="#1f3f31" strokeDasharray="3 4" />
              <XAxis dataKey="label" tick={{ fill: "#8ac9a6", fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={88} />
              <YAxis tick={{ fill: "#8ac9a6", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#07120d", border: "1px solid #1f3f31", color: "#d2f9e2", fontSize: 12 }}
                formatter={(value: number) => formatCompactCurrency(value)}
              />
              <Bar dataKey="amount" fill="#ffc857" radius={[4, 4, 0, 0]} onClick={(row: any) => row?.evidence && openEvidence(row.evidence)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState />
      )}
    </ChartShell>
  );
}
