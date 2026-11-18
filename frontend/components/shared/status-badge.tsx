import { Badge } from "@/components/ui/badge";
import { normalizeStatus, statusLabel } from "@/lib/format";

/** Lifecycle status badge. Takes the raw backend status string. */
export function StatusBadge({ status }: { status: string }) {
  const kind = normalizeStatus(status);
  const variant = kind === "available" ? "success" : kind === "assigned" ? "default" : kind === "under_repair" ? "warning" : "neutral";
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}
