// Telemetry concurrency regressions. Every sensor is mocked; no Windows calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index++) await Promise.resolve();
}

function fixture(overrides = {}, options = {}) {
  let now = 10000;
  const calls = { currentLoad: 0, mem: 0, graphics: 0, processes: 0, native: 0 };
  const providers = {
    currentLoad: async () => ({ currentLoad: 25, cores: [{ load: 25 }] }),
    mem: async () => ({ total: 16 * 1024 ** 3, used: 8 * 1024 ** 3, free: 8 * 1024 ** 3 }),
    graphics: async () => ({ controllers: [] }),
    processes: async () => ({ list: [{ name: 'Test.exe', pid: 12, cpu: 10, mem: 2 }] }),
    native: async () => ({ gpu: 10, cpu: null }),
    ...overrides
  };
  const read = name => () => { calls[name]++; return providers[name](); };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const filename = path.join(__dirname, 'src', 'hardware.js');
  const module = { exports: {} };
  const systeminformation = Object.fromEntries(
    ['currentLoad', 'mem', 'graphics', 'processes'].map(name => [name, read(name)])
  );
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module,
    exports: module.exports,
    Date: Clock,
    console: { error() {} },
    require(name) {
      if (name === 'systeminformation') return systeminformation;
      if (name === './native-telemetry') return class {
        getMetrics = read('native');
        getCapabilities() { return { available: true }; }
      };
      throw new Error(`Unmocked dependency: ${name}`);
    }
  }, { filename });
  return {
    monitor: new module.exports(options), calls, providers,
    advance: milliseconds => { now += milliseconds; }
  };
}

test('simultaneous IPC, optimization and monitoring reads share one collection', async () => {
  const pending = deferred();
  let active = 0;
  let maximumActive = 0;
  const f = fixture({ native: async () => {
    active++;
    maximumActive = Math.max(maximumActive, active);
    try { return await pending.promise; } finally { active--; }
  } });
  const reads = Array.from({ length: 25 }, () => f.monitor.getHardwareStats());
  await flushMicrotasks();
  assert.ok(Object.values(f.calls).every(count => count === 1));

  // An expired TTL never starts another collection while a provider is hung.
  f.advance(60000);
  reads.push(f.monitor.getHardwareStats());
  await flushMicrotasks();
  assert.equal(f.calls.native, 1);
  assert.equal(f.monitor.getCachedHardwareStats(), null);
  pending.resolve({ gpu: 30, cpu: 40 });
  const results = await Promise.all(reads);
  assert.equal(maximumActive, 1);
  assert.equal(active, 0);
  assert.ok(results.every(stats => stats.cpu.current === '40.00' && stats.gpu.current === '30.00'));
  assert.notStrictEqual(results[0], results[1]);
  assert.equal(f.monitor.history.cpu.length, 1);
});

test('cache TTL starts after collection completes and refreshes at its boundary', async () => {
  const pending = deferred();
  const f = fixture({ native: () => pending.promise });
  const first = f.monitor.getHardwareStats();
  await flushMicrotasks();
  f.advance(5000);
  pending.resolve({ gpu: 10, cpu: null });
  await first;
  f.advance(999);
  await f.monitor.getHardwareStats();
  assert.equal(f.calls.native, 1);
  f.advance(1);
  await f.monitor.getHardwareStats();
  assert.equal(f.calls.native, 2);
  assert.equal(f.monitor.history.cpu.length, 2);
});

