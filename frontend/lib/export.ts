import type { Device } from "@/lib/domain/device";
import { brandModel, statusLabel } from "@/lib/format";

function csvEscape(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportDevicesCsv(devices: Device[]) {
  const headers = ["Name", "Brand / Model", "Serial", "Type", "Location", "Status"];
  const rows = devices.map((device) => [
    device.name,
    brandModel(device),
    device.serialNumber,
    device.deviceTypeName,
    device.location,
    statusLabel(device.status),
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
