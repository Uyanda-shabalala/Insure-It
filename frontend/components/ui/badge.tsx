import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", {
  variants: {
    variant: {
      default: "bg-[var(--primary-soft)] text-[var(--primary)]",
      success: "bg-[var(--success-soft)] text-[var(--success)]",
      warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
      danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
      neutral: "bg-[var(--surface-muted)] text-[var(--muted)]",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
