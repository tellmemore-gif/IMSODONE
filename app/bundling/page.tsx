import DirectTimelineChart from "@/components/charts/direct-timeline-chart";
import { BundlingPatterns } from "@/components/tables/bundling-patterns";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Section } from "@/components/ui/section";
import { loadCandidateData } from "@/lib/data-loader";
import { readYearFilter, type SearchParamsPromise } from "@/lib/page-params";

export default async function BundlingPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const year = await readYearFilter(searchParams);
  const data = await loadCandidateData("maxine", year);

  return (
    <div className="space-y-5">
      <Section
        title="Bundling and Fundraising Networks"
        subtitle="Pattern-based fundraising analysis for Maxine's direct donor base"
      >
        <h3 className="text-base font-semibold text-neon">What is bundling?</h3>
        <p className="mt-2 text-sm text-muted">
          Bundling is when a person, fundraiser, or network gathers many individual contributions and channels them to the same campaign. Even when each donation is legally separate, the organizer can still wield influence through coordinated fundraising.
        </p>
        <p className="mt-2 text-sm text-muted">
          This page highlights same-day spikes, same-employer clusters, shared geography concentrations, and repeat high-dollar patterns. These are analytical indicators and do not claim legal bundler status unless explicit disclosure records are provided.
        </p>
      </Section>

      <DirectTimelineChart data={data.directTimeline} />
      <BundlingPatterns data={data} />

      <Disclaimer compact />
    </div>
  );
}
