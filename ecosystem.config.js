module.exports = {
  apps: [
    {
      name: 'kidareh',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Logs configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Memory and Restart management
      max_memory_restart: '1G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '15s',
      restart_delay: 3000,
      
      // Watch & Ignore
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        'backup',
        'data'
      ],
      
      // Production optimizations
      kill_timeout: 5000, // Wait 5s before force kill for graceful shutdown
      wait_ready: true,   // Wait for process.send('ready') if implemented
      listen_timeout: 10000
    }
  ]
};