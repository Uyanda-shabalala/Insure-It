import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring min-h-24 w-full resize-y rounded-xl border bg-[var(--surface)] px-3.5 py-3 text-sm text-[var(--foreground)] shadow-sm outline-none placeholder:text-[color:var(--muted)]",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
