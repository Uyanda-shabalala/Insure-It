# MVP features and deployment

JWT authentication and role-based authorization are deliberately excluded. Coordinate those endpoints and screen permissions with the teammate who owns authentication before a public release.

## Database setup

Apply `backend/database/20261109_mvp_integrity.sql` to the existing Supabase project. It preserves rows, preflights duplicate normalized serials and provider/policy numbers, adds unique indexes, and adds an insurance provider directory with RLS enabled. Any preflight error rolls back the transaction. Review collisions manually rather than deleting or rewriting records automatically.

Serial comparison ignores surrounding spaces and case. New serials are stored trimmed and uppercase. Unknown serials remain null, so multiple devices without a serial are supported. The unique index is required to guarantee duplicate protection under concurrent registration; the application check alone cannot provide that guarantee.

Insurance remains optional after registration. Providers have an optional phone number. Policies use the existing `insurance_policies` schema and insurer name; the provider directory is seeded from existing policies. Add a provider, add or choose its policy, then save the device's optional cover and insured value. Removing cover only unlinks the device; it does not delete the policy. Provider management returns a setup message until the migration is applied.

## Device states

- Available or assigned → send for repair or mark lost.
- Complete repair or recover → assigned if there is an open assignment, otherwise available.
- Assigned → return → available.
- Available with no current holder → retire (terminal).

Repair and loss preserve the current holder and assignment history. Assignment and state writes lock the same device row to prevent conflicting concurrent changes. Returning a device during repair/loss requires first completing repair/recovery.

## Validation and OCR

Required text rejects blank, invisible, emoji and punctuation-only values while supporting international letters, numbers and ordinary punctuation. Optional blank fields become null. Serial numbers accept ASCII letters, digits, spaces, dots, slashes and hyphens; maximum 120 characters. Backend validation remains authoritative.

Capture supports up to ten photos per batch, individual camera captures, multi-file upload, per-photo OCR result review, manual correction, and one-at-a-time registration. Failed images do not discard successful results. Photos are held in browser memory and sent for OCR only; they are not persisted. Reloading closes the queue. Confirmed photos are excluded from retries, and registered photos cannot be registered again from the queue.

OCR limits default to 20 images per client and 60 images globally per fixed minute, across single, JSON alias and batch routes. Override with `OCR_RATE_LIMIT_PER_CLIENT` and `OCR_RATE_LIMIT_GLOBAL`. A batch costs its image count. Rejections return 429 with `Retry-After`. Limits apply per application instance and reset on restart; a shared store is needed before scaling to several instances. Client identity uses authenticated principal or socket address. Untrusted forwarded headers are ignored; a reverse proxy can consequently share the anonymous client quota until trusted proxy/auth configuration is finalized. These application limits do not replace Groq account quotas.

## Container and Render

Build from the backend directory with `docker build -t insure-it-api .`. The multi-stage image runs as an unprivileged user with Java 21. Private environment files are excluded from the image. Supply environment variables at runtime; never add secrets to the Dockerfile, repository or mobile app.

Import the root `render.yaml` as a Render Blueprint. It selects the free plan for preview, disables automatic deployments, binds to `0.0.0.0`, reads Render's `PORT`, and checks `/api/health`. Supply existing `SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME`, `SUPABASE_DB_PASSWORD`, `GROQ_API_KEY`, and temporary Spring Basic credentials through Render's private environment settings. Use the Supabase JDBC connection string with SSL, from the existing project, and never use `SPRING_PROFILES_ACTIVE=local` on Render.

The only new anonymous production route is GET `/api/health`, which reports UP/DOWN without database details. Existing production Basic authentication and CSRF requirements remain in place pending JWT work; mobile write requests are not ready merely because hosting works. Do not embed a shared backend password in the mobile app. Integrate the teammate's authentication before release.

After deployment, verify HTTPS health and authorized API requests, then configure the mobile app's API base URL to the actual Render HTTPS origin. Never substitute a guessed deployment URL. The frontend can use the same address as `API_BACKEND_ORIGIN` and `OCR_BACKEND_ORIGIN` at build time. No local IP should be required after deployment.

Render free services sleep when idle and can take about a minute to wake. They suit preview/demos; production availability needs a separately selected paid plan. See [Render free services](https://render.com/docs/free), [Blueprint reference](https://render.com/docs/blueprint-spec), and [Docker deployments](https://render.com/docs/docker).
