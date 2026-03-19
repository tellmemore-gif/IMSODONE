import Link from "next/link";

export function OpponentCallout({ year }: { year: string }) {
  const href = year === "all" ? "/maxines-2026-primary-opponent" : `/maxines-2026-primary-opponent?year=${year}`;

  return (
    <section className="rounded border border-amber/40 bg-gradient-to-r from-amber/10 to-neon/10 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-amber">Grassroots Alternative</p>
      <h3 className="mt-2 text-lg font-semibold text-text">Looking for a grassroots alternative in the 2026 primary?</h3>
      <p className="mt-2 text-sm text-muted">Meet Maxine's 2026 primary opponent and review her mission.</p>
      <Link
        href={href}
        className="mt-3 inline-flex rounded border border-amber/60 bg-amber/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-amber hover:bg-amber/20"
      >
        Meet Maxine's 2026 primary opponent
      </Link>
    </section>
  );
}
