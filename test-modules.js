// Unit tests for pure logic modules (no Electron dependency)
// Run with: node test-modules.js

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.error(`  FAIL: ${name}`);
    failed++;
  }
}

function assertEq(actual, expected, name) {
  if (actual === expected) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.error(`  FAIL: ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ── Mock electron dependency used by database.js ──
const mlTrainingStore = [];
const requestLogStore = [];
require.cache[require.resolve('./src/database')] = {
  id: require.resolve('./src/database'),
  filename: require.resolve('./src/database'),
  loaded: true,
  exports: {
    getMLTrainingData: () => [...mlTrainingStore],
    recordMLTrainingSample: (s) => mlTrainingStore.push(s),
    getRequestLog: () => [...requestLogStore],
    recordRequestLog: (r) => requestLogStore.push(r),
    getOptimizationHistory: () => [],
    recordOptimization: () => {},
  }
};

// ── Test: MLEngine ──
console.log('\n[MLEngine]');
const MLEngine = require('./src/ml-engine');
const ml = new MLEngine();

assert(ml instanceof MLEngine, 'MLEngine instantiates');
assertEq(ml.k, 5, 'k defaults to 5');
assertEq(Array.isArray(ml.trainingData), true, 'trainingData is array');

// extractFeatures
const fakeStats = { cpu: { current: 50 }, memory: { current: 70 }, gpu: { current: 30 }, processCount: 150 };
const features = ml.extractFeatures(fakeStats);
assert(Array.isArray(features), 'extractFeatures returns array');
assertEq(features.length, 6, 'feature vector has 6 elements');
assertEq(features[0], 0.5, 'CPU feature normalized to 0.5');
assertEq(features[1], 0.7, 'RAM feature normalized to 0.7');
assertEq(features[2], 0.3, 'GPU feature normalized to 0.3');
assertEq(features[5], 0.3, 'processCount normalized (150/500 = 0.3)');

// distance
const a = [0, 0];
const b = [3, 4];
assertEq(ml.distance(a, b), 5, 'euclidean distance 3-4-5');
assertEq(ml.distance([0], [0]), 0, 'distance to self is 0');

// predict with no training data
const result = ml.predict(fakeStats);
assertEq(result.predictions.length, 0, 'no predictions when training data empty');
assertEq(result.confidence, 0, 'confidence 0 with no data');

// getTypeLabel
assertEq(ml.getTypeLabel('high_performance'), 'Plano High Performance', 'label for high_performance');
assertEq(ml.getTypeLabel('clear_ram'), 'Limpeza de RAM', 'label for clear_ram');
assertEq(ml.getTypeLabel('unknown_type'), 'unknown_type', 'unknown type returns key as-is');

// train + predict
const trainStats = { cpu: { current: 80 }, memory: { current: 60 }, gpu: { current: 40 }, processCount: 200 };
ml.train(trainStats, 'clear_ram', 0.9);
ml.train(trainStats, 'high_performance', 0.7);
ml.train(trainStats, 'clear_ram', 0.85);
const result2 = ml.predict(trainStats);
assert(result2.predictions.length > 0, 'predictions available after training');
assertEq(result2.predictions[0].type, 'clear_ram', 'clear_ram predicted as best with high effectiveness');

// ── Test: SuggestionsEngine ──
console.log('\n[SuggestionsEngine]');
const SuggestionsEngine = require('./src/suggestions');
const engine = new SuggestionsEngine();

assert(engine instanceof SuggestionsEngine, 'SuggestionsEngine instantiates');
assertEq(engine.maxHistory, 10, 'maxHistory defaults to 10');

const highCPU = {
  cpu: { current: '85' }, memory: { current: '50' }, gpu: { current: '30' },
  topCpuProcesses: [{ name: 'chrome.exe', cpu: '25' }, { name: 'game.exe', cpu: '30' }]
};
const suggestions = engine.analyze(highCPU);
assert(Array.isArray(suggestions), 'analyze returns array');
assert(suggestions.length > 0, 'high CPU generates suggestions');
assert(suggestions.some(s => s.component === 'CPU'), 'CPU suggestion present');
assert(suggestions[0].severity === 'high', 'high CPU is severity high');
assert(suggestions.some(s => s.component === 'Processos'), 'heavy process suggestion present');

const normalStats = { cpu: { current: '30' }, memory: { current: '40' }, gpu: { current: '20' }, topCpuProcesses: [] };
const normalSugs = engine.analyze(normalStats);
assert(normalSugs.length === 0, 'no suggestions for healthy system');

// addSample and history limit
for (let i = 0; i < 12; i++) engine.addSample(normalStats);
assertEq(engine.history.length, 10, 'history capped at maxHistory');

// ── Test: RequestParams ──
console.log('\n[RequestParams]');
const RequestParams = require('./src/request-params');
const rp = new RequestParams();

assert(rp instanceof RequestParams, 'RequestParams instantiates');
assert(typeof rp.cooldowns === 'object', 'cooldowns defined');
assert(typeof rp.dailyLimits === 'object', 'dailyLimits defined');

// canExecute with empty log
const canRun = rp.canExecute('high_performance');
assertEq(canRun.allowed, true, 'can execute when no log');
assert(typeof canRun.remaining === 'number', 'remaining is a number');

// getUsageStats
const stats = rp.getUsageStats();
assert(typeof stats === 'object', 'getUsageStats returns object');
assert('high_performance' in stats, 'stats has high_performance key');
assertEq(stats['high_performance'].todayCount, 0, 'today count is 0 initially');

// ── Results ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Total: ${passed + failed} tests — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
