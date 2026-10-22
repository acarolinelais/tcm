export function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-5">
      <h1 className="text-lg font-semibold text-foreground">{titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Em breve.</p>
    </div>
  );
}
