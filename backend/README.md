# Insure-It integrated backend

Requires Java 17+ and Maven. The frontend and backend use separate ports:
frontend 3000, backend 8080, optional Python OCR 8001.

## Normal startup

Set SUPABASE_DB_URL (a JDBC PostgreSQL URL), SUPABASE_DB_USERNAME,
SUPABASE_DB_PASSWORD and GROQ_API_KEY privately in the process environment.
No credentials belong in Git. Run mvn spring-boot:run from backend/.
Existing tables are validated; schema creation and alteration are disabled.
The mappings follow the owner's supplied Supabase diagram, not the older
six-table SQL handoff elsewhere in the project.

For an explicitly local demonstration, select the sole local profile with
mvn spring-boot:run '-Dspring-boot.run.profiles=local'. This allows anonymous
/api calls without CSRF. The default bind address is 127.0.0.1. Never use the
local profile for a public deployment. Outside it, HTTP Basic and CSRF remain
required. Supabase application login is not implemented by this integration.

## API

See ../frontend/docs/API_CONTRACT.md for the registration, lookup, employee,
assignment and OCR contracts. Registration uses flat UUID reference IDs.
Assignment records and device lifecycle status are updated atomically.

## Optional backup OCR

In ocr-service/, create a Python virtual environment and install requirements.txt,
then run python -m uvicorn ocr_service:app --host 127.0.0.1 --port 8001.
Wait for /health before demonstrating; first startup may download model weights.
Set OCR_FALLBACK_ENABLED=true in the backend environment to opt in.
OCR_FALLBACK_URL defaults to http://127.0.0.1:8001/ocr. The default fallback read
timeout is 120s, after Groq's own timeout; allow for the combined duration.
Python dependencies are not locked. Establish a tested environment before hosting.
Real-photo accuracy and EasyOCR startup/latency still need target-machine checks.

Both single and batch endpoints use the Groq-first OcrService. All nonempty
results need human review. NOT_FOUND is a valid result and does not trigger
fallback. Provider failures produce errors instead of invented serials.

## Build and tests

Run mvn test or mvn package. Tests select their own isolated H2 configuration and
never use Supabase credentials. HTTP OCR tests call local stand-ins, not paid APIs.
Run python -m unittest -v test_extractor from ocr-service/ for extraction tests.

For browser QA only: mvn test-compile dependency:build-classpath
'-Dmdep.outputFile=target/test-classpath.txt' '-Dmdep.includeScope=test'. Run
com.insureit.IntegrationPreview with target/test-classes, target/classes and that
classpath. It uses port 8088, an ephemeral H2 database, test reference/employee
records and a simulated OCR provider. Build/run the frontend with both backend
origin variables set to http://127.0.0.1:8088. The preview is test source only and
is not included in the production application JAR.

Production deployment still requires completed application authentication and
verification of Supabase permissions, constraints and connectivity.
