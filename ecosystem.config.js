module.exports = {
  apps: [
    {
      name: "h8-automation",
      script: "index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        APP_MODE: "PROD",
        WORKER_ENABLED: "true",
        POLLING_ENABLED: "true",
        LOG_LEVEL: "info",
        BROWSER_POOL_SIZE: "2"
      }
    }
  ]
};
