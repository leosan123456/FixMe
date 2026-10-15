const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'dashboard.js'), 'utf8');

function element(id = '') {
    const classes = new Set();
    return {
        id, dataset: {}, style: {}, attributes: {}, textContent: '', innerHTML: '', hidden: false, disabled: false, children: [],
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            contains: name => classes.has(name),
            toggle(name, value) { const active = value === undefined ? !classes.has(name) : value; if (active) classes.add(name); else classes.delete(name); return active; },
        },
        setAttribute(name, value) { this.attributes[name] = value; },
        removeAttribute(name) { delete this.attributes[name]; },
        querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
        append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child); }, insertAdjacentHTML(_position, html) { this.innerHTML += html; }, focus() {},
    };
}

function renderer(bridge) {
    const nodes = new Map();
    const get = id => { if (!nodes.has(id)) nodes.set(id, element(id)); return nodes.get(id); };
    const panels = ['overview', 'optimize', 'insights', 'activity'].map(name => Object.assign(element(), { dataset: { panel: name } }));
    const navigation = ['overview', 'optimize', 'insights', 'activity'].map(name => Object.assign(element(), { dataset: { view: name } }));
    const events = new Map();
    const windowEvents = new Map();
    const connection = element();
    const boostButton = element('boostButton');
    const descendants = parent => parent.children.flatMap(child => [child, ...descendants(child)]);
    const document = {
        documentElement: {}, activeElement: null, body: element(),
        getElementById: get,
        querySelectorAll(selector) { if (selector === '[data-panel]') return panels; if (selector === '[data-view]') return navigation; if (selector === '.connection-status') return [connection]; if (selector === '.winopt-kill-btn') return descendants(get('winoptKillList')).filter(node => node.className === 'winopt-kill-btn'); return []; },
        querySelector(selector) { return selector === '#winoptGameBoost .winopt-gameboost-btn' ? boostButton : null; }, createElement: element,
        addEventListener(name, callback) { events.set(name, callback); },
    };
    const window = { fixme: bridge, addEventListener(name, callback) { windowEvents.set(name, callback); } };
    const context = vm.createContext({
        window, document, localStorage: { getItem: () => null, setItem() {} }, console,
        setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    });
    vm.runInContext(source, context, { filename: 'dashboard.js' });
    return { context, get, panels, navigation, connection, boostButton, document, initialize: () => events.get('DOMContentLoaded')(), unload: () => windowEvents.get('beforeunload')() };
}

test('preview opens immediately with empty real-data states and no simulated values', () => {
    const app = renderer();
    app.initialize();
    assert.equal(app.get('startupOverlay').hidden, true);
    assert.equal(app.get('cpu-gauge-text').textContent, '--');
    assert.equal(app.get('gpu-gauge-text').textContent, '--');
    assert.equal(app.get('scanBtn').disabled, true);
    assert.equal(app.connection.dataset.state, 'preview');
    assert.match(app.get('appsGrid').innerHTML, /desktop/);
    assert.match(app.get('activityList').innerHTML, /Nenhuma ação/);
    assert.doesNotMatch(source, /Math\.random|simulateHardwareChanges|fixme_ml_data|fixme_req_log/);
});

test('real zero readings stay zero and unavailable GPU stays unavailable', () => {
    const app = renderer({});
    app.context.ingestStats({ cpu: { current: 45 }, memory: { current: 75, total: 16, used: 12 }, gpu: { current: 30 }, processCount: 5 });
    app.context.ingestStats({ cpu: { current: '0' }, memory: { current: 0, total: 16, used: 0 }, gpu: { current: null, source: 'unavailable' }, processCount: 0 });
    assert.equal(app.get('cpu-gauge-text').textContent, '0%');
    assert.equal(app.get('mem-gauge-text').textContent, '0%');
    assert.equal(app.get('gpu-gauge-text').textContent, '--');
    assert.equal(app.get('gpuNativeBadge').textContent, 'Sem sensor de GPU');
    assert.equal(app.get('processCount').textContent, '0');
    assert.equal(app.connection.dataset.state, 'live');
    app.context.ingestStats({ error: 'Telemetry failed' });
    assert.equal(app.connection.dataset.state, 'offline');
});

