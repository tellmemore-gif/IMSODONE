import OutsideTrendChart from "@/components/charts/outside-trend-chart";
import { OutsideSpendingTable } from "@/components/tables/outside-spending-table";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Section } from "@/components/ui/section";
import { loadCandidateData } from "@/lib/data-loader";
import { readYearFilter, type SearchParamsPromise } from "@/lib/page-params";

export default async function OutsideSpendingPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const year = await readYearFilter(searchParams);
  const data = await loadCandidateData("maxine", year);

  return (
    <div className="space-y-5">
      <Section
        title="Outside Spending"
        subtitle="Independent expenditures in races involving Maxine Dexter from 2023 to 2026"
      >
        <p className="text-sm text-muted">
          Outside spending is legally distinct from direct contributions. Each row below is clickable and linked to receipt-backed evidence.
        </p>
      </Section>

      <OutsideTrendChart data={data.outsideTrend} />
      <OutsideSpendingTable rows={data.outsideSpendingRows} />

      <Disclaimer compact />
    </div>
  );
}
