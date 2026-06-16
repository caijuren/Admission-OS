# Admission OS 1.1 Deployment

## Production Data Store

Admission OS 1.1 uses Supabase Auth and Supabase Postgres. Production data is no longer written to `data/eduos.json`.

Each authenticated user gets an isolated row in `public.app_state`:

```text
user_id + key -> data jsonb
```

The 1.1 schema still stores the full application state as `jsonb` for a low-risk migration. Later versions can split this into normalized tables for students, events, goals, tasks, and reports.

## Supabase Setup

1. Enable email/password signups in Supabase Auth.
2. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
3. Configure the app environment variables on the server.

If you already deployed 1.0/1.0.3 and have an existing `public.app_state` row without `user_id`, create your first Supabase user, copy its user id, and assign the old row before applying the final `not null`/primary-key migration:

```sql
update public.app_state
set user_id = 'YOUR_SUPABASE_USER_ID'
where user_id is null;
```

For a fresh deployment, run `supabase/schema.sql` directly.

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
NEXT_PUBLIC_SITE_URL=https://your-domain.example
PORT=3010
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or public logs.

## Auth Flow

- `/login` supports email/password registration and login.
- Protected pages redirect anonymous users to `/login`.
- `/api/data` rejects anonymous requests and reads/writes only the current user's `app_state` row.
- On a user's first successful `/api/data` request, the app seeds that user's row from `data/eduos.json`.

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

Enable Supabase database backups before opening access to users. For a quick manual snapshot:

```sql
select user_id, key, data, version, updated_at
from public.app_state
order by updated_at desc;
```

Before major changes, export `public.app_state` or take a database backup.
