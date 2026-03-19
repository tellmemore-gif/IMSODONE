import { Disclaimer } from "@/components/ui/disclaimer";
import { Section } from "@/components/ui/section";

export default function MethodologyPage() {
  return (
    <div className="space-y-5">
      <Section title="Methodology" subtitle="Definitions, matching logic, evidence model, and analytical limits">
        <div className="space-y-4 text-sm text-muted">
          <div>
            <h3 className="font-semibold text-neon">How direct donor totals are calculated</h3>
            <p>
              Direct donor totals include only contributions that go directly to Maxine's campaign committee IDs. "Direct donors to Maxine" counts unique donors in that direct dataset, and "Total from direct donors" sums only those direct donor amounts.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-neon">AIPAC overlap definition</h3>
            <p>
              "AIPAC-aligned donor" means a donor appearing in documented AIPAC PAC contribution records under defined matching rules. The classification does not infer ideology, identity, motive, or coordination.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-neon">Donor matching logic</h3>
            <p>
              Matching order: (1) exact normalized name, (2) normalized name key plus ZIP, (3) normalized name key plus employer, (4) fuzzy similarity as secondary support. Results are labeled exact, probable, possible, or none.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-neon">Bundling pattern identification</h3>
            <p>
              Bundling analysis uses same-day spikes, same-employer clusters, geography concentrations, and repeat donor patterns. These are pattern indicators unless formal bundler disclosures are explicitly sourced.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-neon">Direct funding vs outside spending vs indirect networks</h3>
            <p>
              Direct funding refers to candidate committee receipts. Outside spending refers to independent expenditures in races involving Maxine. Indirect network activity includes donor overlap, PAC transfers, and multi-hop committee pathways.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-neon">How receipts are attached</h3>
            <p>
              Key entities and relationships carry evidence metadata including receipt IDs, filing URLs, source links, committee IDs, dates, and memo text when available.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-neon">How to read the graphs</h3>
            <p>
              Start with direct funding charts first. Then read indirect charts as network context. Use the evidence drawer on click to inspect underlying records and source links for each chart point, edge, row, or node.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-neon">Limitations and caveats</h3>
            <p>
              Public records can be incomplete, amended, or delayed. Name matching can produce uncertainty, especially with common names. Network proximity does not itself prove direct transfer or legal coordination.
            </p>
          </div>
        </div>
      </Section>

      <Disclaimer />
    </div>
  );
}
