export function Section({
  title,
  subtitle,
  children,
  id
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded border border-border bg-panel p-4 shadow-glow md:p-5">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neon md:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
