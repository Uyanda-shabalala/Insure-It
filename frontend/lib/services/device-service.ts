// Compatibility exports for consumers of the previous frontend service path.
export { listDevices, getDevice, createDevice as registerDevice, listBrands,
  listDeviceTypes, listEmployees, assignDevice, returnDevice } from "@/lib/api/devices";
