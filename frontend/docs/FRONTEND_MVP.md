# Frontend MVP and backend contract

The frontend manages IT assets. Registration, inventory, and device details now
use the Spring Boot API. Browser localStorage is neither read nor written; old
browser records and their embedded legacy data are left untouched.

## Verified in the current Development checkout

| Operation | Source and contract |
| --- | --- |
| Register | `DeviceController`: `POST /api/devices`, JSON `Device`, returns 201 and the saved device |
| Inventory | `GET /api/devices`, returns a JSON device array |
| Details | `GET /api/devices/{id}`, returns a device |
| Brand reference | `DeviceService` resolves `device.brand.id` through `BrandRepo` |
| Type reference | `DeviceService` resolves `device.deviceType.id` through `DeviceTypeRepo` |
| Required fields | `Device` requires name, brand, deviceType, and status. Timestamps are assigned by lifecycle hooks. |

The frontend sends this shape, with actual selected UUIDs:

Runtime check on 7 November 2026: the live device read response returns `brand`
and `deviceType` as display-name strings rather than the nested objects declared
by the checked-out entity. The response adapter accepts both shapes. Name-only
references have a null ID; inventory filtering uses separate view-only keys.
Registration still requires actual UUIDs from lookup responses and keeps the
nested request shape below. At that check, `GET /api/device-types` returned 404,
which is a separate registration lookup limitation.

```json
{
  "name": "User-entered device name",
  "serialNumber": "Reviewed serial or null",
  "brand": { "id": "selected-brand-uuid" },
  "deviceType": { "id": "selected-device-type-uuid" },
  "model": null,
  "location": null,
  "status": "available"
}
```

Only name, brand and device type are required in the form. The backend allows
null serialNumber, model and location. There is no assetTag field in the current
model or service. The current service does not initialize status, so the frontend
supplies the fixed initial value `available`; there is no status input.

The current model refers to `DeviceType` and `InsurancePolicy`, whose definitions
are missing from the checkout. No backend file was changed to work around this.
The backend developer needs to confirm the complete running DTO/model.

## Missing contracts and isolated assumptions

These routes are absent from the checked-out controllers. They are not reported
as verified backend features:

| Required operation | Frontend expectation / proposal |
| --- | --- |
| Brands | `GET /api/brands` -> `[{ "id": "uuid", "name": "..." }]` |
| Device types | `GET /api/device-types` -> same lookup shape |
| Employees | `GET /api/employees` -> employee array with id and available name, employeeNumber and department fields |
| Assign | Proposed `POST /api/devices/{id}/assign`, JSON `{ "employeeId": "actual-employee-id" }` |
| Return | Proposed `POST /api/devices/{id}/return`, no request body |
| Current holder | Optional `currentEmployee` or `currentHolder` object in the device response; neither field exists in the current model |
| Policy | Optional `insurancePolicy` relationship is declared, but the policy model is absent. Only supplied scalar policy identifiers/details are displayed. |

All assumptions are in `lib/services/api-config.ts` and `device-service.ts`.
Lookup paths can be configured; no lookup IDs or records are hard-coded. If a
lookup route is absent or returns invalid data, the form retains input, reports
the problem, and disables registration until valid options are available.

Assignment and return have **no default mutation path**. Their modals exist, but
confirmation is disabled until an agreed route is explicitly configured. Do not
enable a path until its POST method and payload have been confirmed against the
running backend. Adjust the isolated service if the agreed payload differs.
Unknown, assigned, repair, lost and retired statuses cannot be assigned.

The provisional employee decoder accepts id, name (or firstName/lastName),
employeeNumber, and department as either a string or an object with id/name.
Absent holder fields are displayed as unavailable, never synthesized. A confirmed
mutation triggers fresh GET requests for details and inventory. The UI never
optimistically changes a device lifecycle status or saves an assignment locally.

## Configuration and authentication

Copy `.env.example` to `.env.local` only if needed; do not overwrite existing
configuration. Run the frontend with `npm.cmd run dev` from `frontend/`.

The default browser API base is `/api`. Next.js proxies it to
`API_BACKEND_ORIGIN`, falling back to the existing `OCR_BACKEND_ORIGIN`, then
`http://127.0.0.1:8080`. The exact OCR rewrite takes precedence and preserves its
existing independent origin and `NEXT_PUBLIC_OCR_ENDPOINT` override. The default
OCR URL remains `/api/ocr/serial-number` with multipart file part `image`.

The development backend source uses port 3000, which conflicts with Next.js's
default. Run the separately managed Spring backend on port 8080 or set the
frontend's server origin to its real address and use a different frontend port.
No Spring configuration or secret was changed by this implementation.

Optional public configuration (paths are relative to the API base):

```env
# NEXT_PUBLIC_API_BASE_URL=/api
# NEXT_PUBLIC_BRANDS_PATH=/brands
# NEXT_PUBLIC_DEVICE_TYPES_PATH=/device-types
# NEXT_PUBLIC_EMPLOYEES_PATH=/employees
# Only after backend contract confirmation:
# NEXT_PUBLIC_DEVICE_ASSIGN_PATH=/devices/{id}/assign
# NEXT_PUBLIC_DEVICE_RETURN_PATH=/devices/{id}/return
```

