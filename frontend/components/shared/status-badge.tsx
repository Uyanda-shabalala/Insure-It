import { Badge } from "@/components/ui/badge";
import { getDeviceStatus, statusLabel } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const normalized = getDeviceStatus(status);
  const variant =
    normalized === "available"
      ? "success"
      : normalized === "assigned"
        ? "default"
        : normalized === "repair"
          ? "warning"
          : normalized === "lost"
            ? "danger"
            : "neutral";
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}
