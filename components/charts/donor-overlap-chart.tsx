"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import type { EvidenceRecord } from "@/lib/types";

export default function DonorOverlapChart({
  totalDirect,
  overlap
}: {
  totalDirect: number;
  overlap: Array<{ label: string; value: number; evidence: EvidenceRecord }>;
}) {
  const { openEvidence } = useEvidence();

  const overlapCount = overlap.length;
  const hasData = totalDirect > 0;
  const chartData = [
    {
      label: "Direct-only donors",
      value: Math.max(totalDirect - overlapCount, 0),
      evidence: {
        id: "overlap-direct-only",
        label: "Direct-only donors",
        type: "summary",
        why: "Direct donors with no documented overlap in AIPAC PAC donor records.",
        tags: ["overlap", "direct-only"]
      }
    },
    {
      label: "AIPAC overlap donors",
      value: overlapCount,
      evidence: {
        id: "overlap-aipac",
        label: "AIPAC overlap donors",
        type: "summary",
        why: "Direct donors who also appear in documented AIPAC PAC donor records under matching rules.",
        tags: ["overlap", "aipac"]
      }
    }
  ];

  return (
    <ChartShell title="Donor Overlap" subtitle="Maxine direct donors compared with documented AIPAC PAC donor records" indirect>
      {hasData ? (
        <div className="h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                onClick={(entry: any) => entry?.payload?.evidence && openEvidence(entry.payload.evidence)}
              >
                {chartData.map((row) => (
                  <Cell key={row.label} fill={row.label.includes("AIPAC") ? "#ffc857" : "#39ff88"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#07120d", border: "1px solid #1f3f31", color: "#d2f9e2", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState />
      )}
    </ChartShell>
  );
}
