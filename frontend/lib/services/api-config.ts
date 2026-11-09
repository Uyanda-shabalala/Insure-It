// Defaults match the integrated backend; endpoint paths remain configurable.
export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api",
  brandsPath: process.env.NEXT_PUBLIC_BRANDS_PATH?.trim() || "/brands",
  deviceTypesPath:
    process.env.NEXT_PUBLIC_DEVICE_TYPES_PATH?.trim() || "/device-types",
  employeesPath: process.env.NEXT_PUBLIC_EMPLOYEES_PATH?.trim() || "/employees",
  assignPath: process.env.NEXT_PUBLIC_DEVICE_ASSIGN_PATH?.trim() || "/devices/{id}/assign",
  returnPath: process.env.NEXT_PUBLIC_DEVICE_RETURN_PATH?.trim() || "/devices/{id}/return",
};

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiConfig.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function mutationPath(template: string | null, deviceId: string) {
  return template?.includes("{id}")
    ? template.replaceAll("{id}", encodeURIComponent(deviceId))
    : null;
}
