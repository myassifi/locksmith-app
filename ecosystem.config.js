// PM2 Ecosystem Configuration
// This file configures PM2 to manage your Node.js backend process

module.exports = {
  apps: [
    {
      name: 'heatwave-locksmith-api',
      script: 'dist/index.js',
      cwd: '/var/www/heatwave-locksmith/server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/var/www/heatwave-locksmith/logs/api-error.log',
      out_file: '/var/www/heatwave-locksmith/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
