import { AipacSocialBlock } from "@/components/blocks/aipac-social-block";
import DonorOverlapChart from "@/components/charts/donor-overlap-chart";
import ForceNetworkChart from "@/components/charts/force-network-chart";
import IndirectFlowSankey from "@/components/charts/indirect-flow-sankey";
import PacTransferSankey from "@/components/charts/pac-transfer-sankey";
import { OverlapTable } from "@/components/tables/overlap-table";
import ClientSafeBoundary from "@/components/ui/client-safe-boundary";
import { Disclaimer } from "@/components/ui/disclaimer";
import { Section } from "@/components/ui/section";
import { loadCandidateData } from "@/lib/data-loader";
import { readYearFilter, type SearchParamsPromise } from "@/lib/page-params";

export default async function AipacNetworkPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const year = await readYearFilter(searchParams);
  const data = await loadCandidateData("maxine", year);

  return (
    <div className="space-y-5">
      <Section
        title="AIPAC Network"
        subtitle="Indirect analysis only: overlap, PAC transfers, network pathways, and expenditure pipelines"
      >
        <p className="text-sm text-muted">
          These views show indirect relationships and network structure. They do not imply direct transfers to Maxine unless explicitly labeled as direct candidate receipts.
        </p>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClientSafeBoundary title="Donor overlap chart failed to load.">
          <DonorOverlapChart
            totalDirect={data.stats.totalDirectDonors}
            overlap={data.overlapRows.map((row) => ({ label: row.donorName, value: row.totalToCandidate, evidence: row.evidence[0] }))}
          />
        </ClientSafeBoundary>

        <ClientSafeBoundary title="PAC transfer chart failed to load.">
          <PacTransferSankey data={data.pacTransfers} />
        </ClientSafeBoundary>

        <ClientSafeBoundary title="Indirect flow chart failed to load.">
          <IndirectFlowSankey data={data.indirectFlowSankey} />
        </ClientSafeBoundary>

        <ClientSafeBoundary title="Expenditure pipeline chart failed to load.">
          <ForceNetworkChart
            title="Expenditure Pipeline Network"
            subtitle="Committee spending links in races involving Maxine"
            nodes={data.expenditureNetwork.nodes}
            links={data.expenditureNetwork.links}
            indirect
          />
        </ClientSafeBoundary>
      </div>

      <AipacSocialBlock rows={data.aipacSocialPosts} />

      <OverlapTable rows={data.overlapRows} />

      <Disclaimer compact />
    </div>
  );
}
