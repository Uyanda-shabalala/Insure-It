# OCR capture integration

The capture screen uploads the original selected `File` as multipart field
`image`. A separate resized JPEG data URL is retained for the preview and the
registration draft. OCR does not register a device. See FRONTEND_MVP.md for API-backed registration and inventory.

## Run locally

1. Use the backend copy that actually contains `OcrController.java`. The current checkout has device endpoints but does not include the OCR controller.
   Remote branches inspected for this change contain `SerialNumberResponse`,
   but no OCR controller. Do not assume the OCR-named branch exposes the route.
2. From that working backend directory, with Java/Maven installed and its
   required credentials configured, run:

   ```powershell
   $env:SERVER_PORT = "8080"
   mvn spring-boot:run
   ```

   This overrides the port 3000 setting found in the remote development backend
   and leaves port 3000 available for Next.js. Confirm the working backend's
   active profile, authentication, CSRF rules, and OCR provider credentials.
   They cannot be established from the missing controller or sample document.
3. In `frontend`, copy `.env.example` to `.env.local`, install dependencies if
   needed, and start the frontend:

   ```powershell
   Copy-Item .env.example .env.local
   npm.cmd ci
   npm.cmd run dev -- --port 3000
   ```

4. Open `http://localhost:3000`. The default browser URL is
   `/api/ocr/serial-number`. Next.js forwards that exact route to
   `OCR_BACKEND_ORIGIN` (default `http://127.0.0.1:8080`). Browser requests remain
   same-origin, so this path does not require Spring CORS changes. This proxy
   does not bypass Spring authentication or CSRF checks and adds no credentials.

`NEXT_PUBLIC_OCR_ENDPOINT` remains an optional full browser URL override. An
absolute cross-origin URL requires the backend to allow the frontend origin in
CORS, and must be reachable from the browser's device. Prefer the proxy for
phone testing; the phone reaches Next.js and Next.js reaches Spring Boot.
Only the server needs to reach `OCR_BACKEND_ORIGIN`. In Docker it must point to
the backend service/host, not the frontend container's loopback address.

Restart Next.js after environment changes. Rewrites and public environment
values are configured at build time for production: set them before
`npm.cmd run build`, then use `npm.cmd start` or the standalone server. Rebuild
when changing the backend destination. Never put provider keys or privileged
credentials in `NEXT_PUBLIC_` values.

## Expected contract

```http
POST /api/ocr/serial-number
Content-Type: multipart/form-data; boundary=<browser-generated>
```

One file part is named `image`. No JSON image or confidence score is sent.
The browser supplies Content-Type and the multipart boundary automatically.

```json
{ "serialNumber": "ABC123", "status": "FOUND" }
```

```json
{ "serialNumber": null, "status": "NOT_FOUND" }
```

`FOUND` requires a nonblank string serial. `NOT_FOUND` leaves the editable serial
blank and prompts another photo or manual entry. HTTP failures, malformed JSON,
and invalid response shapes show an error while retaining the preview. Serials
are never generated locally. This response shape matches the remote Java record; the
multipart route and field are based on the requested contract and reference
document until the working controller is supplied.

## Test the capture flow

1. Open Capture and select a clear image of a serial label, or use Open camera
   on a device with camera support. The existing input limit is 8 MiB. Configure
   Spring's multipart file/request limits to accommodate the original file plus
   multipart overhead; the resized preview is not the uploaded file.
2. In browser Network tools, confirm a POST to `/api/ocr/serial-number` with a
   multipart `image` file and a browser-generated boundary.
3. Confirm the preview and loading indicator appear, followed by the extracted
   serial. Edit it and choose Continue to device details. Verify the reviewed
   serial and photo are prefilled. Registration sends the reviewed fields to the backend; the preview is not persisted.
4. Use an image with no serial. A `NOT_FOUND` response should keep the preview,
   show the manual-entry guidance, and require a serial before continuing.
5. Stop the backend or return an HTTP error: the error should be visible, the
   preview should remain, and manual entry should still allow continuation.
6. Clear or replace an image while OCR is pending. The cancelled result must
   not repopulate the serial. Selecting the same file again must trigger upload.

To probe the real backend independently of the UI:

```powershell
curl.exe -i -F "image=@C:\images\serial-label.jpg" http://127.0.0.1:8080/api/ocr/serial-number
```

Repeat against port 3000 to exercise the proxy. Supply any authentication
required by your actual controller/security configuration. A mock response
proves frontend handling and multipart transport, not real OCR accuracy.

Frontend checks: `npm.cmd run typecheck`, `npm.cmd run lint`, and
`npm.cmd run build`. ESLint uses the modern Next.js flat configuration with
compatible `eslint` and `eslint-config-next` dependencies.

