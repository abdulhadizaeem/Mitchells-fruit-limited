/**
 * PM2 static server for Vite production build (dist/)
 */
module.exports = {
  apps: [
    {
      name: "mitchells-frontend",
      script: "serve",
      env: {
        PM2_SERVE_PATH: "/opt/mitchells-fruit-limited/frontend/dist",
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: "true",
        PM2_SERVE_HOMEPAGE: "/index.html",
      },
      autorestart: true,
      max_restarts: 10,
      watch: false,
    },
  ],
};
