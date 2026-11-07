# Architecture

Insure-It is an IT asset management frontend with OCR-assisted registration,
server-backed inventory, employee assignment/return interfaces, and optional
linked insurance policy information.

## Data flow

```text
Next.js App Router -> InsureItShell -> feature views and existing UI primitives
  -> useDeviceStore -> device-service -> api-client -> Spring Boot API
Capture -> image-service (preview) + ocr-service (original multipart image)
  -> editable serial draft -> explicit device registration
Details -> GET device -> optional confirmed assignment/return -> refetch
```

`lib/domain/device.ts` defines the asset form and view model. The API service
validates responses, creates the verified nested brand/type request, and isolates
unverified lookup, employee and mutation contracts. `api-config.ts` centralizes
API paths. `next.config.ts` provides a same-origin proxy while preserving the
existing OCR-specific route and origin.

Inventory and dashboard use only server-returned devices. Loading and error
states do not invent inventory values. Device details fetch their own record.
Assignment/return status and holder changes are displayed only after backend
confirmation and refetch. No inventory or assignment is persisted by the browser;
pre-existing localStorage remains untouched.

Existing responsive Tailwind styling, native UI primitives, navigation, image
preview, and serial correction are retained. Optional policy details are read
from the response. Insurance claims are not part of the application.

See [Frontend MVP and backend contract](FRONTEND_MVP.md) for verified endpoints,
missing backend contracts, authentication, configuration and validation steps.
