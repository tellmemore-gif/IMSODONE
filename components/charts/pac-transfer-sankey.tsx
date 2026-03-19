"use client";

import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { ChartShell } from "@/components/charts/chart-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactCurrency } from "@/lib/format";
import type { EvidenceRecord } from "@/lib/types";

type TransferRow = { from: string; to: string; amount: number; date: string; evidence: EvidenceRecord };

export default function PacTransferSankey({ data }: { data: TransferRow[] }) {
  const { openEvidence } = useEvidence();

  const grouped = Array.from(
    data.slice(0, 120).reduce((map, row) => {
      const key = `${row.from}=>${row.to}`;
      const existing = map.get(key) ?? { from: row.from, to: row.to, amount: 0, maxAmount: 0, evidence: row.evidence };
      existing.amount += row.amount;
      if (row.amount > existing.maxAmount) {
        existing.maxAmount = row.amount;
        existing.evidence = row.evidence;
      }
      map.set(key, existing);
      return map;
    }, new Map<string, { from: string; to: string; amount: number; maxAmount: number; evidence: EvidenceRecord }>())
  ).map(([, value]) => ({ from: value.from, to: value.to, amount: value.amount, evidence: value.evidence }));

  const nodeNames = Array.from(new Set(grouped.flatMap((row) => [row.from, row.to])));
  const index = new Map(nodeNames.map((name, i) => [name, i]));

  const links = grouped
    .map((row) => ({ source: index.get(row.from), target: index.get(row.to), value: row.amount, evidence: row.evidence }))
    .filter((row): row is { source: number; target: number; value: number; evidence: EvidenceRecord } => row.source != null && row.target != null);

  const uniqueLinks = links.map((row, index) => {
    const bump = (index + 1) * 0.000001;

    return {
      ...row,
      originalValue: row.value,
      value: row.value + bump
    };
  });
  const hasData = uniqueLinks.length > 0;

  return (
    <ChartShell title="PAC-to-PAC Transfers" subtitle="Committee-to-committee movement in indirect network analysis" indirect>
      {hasData ? (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={{ nodes: nodeNames.map((name) => ({ name })), links: uniqueLinks }}
              nodePadding={20}
              margin={{ top: 8, right: 10, bottom: 8, left: 10 }}
              link={{ stroke: "#ffc857", strokeOpacity: 0.35 }}
              node={{ stroke: "#2e2308", fill: "#ffc857", fillOpacity: 0.85 }}
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
