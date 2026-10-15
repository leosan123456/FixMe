// Verify the installed Electron binary from Node; runtime APIs are checked by the smoke tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const electronPath = require('electron');
assert.equal(typeof electronPath, 'string', 'Electron package resolves to its executable in Node');
assert.ok(fs.existsSync(electronPath), 'Electron executable is installed');
console.log('PASS: installed Electron executable is available');