const test = require('node:test');
const assert = require('node:assert/strict');
const OptimizationRunner = require('./src/optimization-runner');
function fixture() {
  const events = [];
  let executionActive = false;
  let heartbeat;
  let stopped = 0;
  const runner = new OptimizationRunner({
    publish: state => events.push(state), getExecutionState: () => ({ active: executionActive }),
    schedule: fn => { heartbeat = fn; return 1; }, cancel: () => stopped++, now: () => 1000,
  });
  return { runner, events, heartbeat: () => heartbeat(), active: value => { executionActive = value; }, stopped: () => stopped };
}
test('a pending mutation refuses a different mutation without blocking progress or reads', async () => {
  const f = fixture();
  let finish;
  const pending = f.runner.run('winOptVisualEffects', () => new Promise(resolve => { finish = resolve; }));
  let called = false;
  const rejected = await f.runner.run('winOptFullBundle', () => { called = true; });
  assert.equal(rejected.code, 'OPTIMIZATION_BUSY');
  assert.equal(called, false);
  f.heartbeat();
  assert.equal(f.runner.getState().status, 'running');
  assert.ok(f.events.length >= 2);
  finish({ success: true });
  await pending;
  assert.equal(f.runner.getState().active, false);
  assert.equal(f.runner.getState().status, 'completed');
  assert.equal(f.stopped(), 1);
});
test('steps publish progress and partial failure releases the lock only after execution ends', async () => {
  const f = fixture();
  const result = await f.runner.run('winOptFullBundle', async report => {
    report({ phase: 'executing', step: 1, total: 2, label: 'visual_effects' });
    return { success: false, data: { completed: ['visual_effects'] }, error: 'Power plan failed' };
  });
  assert.equal(result.success, false);
  assert.equal(f.events[1].label, 'visual_effects');
  assert.equal(f.runner.getState().status, 'failed');
  assert.equal((await f.runner.run('next', async () => ({ success: true }))).success, true);
});
test('timeout retains mutation lock until the elevated callback confirms it ended', async () => {
  const f = fixture();
  const response = await f.runner.run('winOptFullBundle', async () => {
    f.active(true);
    throw Object.assign(new Error('Deadline exceeded'), { code: 'ELEVATION_TIMEOUT' });
  });
  assert.equal(response.code, 'ELEVATION_TIMEOUT');
  assert.equal(f.runner.getState().status, 'blocked');
  assert.equal(f.runner.getState().active, true);
  assert.equal((await f.runner.run('other', async () => ({ success: true }))).code, 'OPTIMIZATION_BUSY');
  f.active(false);
  f.runner.executionSettled();
  assert.equal(f.runner.getState().status, 'failed');
  assert.equal(f.runner.getState().active, false);
  assert.equal((await f.runner.run('other', async () => ({ success: true }))).success, true);
});
