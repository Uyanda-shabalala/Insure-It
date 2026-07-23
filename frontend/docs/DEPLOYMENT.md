# Deployment Guide

## Option A: Managed Next.js platform

1. Push the folder to a Git repository.
2. Create a project on a Next.js-compatible managed platform.
3. Use `npm run build` as the build command.
4. Set environment variables in the platform, not in committed files.
5. Confirm `/api/health` returns HTTP 200 after deployment.

## Option B: Docker

```bash
docker build -t insure-it-enterprise .
docker run --rm -p 3000:3000 insure-it-enterprise
```

The image uses Next.js standalone output and runs as a non-root user.

## Option C: Node.js service

```bash
npm ci
npm run build
npm run start
```

Place a reverse proxy or load balancer in front of the service, terminate TLS there, and forward health checks to `/api/health`.

## Environment promotion

Use one immutable application image promoted through development, staging, and production. Inject environment-specific API origins, telemetry endpoints, and feature flags at deployment time. Public browser values must not contain secrets.

## Production checklist

- TLS is enforced
- Authentication and tenant authorization are active
- OCR and evidence endpoints are same-origin or strictly allowlisted
- Upload size, MIME type, and rate limits are enforced server-side
- CSP, HSTS, frame, referrer, and permissions policies are configured at the edge/proxy
- Application logs do not contain images, policy numbers, or unnecessary personal data
- Backups and restore procedures are tested
- Dependency and container vulnerability scanning is enabled
- Error reporting and uptime alerts are configured
- Browser support and accessibility checks are part of release gates
