"use client";

import { useMemo, useState } from "react";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { formatDate } from "@/lib/format";
import type { EvidenceRecord, MediaRecord } from "@/lib/types";

const TAGS = ["AIPAC", "dark money", "outside spending", "bundling", "primary", "opponent", "PACs", "fundraising"];

export function MediaTable({ rows }: { rows: Array<MediaRecord & { evidence: EvidenceRecord }> }) {
  const { openEvidence } = useEvidence();
  const [tag, setTag] = useState("all");

  const filtered = useMemo(() => {
    if (tag === "all") return rows;
    return rows.filter((row) => row.tags.map((x) => x.toLowerCase()).includes(tag.toLowerCase()));
  }, [rows, tag]);

  return (
    <section className="space-y-3 rounded border border-border bg-panel p-4">
      <div className="flex flex-wrap gap-2">
        <button
          className={[
            "rounded border px-2 py-1 text-xs",
            tag === "all" ? "border-neon bg-neon/10 text-neon" : "border-border bg-bg text-muted"
          ].join(" ")}
          onClick={() => setTag("all")}
        >
          All tags
        </button>
        {TAGS.map((value) => (
          <button
            key={value}
            className={[
              "rounded border px-2 py-1 text-xs",
              tag === value ? "border-neon bg-neon/10 text-neon" : "border-border bg-bg text-muted"
            ].join(" ")}
            onClick={() => setTag(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2">Headline</th>
              <th className="py-2">Source</th>
              <th className="py-2">Date</th>
              <th className="py-2">Summary</th>
              <th className="py-2">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-muted">
                  No media records for the current year/tag filters.
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
                        Open article
                      </a>
                    </div>
                  </td>
                  <td className="py-2">{row.source}</td>
                  <td className="py-2">{formatDate(row.date)}</td>
                  <td className="py-2 text-muted">{row.summary}</td>
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
