export function parseCsvToObjects(input: string): Array<Record<string, string>> {
  const rows = parseCsvRows(input);
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  const keys = header.map((cell) => cell.trim());

  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const obj: Record<string, string> = {};
      keys.forEach((key, index) => {
        obj[key] = (row[index] ?? "").trim();
      });
      return obj;
    });
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "";

  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows.map((row) => keys.map((key) => escapeCsvCell(row[key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