The source security configuration permits API calls only when the sole active
profile is `local`; that branch disables CSRF. Other profiles use HTTP Basic and
retain CSRF protection. Requests include existing browser credentials. The UI
shows 401/403 errors and does not invent credentials, implement a new sign-in
system, or inject privileged keys. Non-local authenticated integration needs the
backend team's existing session/authorization and CSRF contract.

A cross-origin browser API base requires appropriate backend credentialed CORS.
The default same-origin proxy avoids browser CORS for these calls. Public values
are not secret storage. Set origins/public configuration before a production
build, restart dev after changes, and rebuild production when changing rewrites.

## OCR, persistence, and policy boundaries

Capture and OCR remain separate from registration: take/select a photo, upload,
review/edit the serial, continue, then explicitly Register Device. Loading,
NOT_FOUND, invalid responses, network errors, cancellation and manual serial
correction remain supported. Manual registration needs no OCR or photo.

The image remains an in-memory preview only. No evidence upload/storage endpoint
is exposed by this checkout, so a data URL is not sent as `photoPath` or stored in
localStorage. A photo storage contract is outside this MVP.

Only a successful POST with valid server-returned device data yields a success
notice. The inventory is then fetched again. Errors retain form inputs. Requests
are not automatically retried after an uncertain submission.

Insurance is optional. Devices without returned policy data show
`Uninsured / No policy linked`. The form, dashboard, details, domain types and
CSV export do not include insurance claim functionality.

## Validation

Run from `frontend/`:

```powershell
npm.cmd run lint -- --max-warnings=0
npm.cmd run typecheck -- --incremental false
npm.cmd run build
```

There is no existing project test script. Browser QA should cover real HTTP
transport through Next.js using a controlled local backend when Spring is absent:
registration payload/201 response, persistence via backend GET after refresh,
lookup failures, validation/network/authentication errors, lifecycle filters,
CSV export, OCR serial review, and disabled missing assignment/return routes.
Enable the proposed mutation paths only in a separate controlled test process to
exercise employee selection, POST payloads, authoritative refetch, and failures.
This proves frontend behavior against the stated test contracts, not the missing
Spring controllers or real OCR provider.

## Implementation file index

| Area | Frontend files |
| --- | --- |
| API layer | `lib/services/api-config.ts`, `api-client.ts`, `device-service.ts` |
| Asset state and types | `lib/domain/device.ts`, `hooks/use-device-store.ts`, `lib/format.ts`, `lib/export.ts`; removed the obsolete `lib/storage/device-repository.ts` module |
| Views | `components/app/insure-it-shell.tsx`, `components/dashboard/dashboard-view.tsx`, `components/devices/device-form.tsx`, `device-inventory.tsx`, `device-detail.tsx`, new `device-assignment.tsx` |
| OCR | Existing `ocr-service.ts` and upload logic retained; only preview wording in `components/devices/device-capture.tsx` changed |
| Shared UI | New `components/shared/api-state.tsx`, lifecycle `status-badge.tsx`, accessible titles in `components/ui/dialog.tsx` |
| Configuration and product wording | `next.config.ts`, `.env.example`, `app/layout.tsx`, `app/error.tsx`, `public/manifest.webmanifest`, package description in `package.json` |
| Documentation | This file, `docs/ARCHITECTURE.md`, and `docs/OCR_INTEGRATION.md` |

## Verification performed

Production build and TypeScript passed. ESLint was run with zero warnings allowed.
Chrome/Playwright checks used the built standalone app on port 3001 at desktop
1440x1050 and mobile 390x844, with an external controlled HTTP server on 8080.
The Browser plugin was not available. No test fixtures or simulated server were
added to the application or used as a production fallback.

Verified: registration request fields and IDs, client validation, server errors
preserving input, server-returned registration data, inventory after full reload,
status/search filters, optional policy display, CSV columns, OCR multipart bytes
and editable serial handoff, empty/loading/error/authentication states, missing
lookup/employee routes with retry, lifecycle assignment restrictions, disabled
missing mutation contracts, and unchanged legacy localStorage.

A separate build with explicitly enabled test-only mutation paths verified an
assignment rejection without optimistic status changes, one POST per confirmation,
successful assignment and return, and fresh details/inventory GETs. The final build
was restored to default configuration with unavailable mutations disabled.
Screenshots showed no framework error overlay or horizontal mobile overflow, and
there were no unexpected browser runtime errors. Expected HTTP errors were
injected by the test server to exercise failure handling.

Actual Spring Boot persistence, employee/assignment/return controllers,
authenticated non-local operation, real OCR-provider accuracy, and physical camera
capture could not be verified against live backend services. No backend source,
database migration, Spring configuration, existing secret, branch, or Git history
was changed.
