import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  dependencies = { "@/lib/services/api-config": { apiConfig: {}, mutationPath: () => null }, ...dependencies };
  vm.runInNewContext(outputText, {
    exports, require: (name) => {
      if (!(name in dependencies)) throw new Error("Unexpected dependency: " + name);
      return dependencies[name];
    }, process: { env: {} }, FormData, ...globals,
  });
  return exports;
}

const device = { id: "device-1", name: "Finance laptop", status: "available",
  brand: { id: "brand-1", name: "Dell" }, deviceType: { id: "type-1", name: "Laptop" } };

test("registration matches CreateDeviceRequest with flat reference IDs", async () => {
  let sent;
  const api = loadModule("lib/api/devices.ts", { "@/lib/api/client": {
    request: async (path, options) => { sent = { path, ...options }; return device; },
  } });
  const result = await api.createDevice({ name: device.name, brandId: "brand-1",
    deviceTypeId: "type-1", model: "", location: "", serialNumber: "" });
  assert.equal(sent.path, "/api/devices");
  assert.equal(sent.method, "POST");
  assert.deepEqual(JSON.parse(JSON.stringify(sent.body)), { name: device.name,
    serialNumber: null, model: null, brandId: "brand-1",
    deviceTypeId: "type-1", location: null });
  assert.equal(result.brandName, "Dell");
  assert.equal(result.deviceTypeName, "Laptop");
});

test("inventory supports entity responses and flat read DTOs", async () => {
  const api = loadModule("lib/api/devices.ts", { "@/lib/api/client": {
    request: async () => [device, { ...device, brandName: "HP", deviceTypeName: "Desktop" }, { ...device, brand: "Lenovo", deviceType: "Laptop" }],
  } });
  const list = await api.listDevices();
  assert.equal(list[0].brandName, "Dell");
  assert.equal(list[1].brandName, "HP");
  assert.equal(list[1].deviceTypeName, "Desktop");
  assert.equal(list[2].brandName, "Lenovo");
  assert.equal(list[2].deviceTypeName, "Laptop");
});

test("same-origin requests retain sessions; absent optional routes are unavailable", async () => {
  let call;
  const client = loadModule("lib/api/client.ts", {}, { fetch: async (url, options) => {
    call = { url, ...options };
    return new Response(null, { status: 404 });
  } });
  await assert.rejects(client.request("/api/employees"), client.EndpointUnavailableError);
  assert.equal(call.url, "/api/employees");
  assert.equal(call.credentials, "include");
  assert.equal(call.cache, "no-store");
});

test("OCR uploads multipart image and reads serialNumber", async () => {
  let sent;
  const ocr = loadModule("lib/services/ocr-service.ts", { "@/lib/api/client": {
    request: async (path, options) => { sent = { path, ...options }; return { serialNumber: " SN123 " }; },
    ApiError: Error,
  } });
  const result = await ocr.extractSerial(new Blob(["test"], { type: "image/jpeg" }));
  assert.equal(sent.path, "/api/ocr/serial-number");
  assert.equal(sent.formData.get("image").name, "serial-label.jpg");
  assert.equal(result.serial, "SN123");
});


test("OCR review status and fallback source are preserved", async () => {
  const ocr = loadModule("lib/services/ocr-service.ts", { "@/lib/api/client": {
    request: async () => ({ serialNumber: " CHECK123 ", status: "REVIEW_REQUIRED", source: "fallback", requiresReview: true }),
    ApiError: Error,
  } });
  const result = await ocr.extractSerial(new Blob(["test"]));
  assert.equal(result.serial, "CHECK123");
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.equal(result.source, "fallback");
  assert.equal(result.requiresReview, true);
});

test("malformed inventory does not masquerade as an empty list", async () => {
  const client = loadModule("lib/api/client.ts");
  const api = loadModule("lib/api/devices.ts", { "@/lib/api/client": {
    ...client, request: async () => ({ unexpected: true }),
  } });
  await assert.rejects(api.listDevices(), client.ApiError);
});

test("assignment and return use the implemented routes with encoded device IDs", async () => {
  const calls = [];
  const config = loadModule("lib/services/api-config.ts");
  const api = loadModule("lib/api/devices.ts", {
    "@/lib/services/api-config": config,
    "@/lib/api/client": { request: async (path, options) => { calls.push({ path, ...options }); } },
  });
  await api.assignDevice("device/id", "employee-1");
  await api.returnDevice("device/id");
  assert.equal(calls[0].path, "/api/devices/device%2Fid/assign");
  assert.equal(calls[0].body.employeeId, "employee-1");
  assert.equal(calls[1].path, "/api/devices/device%2Fid/return");
  assert.equal(calls[1].method, "POST");
});


test("employee creation sends trimmed required fields and nullable optional fields", async () => {
  let sent;
  const api = loadModule("lib/api/devices.ts", { "@/lib/services/api-config": loadModule("lib/services/api-config.ts"), "@/lib/api/client": {
    request: async (path, options) => { sent = { path, ...options }; return {
      id: "employee-created", employeeNumber: "EMP001", fullName: "Jane Doe", email: null, department: "Finance",
    }; },
  } });
  const employee = await api.createEmployee({ employeeNumber: " EMP001 ", fullName: " Jane Doe ", email: " ", department: " Finance " });
  assert.equal(sent.path, "/api/employees");
  assert.equal(sent.method, "POST");
  assert.deepEqual(JSON.parse(JSON.stringify(sent.body)), { employeeNumber: "EMP001", fullName: "Jane Doe", email: null, department: "Finance" });
  assert.equal(employee.id, "employee-created");
  assert.equal(employee.fullName, "Jane Doe");
});
