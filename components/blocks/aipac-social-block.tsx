"use client";

import { useEvidence } from "@/components/evidence/evidence-provider";
import { formatDate } from "@/lib/format";
import type { EvidenceRecord, SocialPostRecord } from "@/lib/types";

export function AipacSocialBlock({ rows }: { rows: Array<SocialPostRecord & { evidence: EvidenceRecord }> }) {
  const { openEvidence } = useEvidence();

  return (
    <section className="rounded border border-border bg-panel p-4">
      <header className="mb-3">
        <h3 className="text-base font-semibold text-neon">AIPAC Social Media</h3>
        <p className="mt-1 text-xs text-muted">Preview each linked post before opening it.</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-xs text-muted">
          No AIPAC social post links loaded yet. Add records to <code>data/maxine/social.json</code>.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded border border-border bg-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-amber">{row.platform}</p>
                <p className="text-[11px] text-muted">{formatDate(row.date)}</p>
              </div>
              <p className="mt-1 text-xs text-muted">{row.account}</p>
              {row.previewImageUrl ? (
                <img
                  src={row.previewImageUrl}
                  alt={`${row.platform} preview`}
                  className="mt-3 h-44 w-full rounded border border-border object-cover"
                  loading="lazy"
                />
              ) : (
                <SocialEmbedPreview platform={row.platform} url={row.url} />
              )}
              <p className="mt-2 text-sm text-text">{row.preview || "No preview text provided."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => openEvidence(row.evidence)}
                  className="rounded border border-border bg-panelAlt px-2 py-1 text-[11px] text-text hover:bg-panel"
                >
                  View details
                </button>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-neon/50 bg-neon/10 px-2 py-1 text-[11px] text-neon hover:bg-neon/20"
                >
                  Open post
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SocialEmbedPreview({ platform, url }: { platform: string; url: string }) {
  const embedUrl = getEmbedUrl(platform, url);
  if (!embedUrl) return null;

  return (
    <div className="mt-3 overflow-hidden rounded border border-border">
      <iframe
        src={embedUrl}
        className="h-44 w-full bg-bg"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`${platform} embed preview`}
      />
    </div>
  );
}

function getEmbedUrl(platform: string, url: string) {
  const normalizedPlatform = platform.toLowerCase();

  if (normalizedPlatform.includes("instagram") || url.includes("instagram.com/p/")) {
    return `${stripQuery(url).replace(/\/$/, "")}/embed`;
  }

  if (normalizedPlatform === "x" || url.includes("x.com/")) {
    const match = url.match(/status\/(\d+)/);
    if (!match) return null;
    return `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}&theme=dark`;
  }

  if (normalizedPlatform.includes("facebook") || url.includes("facebook.com/")) {
    return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`;
  }

  return null;
}

function stripQuery(url: string) {
  return url.split("?")[0] || url;
}
