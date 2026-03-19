"use client";

import { useState } from "react";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OverlapRow } from "@/lib/types";

export function OverlapTable({ rows }: { rows: OverlapRow[] }) {
  const { openEvidence } = useEvidence();
  const [search, setSearch] = useState("");

  const filtered = rows.filter((row) => {
    if (!search) return true;
    const needle = search.toLowerCase();
    return row.donorName.toLowerCase().includes(needle) || row.aipacCommittee.toLowerCase().includes(needle);
  });

  function buildPacReceiptOptions(row: OverlapRow) {
    const options: Array<{ url: string; label: string }> = [];
    const seen = new Set<string>();

    for (const item of row.evidence) {
      if (item.type !== "overlap" || !item.filingUrl) continue;
      const date = item.dates?.[0] || "";
      const amount = typeof item.amount === "number" ? formatCurrency(item.amount) : "";
      const committee = item.recipientName || row.aipacCommittee;
      const label = [date ? formatDate(date) : "", amount, committee].filter(Boolean).join(" · ");
      const key = `${item.filingUrl}|${date}|${item.amount ?? ""}|${committee}`;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({ url: item.filingUrl, label: label || "Open receipt" });
    }

    return options;
  }

  return (
    <section className="space-y-3 rounded border border-border bg-panel p-4">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search overlap donors"
        className="w-full rounded border border-border bg-bg px-2 py-2 text-xs"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2">Donor</th>
              <th className="py-2">Total to Maxine</th>
              <th className="py-2">AIPAC committee match</th>
              <th className="py-2">Match level</th>
              <th className="py-2">Confidence</th>
              <th className="py-2">Receipts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-muted">
                  No overlap records for the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const options = buildPacReceiptOptions(row);

                return (
                  <tr key={row.donorId} className="border-b border-border/60 hover:bg-bg/70">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEvidence(row.evidence[0])} className="text-left text-neon hover:underline">
                          {row.donorName}
                        </button>
                      </div>
                    </td>
                    <td className="py-2">{formatCurrency(row.totalToCandidate)}</td>
                    <td className="py-2">{row.aipacCommittee}</td>
                    <td className="py-2">{row.matchLabel}</td>
                    <td className="py-2">{Math.round(row.matchConfidence * 100)}%</td>
                    <td className="py-2">
                      {options.length === 0 ? (
                        <span className="text-muted">No links</span>
                      ) : (
                        <select
                          defaultValue=""
                          className="w-full min-w-[220px] rounded border border-border bg-bg px-2 py-1 text-xs"
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            if (!value) return;
                            window.open(value, "_blank", "noopener,noreferrer");
                            event.currentTarget.value = "";
                          }}
                        >
                          <option value="">Select PAC receipt ({options.length})</option>
                          {options.map((option, index) => (
                            <option key={`${row.donorId}-${index}-${option.url}`} value={option.url}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
