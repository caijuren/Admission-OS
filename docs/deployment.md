# Admission OS Deployment

## Environment Variables

Production requires these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STUDENT_ID=1
NEXT_PUBLIC_APP_ENV=production
ADMISSION_OS_ACCESS_CODE=
ADMISSION_OS_DATA_DRIVER=supabase
ADMISSION_OS_STATE_KEY=default
```

`ADMISSION_OS_ACCESS_CODE` and `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Add the environment variables above to the hosting platform.
5. Deploy the app.

On first read, `/api/data` seeds Supabase from `data/eduos.json` if no row exists for `ADMISSION_OS_STATE_KEY`.

## Verification

Run before deploying:

```bash
npm run lint
npm run build
npm audit --audit-level=high
```

Expected result: lint and build pass, audit has no high or critical vulnerabilities.

## Tencent Cloud Server Deployment

Recommended defaults:

```bash
APP_DIR=/srv/apps/admission-os
APP_PORT=3010
APP_NAME=admission-os
```

Run on the server after pushing the repository to GitHub:

```bash
export REPO_URL=https://github.com/caijuren/Admission-OS.git
bash <(curl -fsSL https://raw.githubusercontent.com/caijuren/Admission-OS/main/scripts/deploy-server.sh)
```

If you have a dedicated domain for this app, also set:

```bash
export SERVER_NAME=admission.example.com
```

If you do not set `SERVER_NAME`, the script only starts PM2 on `127.0.0.1:3010` and does not touch Nginx.

## Data Notes

The current production data model stores the whole app state in one `app_state.data` JSONB document. This keeps the existing UI stable and makes production writes persistent. A future multi-account version should split this into normalized tables and Supabase Auth/RLS membership policies.
