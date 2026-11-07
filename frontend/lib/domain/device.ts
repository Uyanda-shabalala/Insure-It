import { z } from "zod";

export const lifecycleStatuses = [
  "available",
  "assigned",
  "repair",
  "lost",
  "retired",
] as const;
export type DeviceStatus = (typeof lifecycleStatuses)[number] | "unknown";

export interface LookupOption {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  employeeNumber?: string | null;
  department?: string | { id?: string; name?: string | null } | null;
}

export interface Device {
  id: string;
  name: string;
  serialNumber: string | null;
  brand: { id: string | null; name?: string | null };
  deviceType: { id: string | null; name?: string | null };
  model: string | null;
  location: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  currentEmployee: Employee | null;
  insurancePolicy: Record<string, unknown> | null;
}

export interface RegisterDeviceRequest {
  name: string;
  serialNumber: string | null;
  brand: { id: string };
  deviceType: { id: string };
  model: string | null;
  location: string | null;
  status: "available";
}

export const deviceFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a device name"),
  serialNumber: z.string().trim(),
  brandId: z.string().uuid("Select a brand from the backend list"),
  deviceTypeId: z.string().uuid("Select a device type from the backend list"),
  model: z.string().trim(),
  location: z.string().trim(),
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;

export interface DeviceDraft {
  serial: string;
  photo: string | null;
}

export function employeeName(employee: Employee) {
  return (
    employee.name?.trim() ||
    [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() ||
    employee.employeeNumber ||
    "Name not provided"
  );
}

export function employeeDepartment(employee: Employee) {
  return typeof employee.department === "string"
    ? employee.department
    : employee.department?.name || "";
}
