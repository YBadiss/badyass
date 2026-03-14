module.exports = {
  apps: [
    {
      name: 'wgapp',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      cwd: '/var/www/badyass.xyz/wgapp',
      env: {
        STORE_PATH: '/var/www/badyass.xyz/wgapp-store',
        DOTENV_CONFIG_PATH: '/var/www/badyass.xyz/wgapp-store/.env',
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