test('navigation switches panels, accessible active state and localized heading', () => {
    const app = renderer();
    app.context.switchView('optimize');
    assert.equal(app.panels[1].hidden, false);
    assert.equal(app.panels[0].hidden, true);
    assert.equal(app.navigation[1].attributes['aria-current'], 'page');
    assert.equal(app.navigation[1].classList.contains('is-active'), true);
    assert.equal(app.get('pageTitle').textContent, 'Ajustes que fazem sentido.');
    app.context.toggleLang();
    assert.equal(app.get('pageTitle').textContent, 'Make each adjustment count.');
});

test('every translatable HTML label has Portuguese and English copy', () => {
    const app = renderer();
    const html = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
    const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
    keys.forEach(key => assert.notEqual(app.context.t(key), key, 'Missing Portuguese translation: ' + key));
    app.context.toggleLang();
    keys.forEach(key => assert.notEqual(app.context.t(key), key, 'Missing English translation: ' + key));
});

test('empty running-app result stays empty and an IPC error never inserts fake apps', async () => {
    let fail = false;
    const app = renderer({ getRunningApps: async () => fail ? { success: false, error: 'Failed' } : { success: true, data: [] } });
    await app.context.loadRunningApps();
    assert.match(app.get('appsGrid').innerHTML, /Nenhum aplicativo/);
    fail = true;
    await app.context.loadRunningApps();
    assert.match(app.get('appsGrid').innerHTML, /Não foi possível/);
    assert.doesNotMatch(app.get('appsGrid').innerHTML, /Chrome|Spotify/);
});

test('analysis IPC rejection displays an error and releases both analyze buttons', async () => {
    const app = renderer({ runFullAnalysis: async () => ({ success: false, error: 'Aguarde 90s' }) });
    await app.context.startAnalysis();
    assert.match(app.get('aiResultCards').innerHTML, /Aguarde 90s/);
    assert.doesNotMatch(app.get('aiResultCards').innerHTML, /saudável|Verificação concluída/);
    assert.equal(app.get('scanBtn').disabled, false);
    assert.equal(app.get('aiActionBtn').disabled, false);
});

