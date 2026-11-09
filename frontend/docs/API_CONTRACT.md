# Integration API contract

This branch preserves the backend at feature/insureit-mvp commit 7628da2.
The API adapter is lib/api/devices.ts; HTTP transport is lib/api/client.ts.

## Implemented in this backend

- GET /api/devices returns Device entities with nested brand and deviceType objects.
- GET /api/devices/{id} returns a Device entity.
- POST /api/devices accepts name, serialNumber, model, location, brand: { id },
  deviceType: { id }, and status: "available". DeviceService resolves those IDs.
- The display adapter also accepts flat brandName/deviceTypeName read DTOs.

## Missing endpoints

This checkout does not contain controllers for GET /api/brands, GET /api/device-types,
GET /api/employees, GET /api/devices/{id}/assignment, POST /api/devices/{id}/assign,
POST /api/devices/{id}/return, or POST /api/ocr/serial-number.
The UI displays failures/unavailable states. Registration remains disabled until
real brand and type lists are available. No fabricated IDs or successful actions
are substituted. OCR service classes alone do not expose an HTTP endpoint.

## Configuration

By default requests use the same-origin /api proxy retained from the MVP branch.
API_BACKEND_ORIGIN configures its backend (default http://127.0.0.1:8080).
OCR_BACKEND_ORIGIN optionally configures a separate OCR backend.
NEXT_PUBLIC_API_URL optionally specifies a browser-visible backend origin without
/api; the existing NEXT_PUBLIC_API_BASE_URL ending in /api is also supported.
Browser-visible values must never contain credentials. No ZIP environment files
are included. Cross-origin backends must allow the frontend origin and credentials.

## Scope

Only frontend source and these integration notes change. Existing dependency locks,
Next.js proxy, backend, and database configuration are retained. Assignment routes
remain provisional; a 404/405 is shown as unavailable and does not establish that a
specific device exists. Live backend flows require separate verification.

## Build and tests

Run npm ci, npm run typecheck, npm run lint, npm test, and npm run build.
The build explicitly uses Webpack: Turbopack could not start its CSS worker on
the validation machine. The preserved lockfile is unchanged. API contract tests
exercise frontend adapters with controlled responses; they do not prove live backend behavior.

## Validation result

Type checking, linting (one img performance warning), four adapter contract tests,
and the production Webpack build passed. Chrome smoke checks at 1440x1000 and
390x844 verified the nonblank page, capture navigation, inventory failure/retry,
and mobile menu open/close. No runtime exceptions or mobile horizontal overflow
were observed. /api/health returned 200. Missing backend requests returned 500
through the proxy; a missing static resource returned 404. These checks do not
verify registration, OCR extraction or assignment against a running backend.
The Browser plugin was unavailable; Playwright used installed Chrome.
Backend tests could not run because Maven and a Java 17 compiler were unavailable.
