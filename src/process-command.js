function normalizeProcessName(value) {
  if (typeof value !== 'string') throw new Error('Nome de processo inválido');
  const name = value.trim().replace(/\.exe$/i, '');
  // Exact executable names only: paths and PowerShell wildcard patterns would
  // otherwise match a different process or several unrelated applications.
  if (!name || name.length > 255 || !/^[\p{L}\p{N}_. ()-]+$/u.test(name)) {
    throw new Error('Nome de processo inválido');
  }
  return name;
}

function encodedPowerShell(command) {
  return 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ' +
    Buffer.from(command, 'utf16le').toString('base64');
}

module.exports = { normalizeProcessName, encodedPowerShell };
