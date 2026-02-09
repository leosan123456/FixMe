// Bypass npm electron module - use internal
console.log('process.type:', process.type);
console.log('versions.electron:', process.versions.electron);

// Try to access electron internals directly
try {
  // Delete the cached npm module to force internal resolution
  delete require.cache[require.resolve('electron')];

  // Temporarily hide node_modules/electron
  const Module = require('module');
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function(request, parent, isMain, options) {
    if (request === 'electron') {
      // Try the internal electron module
      return 'electron';
    }
    return origResolve.call(this, request, parent, isMain, options);
  };
  const electron = require('electron');
  Module._resolveFilename = origResolve;

  console.log('electron type:', typeof electron);
  if (typeof electron === 'object') {
    console.log('keys:', Object.keys(electron));
  }
} catch (e) {
  console.log('Error:', e.message);
}
process.exit(0);
