/** API adapter for the preserved feature/insureit-mvp backend.
 * DeviceController accepts Device entities, including nested brand/type IDs and status.
 * Lookup, OCR and assignment endpoints are optional and absent from this checkout.
 */
import { EndpointUnavailableError, request } from "@/lib/api/client";
import { apiConfig, mutationPath } from "@/lib/services/api-config";
const apiPath = (path: string) => `/api/${path.replace(/^\/api\//, "").replace(/^\//, "")}`;
import type {
  Assignment,
  Device,
  DeviceFormValues,
  Employee,
  InsurancePolicy,
  NamedRef,
} from "@/lib/domain/device";

type Raw = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));
const strOrNull = (value: unknown) => (value == null || value === "" ? null : String(value));
const numOrNull = (value: unknown) => (value == null || value === "" || Number.isNaN(Number(value)) ? null : Number(value));
const pick = (raw: Raw, ...keys: string[]) => keys.map((key) => raw[key]).find((value) => value !== undefined && value !== null);

function toNamedRef(value: unknown): NamedRef | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Raw;
  return { id: str(raw.id), name: str(raw.name) };
}

function toPolicy(value: unknown): InsurancePolicy | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Raw;
  return {
    id: str(raw.id),
    policyNumber: str(pick(raw, "policyNumber", "policy_number")),
    insurerName: str(pick(raw, "insurerName", "insurer_name")),
    startDate: strOrNull(pick(raw, "startDate", "start_date")),
    endDate: strOrNull(pick(raw, "endDate", "end_date")),
  };
}

function toDevice(value: unknown): Device {
  const raw = (value ?? {}) as Raw;
  return {
    id: str(raw.id),
    name: str(raw.name),
    serialNumber: str(pick(raw, "serialNumber", "serial_number")),
    brandName: str(pick(raw, "brandName", "brand_name") ?? toNamedRef(raw.brand)?.name),
    deviceTypeName: str(pick(raw, "deviceTypeName", "device_type_name") ?? toNamedRef(raw.deviceType)?.name),
    model: str(raw.model),
    location: str(raw.location),
    status: str(raw.status),
    insurancePolicy: toPolicy(pick(raw, "insurancePolicy", "insurance_policy")),
    insuredValue: numOrNull(pick(raw, "insuredValue", "insured_value")),
    purchaseDate: strOrNull(pick(raw, "purchaseDate", "purchase_date")),
    createdAt: strOrNull(pick(raw, "createdAt", "created_at")),
    updatedAt: strOrNull(pick(raw, "updatedAt", "updated_at")),
  };
}

function toEmployee(value: unknown): Employee {
  const raw = (value ?? {}) as Raw;
  return {
    id: str(raw.id),
    employeeNumber: str(pick(raw, "employeeNumber", "employee_number")),
    fullName: str(pick(raw, "fullName", "full_name", "name")),
    email: str(raw.email),
    department: str(raw.department),
  };
}

function toList<T>(value: unknown, map: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(map) : [];
}

/* ------------------------------ devices ------------------------------ */

export async function listDevices(): Promise<Device[]> {
  const data = await request<unknown>("/api/devices", { missingMeansUnavailable: false });
  // Accept a plain array or a paged response ({ content: [...] }).
  const items = Array.isArray(data) ? data : (data as { content?: unknown } | null)?.content;
  return toList(items, toDevice);
}

export async function getDevice(id: string): Promise<Device> {
  const data = await request<unknown>(`/api/devices/${encodeURIComponent(id)}`, { missingMeansUnavailable: false });
  return toDevice(data);
}

/** DeviceController binds a Device entity; DeviceService resolves both nested IDs. */
export async function createDevice(values: DeviceFormValues): Promise<Device> {
  const data = await request<unknown>("/api/devices", {
    method: "POST",
    missingMeansUnavailable: false,
    body: {
      name: values.name,
      serialNumber: values.serialNumber || null,
      model: values.model || null,
      brand: { id: values.brandId },
      deviceType: { id: values.deviceTypeId },
      status: "available",
      location: values.location || null,
    },
  });
  return toDevice(data);
}

/* --------------------------- reference data --------------------------- */

export async function listBrands(): Promise<NamedRef[]> {
  const data = await request<unknown>(apiPath(apiConfig.brandsPath));
  return toList(data, (item) => toNamedRef(item) ?? { id: "", name: "" });
}

export async function listDeviceTypes(): Promise<NamedRef[]> {
  const data = await request<unknown>(apiPath(apiConfig.deviceTypesPath));
  return toList(data, (item) => toNamedRef(item) ?? { id: "", name: "" });
}

/* ------------------------- employees & assignment ------------------------- */

export async function listEmployees(): Promise<Employee[]> {
  const data = await request<unknown>(apiPath(apiConfig.employeesPath));
  return toList(data, toEmployee);
}

/** The open assignment (returned_at is null), or null when the device is not held by anyone. */
export async function getCurrentAssignment(deviceId: string): Promise<Assignment | null> {
  const data = await request<unknown>(`/api/devices/${encodeURIComponent(deviceId)}/assignment`);
  if (!data || typeof data !== "object") return null;
  const raw = data as Raw;
  if (raw.returnedAt || raw.returned_at) return null;
  const employeeSource = raw.employee ?? raw;
  return {
    id: str(raw.id),
    employee: toEmployee(employeeSource),
    assignedAt: strOrNull(pick(raw, "assignedAt", "assigned_at")),
  };
}

/** The backend is expected to create the assignment row AND update the device status. */
export async function assignDevice(deviceId: string, employeeId: string): Promise<void> {
  const path = mutationPath(apiConfig.assignPath, deviceId);
  if (!path) throw new EndpointUnavailableError("Device assignment", 404);
  await request(apiPath(path), { method: "POST", body: { employeeId } });
}

/** The backend is expected to close the open assignment AND update the device status. */
export async function returnDevice(deviceId: string): Promise<void> {
  const path = mutationPath(apiConfig.returnPath, deviceId);
  if (!path) throw new EndpointUnavailableError("Device return", 404);
  await request(apiPath(path), { method: "POST" });
}
