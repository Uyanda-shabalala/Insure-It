"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-lg rounded-3xl border bg-[var(--surface)] p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-4 text-[var(--danger)]" size={34} />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">The workspace could not be rendered. Your locally saved data has not been removed.</p>
        <Button className="mt-6" onClick={reset}>
          <RotateCcw size={16} /> Try again
        </Button>
      </section>
    </main>
  );
}
