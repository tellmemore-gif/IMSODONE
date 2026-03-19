"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactCurrency } from "@/lib/format";
import type { EvidenceRecord } from "@/lib/types";

type TimelinePoint = {
  month: string;
  total: number;
  count: number;
  evidence: EvidenceRecord;
};

export default function DirectTimelineChart({ data }: { data: TimelinePoint[] }) {
  const { openEvidence } = useEvidence();
  const hasData = data.length > 0;

  return (
    <ChartShell title="Timeline of Direct Contributions" subtitle="Direct receipts over time (2023-2026)">
      {hasData ? (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="#1f3f31" strokeDasharray="3 4" />
              <XAxis dataKey="month" tick={{ fill: "#8ac9a6", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8ac9a6", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#07120d", border: "1px solid #1f3f31", color: "#d2f9e2", fontSize: 12 }}
                formatter={(value: number) => formatCompactCurrency(value)}
              />
              <Area
                dataKey="total"
                type="monotone"
                stroke="#39ff88"
                fill="#39ff88"
                fillOpacity={0.22}
                activeDot={{
                  r: 5,
                  stroke: "#39ff88",
                  fill: "#07120d",
                  onClick: (_, payload: any) => {
                    if (payload?.payload?.evidence) openEvidence(payload.payload.evidence);
                  }
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState />
      )}
    </ChartShell>
  );
}
