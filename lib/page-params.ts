import { parseYearFilter } from "@/lib/year";

export type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

export async function readYearFilter(searchParams: SearchParamsPromise) {
  const params = await searchParams;
  return parseYearFilter(params.year);
}

export async function readYearAsString(searchParams: SearchParamsPromise) {
  const year = await readYearFilter(searchParams);
  return year === "all" ? "all" : String(year);
}
