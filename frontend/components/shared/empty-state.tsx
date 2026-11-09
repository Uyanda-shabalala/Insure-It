import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-[var(--surface)] p-8 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon size={22} />
        </div>
        <h3 className="mt-4 font-bold">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>
        {actionLabel && onAction ? <Button className="mt-5" onClick={onAction}>{actionLabel}</Button> : null}
      </div>
    </div>
  );
}
