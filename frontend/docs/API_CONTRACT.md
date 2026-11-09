# Integrated MVP API

Sources: local feature/backend-mvp commit d74ec07, published EasyOCR fallback
commit 3fb9f3e, and the teammate frontend already integrated in dc8c432.
Only reviewed source, tests and documentation were imported. Generated output,
logs and private configuration from other checkouts were not imported.

## Database

Mappings follow the project owner's actual Supabase diagram: devices, brands,
device_types, employees, insurance_policies, users, device_assignments and
verification_logs. There is no asset_tag column. Employees hold devices through
device_assignments; devices has no employee_id column. No migrations or live
Supabase writes were performed as part of integration.

## Device registration

POST /api/devices accepts name, serialNumber, model, brandId, deviceTypeId and
location. Both reference IDs are UUIDs. The backend resolves them and sets status
to available. Unknown serial numbers are stored as null. The existing backend
serial-duplicate rule is retained (409); it is an application check, not a new
unique database constraint.

GET /api/devices and GET /api/devices/{id} return DTOs with brand and deviceType
as display strings, timestamps, optional policy information and insured value.
The frontend also reads the earlier brandName/deviceTypeName DTOs and nested
reference objects. Requests never use display names as identifiers.

GET /api/brands and /api/device-types return id/name lists.
GET /api/employees returns id, employeeNumber, fullName, email and department.
POST /api/employees creates a record from employeeNumber and fullName (required),
plus email and department (optional), and returns 201 with the created DTO and
Location header. The assignment dialog offers Add employee, then selects the new
record without assigning the device until the user confirms. Empty employee lists
show a clear explanation; the selector becomes usable after a record is added.
GET and PUT /api/employees/{id} preserve the local backend's employee API.

## Assignment and return

GET /api/devices/{id}/assignment returns the open assignment with an employee
DTO and assignedAt, or 204 when there is none. A missing device is 404.
POST /api/devices/{id}/assign accepts { employeeId: UUID }.
POST /api/devices/{id}/return closes the open assignment and returns 204.
Assignment and status changes run in one transaction with a device row lock.
Unavailable devices and duplicate assignments return 409. Returns accept only
assigned devices; they do not silently make repair/lost/retired devices available.

## OCR

POST /api/ocr/serial-number accepts multipart field image (JPEG/PNG/WebP, at most
3,000,000 bytes), or JSON { base64Image }. /api/groq/serial-number remains a JSON
alias for the existing integration tests and clients.
POST /api/ocr/serial-number/batch accepts multipart images, between 1 and 10.
Both paths use the same Groq-first orchestration and one bounded executor.

Fallback is opt-in through OCR_FALLBACK_ENABLED=true and OCR_FALLBACK_URL. Groq
provider failures can use the Python service; valid NOT_FOUND does not trigger
fallback. Responses expose serialNumber, status, source and requiresReview.
REVIEW_REQUIRED remains visible in the UI. Users explicitly confirm the serial
against the label before continuing. OCR does not create a device or log a
verification by itself. See backend/README.md for setup and limits.

## Configuration and security

The frontend defaults to its same-origin /api proxy. API_BACKEND_ORIGIN and
OCR_BACKEND_ORIGIN default to http://127.0.0.1:8080. NEXT_PUBLIC_API_URL may
configure a browser-visible backend origin; it must contain no credentials.
Assignment and return paths now default to the implemented endpoints.

Normal backend startup requires database environment variables and validates
existing tables. It does not create or alter production tables. The local profile
must be explicitly selected; only the sole local profile permits anonymous
/api access and disables CSRF for local demonstrations. Keep it on loopback.
Other profiles retain HTTP Basic and CSRF. Supabase login/JWT integration is
separate unfinished work; direct JDBC does not establish Supabase RLS identity.

## Verification scope

Backend tests use an in-memory H2 database and local HTTP provider stand-ins.
They establish local persistence, response contracts, error handling, security
profile behavior and OCR fallback behavior; they do not establish Supabase
connectivity/RLS or real-photo accuracy and latency. The test-only
IntegrationPreview starts the actual backend against H2 with a local Groq
stand-in for browser QA. Production code never seeds test records.

## Integration verification

The final backend package passed 69 tests, including real HTTP OCR failure paths,
security profiles, H2 persistence and concurrent assignment rejection. Seven
frontend contract tests and five Python extraction tests passed. Type checking,
linting (one existing local-image performance warning) and the production
Webpack build passed. Playwright with installed Chrome exercised manual
registration, reference dropdowns, assignment, return, persisted inventory search
and OCR confirmation at 1440x1000 and 390x844. The Browser plugin was unavailable.
These results concern temporary H2 data and local provider stand-ins, not live
Supabase data, Supabase login, actual Groq responses or EasyOCR model accuracy.

Employee creation follow-up: 72 backend tests and eight frontend contract tests passed. Desktop and mobile browser checks covered an empty employee list, required-field validation, creation, automatic selection, explicit assignment and return. Test records used H2 only.
