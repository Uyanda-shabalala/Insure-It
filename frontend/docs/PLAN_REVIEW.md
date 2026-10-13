# Plan Review and Action Record

## 1. Review of the supplied prototype

### What was already strong

The prototype established a coherent user journey: dashboard, image capture, serial review, device details, inventory, record management, claims, and CSV export. It also included useful domain concepts such as renewal status, premium totals, insured value, insurer count, custom provider/type support, and claim history.

### Material risks identified

1. **Single-file architecture** — presentation, data access, business rules, forms, navigation, persistence, OCR simulation, and export logic were tightly coupled.
2. **Nonstandard runtime dependency** — `window.storage` is not a browser or Next.js API and would fail on a normal hosted deployment.
3. **Misleading OCR state** — the serial was randomly generated while the UI described it as an AI extraction.
4. **Fixed mobile shell** — the 390×780 framed layout did not use available desktop/tablet space and was unsuitable as an enterprise workspace.
5. **No durable domain boundary** — device and claim shapes were implicit JavaScript objects rather than typed, validated models.
6. **Storage limitations** — uncompressed base64 photos in browser storage can exceed quota quickly and are not appropriate for shared or regulated records.
7. **No authentication or authorization** — all records were available to whoever opened that browser profile.
8. **No tenant or audit model** — there was no ownership, organization, change history, actor, retention, or deletion policy.
9. **No backend integration contract** — production persistence, evidence storage, and OCR could not be substituted cleanly.
10. **Limited accessibility** — clickable `div` elements, implicit navigation, fixed visual framing, and several controls lacked semantic structure.
11. **Date/status edge cases** — missing and already-expired dates were treated as active in parts of the prototype.
12. **Testing/deployment gaps** — there was no project configuration, typecheck, lint, error boundary, health route, container, or deployment runbook.

## 2. Approved implementation plan

### Foundation

- Next.js App Router and TypeScript
- Tailwind CSS with centralized semantic design tokens
- shadcn-style local UI primitives and `components.json`
- Zod schemas and react-hook-form
- Responsive sidebar, mobile drawer, and bottom navigation

### Domain and data

- Explicit `Device`, `Claim`, status, and form types
- Centralized status, currency, date, metric, and CSV logic
- Repository interface with a versioned local adapter
- Clear upgrade path to authenticated remote APIs

### Workflows

- Preserve all original user journeys
- Add manual creation without requiring image capture
- Distinguish active, expiring, and expired cover
- Add responsive enterprise table and mobile cards
- Add evidence processing feedback and file validation
- Add deletion confirmation and global persistence feedback

### Hosting

- Standalone Next.js output
- Dockerfile and Compose configuration
- Health endpoint
- PWA manifest and metadata
- Environment-based OCR endpoint

## 3. Action completed

| Area | Action | Status |
|---|---|---|
| Architecture | Split monolith into app, domain, store, services, storage, screens, shared, and UI layers | Complete |
| Hosting | Added Next.js production config, standalone output, Dockerfile, Compose, and health endpoint | Complete |
| Responsive UI | Rebuilt for desktop, tablet, and mobile instead of a fixed phone frame | Complete |
| UI system | Added shadcn-compatible aliases and reusable local primitives | Complete |
| Forms | Added typed schemas and structured validation | Complete |
| Persistence | Replaced `window.storage` with a versioned repository abstraction | Complete |
| OCR | Added configurable OCR adapter and clearly labelled demo fallback | Complete |
| Images | Added image type/size checks and browser-side resizing | Complete |
| Device lifecycle | Added create, edit, detail, remove, search, sort, filter, and export | Complete |
| Claims | Added create and remove flows with validation | Complete |
| Reliability | Added loading state, error boundary, persistence warning, and user notices | Complete |
| Documentation | Added architecture, deployment, production boundary, and source review | Complete |

## 4. Required production phase

The following items should be completed before real customer or policy data is used:

1. Identity provider integration and session management
2. Role-based and tenant-scoped authorization
3. Server database and migrations
4. Object storage with short-lived signed upload/download URLs
5. Audit events for record reads and mutations
6. Secrets-managed OCR provider integration
7. Malware scanning and content-type verification for uploads
8. Encryption, backup, retention, and deletion controls
9. Central telemetry, error reporting, logs, and performance monitoring
10. Automated unit, integration, accessibility, and end-to-end tests
11. CI/CD gates for typecheck, lint, tests, dependency review, image build, and vulnerability scanning
12. Legal/privacy review for policy documents and device evidence
