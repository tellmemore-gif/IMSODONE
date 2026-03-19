export function ChartShell({
  title,
  subtitle,
  children,
  indirect = false
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  indirect?: boolean;
}) {
  return (
    <article className="rounded border border-border bg-bg p-3 md:p-4">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
        </div>
        {indirect ? (
          <span className="rounded border border-amber/50 bg-amber/10 px-2 py-1 text-[10px] uppercase text-amber">Indirect</span>
        ) : (
          <span className="rounded border border-neon/50 bg-neon/10 px-2 py-1 text-[10px] uppercase text-neon">Direct</span>
        )}
      </header>
      {children}
    </article>
  );
}
