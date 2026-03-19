"use client";

import { useMemo, useState } from "react";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { toCsv } from "@/lib/csv";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DonorAggregateRow, EvidenceRecord } from "@/lib/types";

export function DirectDonorsTable({ rows }: { rows: DonorAggregateRow[] }) {
  const { openEvidence } = useEvidence();
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [employer, setEmployer] = useState("");
  const [dateAfter, setDateAfter] = useState("");
  const [location, setLocation] = useState("");
  const [zip, setZip] = useState("");
  const [overlap, setOverlap] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [donorType, setDonorType] = useState("all");
  const [sortBy, setSortBy] = useState<"amount" | "name" | "date">("amount");

  const filtered = useMemo(() => {
    const min = Number(minAmount || 0);

    return rows
      .filter((row) => row.totalToCandidate >= min)
      .filter((row) => (search ? row.donorName.toLowerCase().includes(search.toLowerCase()) : true))
      .filter((row) => (employer ? row.employer.toLowerCase().includes(employer.toLowerCase()) : true))
      .filter((row) => (dateAfter ? row.lastDate >= dateAfter : true))
      .filter((row) => (location ? `${row.city}, ${row.state}`.toLowerCase().includes(location.toLowerCase()) : true))
      .filter((row) => (zip ? row.zip.includes(zip) : true))
      .filter((row) => {
        if (overlap === "all") return true;
        return overlap === "true" ? row.overlapStatus : !row.overlapStatus;
      })
      .filter((row) => (confidence === "all" ? true : row.matchLabel === confidence))
      .filter((row) => (donorType === "all" ? true : row.donorType.toLowerCase().includes(donorType.toLowerCase())));
  }, [confidence, dateAfter, donorType, employer, location, minAmount, overlap, rows, search, zip]);

  const sorted = useMemo(() => {
    const next = filtered.slice();

    if (sortBy === "name") {
      next.sort((a, b) => a.donorName.localeCompare(b.donorName));
    } else if (sortBy === "date") {
      next.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
    } else {
      next.sort((a, b) => b.totalToCandidate - a.totalToCandidate);
    }

    return next;
  }, [filtered, sortBy]);

  function downloadCsv() {
    const payload = sorted.map((row) => ({
      donor_name: row.donorName,
      total_to_maxine: row.totalToCandidate,
      employer: row.employer,
      city: row.city,
      state: row.state,
      zip: row.zip,
      overlap_status: row.overlapStatus,
      aipac_alignment_tier: row.aipacAlignmentTier,
      match_confidence: row.matchLabel,
      donor_type: row.donorType,
      first_date: row.firstDate,
      last_date: row.lastDate
    }));

    const csv = toCsv(payload);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "maxine-direct-donors.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function buildReceiptOptions(evidenceRows: EvidenceRecord[]) {
    const options: Array<{ url: string; label: string }> = [];
    const seen = new Set<string>();

    for (const item of evidenceRows) {
      if (item.type !== "donor" || !item.filingUrl) continue;
      const date = item.dates?.[0] || "";
      const amount = typeof item.amount === "number" ? formatCurrency(item.amount) : "";
      const label = [date ? formatDate(date) : "", amount].filter(Boolean).join(" · ") || "Open receipt";
      const key = `${item.filingUrl}|${date}|${item.amount ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({ url: item.filingUrl, label });
    }

    return options;
  }

  return (
    <section className="space-y-3 rounded border border-border bg-panel p-4">
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search donor" className="rounded border border-border bg-bg px-2 py-1 text-xs" />
        <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Min amount" className="w-24 rounded border border-border bg-bg px-2 py-1 text-xs" />
        <input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Employer" className="rounded border border-border bg-bg px-2 py-1 text-xs" />
        <input type="date" value={dateAfter} onChange={(e) => setDateAfter(e.target.value)} className="rounded border border-border bg-bg px-2 py-1 text-xs" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City / State" className="rounded border border-border bg-bg px-2 py-1 text-xs" />
        <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" className="w-24 rounded border border-border bg-bg px-2 py-1 text-xs" />
        <select value={overlap} onChange={(e) => setOverlap(e.target.value)} className="rounded border border-border bg-bg px-2 py-1 text-xs">
          <option value="all">AIPAC overlap: all</option>
          <option value="true">AIPAC overlap: true</option>
          <option value="false">AIPAC overlap: false</option>
        </select>
        <select value={confidence} onChange={(e) => setConfidence(e.target.value)} className="rounded border border-border bg-bg px-2 py-1 text-xs">
          <option value="all">Match confidence: all</option>
          <option value="exact">Exact</option>
          <option value="probable">Probable</option>
          <option value="possible">Possible</option>
          <option value="network">Network</option>
        </select>
        <select value={donorType} onChange={(e) => setDonorType(e.target.value)} className="rounded border border-border bg-bg px-2 py-1 text-xs">
          <option value="all">Donor type: all</option>
          <option value="individual">Individual</option>
          <option value="pac">PAC</option>
          <option value="committee">Committee</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "amount" | "name" | "date")} className="rounded border border-border bg-bg px-2 py-1 text-xs">
          <option value="amount">Sort: amount</option>
          <option value="name">Sort: name</option>
          <option value="date">Sort: date</option>
        </select>
        <button onClick={downloadCsv} className="rounded border border-neon/50 bg-neon/10 px-2 py-1 text-xs text-neon hover:bg-neon/20">
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2">Donor name</th>
              <th className="py-2">Total to Maxine</th>
              <th className="py-2">Employer</th>
              <th className="py-2">City / State</th>
              <th className="py-2">Receipts</th>
              <th className="py-2">Last date</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-muted">
                  No donor records match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const receiptOptions = buildReceiptOptions(row.evidence);

                return (
                  <tr key={`${row.donorName}-${row.zip}`} className="border-b border-border/60 hover:bg-bg/70">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEvidence(row.evidence[0])} className="text-left text-neon hover:underline">
                          {row.donorName}
                        </button>
                        {row.overlapStatus ? (
                          <span className="rounded border border-amber/50 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
                            AIPAC NETWORK
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2">{formatCurrency(row.totalToCandidate)}</td>
                    <td className="py-2">{row.employer || "-"}</td>
                    <td className="py-2">{`${row.city}, ${row.state}`}</td>
                    <td className="py-2">
                      {receiptOptions.length === 0 ? (
                        <span className="text-muted">No links</span>
                      ) : (
                        <select
                          defaultValue=""
                          className="w-full min-w-[190px] rounded border border-border bg-bg px-2 py-1 text-xs"
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            if (!value) return;
                            window.open(value, "_blank", "noopener,noreferrer");
                            event.currentTarget.value = "";
                          }}
                        >
                          <option value="">Select receipt ({receiptOptions.length})</option>
                          {receiptOptions.map((option) => (
                            <option key={`${row.donorName}-${option.url}-${option.label}`} value={option.url}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-2">{formatDate(row.lastDate)}</td>
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
