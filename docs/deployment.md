# Admission OS Deployment

## Simple Server Deployment

The default production setup uses a local JSON file:

```text
/srv/apps/admission-os/data/eduos.json
```

This is the simplest option for a single-user private server. It avoids database setup and keeps the app deployable with only local file storage.

## Environment Variables

Production requires:

```bash
NEXT_PUBLIC_STUDENT_ID=1
NEXT_PUBLIC_APP_ENV=production
ADMISSION_OS_DATA_DRIVER=file
PORT=3010
```

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

## Data Notes

This setup stores the whole app state in one JSON file. Back it up before major changes:

```bash
cp /srv/apps/admission-os/data/eduos.json "/srv/apps/admission-os/data/eduos-$(date +%F-%H%M%S).json"
```

A future multi-account version can move this state into Supabase or another database.
