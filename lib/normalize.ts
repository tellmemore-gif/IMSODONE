const punctuationRegex = /[^A-Z0-9 ]/g;
const suffixRegex = /\b(JR|SR|II|III|IV|PHD|MD)\b/g;

export function normalizeName(input: string): string {
  return (input || "")
    .toUpperCase()
    .replace(suffixRegex, "")
    .replace(punctuationRegex, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmployer(input: string): string {
  return (input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeZip(input: string): string {
  // Preserve ZIP+4 precision when available so distinct donor identities are not collapsed.
  return (input || "").replace(/[^0-9]/g, "").slice(0, 9);
}

export function normalizeCityState(city: string, state: string): string {
  const left = (city || "").toUpperCase().replace(/\s+/g, " ").trim();
  const right = (state || "").toUpperCase().trim();
  return [left, right].filter(Boolean).join(", ");
}

export function nameTokens(input: string): string[] {
  return normalizeName(input)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function canonicalNameKey(input: string): string {
  const tokens = nameTokens(input);
  if (tokens.length <= 1) return tokens.join("");

  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  return `${first} ${last}`.trim();
}
