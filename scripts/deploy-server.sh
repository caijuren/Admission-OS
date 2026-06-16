#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-admission-os}"
APP_DIR="${APP_DIR:-/srv/apps/admission-os}"
APP_PORT="${APP_PORT:-3010}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-}"
SERVER_NAME="${SERVER_NAME:-}"

if [ -z "$REPO_URL" ]; then
  echo "Missing REPO_URL. Example:"
  echo "REPO_URL=https://github.com/your-name/admission-os.git bash scripts/deploy-server.sh"
  exit 1
fi

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1"
    exit 1
  fi
}

need_cmd git
need_cmd node
need_cmd npm

prompt_value() {
  local var_name="$1"
  local label="$2"
  local secret="${3:-false}"
  local current_value="${!var_name:-}"

  if [ -n "$current_value" ]; then
    printf '%s' "$current_value"
    return
  fi

  if [ "$secret" = "true" ]; then
    read -rsp "$label: " current_value
    echo >&2
  else
    read -rp "$label: " current_value
  fi

  printf '%s' "$current_value"
}

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing pm2..."
  sudo npm install -g pm2
fi

echo "==> Deploying $APP_NAME to $APP_DIR on port $APP_PORT"

sudo mkdir -p "$(dirname "$APP_DIR")"
sudo chown -R "$USER":"$USER" "$(dirname "$APP_DIR")"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

cd "$APP_DIR"

if [ ! -f ".env.production" ]; then
  ADMISSION_OS_ACCESS_CODE_VALUE="$(prompt_value ADMISSION_OS_ACCESS_CODE "ADMISSION_OS_ACCESS_CODE" true)"

  cat > .env.production <<ENV
NEXT_PUBLIC_STUDENT_ID=${NEXT_PUBLIC_STUDENT_ID:-1}
NEXT_PUBLIC_APP_ENV=production
ADMISSION_OS_ACCESS_CODE=$ADMISSION_OS_ACCESS_CODE_VALUE
ADMISSION_OS_DATA_DRIVER=file
PORT=$APP_PORT
ENV
  chmod 600 .env.production
  echo "Created .env.production"
fi

if grep -q '^ADMISSION_OS_ACCESS_CODE=$' .env.production; then
  echo "ADMISSION_OS_ACCESS_CODE is empty in .env.production"
  echo "Edit $APP_DIR/.env.production before starting production."
  exit 1
fi

echo "==> Installing dependencies"
npm ci

echo "==> Running checks"
npm run lint
npm run build

echo "==> Starting PM2 process"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
pm2 start npm --name "$APP_NAME" -- start -- -p "$APP_PORT" -H 127.0.0.1
pm2 save

if [ -n "$SERVER_NAME" ]; then
  echo "==> Writing Nginx config for $SERVER_NAME"
  sudo tee "/etc/nginx/sites-available/$APP_NAME" >/dev/null <<NGINX
server {
    listen 80;
    server_name $SERVER_NAME;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
  sudo ln -sfn "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "==> Done"
echo "PM2:"
pm2 list
echo "Health check:"
curl -I "http://127.0.0.1:$APP_PORT" || true
