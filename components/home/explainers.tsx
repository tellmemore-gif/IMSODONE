import { Section } from "@/components/ui/section";

export function Explainers() {
  const items = [
    {
      title: "What is bundling?",
      body: "Bundling is when a fundraiser or network gathers many individual contributions and channels them to the same campaign. Each donation may be legally separate, but the organizer of that donor network can still gain influence through coordinated fundraising power."
    },
    {
      title: "What are PAC-to-PAC transfers?",
      body: "PAC-to-PAC transfers happen when one committee gives money to another. They are not the same as direct candidate contributions, but they can reveal layered funding pipelines before spending happens in a race."
    },
    {
      title: "What is outside spending?",
      body: "Outside spending means independent expenditures supporting or opposing candidates. This money does not enter a candidate committee account, but it can still shape the outcome of a race."
    },
    {
      title: "Direct funding vs indirect influence",
      body: "Direct funding includes contributions received by the candidate committee. Indirect influence includes committee transfers, donor overlap, and independent expenditures. This site keeps those categories separated to avoid overstatement."
    },
    {
      title: "Why donor overlap matters",
      body: "Donor overlap analysis asks whether direct donors to Maxine also appear in documented AIPAC PAC donor records. This is a data linkage exercise using explicit match rules, not an inference about motive, identity, or coordination."
    },
    {
      title: "How to read these graphs",
      body: "Start with direct funding first. Then move to network charts for indirect pathways. Click any donor, PAC, edge, table row, article, or document to open evidence details and source links in the evidence panel."
    }
  ];

  return (
    <Section title="Explainer Blocks" subtitle="Plain-language campaign finance basics used throughout this archive">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.title} className="rounded border border-border bg-bg p-3">
            <h3 className="text-sm font-semibold text-neon">{item.title}</h3>
            <p className="mt-2 text-sm text-muted">{item.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
