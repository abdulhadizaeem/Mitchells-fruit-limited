# Server deploy (Linux)

One-shot deploy: pull `dev`, backend on **8000** (systemd), frontend on **5173** (PM2).

Repo: [abdulhadizaeem/Mitchells-fruit-limited](https://github.com/abdulhadizaeem/Mitchells-fruit-limited.git)

## Prerequisites (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y git python3 python3-venv python3-pip nodejs npm
sudo npm install -g pm2
```

## Env files (you add these)

```bash
# Backend
sudo nano /opt/mitchells-fruit-limited/backend/.env

# Frontend (rebuild after changing VITE_BASE_URL)
sudo nano /opt/mitchells-fruit-limited/frontend/.env
# Example:
# VITE_BASE_URL=http://YOUR_SERVER_IP:8000/api
```

## First deploy

```bash
git clone --branch dev https://github.com/abdulhadizaeem/Mitchells-fruit-limited.git /opt/mitchells-fruit-limited
cd /opt/mitchells-fruit-limited
chmod +x deploy/deploy.sh
sudo ./deploy/deploy.sh
```

## Updates (pull dev and restart)

```bash
sudo /opt/mitchells-fruit-limited/deploy/deploy.sh
```

## Useful commands

```bash
# Backend
sudo systemctl status mitchells-backend
sudo journalctl -u mitchells-backend -f
sudo systemctl restart mitchells-backend

# Frontend
sudo -u www-data pm2 status
sudo -u www-data pm2 logs mitchells-frontend
sudo -u www-data pm2 restart mitchells-frontend
```

## Customize paths / ports

```bash
sudo APP_DIR=/var/www/mitchells BACKEND_PORT=8000 FRONTEND_PORT=3000 APP_USER=deploy ./deploy/deploy.sh
```

If you change `APP_DIR`, edit `cwd` in `deploy/ecosystem.config.cjs` to match.
