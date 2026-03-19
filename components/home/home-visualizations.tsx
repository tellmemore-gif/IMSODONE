"use client";

import dynamic from "next/dynamic";

import { ChartLoading } from "@/components/charts/chart-loading";
import ClientSafeBoundary from "@/components/ui/client-safe-boundary";
import { Section } from "@/components/ui/section";
import type { ProcessedCandidateData } from "@/lib/types";

const DirectFundingSankey = dynamic(() => import("@/components/charts/direct-funding-sankey"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const DirectTimelineChart = dynamic(() => import("@/components/charts/direct-timeline-chart"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const TopDirectDonorsChart = dynamic(() => import("@/components/charts/top-direct-donors-chart"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const RaceSpendingChart = dynamic(() => import("@/components/charts/race-spending-chart"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const DirectCommitteeContributorsChart = dynamic(() => import("@/components/charts/direct-committee-contributors-chart"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const ContributionClustersChart = dynamic(() => import("@/components/charts/contribution-clusters-chart"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const DonorOverlapChart = dynamic(() => import("@/components/charts/donor-overlap-chart"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const PacTransferSankey = dynamic(() => import("@/components/charts/pac-transfer-sankey"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const IndirectFlowSankey = dynamic(() => import("@/components/charts/indirect-flow-sankey"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const ForceNetworkChart = dynamic(() => import("@/components/charts/force-network-chart"), {
  ssr: false,
  loading: () => <ChartLoading />
});
const OutsideTrendChart = dynamic(() => import("@/components/charts/outside-trend-chart"), {
  ssr: false,
  loading: () => <ChartLoading />
});

function SafeViz({ children, title }: { children: React.ReactNode; title: string }) {
  return <ClientSafeBoundary title={title}>{children}</ClientSafeBoundary>;
}

export function DirectFundingVisualizations({ data }: { data: ProcessedCandidateData }) {
  const clusterRows = data.contributionClusters.sameDay.slice(0, 16).map((row) => ({
    label: row.day,
    total: row.total,
    count: row.contributions,
    evidence: row.evidence
  }));

  return (
    <Section
      id="direct"
      title="DIRECT FUNDING TO MAXINE DEXTER"
      subtitle="This section is limited to direct contributions to Maxine's committee and outside spending in her races."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SafeViz title="Direct funding chart failed to load.">
          <DirectFundingSankey data={data.directFundingSankey} />
        </SafeViz>
        <SafeViz title="Timeline chart failed to load.">
          <DirectTimelineChart data={data.directTimeline} />
        </SafeViz>
        <SafeViz title="Top donors chart failed to load.">
          <TopDirectDonorsChart data={data.topDirectDonors} />
        </SafeViz>
        <SafeViz title="Race spending chart failed to load.">
          <RaceSpendingChart data={data.raceSpendingSummary} />
        </SafeViz>
        <div className="lg:col-span-2">
          <SafeViz title="Direct PAC-to-Maxine chart failed to load.">
            <DirectCommitteeContributorsChart data={data.directCommitteeRows} />
          </SafeViz>
        </div>
        <div className="lg:col-span-2">
          <SafeViz title="Contribution clusters chart failed to load.">
            <ContributionClustersChart data={clusterRows} />
          </SafeViz>
        </div>
      </div>
    </Section>
  );
}

export function NetworkVisualizations({ data }: { data: ProcessedCandidateData }) {
  return (
    <Section
      id="network"
      title="NETWORK AND INDIRECT CONNECTIONS"
      subtitle="This section covers indirect relationships and network pathways. It does not imply all network money went directly to Maxine."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SafeViz title="Donor overlap chart failed to load.">
          <DonorOverlapChart
            totalDirect={data.stats.totalDirectDonors}
            overlap={data.overlapRows.map((row) => ({
              label: row.donorName,
              value: row.totalToCandidate,
              evidence: row.evidence[0]
            }))}
          />
        </SafeViz>
        <SafeViz title="Outside spending trend chart failed to load.">
          <OutsideTrendChart data={data.outsideTrend} />
        </SafeViz>
        <SafeViz title="PAC transfer chart failed to load.">
          <PacTransferSankey data={data.pacTransfers} />
        </SafeViz>
        <SafeViz title="Indirect flow chart failed to load.">
          <IndirectFlowSankey data={data.indirectFlowSankey} />
        </SafeViz>
        <div className="lg:col-span-2">
          <SafeViz title="Expenditure network view failed to load.">
            <ForceNetworkChart
              title="Expenditure Network View"
              subtitle="Committees and expenditure targets in races involving Maxine"
              nodes={data.expenditureNetwork.nodes}
              links={data.expenditureNetwork.links}
              indirect
            />
          </SafeViz>
        </div>
      </div>
    </Section>
  );
}
