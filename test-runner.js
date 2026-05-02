// Runs all tests: module tests (Node.js) + Electron window test
const cp = require('child_process');
const path = require('path');

const electronPath = require('electron');

const env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;

let allPassed = true;

function runTest(label, command, args, opts) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running: ${label}`);
    console.log('='.repeat(50));
    const child = cp.spawn(command, args, { stdio: 'inherit', ...opts });
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`\n[${label}] FAILED (exit code ${code})`);
        allPassed = false;
      } else {
        console.log(`\n[${label}] PASSED`);
      }
      resolve();
    });
  });
}

(async () => {
  // 1. Node.js environment check
  await runTest('test-electron.js (Node env check)', process.execPath, ['test-electron.js'], { cwd: __dirname });

  // 2. Module unit tests
  await runTest('test-modules.js (Unit tests)', process.execPath, ['test-modules.js'], { cwd: __dirname });

  // 3. Electron window test (requires display)
  await runTest('minimal-test.js (Electron window)', electronPath, ['minimal-test.js'], {
    cwd: __dirname,
    env,
    timeout: 15000
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  process.exit(allPassed ? 0 : 1);
})();
