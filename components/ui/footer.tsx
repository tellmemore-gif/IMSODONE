"use client";

import Link from "next/link";

import { useYearFilter } from "@/components/year-filter/year-filter-provider";

export function Footer() {
  const { buildHref } = useYearFilter();

  return (
    <footer className="border-t border-border/80 bg-panel/80">
      <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted md:px-6">
        <p>Data sourced from the Federal Election Commission (FEC). This site is not affiliated with or endorsed by the FEC.</p>
        <p className="mt-1 text-muted/90">Built independently using public records, personal time, and personal resources.</p>
        <p className="mt-3">
          <Link
            href={buildHref("/documents")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-amber hover:underline"
          >
            Documents / Receipts
          </Link>
        </p>
      </div>
    </footer>
  );
}
