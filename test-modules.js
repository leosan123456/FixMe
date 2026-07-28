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
let localMLStateStore = null;
let userProfileStore = null;
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
    getLocalMLState: () => localMLStateStore,
    saveLocalMLState: (s) => { localMLStateStore = s; },
    getUserProfile: () => userProfileStore,
    recordUserProfile: (p) => { userProfileStore = { ...p, updatedAt: new Date().toISOString() }; },
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

// ── Test: NativeTelemetry (PDH via koffi) ──
console.log('\n[NativeTelemetry]');
const NativeTelemetry = require('./src/native-telemetry');

// Pure helper — no PDH/koffi/OS dependency.
{
  const fixture = [
    { szName: 'pid_1_eng_0_engtype_3D', FmtValue: { CStatus: 0, doubleValue: 10 } },
    { szName: 'pid_2_eng_0_engtype_3D', FmtValue: { CStatus: 0, doubleValue: 5.5 } },
    { szName: 'pid_1_eng_1_engtype_Copy', FmtValue: { CStatus: 0, doubleValue: 99 } },
    { szName: 'pid_3_eng_0_engtype_3D', FmtValue: { CStatus: 0x800007D5, doubleValue: 42 } } // invalid, excluded
  ];
  assertEq(NativeTelemetry._sumEngineType(fixture, '3D'), 15.5, '_sumEngineType sums only matching+valid engtype_3D entries');
  assertEq(NativeTelemetry._sumEngineType([], '3D'), 0, '_sumEngineType returns 0 for empty input');
  assertEq(NativeTelemetry._sumEngineType(fixture, 'VR'), 0, '_sumEngineType returns 0 when no engine matches');
}

// Environment-dependent best-effort check — probe() must never throw even if
// PDH/koffi is unavailable on the machine running the tests; this is a soft
// check, not a hard requirement (a GPU-less CI box would legitimately fail it).
{
  const nt = new NativeTelemetry();
  let threw = false;
  let caps = null;
  try { caps = nt.probe(); } catch (_) { threw = true; }
  assert(threw === false, 'probe() never throws');
  assert(caps && typeof caps.available === 'boolean', 'getCapabilities-shaped result from probe()');
  if (!caps.available) {
    console.log('  (native telemetry unavailable on this machine — capability probe skipped, this is expected on non-Windows/GPU-less environments)');
  }
}

// ── Test: LocalMLHub (user profile prior integration) ──
console.log('\n[LocalMLHub]');
const LocalMLHub = require('./src/local-ml');
const { UserProfileCluster, OptimizationScorer, SessionClassifier, splitFavoriteApps } = LocalMLHub;

// UserProfileCluster.seedFromDeclaredProfile
{
  const cluster = new UserProfileCluster();
  // Drift the Gamer centroid away from its archetype first (a fresh cluster
  // starts exactly on-archetype, so seeding would have nothing to visibly move).
  // cpu=60/mem=55/gpu=90/procs=100/hour=20 is still nearest to the Gamer
  // centroid (vs the other 3), so repeated updates pull centroids[0] specifically.
  for (let i = 0; i < 5; i++) cluster.update(60, 55, 90, 100, 20);
  const drifted = [...cluster.centroids[0]];

  const applied = cluster.seedFromDeclaredProfile('Gamer');
  assert(applied === true, 'seedFromDeclaredProfile applies for a known non-Idle profile');
  const target = [0.70, 0.70, 0.80, 0.30, 0.75]; // DEFAULT_CENTROIDS[Gamer]
  const distBefore = Math.hypot(...drifted.map((v, i) => v - target[i]));
  const distAfter = Math.hypot(...cluster.centroids[0].map((v, i) => v - target[i]));
  assert(distAfter < distBefore, 'seeding moves the matching centroid closer to its archetype');

  const reapplied = cluster.seedFromDeclaredProfile('Gamer');
  assertEq(reapplied, false, 'seeding again without force is a no-op (idempotent)');

  const forced = cluster.seedFromDeclaredProfile('Gamer', { force: true });
  assertEq(forced, true, 'force:true re-applies seeding');

  const rejected = cluster.seedFromDeclaredProfile('Idle');
  assertEq(rejected, false, 'seedFromDeclaredProfile rejects Idle');
  const rejectedUnknown = cluster.seedFromDeclaredProfile('NotAProfile');
  assertEq(rejectedUnknown, false, 'seedFromDeclaredProfile rejects unknown names');
}