test('cached reads and later samples cannot mutate previous snapshots or internal history', async () => {
  const f = fixture();
  const first = await f.monitor.getHardwareStats();
  const second = await f.monitor.getHardwareStats();
  second.cpu.current = '99.00';
  second.cpu.cores[0] = '99.00';
  second.cpu.history.push(99);
  second.memory.history.push(99);
  second.gpu.history.push(99);
  second.topCpuProcesses[0].name = 'Changed';
  second.topMemoryProcesses.splice(0);
  const cached = f.monitor.getCachedHardwareStats();
  assert.equal(cached.cpu.current, '25.00');
  assert.equal(cached.cpu.cores[0], '25.00');
  assert.equal(cached.cpu.history.length, 1);
  assert.equal(cached.memory.history.length, 1);
  assert.equal(cached.gpu.history.length, 1);
  assert.equal(cached.topCpuProcesses[0].name, 'Test.exe');
  assert.equal(cached.topMemoryProcesses.length, 1);

  f.advance(1000);
  f.providers.currentLoad = async () => ({ currentLoad: 50, cores: [] });
  const next = await f.monitor.getHardwareStats();
  assert.equal(next.cpu.history.length, 2);
  assert.equal(first.cpu.history.length, 1);
  assert.equal(first.memory.history.length, 1);
  assert.equal(first.gpu.history.length, 1);
  assert.equal(first.cpu.current, '25.00');
  assert.equal(f.monitor.history.cpu.length, 2);
});

test('a failing sensor does not release the flight while another sensor is pending', async () => {
  const pending = deferred();
  const f = fixture({
    currentLoad: async () => { throw new Error('CPU temporarily unavailable'); },
    native: () => pending.promise
  });
  let completed = false;
  const first = f.monitor.getHardwareStats().then(stats => { completed = true; return stats; });
  await flushMicrotasks();
  const second = f.monitor.getHardwareStats();
  f.advance(60000);
  await flushMicrotasks();
  assert.equal(completed, false);
  assert.equal(f.calls.native, 1);
  assert.equal(f.calls.currentLoad, 1);
  pending.resolve({ gpu: 0, cpu: null });
  const failures = await Promise.all([first, second]);
  assert.ok(failures.every(stats => stats.error.includes('CPU temporarily unavailable')));
  assert.equal(f.monitor.getCachedHardwareStats(), null);

  // Failures are not cached; the next request can immediately recover.
  f.providers.currentLoad = async () => ({ currentLoad: 35, cores: [] });
  f.providers.native = async () => ({ gpu: 0, cpu: null });
  const recovered = await f.monitor.getHardwareStats();
  assert.equal(recovered.error, undefined);
  assert.equal(recovered.cpu.current, '35.00');
  assert.equal(f.calls.native, 2);
  assert.equal(f.monitor.history.cpu.length, 1);
});

test('optional sensor rejection and synchronous throws preserve usable telemetry', async () => {
  const f = fixture({
    graphics: () => { throw new Error('No graphics provider'); },
    native: async () => { throw new Error('PDH unavailable'); }
  });
  const stats = await f.monitor.getHardwareStats();
  assert.equal(stats.error, undefined);
  assert.equal(stats.cpu.current, '25.00');
  assert.equal(stats.gpu.current, null);
  assert.equal(stats.gpu.available, false);
  await f.monitor.getHardwareStats();
  assert.equal(f.calls.native, 1);
});

test('nonblocking snapshot reads enforce their maximum age without collecting', async () => {
  const f = fixture();
  assert.equal(f.monitor.getCachedHardwareStats(), null);
  assert.equal(f.calls.native, 0);
  await f.monitor.getHardwareStats();
  f.advance(9999);
  assert.ok(f.monitor.getCachedHardwareStats());
  assert.equal(f.monitor.getCachedHardwareStats(5000), null);
  f.advance(1);
  assert.equal(f.monitor.getCachedHardwareStats(), null);
  assert.equal(f.calls.native, 1);
});

test('zero TTL allows immediate refreshes while retaining single-flight protection', async () => {
  const f = fixture({}, { cacheTtlMs: 0 });
  await Promise.all([f.monitor.getHardwareStats(), f.monitor.getHardwareStats()]);
  assert.equal(f.calls.native, 1);
  await f.monitor.getHardwareStats();
  assert.equal(f.calls.native, 2);
});
