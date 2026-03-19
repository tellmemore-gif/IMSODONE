"use client";

import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactCurrency } from "@/lib/format";
import type { SankeyGraphData } from "@/lib/types";

export default function IndirectFlowSankey({ data }: { data: SankeyGraphData }) {
  const { openEvidence } = useEvidence();

  const grouped = Array.from(
    data.links.reduce((map, link) => {
      const key = `${link.source}-${link.target}`;
      const existing = map.get(key) ?? { ...link, originalValue: 0 };
      existing.value += link.value;
      existing.originalValue += link.value;
      map.set(key, existing);
      return map;
    }, new Map<string, (typeof data.links)[number] & { originalValue: number }>())
  ).map(([, value]) => value);

  const links = grouped.map((link, index) => {
    return {
      ...link,
      value: link.value + (index + 1) * 0.000001
    };
  });
  const hasData = links.length > 0;

  return (
    <ChartShell
      title="Indirect Political Funding Network"
      subtitle="Donors -> PACs -> PACs -> expenditures (indirect network analysis)"
      indirect
    >
      {hasData ? (
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={{ nodes: data.nodes, links }}
              nodePadding={18}
              margin={{ top: 8, right: 10, bottom: 8, left: 10 }}
              link={{ stroke: "#39ff88", strokeOpacity: 0.28 }}
              node={{ stroke: "#124d30", fill: "#0f6e41", fillOpacity: 0.85 }}
              onClick={(payload: any) => {
                const evidence = payload?.payload?.evidence || payload?.evidence;
                if (evidence) openEvidence(evidence);
              }}
            >
              <Tooltip
                contentStyle={{ background: "#07120d", border: "1px solid #1f3f31", color: "#d2f9e2", fontSize: 12 }}
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
