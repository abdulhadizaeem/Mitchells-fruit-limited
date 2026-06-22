#!/usr/bin/env bash
#
# Mitchell's Fruit Limited — server deploy script
# Pulls dev branch, installs deps, runs backend via systemd (port 8000)
# and frontend via PM2 (Vite preview on port 5173).
#
# Usage (on the server):
#   chmod +x deploy/deploy.sh
#   sudo ./deploy/deploy.sh
#
# Before first run, create:
#   $APP_DIR/backend/.env
#   $APP_DIR/frontend/.env   (VITE_BASE_URL=http://YOUR_SERVER_IP:8000/api)
#

set -euo pipefail

# ── Config (edit if needed) ────────────────────────────────────────────────
REPO_URL="https://github.com/abdulhadizaeem/Mitchells-fruit-limited.git"
BRANCH="dev"
APP_DIR="${APP_DIR:-/opt/mitchells-fruit-limited}"
APP_USER="${APP_USER:-www-data}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
SERVICE_NAME="${SERVICE_NAME:-mitchells-backend}"
PM2_APP_NAME="${PM2_APP_NAME:-mitchells-frontend}"
PYTHON="${PYTHON:-python3}"
# ─────────────────────────────────────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*"; exit 1; }

if [[ "${EUID}" -ne 0 ]]; then
  die "Run as root: sudo $0"
fi

command -v git >/dev/null    || die "git is not installed"
command -v "$PYTHON" >/dev/null || die "$PYTHON is not installed"
command -v npm >/dev/null    || die "npm is not installed"
command -v pm2 >/dev/null    || die "pm2 is not installed (npm i -g pm2)"

log "App directory: $APP_DIR"
log "Branch: $BRANCH"

# ── Clone or pull ───────────────────────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  log "Pulling latest from origin/$BRANCH ..."
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull origin "$BRANCH"
else
  log "Cloning repository ..."
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
fi

# ── Ownership ───────────────────────────────────────────────────────────────
if id "$APP_USER" &>/dev/null; then
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
else
  log "User $APP_USER not found; creating ..."
  useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER" || true
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

# ── Backend: venv + dependencies ────────────────────────────────────────────
log "Setting up backend virtualenv ..."
sudo -u "$APP_USER" bash -c "
  set -euo pipefail
  cd '$APP_DIR/backend'
  if [[ ! -d .venv ]]; then
    $PYTHON -m venv .venv
  fi
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
"

[[ -f "$APP_DIR/backend/.env" ]] || log "WARN: $APP_DIR/backend/.env missing — add it before starting the service"

# ── systemd unit ────────────────────────────────────────────────────────────
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
log "Writing systemd unit: $UNIT_FILE"

cat > "$UNIT_FILE" <<EOF
[Unit]
Description=Mitchell's Fruit Farms API (FastAPI / Uvicorn)
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment=PATH=${APP_DIR}/backend/.venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=${APP_DIR}/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port ${BACKEND_PORT}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
log "Backend: systemctl status ${SERVICE_NAME}"

# ── Frontend: build + PM2 ───────────────────────────────────────────────────
[[ -f "$APP_DIR/frontend/.env" ]] || log "WARN: $APP_DIR/frontend/.env missing — add VITE_BASE_URL before users hit the UI"

log "Building frontend ..."
sudo -u "$APP_USER" bash -c "
  set -euo pipefail
  cd '$APP_DIR/frontend'
  npm ci
  npm run build
"

ECOSYSTEM="$APP_DIR/deploy/ecosystem.config.cjs"
log "Writing PM2 config: $ECOSYSTEM"
cat > "$ECOSYSTEM" <<EOF
module.exports = {
  apps: [
    {
      name: "${PM2_APP_NAME}",
      cwd: "${APP_DIR}/frontend",
      script: "node_modules/vite/bin/vite.js",
      args: "preview --host 0.0.0.0 --port ${FRONTEND_PORT}",
      interpreter: "node",
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      watch: false,
    },
  ],
};
EOF
chown "$APP_USER:$APP_USER" "$ECOSYSTEM"

log "Starting frontend with PM2 ($PM2_APP_NAME) ..."

# PM2 as app user (keeps process list in that user's home)
sudo -u "$APP_USER" bash -c "
  set -euo pipefail
  cd '$APP_DIR/frontend'
  pm2 delete '${PM2_APP_NAME}' 2>/dev/null || true
  pm2 start '${ECOSYSTEM}' --only '${PM2_APP_NAME}'
  pm2 save
"

# PM2 startup on boot (run once; may print a command to copy)
sudo -u "$APP_USER" pm2 startup systemd -u "$APP_USER" --hp "$(eval echo ~$APP_USER)" 2>/dev/null || \
  log "If PM2 does not start on reboot, run: sudo -u $APP_USER pm2 startup"

log "Done."
log "  Backend:  http://0.0.0.0:${BACKEND_PORT}  (systemd: ${SERVICE_NAME})"
log "  Frontend: http://0.0.0.0:${FRONTEND_PORT}  (pm2: ${PM2_APP_NAME})"
log "  Logs:     journalctl -u ${SERVICE_NAME} -f"
log "            sudo -u ${APP_USER} pm2 logs ${PM2_APP_NAME}"