test('analysis is single-flight, reports recommendations honestly and escapes remote text', async () => {
    let finish;
    let calls = 0;
    const app = renderer({ runFullAnalysis: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
    const pending = app.context.startAnalysis();
    assert.equal(app.get('scanBtn').disabled, true);
    assert.equal(app.get('aiActionBtn').disabled, true);
    await app.context.startAnalysis();
    assert.equal(calls, 1);
    finish({ success: true, diagnostics: { issues: [] }, ai: { recommendations: [{ type: '<img onerror=bad>', description: 'Review settings' }] } });
    await pending;
    assert.match(app.get('aiResultCards').innerHTML, /&lt;img onerror=bad&gt;/);
    assert.match(app.get('aiResultCards').innerHTML, /não são aplicadas/);
    assert.equal(app.get('aiMetricFixed').textContent, 1);
    assert.equal(app.get('aiConfValue').hidden, true);
});

test('optimization uses real revert IPC and restores button state after failure', async () => {
    const calls = [];
    let fail = false;
    const app = renderer({ winOptVisualEffects: async value => { calls.push(value); return fail ? { success: false, error: 'UAC canceled' } : { success: true }; } });
    await app.context.applyWinOpt('visual', true);
    assert.equal(app.get('revertVisual').disabled, false);
    assert.equal(app.get('woc-visual').dataset.state, 'applied');
    await app.context.applyWinOpt('visual', false);
    assert.deepEqual(calls, [true, false]);
    assert.equal(app.get('revertVisual').disabled, true);
    fail = true;
    await app.context.applyWinOpt('visual', true);
    assert.equal(app.get('woc-visual').dataset.state, 'error');
    assert.equal(app.get('togVisual').disabled, false);
    assert.equal(app.get('revertVisual').disabled, true);
});

test('individual process termination calls only the exact selected executable', async () => {
    const names = [];
    let batchCalls = 0;
    const app = renderer({
        killProcess: async name => { names.push(name); return { success: true }; },
        winOptKillBackground: async () => { batchCalls++; return { success: true }; },
        winOptGetKillCandidates: async () => ({ success: true, data: [] }),
        getRunningApps: async () => ({ success: true, data: [] }),
    });
    await app.context.killProcess('chrome.exe');
    assert.deepEqual(names, ['chrome.exe']);
    assert.equal(batchCalls, 0);
    const failed = renderer({ killProcess: async () => ({ success: false, error: 'Access denied' }) });
    const button = element();
    await failed.context.killProcess('chrome.exe', button);
    assert.equal(button.disabled, false);
    assert.match(failed.get('winoptToast').textContent, /Access denied/);
    assert.doesNotMatch(failed.get('activityList').innerHTML, /Processo encerrado/);
});

test('ML samples, effectiveness and quotas come from backend values', async () => {
    const app = renderer({
        getMLModelStats: async () => ({ success: true, data: { totalSamples: 12, avgEffectiveness: 0.65 } }),
        mlPredict: async () => ({ success: true, data: { predictions: [] } }),
        getUsageStats: async () => ({ success: true, data: { high_performance: { todayCount: 2, limit: 9 }, clear_ram: { todayCount: 0, limit: 27 }, diagnostico: { todayCount: 1, limit: 11 } } }),
    });
    await app.context.updateMLCards();
    assert.equal(app.get('ml-samples').textContent, '12');
    assert.equal(app.get('ml-accuracy').textContent, '65%');
    assert.match(app.get('ml-usage-body').innerHTML, /2\/9/);
    assert.match(app.get('ml-usage-body').innerHTML, /0\/27/);
    app.context.applyMLPrediction();
    assert.equal(app.panels[1].hidden, false);
    assert.doesNotMatch(app.get('activityList').innerHTML, /ML aplicou/);
});

test('basic bundle targets visual effects and power only and marks only confirmed operations', async () => {
    let options;
    const app = renderer({ winOptVisualEffects: async () => ({ success: true }), winOptPowerPlan: async () => ({ success: true }), winOptFullBundle: async value => {
        options = value;
        return { success: false, data: { completed: ['visual_effects', 'power_ultimate'], errors: [{ step: 'network', error: 'Denied' }] } };
    } });
    await app.context.runFullOptimization();
    assert.deepEqual({ ...options }, { visualEffects: true, power: true, services: false, telemetry: false, network: false, scheduler: false, policies: false, gpu: false, memory: false, killProcesses: false });
    assert.equal(app.get('revertVisual').disabled, false);
    assert.equal(app.get('revertPower').disabled, false);
    assert.equal(app.get('woc-network').classList.contains('active'), false);
    assert.match(app.get('winoptToast').textContent, /2 ajustes aplicados; 1 falhas/);
});

test('startup reads data without running diagnostics or mutating the system', async () => {
    let diagnostics = 0;
    let actions = 0;
    let statsListener;
    const app = renderer({
        runDiagnostics: async () => { diagnostics++; return { success: true }; },
        winOptFullBundle: async () => { actions++; return { success: true }; },
        getSystemInfo: async () => ({ success: true, data: { cpuModel: 'Real CPU', cpuCores: 8, totalMemory: '16', gpuModel: 'Real GPU' } }),
        getHardwareStats: async () => ({ success: true, data: { stats: { cpu: { current: 0 }, memory: { current: 25, total: 16, used: 4 }, gpu: { current: null } } } }),
        getRunningApps: async () => ({ success: true, data: [] }),
        getMLModelStats: async () => ({ success: true, data: { totalSamples: 0 } }),
        mlPredict: async () => ({ success: true, data: { predictions: [] } }),
        getUsageStats: async () => ({ success: true, data: {} }),
        winOptGetKillCandidates: async () => ({ success: true, data: [] }),
        onStatsUpdate: callback => { statsListener = callback; },
        onAnalysisProgress() {}, startMonitoring: async () => ({ success: true }),
    });
    await app.context.runStartupSequence();
    assert.equal(diagnostics, 0);
    assert.equal(actions, 0);
    assert.equal(app.get('startupOverlay').hidden, true);
    assert.equal(app.get('hw-cpu-name').textContent, 'Real CPU');
    statsListener({ stats: { cpu: { current: 0 }, memory: { current: 0, total: 16, used: 0 }, gpu: { current: null } } });
    assert.equal(app.get('cpu-gauge-text').textContent, '0%');
});

for (const operation of ['individual', 'bundle', 'kill', 'boost']) {
    test(operation + ' locks every system mutation while navigation and telemetry stay responsive', async () => {
        let finish;
        const calls = [];
        const action = name => (...args) => {
            calls.push([name, ...args]);
            return new Promise(resolve => { finish = resolve; });
        };
        const app = renderer({
            winOptVisualEffects: action('visual'), winOptPowerPlan: action('power'),
            winOptFullBundle: action('bundle'), killProcess: action('kill'), winOptBoostGame: action('boost'),
            winOptGetKillCandidates: async () => ({ success: true, data: [{ name: 'Chrome', exe: 'chrome.exe' }] }),
            getRunningApps: async () => ({ success: true, data: [] }),
        });
        await app.context.refreshKillCandidates();
        app.get('gameBoostInput').value = 'game.exe';
        const pending = {
            individual: () => app.context.applyWinOpt('visual'), bundle: () => app.context.runFullOptimization(),
            kill: () => app.context.killProcess('chrome.exe'), boost: () => app.context.boostGameProcess(),
        }[operation]();
        assert.equal(app.get('togVisual').disabled, true);
        assert.equal(app.get('togPower').disabled, true);
        assert.equal(app.get('winoptBundleBtn').disabled, true);
        assert.equal(app.get('gameBoostInput').disabled, true);
        assert.equal(app.boostButton.disabled, true);
        assert.equal(app.document.querySelectorAll('.winopt-kill-btn')[0].disabled, true);
        assert.equal(app.get('optimizationProgress').hidden, false);
        await app.context.applyWinOpt('power');
        await app.context.runFullOptimization();
        await app.context.killProcess('other.exe');
        await app.context.boostGameProcess();
        assert.equal(calls.length, 1);
        app.context.switchView('insights');
        assert.equal(app.panels[2].hidden, false);
        app.context.ingestStats({ cpu: { current: 17 }, memory: { current: 20 } });
        assert.equal(app.get('cpu-gauge-text').textContent, '17%');
        finish({ success: true, data: { completed: ['visual_effects', 'power_ultimate'], errors: [] } });
        await pending;
        assert.equal(app.get('togPower').disabled, false);
        assert.equal(app.boostButton.disabled, false);
        assert.equal(app.get('optimizationProgress').dataset.state, 'completed');
    });
}

test('backend progress reports real steps and elapsed time without prematurely releasing an IPC action', async () => {
    let finish;
    const app = renderer({ winOptVisualEffects: () => new Promise(resolve => { finish = resolve; }) });
    const pending = app.context.applyWinOpt('visual');
    app.context.receiveOptimizationProgress({ operationId: 'one', operation: 'winOptVisualEffects', status: 'running', phase: 'executing', step: 0, total: 2, label: 'visual_effects', message: '<Windows>', elapsedMs: 3200 });
    assert.match(app.get('optimizationProgressTitle').textContent, /Aplicando ajuste/);
    assert.match(app.get('optimizationProgressDetail').textContent, /Etapa 1 de 2/);
    assert.match(app.get('optimizationProgressDetail').textContent, /Efeitos Visuais/);
    assert.doesNotMatch(app.get('optimizationProgressDetail').textContent, /visual_effects|Etapa 0/);
    assert.equal(app.get('optimizationProgressBar').value, 0);
    assert.match(app.get('optimizationProgressDetail').textContent, /<Windows>/);
    assert.equal(app.get('optimizationProgressDetail').innerHTML, '');
    assert.equal(app.get('optimizationElapsed').textContent, 'Tempo decorrido: 3s');
    app.context.toggleLang();
    assert.match(app.get('optimizationProgressTitle').textContent, /Applying adjustment/);
    assert.match(app.get('optimizationElapsed').textContent, /Elapsed time: 3s/);
    assert.match(app.get('optimizationProgressDetail').textContent, /Visual Effects/);
    app.context.receiveOptimizationProgress({ operationId: 'one', operation: 'winOptVisualEffects', status: 'running', phase: 'executing', step: 1, total: 2, label: 'power', elapsedMs: 3500 });
    assert.match(app.get('optimizationProgressDetail').textContent, /Step 2 of 2/);
    assert.match(app.get('optimizationProgressDetail').textContent, /Power Plan/);
    assert.equal(app.get('optimizationProgressBar').value, 1);
    app.context.receiveOptimizationProgress({ operationId: 'one', operation: 'winOptVisualEffects', status: 'completed', phase: 'finalizing', step: 2, total: 2, elapsedMs: 4000 });
    assert.equal(app.get('togVisual').disabled, true);
    finish({ success: true });
    await pending;
    assert.equal(app.get('togVisual').disabled, false);
    assert.equal(app.get('optimizationProgressBar').value, 2);
});

test('progress labels translate internal step identifiers and hide raw bridge method names', () => {
    const app = renderer({});
    const labels = ['visual_effects', 'power', 'services', 'telemetry', 'network', 'scheduler', 'policies', 'gpu', 'memory', 'kill_bg'];
    labels.forEach(label => assert.notEqual(app.context.optimizationStepLabel(label), label));
    app.context.toggleLang();
    labels.forEach(label => assert.notEqual(app.context.optimizationStepLabel(label), label));
    assert.equal(app.context.optimizationStepLabel('winOptVisualEffects'), 'Visual Effects');
    assert.equal(app.context.optimizationStepLabel('winOptUnknownAction'), '');
});

for (const code of ['OPTIMIZATION_BUSY', 'ELEVATION_TIMEOUT', 'ELEVATION_BLOCKED']) {
    test(code + ' does not claim cancellation or unlock while Windows may still be running', async () => {
        let calls = 0;
        const app = renderer({ winOptVisualEffects: async () => { calls++; return { success: false, code, error: 'Unconfirmed' }; } });
        await app.context.applyWinOpt('visual');
        assert.equal(app.get('togVisual').disabled, true);
        assert.equal(app.get('winoptBundleBtn').disabled, true);
        await app.context.applyWinOpt('visual');
        assert.equal(calls, 1);
        assert.doesNotMatch(app.get('optimizationProgressDetail').textContent, /cancelad|stopped|canceled/i);
        assert.match(app.get('winoptToast').textContent, /andamento|ainda pode/);
        app.context.receiveOptimizationProgress({ operationId: 'uncertain', operation: 'winOptVisualEffects', status: 'failed', phase: 'finalizing', elapsedMs: 45000 });
        assert.equal(app.get('togVisual').disabled, false);
        assert.equal(app.get('revertVisual').disabled, true);
    });
}

test('reload restores the main-process operation lock and cleans up its event listener', async () => {
    let listener;
    let stopped = 0;
    let actions = 0;
    const app = renderer({
        winOptVisualEffects: async () => { actions++; return { success: true }; },
        getOptimizationState: async () => ({ success: true, data: { operationId: 'existing', operation: 'winOptFullBundle', status: 'blocked', active: true, phase: 'executing', step: 2, total: 2, elapsedMs: 61000 } }),
        onOptimizationProgress: callback => { listener = callback; return () => { stopped++; }; },
        startMonitoring: async () => ({ success: true }),
    });
    await app.context.runStartupSequence();
    assert.equal(app.get('optimizationProgress').dataset.state, 'blocked');
    assert.equal(app.get('togVisual').disabled, true);
    assert.match(app.get('optimizationProgressDetail').textContent, /ainda pode estar executando/);
    await app.context.applyWinOpt('visual');
    assert.equal(actions, 0);
    listener({ operationId: 'existing', operation: 'winOptFullBundle', status: 'failed', active: false, phase: 'finalizing', elapsedMs: 65000 });
    assert.equal(app.get('togVisual').disabled, false);
    app.unload();
    assert.equal(stopped, 1);
});

test('a stale state snapshot cannot clear a newer progress event', async () => {
    let snapshot;
    let listener;
    const app = renderer({
        winOptVisualEffects: async () => ({ success: true }),
        getOptimizationState: () => new Promise(resolve => { snapshot = resolve; }),
        onOptimizationProgress: callback => { listener = callback; }, startMonitoring: async () => ({ success: true }),
    });
    await app.context.runStartupSequence();
    assert.equal(app.get('togVisual').disabled, true);
    listener({ operationId: 'new', operation: 'winOptVisualEffects', status: 'running', phase: 'executing', elapsedMs: 0 });
    snapshot({ success: true, data: null });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.get('togVisual').disabled, true);
    assert.equal(app.get('optimizationProgress').dataset.state, 'running');
});

test('an unavailable state snapshot keeps mutations locked until an authoritative state arrives', async () => {
    let available = false;
    const app = renderer({
        winOptVisualEffects: async () => ({ success: true }),
        getOptimizationState: async () => available ? { success: true, data: null } : { success: false, error: 'IPC unavailable' },
        startMonitoring: async () => ({ success: true }),
    });
    await app.context.runStartupSequence();
    assert.equal(app.get('togVisual').disabled, true);
    assert.match(app.get('optimizationProgressDetail').textContent, /tentará consultar novamente/);
    available = true;
    await app.context.recoverOptimizationState();
    assert.equal(app.get('togVisual').disabled, false);
    assert.equal(app.get('optimizationProgress').hidden, true);
});
