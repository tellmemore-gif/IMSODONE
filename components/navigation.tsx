"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { YEAR_FILTER_OPTIONS, useYearFilter } from "@/components/year-filter/year-filter-provider";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/direct-donors", label: "Direct Donors" },
  { href: "/outside-spending", label: "Outside Spending" },
  { href: "/aipac-network", label: "AIPAC Network" },
  { href: "/bundling", label: "Bundling" },
  { href: "/media", label: "Media" },
  { href: "/methodology", label: "Methodology" },
  { href: "/maxines-2026-primary-opponent", label: "Maxine's 2026 Primary Opponent" }
] as const;

export function Navigation() {
  const pathname = usePathname();
  const { selectedYearOption, selectedYearLabel, setYear, buildHref, isPending } = useYearFilter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, selectedYearOption]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/90 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neon sm:text-xs sm:tracking-[0.32em]">Maxine Dexter Finance Archive</p>
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-site-menu"
            className="rounded border border-border bg-panel px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted hover:border-neon/60 hover:text-neon md:hidden"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="year-filter" className="text-[10px] uppercase tracking-[0.12em] text-muted sm:tracking-[0.2em]">
              Year: {selectedYearLabel}
            </label>
            <select
              id="year-filter"
              value={selectedYearOption}
              onChange={(event) => setYear(event.target.value as typeof YEAR_FILTER_OPTIONS[number])}
              className="min-w-[110px] rounded border border-border bg-panel px-2 py-1 text-xs text-text outline-none ring-neon/50 focus:ring"
            >
              {YEAR_FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Years" : option}
                </option>
              ))}
            </select>
          </div>
          {isPending ? <span className="text-[10px] uppercase tracking-[0.12em] text-muted">Updating</span> : null}
        </div>

        <nav className="hidden gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={buildHref(item.href)}
                className={[
                  "whitespace-nowrap rounded border px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition sm:text-[11px] sm:tracking-[0.15em]",
                  active
                    ? "border-neon bg-neon/10 text-neon shadow-glow"
                    : "border-border bg-panel text-muted hover:border-neon/60 hover:text-text"
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div id="mobile-site-menu" className={["md:hidden", mobileOpen ? "block" : "hidden"].join(" ")}>
          <nav className="grid gap-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={`mobile-${item.href}`}
                  href={buildHref(item.href)}
                  className={[
                    "rounded border px-3 py-2 text-[10px] uppercase tracking-[0.12em] transition",
                    active
                      ? "border-neon bg-neon/10 text-neon shadow-glow"
                      : "border-border bg-panel text-muted hover:border-neon/60 hover:text-text"
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
