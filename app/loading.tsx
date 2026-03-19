export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded border border-border bg-panel" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded border border-border bg-panelAlt" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded border border-border bg-panel" />
        <div className="h-80 animate-pulse rounded border border-border bg-panel" />
      </div>
    </div>
  );
}
