"use client";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ProcessedCandidateData } from "@/lib/types";

export function BundlingPatterns({ data }: { data: ProcessedCandidateData }) {
  const { openEvidence } = useEvidence();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ClusterTable
          title="Same-day donation clusters"
          headers={["Day", "Contributions", "Total"]}
          rows={data.contributionClusters.sameDay.slice(0, 20).map((row) => ({
            key: row.day,
            values: [formatDate(row.day), String(row.contributions), formatCurrency(row.total)],
            evidence: row.evidence
          }))}
          onOpen={openEvidence}
        />
        <ClusterTable
          title="Same-employer clusters"
          headers={["Employer", "Contributors", "Total"]}
          rows={data.contributionClusters.sameEmployer.slice(0, 20).map((row) => ({
            key: row.employer,
            values: [row.employer, String(row.contributors), formatCurrency(row.total)],
            evidence: row.evidence
          }))}
          onOpen={openEvidence}
        />
        <ClusterTable
          title="ZIP / city concentration"
          headers={["Geography", "Contributors", "Total"]}
          rows={data.contributionClusters.geography.slice(0, 20).map((row) => ({
            key: row.geography,
            values: [row.geography, String(row.contributors), formatCurrency(row.total)],
            evidence: row.evidence
          }))}
          onOpen={openEvidence}
        />
        <ClusterTable
          title="Repeat high-dollar patterns"
          headers={["Donor", "Contributions", "Total"]}
          rows={data.contributionClusters.repeatHighDollar.slice(0, 20).map((row) => ({
            key: row.donor,
            values: [row.donor, String(row.contributions), formatCurrency(row.total)],
            evidence: row.evidence
          }))}
          onOpen={openEvidence}
        />
      </div>
    </div>
  );
}

function ClusterTable({
  title,
  headers,
  rows,
  onOpen
}: {
  title: string;
  headers: [string, string, string];
  rows: Array<{ key: string; values: [string, string, string]; evidence: any }>;
  onOpen: (evidence: any) => void;
}) {
  return (
    <article className="rounded border border-border bg-panel p-4">
      <h3 className="text-sm font-semibold text-neon">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              {headers.map((header) => (
                <th key={header} className="py-2">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-xs text-muted">
                  No cluster patterns detected for the current filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${title}-${row.key}`} className="border-b border-border/60 hover:bg-bg/70">
                  <td className="py-2">
                    <button onClick={() => onOpen(row.evidence)} className="text-left text-neon hover:underline">
                      {row.values[0]}
                    </button>
                  </td>
                  <td className="py-2">{row.values[1]}</td>
                  <td className="py-2">{row.values[2]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