// OptimizationScorer.predict with/without priorityBias
{
  const scorer = new OptimizationScorer();
  const busyStats = { cpu: { current: 80 }, memory: { current: 60 }, gpu: { current: 40 }, processCount: 200 };
  // Moderate deltas so measured effectiveness lands well under the 1.0 cap —
  // otherwise the priorityBias bump would be invisible behind clamp(...,0,1).
  scorer.train(busyStats, 'high_performance', { cpu: 80, mem: 60, gpu: 40 }, { cpu: 65, mem: 52, gpu: 33 });
  scorer.train(busyStats, 'clear_ram', { cpu: 80, mem: 60, gpu: 40 }, { cpu: 74, mem: 45, gpu: 38 });
  scorer.train(busyStats, 'diagnostico', { cpu: 80, mem: 60, gpu: 40 }, { cpu: 78, mem: 59, gpu: 39 });

  const withoutBias = scorer.predict(busyStats);
  const withoutBiasAgain = scorer.predict(busyStats); // no priorityBias arg at all — regression guard
  assertEq(
    JSON.stringify(withoutBias.predictions),
    JSON.stringify(withoutBiasAgain.predictions),
    'predict() with no priorityBias arg is unchanged (backward compatible)'
  );

  const withNullBias = scorer.predict(busyStats, {}, null);
  assertEq(
    JSON.stringify(withoutBias.predictions),
    JSON.stringify(withNullBias.predictions),
    'predict() with explicit null priorityBias matches no-bias behavior'
  );

  const perfScoreBefore = withoutBias.predictions.find(p => p.type === 'high_performance').score;
  const withPerfBias = scorer.predict(busyStats, {}, 'performance');
  const perfScoreAfter = withPerfBias.predictions.find(p => p.type === 'high_performance').score;
  assert(perfScoreAfter > perfScoreBefore, 'priorityBias "performance" raises high_performance score');
}

// SessionClassifier — favorite apps extend keyword detection
{
  const classifier = new SessionClassifier();
  const procs = [{ name: 'myfancygame.exe' }];

  const withoutExtra = classifier._features(50, 40, 30, procs);
  assertEq(withoutExtra.hasGame, 'n', 'hasGame is "n" for an app not in the hardcoded keyword list');

  const withExtra = classifier._features(50, 40, 30, procs, { game: ['myfancygame'] });
  assertEq(withExtra.hasGame, 'y', 'hasGame flips to "y" when the app is passed via extra.game');
}

// splitFavoriteApps
{
  const gamer = splitFavoriteApps({ usageType: 'Gamer', favoriteApps: 'Valorant, CS2' });
  assertEq(JSON.stringify(gamer), JSON.stringify({ game: ['valorant', 'cs2'], work: [] }), 'splitFavoriteApps buckets Gamer apps into game only');

  const worker = splitFavoriteApps({ usageType: 'Trabalho', favoriteApps: 'VSCode, Slack' });
  assertEq(JSON.stringify(worker), JSON.stringify({ game: [], work: ['vscode', 'slack'] }), 'splitFavoriteApps buckets Trabalho apps into work only');

  const misto = splitFavoriteApps({ usageType: 'Misto', favoriteApps: 'Discord' });
  assertEq(JSON.stringify(misto), JSON.stringify({ game: ['discord'], work: ['discord'] }), 'splitFavoriteApps buckets Misto apps into both');

  const empty = splitFavoriteApps(null);
  assertEq(JSON.stringify(empty), JSON.stringify({ game: [], work: [] }), 'splitFavoriteApps handles a null profile');
}

// LocalMLHub.reloadDeclaredProfile — end-to-end via the mocked database
{
  userProfileStore = { usageType: 'Gamer', priority: 'performance', favoriteApps: 'myfancygame', peakHours: [] };
  const hub = new LocalMLHub();
  hub.load();
  assertEq(hub.declaredProfile.usageType, 'Gamer', 'load() pulls the declared profile from the database');
  assertEq(hub.cluster._seededFor, 'Gamer', 'load() seeds the cluster from the declared profile');
  assertEq(JSON.stringify(hub._favoriteKeywords), JSON.stringify({ game: ['myfancygame'], work: [] }), 'load() derives favorite keywords from the declared profile');
}

// ── Results ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Total: ${passed + failed} tests — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
