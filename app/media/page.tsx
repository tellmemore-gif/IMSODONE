import { MediaTable } from "@/components/tables/media-table";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Section } from "@/components/ui/section";
import { loadCandidateData } from "@/lib/data-loader";
import { readYearFilter, type SearchParamsPromise } from "@/lib/page-params";

export default async function MediaPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const year = await readYearFilter(searchParams);
  const data = await loadCandidateData("maxine", year);

  return (
    <div className="space-y-5">
      <Section
        title="Media"
        subtitle="Archive of coverage on Maxine Dexter funding, donor overlap, outside spending, bundling, and PAC networks"
      >
        <p className="text-sm text-muted">
          Filter coverage by topic tags including AIPAC, dark money, outside spending, bundling, primary, opponent, PACs, and fundraising.
        </p>
      </Section>

      <MediaTable rows={data.media} />

      <Disclaimer compact />
    </div>
  );
}
