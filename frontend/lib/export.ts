import {
  employeeDepartment,
  employeeName,
  type Device,
} from "@/lib/domain/device";
import { statusLabel } from "@/lib/format";

function csvEscape(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportDevicesCsv(devices: Device[]) {
  const headers = [
    "Device ID",
    "Name",
    "Brand",
    "Model",
    "Serial Number",
    "Device Type",
    "Location",
    "Lifecycle Status",
    "Current Employee",
    "Employee Number",
    "Department",
  ];
  const rows = devices.map((device) => [
    device.id,
    device.name,
    device.brand.name,
    device.model,
    device.serialNumber,
    device.deviceType.name,
    device.location,
    statusLabel(device.status),
    device.currentEmployee ? employeeName(device.currentEmployee) : "",
    device.currentEmployee?.employeeNumber,
    device.currentEmployee ? employeeDepartment(device.currentEmployee) : "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `insure-it-devices-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
