// Launcher script - removes ELECTRON_RUN_AS_NODE and starts Electron
const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;

const cp = require('child_process');
const electronPath = require('electron');

const child = cp.spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: env,
  cwd: __dirname
});

child.on('close', (code) => {
  process.exit(code);
});
