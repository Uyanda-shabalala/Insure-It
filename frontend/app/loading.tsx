export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md animate-pulse space-y-4" aria-label="Loading Insure-It">
        <div className="h-8 w-40 rounded-xl bg-[var(--surface-muted)]" />
        <div className="h-32 rounded-3xl bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 rounded-3xl bg-[var(--surface-muted)]" />
          <div className="h-28 rounded-3xl bg-[var(--surface-muted)]" />
        </div>
      </div>
    </main>
  );
}
