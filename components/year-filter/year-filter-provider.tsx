"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { parseYearFilter } from "@/lib/year";
import type { YearFilter } from "@/lib/types";

export const YEAR_FILTER_OPTIONS = ["all", "2023", "2024", "2025", "2026"] as const;

export type YearOption = (typeof YEAR_FILTER_OPTIONS)[number];

type YearFilterContextValue = {
  selectedYear: YearFilter;
  selectedYearOption: YearOption;
  selectedYearLabel: string;
  setYear: (next: YearOption) => void;
  buildHref: (basePath: string) => string;
  isPending: boolean;
};

const YearFilterContext = createContext<YearFilterContextValue | null>(null);

function normalizeYearOption(value: string | null | undefined): YearOption {
  const parsed = parseYearFilter(value ?? undefined);
  return parsed === "all" ? "all" : String(parsed) as YearOption;
}

function readYearFromWindow(): YearOption {
  if (typeof window === "undefined") return "all";
  const params = new URLSearchParams(window.location.search);
  return normalizeYearOption(params.get("year"));
}

export function YearFilterProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedYearOption, setSelectedYearOption] = useState<YearOption>("all");
  const [isPending, startTransition] = useTransition();

  const syncFromLocation = useCallback(() => {
    setSelectedYearOption(readYearFromWindow());
  }, []);

  useEffect(() => {
    syncFromLocation();
  }, [pathname, syncFromLocation]);

  useEffect(() => {
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [syncFromLocation]);

  const setYear = useCallback(
    (next: YearOption) => {
      setSelectedYearOption(next);
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (next === "all") {
        params.delete("year");
      } else {
        params.set("year", next);
      }

      const query = params.toString();
      const nextHref = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    },
    [pathname, router]
  );

  const buildHref = useCallback(
    (basePath: string) => {
      if (selectedYearOption === "all") return basePath;
      return `${basePath}?year=${selectedYearOption}`;
    },
    [selectedYearOption]
  );

  const value = useMemo<YearFilterContextValue>(() => {
    const selectedYear = parseYearFilter(selectedYearOption);
    return {
      selectedYear,
      selectedYearOption,
      selectedYearLabel: selectedYearOption === "all" ? "All Years" : selectedYearOption,
      setYear,
      buildHref,
      isPending
    };
  }, [buildHref, isPending, selectedYearOption, setYear]);

  return <YearFilterContext.Provider value={value}>{children}</YearFilterContext.Provider>;
}

export function useYearFilter() {
  const context = useContext(YearFilterContext);
  if (!context) {
    throw new Error("useYearFilter must be used inside YearFilterProvider");
  }

  return context;
}
