"use client";

import { useState } from "react";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReceiptRecord } from "@/lib/types";

export function ReceiptsTable({ rows }: { rows: ReceiptRecord[] }) {
  const { openEvidence } = useEvidence();
  const [search, setSearch] = useState("");

  const filtered = rows.filter((row) => {
    if (!search) return true;
    const needle = search.toLowerCase();
    return (
      row.title.toLowerCase().includes(needle) ||
      row.contributorName.toLowerCase().includes(needle) ||
      row.recipientName.toLowerCase().includes(needle) ||
      row.tags.join(" ").toLowerCase().includes(needle)
    );
  });

  return (
    <section className="space-y-3 rounded border border-border bg-panel p-4">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search receipts by donor, committee, memo, tag"
        className="w-full rounded border border-border bg-bg px-2 py-2 text-xs"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2">Receipt</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Date</th>
              <th className="py-2">Contributor</th>
              <th className="py-2">Recipient</th>
              <th className="py-2">Type</th>
              <th className="py-2">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted">
                  No receipts match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-bg/70">
                  <td className="py-2">
                    <div className="space-y-1">
                      <button
                        onClick={() =>
                          openEvidence({
                            id: `receipt-${row.id}`,
                            label: row.title,
                            type: "receipt",
                            why: "Official receipt or filing record.",
                            amount: row.amount,
                            dates: [row.date],
                            sourceType: row.sourceType,
                            sourceTitle: row.sourceTitle,
                            sourceUrl: row.sourceUrl,
                            receiptId: row.id,
                            fecDocumentId: row.fecDocumentId,
                            filingUrl: row.filingUrl,
                            committeeId: row.committeeId,
                            contributorName: row.contributorName,
                            recipientName: row.recipientName,
                            memoText: row.memoText,
                            supportOppose: row.supportOppose,
                            notes: row.notes,
                            tags: row.tags
                          })
                        }
                        className="text-left text-neon hover:underline"
                      >
                        {row.title}
                      </button>
                      {row.filingUrl ? (
                        <a href={row.filingUrl} target="_blank" rel="noreferrer" className="text-[10px] text-amber hover:underline">
                          Open filing
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2">{formatCurrency(row.amount)}</td>
                  <td className="py-2">{formatDate(row.date)}</td>
                  <td className="py-2">{row.contributorName || "-"}</td>
                  <td className="py-2">{row.recipientName || "-"}</td>
                  <td className="py-2">{row.sourceType || "-"}</td>
                  <td className="py-2">{row.tags.join(", ")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
