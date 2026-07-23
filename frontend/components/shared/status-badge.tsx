import { Badge } from "@/components/ui/badge";
import type { DeviceStatus } from "@/lib/domain/device";

const labels: Record<DeviceStatus, string> = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const variant = status === "active" ? "success" : status === "expiring" ? "warning" : "danger";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}
