export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <section className={["rounded border border-amber/40 bg-amber/10", compact ? "p-3" : "p-4"].join(" ")}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber">Disclaimer</h3>
      <ul className="mt-2 space-y-1 text-xs text-amber/90">
        <li>Public campaign-finance data is shown for informational purposes.</li>
        <li>This analysis does not allege wrongdoing or illegal coordination.</li>
        <li>This project is independent and not endorsed by the FEC.</li>
        <li>Network relationships do not necessarily indicate direct transfers or coordination.</li>
        <li>Bundling analysis reflects patterns unless official bundler disclosures are cited.</li>
      </ul>
    </section>
  );
}
