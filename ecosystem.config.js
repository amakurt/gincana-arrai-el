module.exports = {
  apps: [
    {
      name: 'gincana-1',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/ubuntu/gincana-arrai-el',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_OPTIONS: '--max-old-space-size=400'
      }
    },
    {
      name: 'gincana-2',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/home/ubuntu/gincana-arrai-el',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_OPTIONS: '--max-old-space-size=400'
      }
    }
  ]
};
