"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => onOpenChange(false)}
      className="m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-xl overflow-visible rounded-3xl bg-transparent p-0 text-[var(--foreground)] backdrop:bg-black/60"
    >
      <section className={cn("max-h-[92vh] overflow-y-auto rounded-3xl border bg-[var(--surface)] shadow-2xl", className)}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-[var(--surface)] p-5">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
          </div>
          <Button aria-label="Close dialog" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X size={18} />
          </Button>
        </header>
        {children}
      </section>
    </dialog>
  );
}
