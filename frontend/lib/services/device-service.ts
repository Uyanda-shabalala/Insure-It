import { z } from "zod";
import {
  deviceFormSchema,
  type Device,
  type DeviceFormValues,
  type Employee,
  type LookupOption,
  type RegisterDeviceRequest,
} from "@/lib/domain/device";
import { ApiError, apiRequest } from "@/lib/services/api-client";
import { apiConfig, mutationPath } from "@/lib/services/api-config";

// The running read DTO returns names; the entity-shaped response returns objects.
// A display name is never treated as a backend identifier.
const referenceSchema = z.union([
  z.string().min(1).transform((name) => ({ id: null, name })),
  z.object({ id: z.string().min(1), name: z.string().nullish() }),
]);
const employeeSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  employeeNumber: z.string().nullish(),
  department: z
    .union([
      z.string(),
      z.object({ id: z.string().optional(), name: z.string().nullish() }),
    ])
    .nullish(),
});

// currentEmployee/currentHolder and policy scalar fields are optional extensions:
// their models are absent from this backend checkout. Never synthesize a holder.
const deviceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    serialNumber: z.string().nullish(),
    brand: referenceSchema,
    deviceType: referenceSchema,
    model: z.string().nullish(),
    location: z.string().nullish(),
    status: z.string().min(1),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    currentEmployee: employeeSchema.nullish(),
    currentHolder: employeeSchema.nullish(),
    insurancePolicy: z.record(z.string(), z.unknown()).nullish(),
  })
  .transform((data): Device => ({
    id: data.id,
    name: data.name,
    brand: data.brand,
    deviceType: data.deviceType,
    serialNumber: data.serialNumber ?? null,
    model: data.model ?? null,
    location: data.location ?? null,
    status: data.status,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    currentEmployee: data.currentEmployee ?? data.currentHolder ?? null,
    insurancePolicy: data.insurancePolicy ?? null,
  }));

function decode<T>(schema: z.ZodType<T>, data: unknown, resource: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.slice(0, 3).map((issue) =>
      `${issue.path.join(".") || "response"}: ${issue.message}`,
    ).join("; ");
    throw new ApiError(
      `The backend returned an unexpected ${resource} format. ${details}`,
    );
  }
  return result.data;
}

export function toRegisterDeviceRequest(
  values: DeviceFormValues,
): RegisterDeviceRequest {
  const data = deviceFormSchema.parse(values);
  return {
    name: data.name,
    serialNumber: data.serialNumber || null,
    brand: { id: data.brandId },
    deviceType: { id: data.deviceTypeId },
    model: data.model || null,
    location: data.location || null,
    status: "available",
  };
}

export async function listDevices(signal?: AbortSignal): Promise<Device[]> {
  return decode(
    z.array(deviceSchema),
    await apiRequest("/devices", { signal }),
    "device list",
  );
}

export async function getDevice(
  id: string,
  signal?: AbortSignal,
): Promise<Device> {
  return decode(
    deviceSchema,
    await apiRequest(`/devices/${encodeURIComponent(id)}`, { signal }),
    "device",
  );
}

export async function registerDevice(
  values: DeviceFormValues,
): Promise<Device> {
  return decode(
    deviceSchema,
    await apiRequest("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toRegisterDeviceRequest(values)),
    }),
    "registered device",
  );
}

const lookupSchema = z.array(
  z.object({ id: z.string().uuid(), name: z.string().min(1) }),
);
export async function listBrands(
  signal?: AbortSignal,
): Promise<LookupOption[]> {
  return decode(
    lookupSchema,
    await apiRequest(apiConfig.brandsPath, { signal }),
    "brand list",
  );
}
export async function listDeviceTypes(
  signal?: AbortSignal,
): Promise<LookupOption[]> {
  return decode(
    lookupSchema,
    await apiRequest(apiConfig.deviceTypesPath, { signal }),
    "device type list",
  );
}
export async function listEmployees(signal?: AbortSignal): Promise<Employee[]> {
  return decode(
    z.array(employeeSchema),
    await apiRequest(apiConfig.employeesPath, { signal }),
    "employee list",
  );
}

export const assignmentAvailable = Boolean(
  mutationPath(apiConfig.assignPath, "device-id"),
);
export const returnAvailable = Boolean(
  mutationPath(apiConfig.returnPath, "device-id"),
);

export async function assignDevice(deviceId: string, employeeId: string) {
  const path = mutationPath(apiConfig.assignPath, deviceId);
  if (!path)
    throw new ApiError(
      "Device assignment is not available on the backend yet.",
    );
  // Provisional payload. Only enable the configured path after backend agreement.
  await apiRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId }),
  });
}

export async function returnDevice(deviceId: string) {
  const path = mutationPath(apiConfig.returnPath, deviceId);
  if (!path)
    throw new ApiError("Device returns are not available on the backend yet.");
  await apiRequest(path, { method: "POST" });
}
