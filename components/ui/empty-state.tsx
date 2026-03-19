export function EmptyState({
  title = "No records for this filter",
  detail = "Try selecting another year or loading additional data."
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded border border-border/80 bg-bg/80 p-6 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">{title}</p>
        <p className="mt-2 text-sm text-muted">{detail}</p>
      </div>
    </div>
  );
}
