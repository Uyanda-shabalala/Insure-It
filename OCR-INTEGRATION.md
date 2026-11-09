# Groq with local EasyOCR fallback

Branch: `feat/easyocr-fallback`, based on `origin/Development`.

Spring Boot tries Groq first. On rate limiting, missing Groq configuration,
provider errors, malformed answers, or a connection failure/timeout, it calls
the Python service if `OCR_FALLBACK_ENABLED=true`. A valid Groq `NOT_FOUND`
does not trigger fallback. Invalid caller input is rejected before providers.
Fallback is disabled by default so an existing deployment does not acquire
an unexpected dependency. Both providers failing produces an HTTP error,
never a fabricated serial or `NOT_FOUND`.

## Start locally

Use two terminals. No paid hosting is required for this setup.

In `ocr-service/`, using a Python environment compatible with EasyOCR/PyTorch:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn ocr_service:app --host 127.0.0.1 --port 8001
```

First startup can download OCR model weights and take time. Wait for startup
to complete and check `http://127.0.0.1:8001/health` before a demonstration.
The dependency list is not a locked deployment environment; establish and pin
the working versions on the target machine before hosting.

In `backend/`, with Java 17+ and Maven available:

```powershell
$env:GROQ_API_KEY = 'your-key'
.\start-ocr-local.ps1
```

The existing local profile binds Spring Boot to `127.0.0.1:3000` and permits
local API requests. Do not use that profile for public hosting. If your
frontend also uses port 3000, set `SERVER_PORT=8080` before starting the backend.
The Python service remains at port 8001.

`Development` already references absent `DeviceType` and `InsurancePolicy`
classes, so its normal build currently fails. The `ocr-only` Maven profile
compiles only the OCR application and excludes database code. The script
imports database auto-configuration exclusions. This permits OCR integration
testing and demonstrations; it does not repair or validate the inventory API.
After the database model work is merged, build normally and enable fallback
in the full backend. Do not mix old build output from other profiles; use a
clean build when changing profiles.

## API

`POST /api/ocr/serial-number` accepts either:

- JSON: `{"base64Image":"data:image/png;base64,..."}`
- Multipart form: field `image`, with JPEG, PNG or WebP content type.

The JSON alias `/api/groq/serial-number` uses the same orchestration.
The backend forwards the original decoded bytes as multipart field `file`
to Python. Maximum decoded image size is 3,000,000 bytes (4,000,000 base64
characters). Python's larger limit does not override the backend limit.

Example fallback response:

```json
{"serialNumber":"ABC12345","status":"REVIEW_REQUIRED","source":"fallback","requiresReview":true}
```

Python `ok` maps to `FOUND`; `low_confidence` maps to `REVIEW_REQUIRED`;
`not_detected` with an explicit null serial maps to `NOT_FOUND`.
All nonempty results require user confirmation before saving, including
Groq and Python `ok`. This API does not save a device. The frontend must handle
`REVIEW_REQUIRED`, show the editable value, and require confirmation.
No confidence percentage is exposed because the Python score is uncalibrated.
This branch changes the backend and Python service, not the frontend UI.

The existing batch service now uses the same orchestrator. It retains its
existing fail-whole-batch behavior if a task fails; no new batch route is added.

## Configuration

| Setting | Default |
|---|---|
| `OCR_FALLBACK_ENABLED` | `false` |
| `OCR_FALLBACK_URL` | `http://127.0.0.1:8001/ocr` |
| `ocr.fallback.connect-timeout` | `2s` |
| `ocr.fallback.read-timeout` | `120s` |

Groq's existing connect/read deadlines are 10s/60s. Calls are sequential,
so end-to-end requests can take roughly the sum of provider deadlines plus
processing overhead. Ensure frontend and reverse-proxy deadlines accommodate
this or shorten the limits after measuring. Only configured service URLs are
used; users cannot supply fallback destinations.

## Verification

```powershell
# backend/; use a clean build when switching compilation profiles
mvn -Pocr-only -Dtest=OcrFallbackIntegrationTest clean test
# ocr-service/
python -m unittest -v test_extractor
```

Java tests exercise real HTTP calls against local stand-ins, multipart
serialization, Groq success and failure, disabled fallback, missing keys,
invalid caller data, review status, malformed fallback output, timeouts,
and an actual local Spring Boot startup/request. They make no billable calls.
Python tests cover extraction regressions and pass selection without loading
models. These do not establish real-photo accuracy or actual EasyOCR latency.

The included Python service was taken from the locally available
`insure-it-ocr.zip`, not a verified copy of the unavailable `(1)` upload.
Changes restrict serial-label scope, reject Express Service Code, include the
original-image pass, and retain a later accepted pass over an earlier ambiguous
one. Run real device images before relying on its output in a presentation.

For hosting, run Python as a persistent internal service accessible to Spring
Boot. Configure its private URL and measure CPU/memory and latency first.
The same-machine setup handles Groq failure, not failure of that machine.
