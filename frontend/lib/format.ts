import type { Device, DeviceStatus } from "@/lib/domain/device";

const DAY = 86_400_000;

export function getDeviceStatus(expiryDate: string, reference = new Date()): DeviceStatus {
  if (!expiryDate) return "expired";
  const expiry = new Date(`${expiryDate}T23:59:59`);
  const diffDays = (expiry.getTime() - reference.getTime()) / DAY;
  if (diffDays < 0) return "expired";
  if (diffDays <= 90) return "expiring";
  return "active";
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function formatRelativeTime(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / DAY);
  if (days <= 0) return "Added today";
  if (days === 1) return "Added yesterday";
  return `Added ${days} days ago`;
}

export function summarizeDevices(devices: Device[]) {
  const statuses = devices.map((device) => getDeviceStatus(device.expiryDate));
  return {
    total: devices.length,
    active: statuses.filter((status) => status === "active").length,
    expiring: statuses.filter((status) => status === "expiring").length,
    expired: statuses.filter((status) => status === "expired").length,
    insurers: new Set(devices.map((device) => device.insurer)).size,
    monthlyPremium: devices.reduce((sum, device) => sum + (device.premium ?? 0), 0),
    sumInsured: devices.reduce((sum, device) => sum + (device.sumInsured ?? 0), 0),
    claims: devices.reduce((sum, device) => sum + device.claims.length, 0),
  };
}
