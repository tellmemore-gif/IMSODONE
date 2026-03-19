import { DirectDonorsTable } from "@/components/tables/direct-donors-table";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Section } from "@/components/ui/section";
import { loadCandidateData } from "@/lib/data-loader";
import { readYearFilter, type SearchParamsPromise } from "@/lib/page-params";

export default async function DirectDonorsPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const year = await readYearFilter(searchParams);
  const data = await loadCandidateData("maxine", year);

  return (
    <div className="space-y-5">
      <Section
        title="Direct Donors"
        subtitle="Searchable donor research for contributions made directly to Maxine's campaign committee"
      >
        <p className="text-sm text-muted">
          Filters include amount, employer, date, city/state, ZIP, overlap status, match confidence, and donor type. Click any donor row to open receipt-backed evidence details.
        </p>
      </Section>

      <DirectDonorsTable rows={data.directDonorRows} />

      <Disclaimer compact />
    </div>
  );
}
