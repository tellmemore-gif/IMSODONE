"use client";

import { useMemo, useState } from "react";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { formatDate } from "@/lib/format";
import type { DocumentRecord, EvidenceRecord } from "@/lib/types";

const TYPES = ["all", "filing", "receipt", "article", "screenshot", "memo"] as const;

export function DocumentsTable({ rows }: { rows: Array<DocumentRecord & { evidence: EvidenceRecord }> }) {
  const { openEvidence } = useEvidence();
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const byType = type === "all" ? true : row.type.toLowerCase().includes(type);
      const bySearch =
        search.length === 0
          ? true
          : row.title.toLowerCase().includes(search.toLowerCase()) || row.tags.join(" ").toLowerCase().includes(search.toLowerCase());
      return byType && bySearch;
    });
  }, [rows, search, type]);

  return (
    <section className="space-y-3 rounded border border-border bg-panel p-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by donor, PAC, committee, evidence tag"
          className="w-full max-w-sm rounded border border-border bg-bg px-2 py-2 text-xs"
        />
        <select value={type} onChange={(event) => setType(event.target.value as (typeof TYPES)[number])} className="rounded border border-border bg-bg px-2 py-2 text-xs">
          {TYPES.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "Evidence type: all" : item}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2">Title</th>
              <th className="py-2">Type</th>
              <th className="py-2">Date</th>
              <th className="py-2">Committee</th>
              <th className="py-2">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-muted">
                  No documents match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-bg/70">
                  <td className="py-2">
                    <div className="space-y-1">
                      <button onClick={() => openEvidence(row.evidence)} className="text-left text-neon hover:underline">
                        {row.title}
                      </button>
                      <a href={row.url} target="_blank" rel="noreferrer" className="text-[10px] text-amber hover:underline">
                        Open file
                      </a>
                    </div>
                  </td>
                  <td className="py-2">{row.type}</td>
                  <td className="py-2">{formatDate(row.date)}</td>
                  <td className="py-2">{row.committeeId || "-"}</td>
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
