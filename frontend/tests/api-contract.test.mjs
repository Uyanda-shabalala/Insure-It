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

test("registration matches preserved Device entity, with nested IDs and status", async () => {
  let sent;
  const api = loadModule("lib/api/devices.ts", { "@/lib/api/client": {
    request: async (path, options) => { sent = { path, ...options }; return device; },
  } });
  const result = await api.createDevice({ name: device.name, brandId: "brand-1",
    deviceTypeId: "type-1", model: "", location: "", serialNumber: "" });
  assert.equal(sent.path, "/api/devices");
  assert.equal(sent.method, "POST");
  assert.deepEqual(JSON.parse(JSON.stringify(sent.body)), { name: device.name,
    serialNumber: null, model: null, brand: { id: "brand-1" },
    deviceType: { id: "type-1" }, status: "available", location: null });
  assert.equal(result.brandName, "Dell");
  assert.equal(result.deviceTypeName, "Laptop");
});

test("inventory supports entity responses and flat read DTOs", async () => {
  const api = loadModule("lib/api/devices.ts", { "@/lib/api/client": {
    request: async () => [device, { ...device, brandName: "HP", deviceTypeName: "Desktop" }],
  } });
  const list = await api.listDevices();
  assert.equal(list[0].brandName, "Dell");
  assert.equal(list[1].brandName, "HP");
  assert.equal(list[1].deviceTypeName, "Desktop");
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
