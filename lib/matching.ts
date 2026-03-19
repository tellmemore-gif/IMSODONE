import type { MatchLabel } from "@/lib/types";
import { canonicalNameKey, normalizeEmployer, normalizeName, normalizeZip } from "@/lib/normalize";

export type MatchCandidate = {
  name: string;
  employer?: string;
  zip?: string;
};

export type MatchResult = {
  label: MatchLabel;
  confidence: number;
  matchedName: string;
};

export function classifyMatch(source: MatchCandidate, candidates: MatchCandidate[]): MatchResult {
  const sourceName = normalizeName(source.name);
  const sourceNameKey = canonicalNameKey(source.name);
  const sourceZip = normalizeZip(source.zip || "");
  const sourceEmployer = normalizeEmployer(source.employer || "");

  const exact = candidates.find((candidate) => normalizeName(candidate.name) === sourceName);
  if (exact) {
    return { label: "exact", confidence: 1, matchedName: exact.name };
  }

  const probableByZip = candidates.find((candidate) => {
    return canonicalNameKey(candidate.name) === sourceNameKey && sourceZip.length > 0 && normalizeZip(candidate.zip || "") === sourceZip;
  });
  if (probableByZip) {
    return { label: "probable", confidence: 0.88, matchedName: probableByZip.name };
  }

  const probableByEmployer = candidates.find((candidate) => {
    return (
      canonicalNameKey(candidate.name) === sourceNameKey &&
      sourceEmployer.length > 0 &&
      normalizeEmployer(candidate.employer || "") === sourceEmployer
    );
  });
  if (probableByEmployer) {
    return { label: "probable", confidence: 0.82, matchedName: probableByEmployer.name };
  }

  let bestCandidate: MatchCandidate | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = similarity(sourceName, normalizeName(candidate.name));
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  if (bestCandidate && bestScore >= 0.88) {
    return { label: "possible", confidence: Number(bestScore.toFixed(2)), matchedName: bestCandidate.name };
  }

  return { label: "none", confidence: 0, matchedName: "" };
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[a.length][b.length];
}
