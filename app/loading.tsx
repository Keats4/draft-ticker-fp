export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="h-10 w-64 animate-pulse rounded bg-neutral-200" />
      <div className="mt-2 h-4 w-80 animate-pulse rounded bg-neutral-100" />
      <div className="mt-6 h-12 w-full animate-pulse rounded bg-neutral-100" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-full animate-pulse rounded bg-neutral-50"
          />
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-neutral-400">
        Loading market data…
      </p>
    </main>
  );
}
