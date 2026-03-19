"use client";

import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactCurrency } from "@/lib/format";
import type { SankeyGraphData } from "@/lib/types";

export default function DirectFundingSankey({ data }: { data: SankeyGraphData }) {
  const { openEvidence } = useEvidence();

  const linkUsage = new Map<string, number>();
  const links = data.links.map((link) => {
    const key = `${link.source}-${link.target}-${link.value}-${link.evidence.id}`;
    const seen = linkUsage.get(key) ?? 0;
    linkUsage.set(key, seen + 1);

    return {
      ...link,
      originalValue: link.value,
      value: link.value + (seen + 1) * 0.000001
    };
  });
  const hasData = links.some((item) => item.originalValue > 0);

  return (
    <ChartShell
      title="Direct Funding to Maxine Dexter"
      subtitle="Donors and PACs directly into committee receipts, plus outside race spending context"
      indirect={false}
    >
      {hasData ? (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={{ nodes: data.nodes, links }}
              nodePadding={22}
              margin={{ top: 8, right: 10, bottom: 8, left: 10 }}
              link={{ stroke: "#39ff88", strokeOpacity: 0.35 }}
              node={{ stroke: "#10462b", fill: "#39ff88", fillOpacity: 0.8 }}
              onClick={(payload: any) => {
                const evidence = payload?.payload?.evidence || payload?.evidence;
                if (evidence) openEvidence(evidence);
              }}
            >
              <Tooltip
                contentStyle={{
                  background: "#07120d",
                  border: "1px solid #1f3f31",
                  color: "#d2f9e2",
                  fontSize: 12
                }}
                formatter={(_: number, __: string, item: any) => formatCompactCurrency(item?.payload?.originalValue ?? item?.value ?? 0)}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState />
      )}
    </ChartShell>
  );
}
