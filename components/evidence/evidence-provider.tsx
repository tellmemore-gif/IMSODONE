"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { useYearFilter } from "@/components/year-filter/year-filter-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { EvidenceRecord } from "@/lib/types";

type EvidenceContextValue = {
  openEvidence: (item: EvidenceRecord) => void;
};

const EvidenceContext = createContext<EvidenceContextValue | null>(null);

export function EvidenceProvider({ children }: { children: React.ReactNode }) {
  const { selectedYear, selectedYearLabel } = useYearFilter();
  const [active, setActive] = useState<EvidenceRecord | null>(null);

  const value = useMemo(
    () => ({
      openEvidence: (item: EvidenceRecord) => setActive(item)
    }),
    []
  );

  const allDates = active?.dates ?? [];
  const primaryDates =
    selectedYear === "all" ? allDates : allDates.filter((value) => String(value).startsWith(String(selectedYear)));
  const secondaryDates =
    selectedYear === "all" ? [] : allDates.filter((value) => !String(value).startsWith(String(selectedYear)));

  return (
    <EvidenceContext.Provider value={value}>
      {children}

      {active ? (
        <div className="pointer-events-none fixed inset-0 z-[70] flex justify-end bg-black/35 backdrop-blur-[1px]">
          <aside className="pointer-events-auto h-full w-full max-w-lg overflow-y-auto border-l border-border bg-panel p-5 shadow-glow">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Evidence Panel</p>
                <h3 className="mt-1 text-lg font-semibold text-neon">{active.label}</h3>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">Year filter: {selectedYearLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded border border-border bg-bg px-3 py-1 text-xs text-muted hover:border-neon hover:text-neon"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-sm text-text/90">
              <EvidenceRow label="Entity type" value={active.type} />
              <EvidenceRow label="Why it appears" value={active.why} />
              <EvidenceRow label="Amount" value={typeof active.amount === "number" ? formatCurrency(active.amount) : "-"} />
              <EvidenceRow label="Date(s)" value={primaryDates.map((date) => formatDate(date)).join(", ") || "-"} />
              <EvidenceRow label="Committee" value={active.committeeId || "-"} />
              <EvidenceRow label="Contributor" value={active.contributorName || "-"} />
              <EvidenceRow label="Recipient" value={active.recipientName || "-"} />
              <EvidenceRow label="Support/Oppose" value={active.supportOppose || "-"} />
              <EvidenceRow
                label="Match confidence"
                value={typeof active.matchConfidence === "number" ? `${Math.round(active.matchConfidence * 100)}%` : "-"}
              />
              <EvidenceRow label="Memo / notes" value={active.memoText || active.notes || "-"} />
              <EvidenceRow label="Receipt ID" value={active.receiptId || "-"} />
              <EvidenceRow label="FEC document ID" value={active.fecDocumentId || "-"} />

              {secondaryDates.length > 0 ? (
                <EvidenceRow
                  label="Related records from other years"
                  value={secondaryDates.map((date) => formatDate(date)).join(", ")}
                />
              ) : null}

              {active.sourceUrl ? (
                <a
                  href={active.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber hover:bg-amber/20"
                >
                  Open Source Link
                </a>
              ) : null}

              {active.filingUrl ? (
                <a
                  href={active.filingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded border border-neon/40 bg-neon/10 px-3 py-2 text-xs text-neon hover:bg-neon/20"
                >
                  Open Filing / Receipt
                </a>
              ) : null}

              {active.tags && active.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {active.tags.map((tag) => (
                    <span key={`${active.id}-${tag}`} className="rounded border border-border px-2 py-1 text-[10px] uppercase text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </EvidenceContext.Provider>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-bg px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 text-sm text-text">{value}</p>
    </div>
  );
}

export function useEvidence() {
  const context = useContext(EvidenceContext);
  if (!context) {
    throw new Error("useEvidence must be used inside EvidenceProvider");
  }

  return context;
}
