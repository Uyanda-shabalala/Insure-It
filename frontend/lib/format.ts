import type { Device, DeviceStatus } from "@/lib/domain/device";

export function getDeviceStatus(
  status: string | null | undefined,
): DeviceStatus {
  const normalized = status
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (normalized === "under_repair" || normalized === "in_repair")
    return "repair";
  if (
    normalized === "available" ||
    normalized === "assigned" ||
    normalized === "repair" ||
    normalized === "lost" ||
    normalized === "retired"
  )
    return normalized;
  return "unknown";
}

export function statusLabel(status: string) {
  const normalized = getDeviceStatus(status);
  const labels: Record<DeviceStatus, string> = {
    available: "Available",
    assigned: "Assigned",
    repair: "Under Repair",
    lost: "Lost",
    retired: "Retired",
    unknown: status || "Unknown",
  };
  return labels[normalized];
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "Not provided";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "Not provided";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function deviceTimestamp(device: Device) {
  const value = Date.parse(device.createdAt ?? device.updatedAt ?? "");
  return Number.isNaN(value) ? 0 : value;
}

export function summarizeDevices(devices: Device[]) {
  return {
    total: devices.length,
    available: devices.filter(
      (device) => getDeviceStatus(device.status) === "available",
    ).length,
    assigned: devices.filter(
      (device) => getDeviceStatus(device.status) === "assigned",
    ).length,
    repair: devices.filter(
      (device) => getDeviceStatus(device.status) === "repair",
    ).length,
  };
}
