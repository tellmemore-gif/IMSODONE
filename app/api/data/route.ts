import { NextResponse } from "next/server";

import { loadCandidateData } from "@/lib/data-loader";
import type { CandidateKey } from "@/lib/types";
import { parseYearFilter } from "@/lib/year";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const candidateParam = searchParams.get("candidate");
  const candidate: CandidateKey = candidateParam === "jessica" ? "jessica" : "maxine";
  const year = parseYearFilter(searchParams.get("year") || undefined);

  const data = await loadCandidateData(candidate, year);

  return NextResponse.json({
    candidate,
    year,
    data
  });
}
