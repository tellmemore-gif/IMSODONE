"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactCurrency } from "@/lib/format";
import type { EvidenceRecord } from "@/lib/types";

export default function OutsideTrendChart({
  data
}: {
  data: Array<{ month: string; total: number; evidence: EvidenceRecord }>;
}) {
  const { openEvidence } = useEvidence();
  const hasData = data.length > 0;

  return (
    <ChartShell title="Outside Spending Trend" subtitle="Independent expenditures in races involving Maxine" indirect>
      {hasData ? (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="#1f3f31" strokeDasharray="3 4" />
              <XAxis dataKey="month" tick={{ fill: "#8ac9a6", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8ac9a6", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#07120d", border: "1px solid #1f3f31", color: "#d2f9e2", fontSize: 12 }}
                formatter={(value: number) => formatCompactCurrency(value)}
              />
              <Line
                dataKey="total"
                type="monotone"
                stroke="#ffc857"
                strokeWidth={2}
                dot={{ r: 3, fill: "#ffc857", stroke: "#2e2308" }}
                activeDot={{
                  r: 5,
                  onClick: (_, payload: any) => {
                    if (payload?.payload?.evidence) openEvidence(payload.payload.evidence);
                  }
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState />
      )}
    </ChartShell>
  );
}
