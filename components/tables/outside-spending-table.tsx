"use client";

import { useMemo, useState } from "react";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExpenditureRecord, EvidenceRecord } from "@/lib/types";

export function OutsideSpendingTable({
  rows
}: {
  rows: Array<ExpenditureRecord & { evidence: EvidenceRecord[] }>;
}) {
  const { openEvidence } = useEvidence();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (!search) return true;
        const needle = search.toLowerCase();
        return (
          row.committeeName.toLowerCase().includes(needle) ||
          row.targetCandidate.toLowerCase().includes(needle) ||
          row.purpose.toLowerCase().includes(needle)
        );
      }),
    [rows, search]
  );

  return (
    <section className="space-y-3 rounded border border-border bg-panel p-4">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search spender, target, purpose"
        className="w-full rounded border border-border bg-bg px-2 py-2 text-xs"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2">Spender</th>
              <th className="py-2">Support/Oppose</th>
              <th className="py-2">Target</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Date</th>
              <th className="py-2">Purpose</th>
              <th className="py-2">Receipts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted">
                  No outside spending records match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-bg/70">
                  <td className="py-2">
                    <button onClick={() => openEvidence(row.evidence[0])} className="text-left text-neon hover:underline">
                      {row.committeeName}
                    </button>
                  </td>
                  <td className="py-2">{row.supportOppose}</td>
                  <td className="py-2">{row.targetCandidate}</td>
                  <td className="py-2">{formatCurrency(row.amount)}</td>
                  <td className="py-2">{formatDate(row.date)}</td>
                  <td className="py-2">{row.purpose}</td>
                  <td className="py-2">{row.receiptId ? 1 : 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
