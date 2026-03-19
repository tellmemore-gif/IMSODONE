import { DocumentsTable } from "@/components/tables/documents-table";
import { ReceiptsTable } from "@/components/tables/receipts-table";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Section } from "@/components/ui/section";
import { loadCandidateData } from "@/lib/data-loader";
import { readYearFilter, type SearchParamsPromise } from "@/lib/page-params";

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const year = await readYearFilter(searchParams);
  const data = await loadCandidateData("maxine", year);

  return (
    <div className="space-y-5">
      <Section
        title="Documents / Receipts"
        subtitle="Research-library archive of filings, receipts, official documents, and supporting references"
      >
        <p className="text-sm text-muted">
          Filter records by donor, PAC, committee, expenditure context, overlap tags, year, cycle, and evidence type. Every row opens source-backed detail in the evidence panel.
        </p>
      </Section>

      <DocumentsTable rows={data.documents} />
      <ReceiptsTable rows={data.receipts} />

      <Disclaimer compact />
    </div>
  );
}
