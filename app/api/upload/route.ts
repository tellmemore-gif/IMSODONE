import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { parseCsvToObjects } from "@/lib/csv";

const DATA_ROOT = path.join(process.cwd(), "data");
const CANDIDATES = new Set(["maxine", "jessica"]);
const DATASETS = new Set(["donors", "pacs", "transactions", "expenditures", "media", "social", "receipts", "documents", "config"]);

export async function POST(request: Request) {
  if (process.env.NETLIFY) {
    return NextResponse.json(
      {
        error:
          "CSV/JSON upload is disabled in Netlify runtime. Update data files in the repository (data/maxine or data/jessica) and redeploy."
      },
      { status: 501 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const candidate = String(formData.get("candidate") || "maxine").toLowerCase();
  const dataset = String(formData.get("dataset") || "donors").toLowerCase();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!CANDIDATES.has(candidate) || !DATASETS.has(dataset)) {
    return NextResponse.json({ error: "Invalid candidate or dataset" }, { status: 400 });
  }

  const text = await file.text();
  const extension = file.name.split(".").pop()?.toLowerCase();

  let rows: Array<Record<string, unknown>> | Record<string, unknown> = [];

  try {
    if (extension === "json") {
      const parsed = JSON.parse(text);
      rows = parsed;
    } else if (extension === "csv") {
      rows = parseCsvToObjects(text);
      if (dataset === "config") {
        rows = (rows as Array<Record<string, unknown>>)[0] || {};
      }
    } else {
      return NextResponse.json({ error: "Only .json and .csv uploads are supported" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse uploaded data" }, { status: 400 });
  }

  const folder = path.join(DATA_ROOT, candidate);
  await fs.mkdir(folder, { recursive: true });
  const target = path.join(folder, `${dataset}.json`);
  await fs.writeFile(target, JSON.stringify(rows, null, 2), "utf8");

  const rowCount = Array.isArray(rows) ? rows.length : 1;

  return NextResponse.json({
    ok: true,
    candidate,
    dataset,
    rowCount,
    path: target
  });
}
