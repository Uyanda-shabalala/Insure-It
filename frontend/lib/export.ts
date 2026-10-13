import type { Device } from "@/lib/domain/device";
import { getDeviceStatus } from "@/lib/format";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportDevicesCsv(devices: Device[]) {
  const headers = [
    "Name",
    "Type",
    "Serial",
    "Insurer",
    "Policy Number",
    "Monthly Premium (R)",
    "Sum Insured (R)",
    "Expiry Date",
    "Status",
    "Claims",
  ];
  const rows = devices.map((device) => [
    device.name,
    device.type,
    device.serial,
    device.insurer,
    device.policyNumber,
    device.premium ?? "",
    device.sumInsured ?? "",
    device.expiryDate,
    getDeviceStatus(device.expiryDate),
    device.claims.length,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `insure-it-devices-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
