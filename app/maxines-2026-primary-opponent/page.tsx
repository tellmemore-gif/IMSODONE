import Link from "next/link";

import { Disclaimer } from "@/components/ui/disclaimer";
import { Section } from "@/components/ui/section";
import { readYearAsString, type SearchParamsPromise } from "@/lib/page-params";

export default async function OpponentPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const yearText = await readYearAsString(searchParams);

  return (
    <div className="space-y-5">
      <Section title="Maxine's 2026 Primary Opponent">
        <p className="text-sm text-muted">
          Vote May 19th in the Primary. Last day to register Democrat is April 28th.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="https://jsalfororegon.com" target="_blank" rel="noreferrer" className="rounded border border-neon/50 bg-neon/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-neon hover:bg-neon/20">
            Campaign Website
          </Link>
          <Link href="https://www.jsalfororegon.com/endorsements" target="_blank" rel="noreferrer" className="rounded border border-border bg-bg px-3 py-2 text-xs uppercase tracking-[0.14em] text-text hover:bg-panelAlt">
            Endorsements
          </Link>
          <Link href="https://secure.actblue.com/donate/grassrootsjsal" target="_blank" rel="noreferrer" className="rounded border border-amber/60 bg-amber/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-amber hover:bg-amber/20">
            Donate to a grassroots candidate
          </Link>
        </div>
      </Section>

      <Section title="Jessica Salas (A.K.A. J.Sal For Oregon)" subtitle="Who she is">
        <div className="space-y-3 text-sm text-muted">
          <p>
            Jessica Salas has spent her 35 years fighting, for herself and for others. Throughout her life, she has been told she couldn't achieve what she set her mind to. Instead of backing down, she turned that doubt into fuel.
          </p>
          <p>Every challenge, every "no," became part of her story and her drive.</p>
          <p>
            From surviving personal battles to stepping forward to run for Congress, Jessica has never accepted limitations placed on her. Advocacy is not new to her, it is who she is. She has spent most of her life standing up for what she believes is right, even when it was difficult, even when it meant standing alone.
          </p>
          <p>
            She saw a chance to run for this seat at a time when everything around her felt like it was crumbling. And she realized something deeper: only 2% of Congress comes from the working class, while more than half are millionaires.
          </p>
          <p>
            Our government is supposed to represent the people. Right now, it is dominated by people who are there for their own gain.
          </p>
          <p>
            Jessica learned early in life what money can do. Her father struggled with a gambling addiction, and she watched it consume him. She saw how money can become a black hole, something that takes more than it gives. That experience shaped her. She made a promise to herself that she would never let money define or consume her.
          </p>
          <p>Now, she sees that same pattern in our political system.</p>
          <p>
            When people in power are there for themselves, they stop listening to the people they represent. And for too long, our voices have been ignored.
          </p>
          <p>Jessica is running to change that.</p>
          <p>
            She wants people to be heard, to be seen, and to be known. Because it is time for government to reflect the lives of the people it serves.
          </p>
          <p>It is time for the people to be represented by someone who is one of them.</p>
        </div>
      </Section>
      <Section title="AMERICA CAN'T AFFORD BILLIONAIRES">
        <p className="text-sm text-muted">
          This campaign is rooted in working-class representation, not billionaire influence.
        </p>
      </Section>

      <Section title="Built Independently" subtitle="Authenticity note">
        <p className="text-sm text-muted">
          This project was built independently, with personal time and personal resources, to make public records easier for voters to access and verify.
        </p>
        <p className="mt-2 text-sm text-muted">
          Public records should belong to voters, not just institutions.
        </p>
        <p className="mt-3 text-lg font-semibold text-neon">Never forget where you came from and who got you there.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="https://example.com/jessica" target="_blank" rel="noreferrer" className="rounded border border-neon/50 bg-neon/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-neon hover:bg-neon/20">
            Learn more about Jessica
          </Link>
          <Link href="https://example.com/support-jessica" target="_blank" rel="noreferrer" className="rounded border border-amber/60 bg-amber/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-amber hover:bg-amber/20">
            Support a grassroots campaign
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted">Current filter context: {yearText === "all" ? "All Years (2023-2026)" : yearText}</p>
      </Section>

      <Disclaimer />
    </div>
  );
}
