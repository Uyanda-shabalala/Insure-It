# Architecture

## Design goals

- Run immediately as a self-contained frontend
- Preserve the supplied product workflow
- Avoid coupling screens to a specific database or OCR provider
- Keep the design system local and editable
- Support progressive replacement of demo adapters with enterprise services

## Layer model

```text
App Router entry
  -> Application shell and navigation
    -> Feature views
      -> Shared domain components
        -> Local UI primitives

Feature views
  -> useDeviceStore
    -> DeviceRepository
      -> BrowserDeviceRepository (current)
      -> RemoteDeviceRepository (production replacement)

Capture view
  -> image-service
  -> ocr-service
      -> Configured OCR API (preferred)
      -> Explicit demo fallback
```

## State strategy

The project intentionally uses a focused custom hook rather than a global third-party state package. The dataset is small and local, operations are synchronous from the UI perspective, and the repository is already asynchronous. When a remote API is introduced, TanStack Query can be added for caching, mutation lifecycle, invalidation, and optimistic updates without changing presentation components substantially.

## UI strategy

The `components/ui` folder follows the shadcn ownership model: source code lives in the application and can be changed directly. The current package uses lightweight native semantics where possible, including the HTML dialog element and native selects. Radix, Base UI, or React Aria primitives can be substituted when the product requires advanced composite interactions.

## Data boundary

The browser repository is a demo adapter only. Production records should use server-generated identifiers, organization ownership, optimistic concurrency/version fields, audit metadata, and server-side validation. Evidence images should not be stored as base64 strings in the application database.

## Security boundary

`NEXT_PUBLIC_OCR_ENDPOINT` is visible to the browser and must never contain a provider key. It should point to a trusted endpoint protected by the application's session and authorization model. The server should validate image size/type, scan uploads, enforce rate limits, and avoid logging sensitive image bodies.
