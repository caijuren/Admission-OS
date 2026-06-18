# EduOS Technical Architecture

## Current Architecture

EduOS currently uses a full-stack Next.js architecture:

```text
Browser
  -> Next.js App Router pages
  -> Next.js API Routes
  -> File-backed JSON state or Supabase app_state JSONB
  -> PM2 + next start on a single server
```

This is not a traditional front-end/back-end split. It is a BFF-style full-stack web application where React UI and server APIs live in the same Next.js codebase.

## Runtime Stack

- Framework: Next.js `15.5.19`
- UI: React `18.3.1`
- Styling: Tailwind CSS `3.4.x`
- UI primitives: Radix UI
- Icons: Lucide React
- Data service option 1: local file mode
- Data service option 2: Supabase service-role backed JSONB mode
- Process manager: PM2

## Why This Architecture Fits v1.5

- Low operational complexity for a single-family or small private deployment.
- Fast product iteration because pages and API routes live together.
- Server-side auth and data APIs avoid exposing service credentials to the browser.
- JSON state keeps migration cost low while the product model is still evolving.

## Current Data Model

The current runtime source of truth remains:

- `data/eduos.local.json` in file mode.
- `public.app_state.data` JSONB in Supabase mode.

This stores the whole application state as one document per user and state key. It is intentionally simple and resilient for early product iteration.

## Structured Database Direction

The next stage is a hybrid migration:

1. Keep `app_state` as the compatibility snapshot.
2. Introduce structured tables for profile, goals, tasks, logs, events, pathway stages, and integrations.
3. Dual-write selected entities from API routes.
4. Backfill structured tables from existing JSON state.
5. Move read paths page by page once the structured tables are stable.

The initial structured schema is included in `supabase/schema.sql`, but runtime reads and writes still use `app_state` in v1.5.0.

## Frontend/Backend Split Assessment

EduOS does not need a separate frontend and backend service yet. A separate service boundary would add deployment and API-contract overhead before the product model has fully stabilized.

Recommended next upgrades:

- CI/CD pipeline.
- Automated smoke tests.
- Structured database dual-write.
- Audit log for external pushes.
- Encrypted integration secrets.
- Release notes and version bump discipline for every production release.
