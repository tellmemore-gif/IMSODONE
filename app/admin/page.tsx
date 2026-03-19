"use client";

import { FormEvent, useState } from "react";

const CANDIDATES = ["maxine", "jessica"] as const;
const DATASETS = ["donors", "pacs", "transactions", "expenditures", "media", "social", "receipts", "documents", "config"] as const;

export default function AdminPage() {
  const [candidate, setCandidate] = useState<(typeof CANDIDATES)[number]>("maxine");
  const [dataset, setDataset] = useState<(typeof DATASETS)[number]>("donors");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.set("candidate", candidate);
    formData.set("dataset", dataset);
    formData.set("file", file);

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Upload failed.");
      } else {
        setMessage(`Uploaded ${payload.rowCount} row(s) to data/${payload.candidate}/${payload.dataset}.json`);
      }
    } catch {
      setMessage("Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-border bg-panel p-4">
        <h1 className="text-xl font-semibold text-neon">Admin / Data Input</h1>
        <p className="mt-2 text-sm text-muted">
          Option A: replace JSON files in <code>data/maxine</code> or <code>data/jessica</code>. Option B: upload CSV or JSON here and write directly into the dataset folder.
        </p>
        <p className="mt-2 text-xs text-amber">
          Netlify note: production deploys are read-only. Use repo file updates + redeploy for permanent data changes.
        </p>
      </section>

      <form onSubmit={onSubmit} className="space-y-3 rounded border border-border bg-panel p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={candidate} onChange={(event) => setCandidate(event.target.value as (typeof CANDIDATES)[number])} className="rounded border border-border bg-bg px-2 py-2 text-xs">
            {CANDIDATES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <select value={dataset} onChange={(event) => setDataset(event.target.value as (typeof DATASETS)[number])} className="rounded border border-border bg-bg px-2 py-2 text-xs">
            {DATASETS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <input type="file" accept=".json,.csv" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded border border-border bg-bg px-2 py-2 text-xs" />

          <button type="submit" disabled={!file || loading} className="rounded border border-neon/50 bg-neon/10 px-2 py-2 text-xs text-neon disabled:opacity-40">
            {loading ? "Uploading..." : "Upload dataset"}
          </button>
        </div>

        {message ? <p className="text-xs text-amber">{message}</p> : null}
      </form>
    </div>
  );
}
