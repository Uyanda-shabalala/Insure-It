import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
}

export function MetricCard({ label, value, helper, icon: Icon }: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{helper}</p>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
