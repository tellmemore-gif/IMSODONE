import { formatCurrency, formatNumber } from "@/lib/format";

export function StatsCards({
  stats
}: {
  stats: {
    totalDirectDonors: number;
    totalDirectAmount: number;
    aipacDonorCount: number;
    aipacDonorAmount: number;
    outsideSpendingTotal: number;
  };
}) {
  const cards = [
    { label: "Direct donors to Maxine", value: formatNumber(stats.totalDirectDonors), tone: "text-neon" },
    { label: "Total from direct donors", value: formatCurrency(stats.totalDirectAmount), tone: "text-neon" },
    { label: "AIPAC aligned donors", value: formatNumber(stats.aipacDonorCount), tone: "text-amber" },
    { label: "Total from AIPAC donors", value: formatCurrency(stats.aipacDonorAmount), tone: "text-amber" },
    { label: "Outside spending", value: formatCurrency(stats.outsideSpendingTotal), tone: "text-neon" }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="rounded border border-border bg-panelAlt p-4 shadow-glow">
          <p className="text-[11px] uppercase tracking-[0.17em] text-muted">{card.label}</p>
          <p className={["mt-2 text-2xl font-semibold", card.tone].join(" ")}>{card.value}</p>
        </article>
      ))}
    </section>
  );
}
