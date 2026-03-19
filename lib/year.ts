import type { YearFilter } from "@/lib/types";

const VALID_YEARS = new Set([2023, 2024, 2025, 2026]);

export function parseYearFilter(input: string | string[] | undefined): YearFilter {
  const value = Array.isArray(input) ? input[0] : input;
  if (!value || value.toLowerCase() === "all") return "all";

  const parsed = Number(value);
  if (VALID_YEARS.has(parsed)) return parsed as YearFilter;
  return "all";
}

export function extractYear(dateStr: string): number | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();
  const isoYear = Number(trimmed.slice(0, 4));
  if (Number.isFinite(isoYear) && isoYear >= 1900 && isoYear <= 2100) {
    return isoYear;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCFullYear();
}

export function monthKey(dateStr: string): string {
  if (!dateStr) return "Unknown";

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr.slice(0, 7) || "Unknown";

  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${parsed.getUTCFullYear()}-${month}`;
}
