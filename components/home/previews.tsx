"use client";

import Link from "next/link";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { formatDate } from "@/lib/format";
import type { DocumentRecord, EvidenceRecord, MediaRecord } from "@/lib/types";

export function MediaPreview({ rows, year }: { rows: Array<MediaRecord & { evidence: EvidenceRecord }>; year: string }) {
  const { openEvidence } = useEvidence();
  const href = year === "all" ? "/media" : `/media?year=${year}`;

  return (
    <section className="rounded border border-border bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neon">Media Preview</h3>
        <Link href={href} className="text-xs text-amber hover:underline">
          Open full media archive
        </Link>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded border border-border bg-bg p-3 text-xs text-muted">No media records for the selected year.</p>
        ) : (
          rows.slice(0, 5).map((row) => (
            <article key={row.id} className="rounded border border-border bg-bg p-3">
              <button onClick={() => openEvidence(row.evidence)} className="text-left text-sm text-neon hover:underline">
                {row.title}
              </button>
              <p className="mt-1 text-xs text-muted">
                {row.source} - {formatDate(row.date)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function DocumentsPreview({ rows, year }: { rows: Array<DocumentRecord & { evidence: EvidenceRecord }>; year: string }) {
  const { openEvidence } = useEvidence();
  const href = year === "all" ? "/documents" : `/documents?year=${year}`;

  return (
    <section className="rounded border border-border bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neon">Documents / Receipts Preview</h3>
        <Link href={href} className="text-xs text-amber hover:underline">
          Open full document archive
        </Link>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded border border-border bg-bg p-3 text-xs text-muted">No document records for the selected year.</p>
        ) : (
          rows.slice(0, 5).map((row) => (
            <article key={row.id} className="rounded border border-border bg-bg p-3">
              <button onClick={() => openEvidence(row.evidence)} className="text-left text-sm text-neon hover:underline">
                {row.title}
              </button>
              <p className="mt-1 text-xs text-muted">
                {row.type} - {formatDate(row.date)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function MethodologyPreview({ year }: { year: string }) {
  const href = year === "all" ? "/methodology" : `/methodology?year=${year}`;

  return (
    <section className="rounded border border-border bg-panel p-4">
      <h3 className="text-lg font-semibold text-neon">Methodology Preview</h3>
      <p className="mt-2 text-sm text-muted">
        Definitions, matching logic, caveats, and graph reading guidance are documented in full. This includes direct vs indirect separation, overlap classification, and bundling pattern interpretation boundaries.
      </p>
      <Link href={href} className="mt-3 inline-flex rounded border border-neon/50 bg-neon/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-neon hover:bg-neon/20">
        Read methodology
      </Link>
    </section>
  );
}
