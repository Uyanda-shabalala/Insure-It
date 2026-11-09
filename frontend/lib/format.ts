import type { Device } from "@/lib/domain/device";

const DAY = 86_400_000;

/* --------------------------- lifecycle status --------------------------- */

export type LifecycleStatus = "available" | "assigned" | "under_repair" | "other";

/**
 * The backend stores status as free text. Map it onto the three statuses the MVP cares about,
 * tolerating case, spaces and hyphens ("Under Repair", "under-repair", "UNDER_REPAIR").
 * Anything else is kept as "other" and displayed with its own text.
 */
export function normalizeStatus(raw: string): LifecycleStatus {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "available") return "available";
  if (key === "assigned" || key === "in_use") return "assigned";
  if (key.includes("repair")) return "under_repair";
  return "other";
}

export function statusLabel(raw: string) {
  const status = normalizeStatus(raw);
  if (status === "available") return "Available";
  if (status === "assigned") return "Assigned";
  if (status === "under_repair") return "Under repair";
  const text = raw.trim().replace(/[_-]+/g, " ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "Unknown";
}

export function summarizeDevices(devices: Device[]) {
  const statuses = devices.map((device) => normalizeStatus(device.status));
  return {
    total: devices.length,
    available: statuses.filter((status) => status === "available").length,
    assigned: statuses.filter((status) => status === "assigned").length,
    underRepair: statuses.filter((status) => status === "under_repair").length,
  };
}

/* ------------------------- optional insurance cover ------------------------- */

export type CoverStatus = "active" | "expiring" | "expired";

export function getCoverStatus(endDate: string | null, reference = new Date()): CoverStatus {
  if (!endDate) return "expired";
  const diffDays = (new Date(`${endDate}T23:59:59`).getTime() - reference.getTime()) / DAY;
  if (diffDays < 0) return "expired";
  if (diffDays <= 90) return "expiring";
  return "active";
}

/* ------------------------------- display ------------------------------- */

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(value);
}

/** Accepts "2026-11-08" or a full ISO timestamp. */
export function formatDate(date: string | null | undefined) {
  if (!date) return "";
  const value = date.length <= 10 ? new Date(`${date}T12:00:00`) : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

export function timestamp(date: string | null | undefined) {
  const value = date ? Date.parse(date) : NaN;
  return Number.isNaN(value) ? 0 : value;
}

export function formatRelativeTime(date: string | null | undefined) {
  const value = timestamp(date);
  if (!value) return "";
  const days = Math.floor((Date.now() - value) / DAY);
  if (days <= 0) return "Added today";
  if (days === 1) return "Added yesterday";
  return `Added ${days} days ago`;
}

export function brandModel(device: Pick<Device, "brandName" | "model">) {
  return [device.brandName, device.model].filter(Boolean).join(" ") || "";
}
