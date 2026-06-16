# Admission OS 1.0 Deployment

## Production Data Store

Admission OS 1.0 uses Supabase Postgres as the production data store. The app no longer writes production data to `data/eduos.json`.

The current 1.0 schema stores the full application state in `public.app_state.data` as `jsonb`. This keeps the first database migration small while moving all live data into Postgres. Later versions can split this state into normalized tables for users, students, events, goals, tasks, and reports.

## Supabase Setup

Run the SQL in `supabase/schema.sql` in the Supabase SQL editor before deploying.

The production API uses `SUPABASE_SERVICE_ROLE_KEY` on the server to read and write `public.app_state`. Do not expose this key in the browser.

## Environment Variables

Production requires:

```bash
NEXT_PUBLIC_STUDENT_ID=1
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMISSION_OS_DATA_DRIVER=database
ADMISSION_OS_STATE_KEY=default
PORT=3010
```

`ADMISSION_OS_STATE_KEY` selects the app state row in `public.app_state`. Keep it as `default` for the 1.0 single-tenant deployment.

## Initial Data

On the first successful `/api/data` request, if no row exists for `ADMISSION_OS_STATE_KEY`, the app seeds Supabase from `data/eduos.json`. After that, all updates are persisted in Postgres.

Keep `data/eduos.json` as the seed snapshot, not as production storage.

## Verification

Run before deploying:

```bash
npm run lint
npm run build
npm audit --audit-level=high
```

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

## Backup Notes

Enable Supabase database backups before opening access to other users. For a quick manual snapshot of the 1.0 state:

```sql
select key, data, version, updated_at
from public.app_state
where key = 'default';
```

Before major changes, export that row from Supabase or take a database backup.
