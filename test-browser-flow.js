// Run with playwright-cli run-code --filename=test-browser-flow.js after opening dashboard.html.
// All system actions use a fake bridge; this test never changes Windows settings.
async page => {
    const url = page.url();
    const errors = [];
    const passed = [];
    page.on('pageerror', error => errors.push(error.message));
    const check = (condition, label) => { if (!condition) throw new Error(label); passed.push(label); };
    await page.setViewportSize({ width: 1100, height: 720 });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.connection-status').dataset.state === 'preview');
    check(await page.locator('#cpu-gauge-text').textContent() === '--', 'Preview has no invented hardware readings');
    check(await page.locator('#scanBtn').isDisabled(), 'Preview cannot invoke system actions');
    await page.screenshot({ path: 'qa/fixme-preview.png', fullPage: true, animations: 'disabled' });
    await page.addInitScript(() => {
        localStorage.setItem('fixme_lang', 'pt');
        window.fixtureCalls = [];
        window.fixtureFailure = '';
        window.fixtureOptimizationState = null;
        window.fixtureHoldVisual = false;
        window.fixtureStats = { cpu: { current: 18.4 }, memory: { current: 46, total: 32, used: 14.7 }, gpu: { current: 0, source: 'native' }, processCount: 138 };
        const ok = data => Promise.resolve({ success: true, data });
        const action = (name, ...args) => { window.fixtureCalls.push({ name, args }); return window.fixtureFailure === name ? Promise.resolve({ success: false, error: 'Falha de teste: ' + name }) : ok({ success: true }); };
        window.fixme = {
            getOptimizationState: () => ok(window.fixtureOptimizationState),
            onOptimizationProgress: callback => { window.fixtureProgressUpdate = callback; return () => {}; },
            getSystemInfo: () => ok({ cpuModel: 'AMD Ryzen 7 7800X3D', cpuCores: 16, totalMemory: '32', gpuModel: 'NVIDIA GeForce RTX 4070', gpuVram: 12288 }),
            getHardwareStats: () => ok({ stats: window.fixtureStats }), startMonitoring: () => ok(), onStatsUpdate: callback => { window.fixtureStatsUpdate = callback; return () => {}; }, onAnalysisProgress: () => () => {},
            getRunningApps: () => ok([{ name: 'Steam', cpu: 2.1 }, { name: 'Discord', cpu: 1.4 }, { name: 'Firefox', cpu: 4.2 }, { name: 'Spotify', cpu: .7 }, { name: 'OBS Studio', cpu: 3.6 }, { name: 'FixMe', cpu: .9 }]),
            getMLModelStats: () => ok({ totalSamples: 0, avgEffectiveness: 0 }), mlPredict: () => ok({ predictions: [] }), getUsageStats: () => ok({ high_performance: { todayCount: 1, limit: 10 }, clear_ram: { todayCount: 0, limit: 50 }, diagnostico: { todayCount: 2, limit: 20 } }),
            winOptGetKillCandidates: () => ok([{ name: 'Discord', exe: 'Discord.exe' }, { name: 'Teams', exe: 'Teams.exe' }]),
            winOptVisualEffects: apply => window.fixtureHoldVisual ? new Promise(resolve => {
                window.fixtureResolveVisual = resolve;
                window.fixtureOptimizationState = { operationId: 'pending-test', operation: 'winOptVisualEffects', status: 'running', active: true, phase: 'executing', step: 0, total: 2, label: 'visual_effects', elapsedMs: 3200 };
                window.fixtureProgressUpdate(window.fixtureOptimizationState);
            }) : action('visual', apply), winOptPowerPlan: revert => action('power', revert), winOptDisableTelemetry: () => action('telemetry'),
            winOptFullBundle: options => { window.fixtureCalls.push({ name: 'bundle', args: [options] }); return ok({ completed: ['visual_effects'], errors: [], success: true }); },
            killProcess: exe => action('kill', exe), winOptBoostGame: exe => action('boost', exe),
            getProfile: () => ok(null), saveProfile: profile => action('profile', profile),
            runFullAnalysis: () => { window.fixtureCalls.push({ name: 'analysis' }); return window.fixtureFailure === 'analysis' ? Promise.resolve({ success: false, error: 'Aguarde 60s' }) : ok({ diagnostics: { issues: [{ title: 'Uso de memória', description: 'Revisar aplicativos abertos.' }] }, ai: { recommendations: [{ type: 'Energia', description: 'Revisar o plano de energia.' }] } }); },
            deepAIBottleneck: type => { window.fixtureCalls.push({ name: 'bottleneck', args: [type] }); return ok({ rootCause: 'Carga da CPU em aplicativos abertos.', optimizations: [{ title: 'Revisar aplicativos', description: 'Encerre apenas os que não estiver usando.' }] }); }
        };
    });
    await page.goto(url);
    await page.waitForFunction(() => document.querySelector('.connection-status').dataset.state === 'live');
    check(await page.locator('#gpu-gauge-text').textContent() === '0%', 'Measured idle GPU remains zero');
    check(await page.evaluate(() => window.fixtureCalls.length) === 0, 'Startup performs no diagnostics or system actions');
    check(await page.locator('.app-card').count() === 6, 'Desktop renders applications from bridge');
    await page.screenshot({ path: 'qa/fixme-overview.png', fullPage: true, animations: 'disabled' });
    await page.locator('.primary-nav [data-view="optimize"]').click();
    check(await page.locator('[data-panel="optimize"]').isVisible(), 'Optimization navigation works');
    await page.evaluate(() => { window.fixtureHoldVisual = true; });
    await page.locator('#togVisual').click();
    await page.waitForFunction(() => document.querySelector('#optimizationProgress').dataset.state === 'running');
    check(await page.locator('#togGPU').isDisabled(), 'A pending optimization disables other system actions');
    check(await page.locator('#optimizationProgressDetail').textContent().then(text => text.includes('Etapa 1 de 2') && !text.includes('visual_effects')), 'Progress uses readable current step and translated label');
    await page.locator('.primary-nav [data-view="insights"]').click();
    check(await page.locator('[data-panel="insights"]').isVisible(), 'Electron-style pending operation leaves navigation responsive');
    await page.evaluate(() => window.fixtureStatsUpdate({ stats: { ...window.fixtureStats, cpu: { current: 0 } } }));
    check(await page.locator('#cpu-gauge-text').textContent() === '0%', 'Telemetry keeps updating during optimization');
    await page.screenshot({ path: 'qa/fixme-optimization-running.png', fullPage: false, animations: 'disabled' });
    await page.evaluate(() => {
        window.fixtureOptimizationState = { ...window.fixtureOptimizationState, status: 'blocked', active: true, elapsedMs: 120000 };
        window.fixtureProgressUpdate(window.fixtureOptimizationState);
        window.fixtureResolveVisual({ success: false, code: 'ELEVATION_TIMEOUT', error: 'Tempo limite do teste.' });
    });
    await page.waitForFunction(() => document.querySelector('#optimizationProgress').dataset.state === 'blocked');
    check(await page.locator('#togVisual').isDisabled(), 'An uncertain Windows timeout keeps mutations locked');
    await page.screenshot({ path: 'qa/fixme-optimization-waiting.png', fullPage: false, animations: 'disabled' });
    await page.evaluate(() => {
        window.fixtureOptimizationState = { ...window.fixtureOptimizationState, status: 'failed', active: false };
        window.fixtureProgressUpdate(window.fixtureOptimizationState);
        window.fixtureHoldVisual = false;
    });
    await page.waitForFunction(() => !document.querySelector('#togVisual').disabled);
    check(await page.locator('#togVisual').isEnabled(), 'Confirmed process completion allows a new adjustment');
    await page.locator('.primary-nav [data-view="optimize"]').click();
    await page.locator('#togVisual').click();
    await page.waitForFunction(() => !document.querySelector('#revertVisual').disabled);
    await page.locator('#revertVisual').click();
    await page.waitForFunction(() => document.querySelector('#revertVisual').disabled);
    check(JSON.stringify(await page.evaluate(() => window.fixtureCalls.filter(x => x.name === 'visual').map(x => x.args[0]))) === '[true,false]', 'Apply and revert call the correct backend operations');
    await page.evaluate(() => { window.fixtureFailure = 'telemetry'; });
    await page.locator('#togTelemetry').click();
    await page.waitForFunction(() => document.querySelector('#woc-telemetry').dataset.state === 'error');
    check(await page.locator('#togTelemetry').isEnabled(), 'Failed operation restores action button');
    await page.locator('.winopt-kill-btn').first().click();
    await page.waitForFunction(() => window.fixtureCalls.some(x => x.name === 'kill'));
    check((await page.evaluate(() => window.fixtureCalls.find(x => x.name === 'kill').args[0])) === 'Discord.exe', 'End process targets only selected executable');
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
    await page.screenshot({ path: 'qa/fixme-optimizations.png', fullPage: true, animations: 'disabled' });
    await page.locator('.primary-nav [data-view="overview"]').click();
    await page.locator('#scanBtn').click();
    await page.waitForFunction(() => document.querySelector('#aiResults').classList.contains('active'));
    await page.locator('#aiPanel').waitFor({ state: 'visible' });
    check(await page.locator('#aiPanel').isVisible(), 'Diagnostic drawer opens on analysis');
    check(await page.locator('#aiMetricIssues').textContent() === '1', 'Diagnostic result uses actual issue count');
    check(await page.locator('#aiMetricFixed').textContent() === '1', 'Recommendation count is separate from executed actions');
    await page.screenshot({ path: 'qa/fixme-diagnostic.png', fullPage: false, animations: 'disabled' });
    await page.keyboard.press('Escape');
    check(await page.evaluate(() => document.activeElement.id === 'scanBtn'), 'Escape returns focus to analysis trigger');
    await page.evaluate(() => { window.fixtureFailure = 'analysis'; });
    await page.locator('#scanBtn').click();
    await page.waitForFunction(() => document.querySelector('#aiResultCards').textContent.includes('Aguarde 60s'));
    check(await page.locator('#aiActionBtn').isEnabled(), 'Rejected diagnosis releases retry button');
    await page.keyboard.press('Escape');
    await page.locator('#profileEditBtn').click();
    await page.locator('input[name="profileUsageType"][value="Gamer"]').check();
    await page.locator('input[name="profilePriority"][value="balanced"]').check();
    await page.locator('.profile-save-btn').click();
    await page.waitForFunction(() => document.querySelector('#profileOverlay').hidden);
    check(await page.evaluate(() => document.activeElement.id === 'profileEditBtn'), 'Profile save returns focus');
    await page.locator('.primary-nav [data-view="insights"]').click();
    await page.locator('button[onclick="showBottleneckMenu()"]').click();
    await page.locator('dialog button').filter({ hasText: 'CPU' }).click();
    await page.waitForFunction(() => window.fixtureCalls.some(x => x.name === 'bottleneck'));
    check(await page.locator('#deepaiResultContent').textContent().then(text => text.includes('Carga da CPU')), 'Specific bottleneck selection requests and displays selected resource');
    await page.screenshot({ path: 'qa/fixme-insights.png', fullPage: true, animations: 'disabled' });
    await page.locator('#langToggleBtn').click();
    check(await page.locator('#pageTitle').textContent() === 'Understand your performance.', 'English navigation headings update');
    await page.locator('.primary-nav [data-view="activity"]').click();
    check(await page.locator('.activity-item').count() >= 4, 'Session activity contains completed operations');
    for (const width of [1100, 900, 390]) {
        await page.setViewportSize({ width, height: 720 });
        for (const view of ['overview', 'optimize', 'insights', 'activity']) {
            await page.locator('.primary-nav [data-view="' + view + '"]').click();
            check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow at ' + width + 'px in ' + view);
        }
    }
    await page.setViewportSize({ width: 1100, height: 720 });
    await page.locator('#langToggleBtn').click();
    await page.locator('.primary-nav [data-view="overview"]').click();
    await page.evaluate(() => { window.fixtureFailure = ''; });
    await page.screenshot({ path: 'qa/fixme-final.png', fullPage: true, animations: 'disabled' });
    check(errors.length === 0, 'No browser JavaScript errors: ' + errors.join('; '));
    return { passed: passed.length, checks: passed, screenshots: 'qa/' };
}
