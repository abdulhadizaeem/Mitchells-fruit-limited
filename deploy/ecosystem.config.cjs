/**
 * PM2 ecosystem — Mitchell's frontend (production build via vite preview)
 *
 * Env: set VITE_BASE_URL in frontend/.env before npm run build
 * (Vite bakes env at build time).
 */
module.exports = {
  apps: [
    {
      name: "mitchells-frontend",
      cwd: "/opt/mitchells-fruit-limited/frontend",
      script: "node_modules/vite/bin/vite.js",
      args: "preview --host 0.0.0.0 --port 5173",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      watch: false,
    },
  ],
};
