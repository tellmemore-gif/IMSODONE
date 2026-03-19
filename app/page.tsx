import Link from "next/link";

import { Explainers } from "@/components/home/explainers";
import { DirectFundingVisualizations, NetworkVisualizations } from "@/components/home/home-visualizations";
import { OpponentCallout } from "@/components/home/opponent-callout";
import { DocumentsPreview, MediaPreview, MethodologyPreview } from "@/components/home/previews";
import { Disclaimer } from "@/components/ui/disclaimer";
import { EntryMessageModal } from "@/components/ui/entry-message-modal";
import { Section } from "@/components/ui/section";
import { StatsCards } from "@/components/ui/stats-cards";
import { loadCandidateData } from "@/lib/data-loader";
import { readYearAsString, readYearFilter, type SearchParamsPromise } from "@/lib/page-params";

export default async function HomePage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const year = await readYearFilter(searchParams);
  const yearText = await readYearAsString(searchParams);
  const data = await loadCandidateData("maxine", year);

  return (
    <div className="space-y-6">
      <EntryMessageModal />

      <section className="rounded border border-border bg-panel p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-neon">Investigative archive · 2023-2026</p>
        <h1 className="mt-2 text-3xl font-semibold text-neon md:text-4xl">Who Funds Maxine Dexter?</h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-text/95">
          In the 2023-2024 election cycle, Maxine Dexter won her seat with support from XXX donors aligned with AIPAC. She has since said she no longer accepts AIPAC money.
          <br />
          <br />
          But it's worth asking: how meaningful is that stance after a campaign has already been funded? Once a seat is secured, turning down future contributions is a very different decision than refusing them from the start. This is exactly why I created this website. It breaks down how bundling works and why it matters. Because transparency shouldn't end after Election Day, and voters deserve to understand who helped put candidates in power.
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">
          Current global filter: {yearText === "all" ? "All Years (2023-2026)" : yearText}
        </p>
      </section>

      <StatsCards stats={data.stats} />

      <DirectFundingVisualizations data={data} />

      <Explainers />

      <NetworkVisualizations data={data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MediaPreview rows={data.media} year={yearText} />
        <DocumentsPreview rows={data.documents} year={yearText} />
      </div>

      <MethodologyPreview year={yearText} />

      <OpponentCallout year={yearText} />

      <Section title="Research Access" subtitle="Use the full archive sections for deeper investigation.">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ["Direct Donors", "/direct-donors"],
            ["Outside Spending", "/outside-spending"],
            ["AIPAC Network", "/aipac-network"],
            ["Bundling", "/bundling"],
            ["Media", "/media"],
            ["Documents", "/documents"],
            ["Methodology", "/methodology"]
          ].map(([label, href]) => (
            <Link key={href} href={yearText === "all" ? href : `${href}?year=${yearText}`} className="rounded border border-border bg-bg px-3 py-2 text-muted hover:border-neon/60 hover:text-neon">
              {label}
            </Link>
          ))}
        </div>
      </Section>

      <Disclaimer />
    </div>
  );
}
