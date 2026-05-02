'use strict';
const db = require('./database');

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function mean(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function euclidean(a, b) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - (b[i] || 0)) ** 2, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AnomalyDetector — Welford's online z-score per metric
//    Detects when CPU/RAM/GPU readings deviate abnormally from historical norms.
// ─────────────────────────────────────────────────────────────────────────────

class AnomalyDetector {
  constructor(threshold = 2.5) {
    this.threshold = threshold;
    this.metrics = {
      cpu: { n: 0, mean: 0, M2: 0 },
      mem: { n: 0, mean: 0, M2: 0 },
      gpu: { n: 0, mean: 0, M2: 0 }
    };
    this.anomalyLog = [];
  }

  _welford(s, x) {
    s.n++;
    const d1 = x - s.mean;
    s.mean += d1 / s.n;
    s.M2 += d1 * (x - s.mean);
  }

  _variance(s) { return s.n > 1 ? s.M2 / (s.n - 1) : 0; }

  update(cpu, mem, gpu) {
    this._welford(this.metrics.cpu, cpu);
    this._welford(this.metrics.mem, mem);
    this._welford(this.metrics.gpu, gpu);
  }

  detect(cpu, mem, gpu) {
    const result = { anomalies: [], score: 0, isAnomaly: false };
    const inputs = { cpu, mem, gpu };
    for (const [key, val] of Object.entries(inputs)) {
      const s = this.metrics[key];
      if (s.n < 10) continue;
      const std = Math.sqrt(this._variance(s));
      if (std === 0) continue;
      const z = Math.abs((val - s.mean) / std);
      if (z > this.threshold) {
        result.anomalies.push({
          metric: key, value: val,
          mean: Math.round(s.mean * 10) / 10,
          z: Math.round(z * 10) / 10
        });
        result.score = Math.max(result.score, z);
      }
    }
    result.isAnomaly = result.anomalies.length > 0;
    if (result.isAnomaly) {
      this.anomalyLog.push({ ts: Date.now(), anomalies: result.anomalies });
      if (this.anomalyLog.length > 200) this.anomalyLog = this.anomalyLog.slice(-200);
    }
    return result;
  }

  getStats() {
    const out = {};
    for (const [k, s] of Object.entries(this.metrics)) {
      out[k] = {
        mean: Math.round(s.mean * 10) / 10,
        std:  Math.round(Math.sqrt(this._variance(s)) * 10) / 10,
        samples: s.n
      };
    }
    return { metrics: out, anomalyCount: this.anomalyLog.length, threshold: this.threshold };
  }

  serialize() {
    return { metrics: this.metrics, anomalyLog: this.anomalyLog.slice(-50), threshold: this.threshold };
  }

  deserialize(d) {
    if (!d) return;
    if (d.metrics)    this.metrics    = d.metrics;
    if (d.anomalyLog) this.anomalyLog = d.anomalyLog;
    if (d.threshold)  this.threshold  = d.threshold;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PerformanceForecast — per-slot exponential smoothing (168 time slots)
//    Predicts expected CPU/RAM/GPU for any hour×weekday based on past readings.
// ─────────────────────────────────────────────────────────────────────────────

class PerformanceForecast {
  constructor(alpha = 0.25) {
    this.alpha = alpha;
    // 7 weekdays × 24 hours = 168 slots; each: { cpu, mem, gpu, count }
    this.slots = Array.from({ length: 168 }, () => ({ cpu: 0, mem: 0, gpu: 0, count: 0 }));
  }

  _idx(hour, weekday) { return weekday * 24 + (hour % 24); }

  update(cpu, mem, gpu, hour, weekday) {
    const s = this.slots[this._idx(hour, weekday)];
    if (s.count === 0) {
      s.cpu = cpu; s.mem = mem; s.gpu = gpu;
    } else {
      const a = this.alpha;
      s.cpu = a * cpu + (1 - a) * s.cpu;
      s.mem = a * mem + (1 - a) * s.mem;
      s.gpu = a * gpu + (1 - a) * s.gpu;
    }
    s.count++;
  }

  predict(hour, weekday) {
    const s = this.slots[this._idx(hour, weekday)];
    if (s.count === 0) {
      const neighbors = [-1, 1].map(d => this.slots[this._idx(hour + d + 24, weekday)]).filter(n => n.count > 0);
      if (!neighbors.length) return { cpu: 30, mem: 50, gpu: 20, confidence: 0 };
      return {
        cpu: Math.round(mean(neighbors.map(n => n.cpu))),
        mem: Math.round(mean(neighbors.map(n => n.mem))),
        gpu: Math.round(mean(neighbors.map(n => n.gpu))),
        confidence: 10
      };
    }
    return {
      cpu: Math.round(s.cpu),
      mem: Math.round(s.mem),
      gpu: Math.round(s.gpu),
      confidence: Math.min(100, s.count * 5)
    };
  }

  getStats() {
    const used = this.slots.filter(s => s.count > 0);
    return {
      coveredSlots: used.length,
      totalSlots: 168,
      coveragePct: Math.round(used.length / 168 * 100),
      avgConfidence: used.length ? Math.round(mean(used.map(s => Math.min(100, s.count * 5)))) : 0
    };
  }

  serialize() { return { slots: this.slots, alpha: this.alpha }; }

  deserialize(d) {
    if (!d) return;
    if (d.slots && d.slots.length === 168) this.slots = d.slots;
    if (d.alpha) this.alpha = d.alpha;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UserProfileCluster — online k-means (k=4)
//    Learns the user's recurring usage profiles: Gamer, Trabalho, Idle, Misto.
// ─────────────────────────────────────────────────────────────────────────────

const PROFILE_NAMES = ['Gamer', 'Trabalho', 'Idle', 'Misto'];

class UserProfileCluster {
  constructor() {
    this.k = 4;
    // Centroids: [cpu/100, mem/100, gpu/100, processCount/500, hour/24]
    this.centroids = [
      [0.70, 0.70, 0.80, 0.30, 0.75],  // Gamer
      [0.50, 0.60, 0.10, 0.40, 0.42],  // Trabalho
      [0.10, 0.30, 0.05, 0.10, 0.25],  // Idle
      [0.40, 0.50, 0.30, 0.30, 0.50]   // Misto
    ];
    this.counts   = [0, 0, 0, 0];
    this.history  = [];
    this.lr       = 0.05;
  }

  _feat(cpu, mem, gpu, procCount, hour) {
    return [cpu / 100, mem / 100, gpu / 100, procCount / 500, hour / 24];
  }

  _nearest(f) {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < this.k; i++) {
      const d = euclidean(f, this.centroids[i]);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    const dists = this.centroids.map(c => euclidean(f, c));
    const sum   = dists.reduce((a, b) => a + b, 0);
    const conf  = sum > 0 ? Math.round((1 - dists[best] / (sum / this.k)) * 100) : 50;
    return { index: best, name: PROFILE_NAMES[best], confidence: clamp(conf, 0, 100) };
  }

  update(cpu, mem, gpu, procCount, hour) {
    const f = this._feat(cpu, mem, gpu, procCount, hour);
    const { index } = this._nearest(f);
    this.counts[index]++;
    const c = this.centroids[index];
    for (let d = 0; d < f.length; d++) c[d] += this.lr * (f[d] - c[d]);
    this.lr = Math.max(0.001, this.lr * 0.9999);
    this.history.push({ ts: Date.now(), profile: PROFILE_NAMES[index], cpu, mem, gpu });
    if (this.history.length > 500) this.history = this.history.slice(-500);
  }

  classify(cpu, mem, gpu, procCount, hour) {
    return this._nearest(this._feat(cpu, mem, gpu, procCount, hour));
  }

  getStats() {
    const total = this.counts.reduce((s, c) => s + c, 0);
    return {
      profiles: PROFILE_NAMES.map((name, i) => ({
        name,
        count:    this.counts[i],
        pct:      total ? Math.round(this.counts[i] / total * 100) : 0,
        centroid: {
          cpu: Math.round(this.centroids[i][0] * 100),
          mem: Math.round(this.centroids[i][1] * 100),
          gpu: Math.round(this.centroids[i][2] * 100)
        }
      })),
      dominantProfile: total
        ? PROFILE_NAMES[this.counts.indexOf(Math.max(...this.counts))]
        : 'Desconhecido',
      totalSessions: total,
      learningRate:  Math.round(this.lr * 10000) / 10000
    };
  }

  serialize() {
    return {
      centroids: this.centroids,
      counts:    this.counts,
      history:   this.history.slice(-100),
      lr:        this.lr
    };
  }

  deserialize(d) {
    if (!d) return;
    if (d.centroids && d.centroids.length === this.k) this.centroids = d.centroids;
    if (d.counts)   this.counts   = d.counts;
    if (d.history)  this.history  = d.history;
    if (d.lr)       this.lr       = d.lr;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SessionClassifier — Naive Bayes
//    Classifies the current session type: gaming, work, idle, media, browser.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_TYPES = ['gaming', 'work', 'idle', 'media', 'browser'];

class SessionClassifier {
  constructor() {
    this.classCounts    = Object.fromEntries(SESSION_TYPES.map(t => [t, 1]));
    this.totalSamples   = SESSION_TYPES.length;
    this.featureCounts  = {};
    this.recentPredictions = [];
  }

  _features(cpu, mem, gpu, procs = []) {
    const names = procs.map(p => (p.name || '').toLowerCase());
    const has = keywords => names.some(n => keywords.some(k => n.includes(k)));
    return {
      cpuBand:    cpu > 70 ? 'hi' : cpu > 30 ? 'mid' : 'lo',
      memBand:    mem > 70 ? 'hi' : mem > 40 ? 'mid' : 'lo',
      gpuBand:    gpu > 50 ? 'hi' : gpu > 15 ? 'mid' : 'lo',
      cpuGpuHigh: (cpu > 50 && gpu > 40) ? 'y' : 'n',
      hasGame:    has(['steam', 'epicgames', 'gamebarpresence', 'origin', 'uplay', 'battle']) ? 'y' : 'n',
      hasWork:    has(['code', 'devenv', 'node', 'python', 'cmd', 'powershell', 'idea']) ? 'y' : 'n',
      hasBrowser: has(['chrome', 'firefox', 'msedge', 'opera', 'brave']) ? 'y' : 'n',
      hasMedia:   has(['vlc', 'spotify', 'wmplayer', 'mpc', 'potplayer']) ? 'y' : 'n'
    };
  }

  train(cpu, mem, gpu, procs, label) {
    if (!SESSION_TYPES.includes(label)) return;
    this.classCounts[label]++;
    this.totalSamples++;
    const f = this._features(cpu, mem, gpu, procs);
    for (const [fname, fval] of Object.entries(f)) {
      if (!this.featureCounts[fname]) this.featureCounts[fname] = {};
      if (!this.featureCounts[fname][label]) this.featureCounts[fname][label] = {};
      this.featureCounts[fname][label][fval] = (this.featureCounts[fname][label][fval] || 0) + 1;
    }
  }

  classify(cpu, mem, gpu, procs = []) {
    const f = this._features(cpu, mem, gpu, procs);
    const logScores = {};
    for (const cls of SESSION_TYPES) {
      let score = Math.log((this.classCounts[cls] || 1) / this.totalSamples);
      for (const [fname, fval] of Object.entries(f)) {
        const observed = (this.featureCounts[fname]?.[cls]?.[fval] || 0) + 1;
        const classTotal = Object.values(this.featureCounts[fname]?.[cls] || {}).reduce((s, v) => s + v, 0) + 2;
        score += Math.log(observed / classTotal);
      }
      logScores[cls] = score;
    }

    const sorted = Object.entries(logScores).sort((a, b) => b[1] - a[1]);
    const best   = sorted[0][0];
    // Softmax confidence
    const maxVal = sorted[0][1];
    const exps   = sorted.map(([, v]) => Math.exp(v - maxVal));
    const expSum = exps.reduce((a, b) => a + b, 0);
    const conf   = Math.round((exps[0] / expSum) * 100);

    const result = { type: best, confidence: conf };
    this.recentPredictions.push({ ts: Date.now(), ...result });
    if (this.recentPredictions.length > 200) this.recentPredictions = this.recentPredictions.slice(-200);
    return result;
  }

  getStats() {
    const total = Object.values(this.classCounts).reduce((s, c) => s + c, 0);
    return {
      classCounts:      this.classCounts,
      totalSamples:     this.totalSamples,
      distribution:     Object.fromEntries(
        SESSION_TYPES.map(c => [c, Math.round((this.classCounts[c] || 0) / total * 100)])
      ),
      recentPredictions: this.recentPredictions.slice(-5)
    };
  }

  serialize() {
    return {
      classCounts:   this.classCounts,
      totalSamples:  this.totalSamples,
      featureCounts: this.featureCounts
    };
  }

  deserialize(d) {
    if (!d) return;
    if (d.classCounts)   this.classCounts   = d.classCounts;
    if (d.totalSamples)  this.totalSamples  = d.totalSamples;
    if (d.featureCounts) this.featureCounts = d.featureCounts;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. OptimizationScorer — recency-weighted kNN (k=7) with before/after delta
//    Predicts which optimization will yield the highest measured improvement
//    for the current machine state, based on past outcomes.
// ─────────────────────────────────────────────────────────────────────────────

class OptimizationScorer {
  constructor(k = 7) {
    this.k       = k;
    this.samples = []; // { features[8], type, delta{cpu,mem,gpu}, effectiveness, ts }
  }

  // 8-dim: [cpu, mem, gpu, hour, weekday, procCount, cpuTrend, memTrend]
  _feat(stats, trends = {}) {
    const now = new Date();
    return [
      clamp(parseFloat(stats?.cpu?.current || 0) / 100,      0, 1),
      clamp(parseFloat(stats?.memory?.current || 0) / 100,   0, 1),
      clamp(parseFloat(stats?.gpu?.current || 0) / 100,      0, 1),
      now.getHours() / 24,
      now.getDay() / 7,
      clamp((stats?.processCount || 0) / 500,                0, 1),
      clamp((trends.cpu || 0) / 50,                         -1, 1),
      clamp((trends.mem || 0) / 50,                         -1, 1)
    ];
  }

  train(stats, type, before, after, userRating = null) {
    const delta = {
      cpu: Math.max(0, (before?.cpu || 0) - (after?.cpu || 0)),
      mem: Math.max(0, (before?.mem || 0) - (after?.mem || 0)),
      gpu: Math.max(0, (before?.gpu || 0) - (after?.gpu || 0))
    };
    const measured = clamp((delta.cpu * 0.5 + delta.mem * 0.3 + delta.gpu * 0.2) / 20, 0, 1);
    const rated    = userRating !== null ? (userRating - 1) / 4 : measured;
    const eff      = userRating !== null ? 0.4 * measured + 0.6 * rated : measured;

    this.samples.push({ features: this._feat(stats), type, delta, effectiveness: eff, ts: Date.now() });
    if (this.samples.length > 2000) this.samples = this.samples.slice(-2000);
  }

  predict(stats, trends = {}) {
    if (this.samples.length < 3) {
      return { predictions: [], confidence: 0, message: 'Dados insuficientes (mín. 3 amostras)' };
    }

    const f    = this._feat(stats, trends);
    const now  = Date.now();
    const half = 30 * 24 * 60 * 60 * 1000; // 30-day half-life for recency decay

    const scored = this.samples.map(s => ({
      type:  s.type,
      score: s.effectiveness,
      delta: s.delta,
      w:     (1 / (euclidean(f, s.features) + 0.001)) * Math.exp(-Math.log(2) * (now - s.ts) / half)
    }));
    scored.sort((a, b) => b.w - a.w);
    const kBest = scored.slice(0, this.k);

    const agg = {};
    for (const { type, score, delta, w } of kBest) {
      if (!agg[type]) agg[type] = { ws: 0, wt: 0, wCpu: 0, wMem: 0, wGpu: 0, n: 0 };
      agg[type].ws   += score   * w;
      agg[type].wt   += w;
      agg[type].wCpu += delta.cpu * w;
      agg[type].wMem += delta.mem * w;
      agg[type].wGpu += delta.gpu * w;
      agg[type].n++;
    }

    const predictions = Object.entries(agg).map(([type, a]) => ({
      type,
      score:            Math.round(a.ws / a.wt * 100) / 100,
      estimatedCpuDrop: Math.round(a.wCpu / a.wt),
      estimatedMemDrop: Math.round(a.wMem / a.wt),
      estimatedGpuDrop: Math.round(a.wGpu / a.wt),
      confidence:       Math.round(Math.min(a.n / this.k, 1) * 100)
    })).sort((a, b) => b.score - a.score);

    return {
      predictions,
      topType:    predictions[0]?.type || null,
      confidence: predictions[0]?.confidence || 0,
      message:    predictions[0]
        ? `Recomendado: ${predictions[0].type} (efetividade ${Math.round(predictions[0].score * 100)}%)`
        : 'Sem predições'
    };
  }

  getStats() {
    const tc  = {};
    for (const s of this.samples) tc[s.type] = (tc[s.type] || 0) + 1;
    const avg = this.samples.length ? mean(this.samples.map(s => s.effectiveness)) : 0;
    return {
      totalSamples:     this.samples.length,
      typeCounts:       tc,
      avgEffectiveness: Math.round(avg * 100) / 100,
      isReady:          this.samples.length >= 3
    };
  }

  serialize() { return { samples: this.samples.slice(-500), k: this.k }; }

  deserialize(d) {
    if (!d) return;
    if (d.samples) this.samples = d.samples;
    if (d.k)       this.k       = d.k;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalMLHub — orchestrates all 5 models + debounced DB persistence
// ─────────────────────────────────────────────────────────────────────────────

class LocalMLHub {
  constructor() {
    this.anomaly   = new AnomalyDetector();
    this.forecast  = new PerformanceForecast();
    this.cluster   = new UserProfileCluster();
    this.session   = new SessionClassifier();
    this.optimizer = new OptimizationScorer();
    this._loaded   = false;
    this._timer    = null;
  }

  load() {
    if (this._loaded) return;
    const state = db.getLocalMLState();
    if (state) {
      this.anomaly.deserialize(state.anomaly);
      this.forecast.deserialize(state.forecast);
      this.cluster.deserialize(state.cluster);
      this.session.deserialize(state.session);
      this.optimizer.deserialize(state.optimizer);
    }
    this._loaded = true;
  }

  _save() {
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      db.saveLocalMLState({
        anomaly:   this.anomaly.serialize(),
        forecast:  this.forecast.serialize(),
        cluster:   this.cluster.serialize(),
        session:   this.session.serialize(),
        optimizer: this.optimizer.serialize()
      });
    }, 5000);
  }

  // Called on every hardware stats update (monitoring loop tick).
  // Returns a snapshot of all model outputs for this tick.
  tick(stats, processes = []) {
    this.load();
    const cpu   = parseFloat(stats?.cpu?.current || 0);
    const mem   = parseFloat(stats?.memory?.current || 0);
    const gpu   = parseFloat(stats?.gpu?.current || 0);
    const procs = stats?.processCount || 0;
    const now   = new Date();

    this.anomaly.update(cpu, mem, gpu);
    this.forecast.update(cpu, mem, gpu, now.getHours(), now.getDay());
    this.cluster.update(cpu, mem, gpu, procs, now.getHours());
    this._save();

    const nextHour = (now.getHours() + 1) % 24;
    return {
      anomaly:  this.anomaly.detect(cpu, mem, gpu),
      forecast: this.forecast.predict(nextHour, now.getDay()),
      profile:  this.cluster.classify(cpu, mem, gpu, procs, now.getHours()),
      session:  this.session.classify(cpu, mem, gpu, processes)
    };
  }

  // Record the measured outcome of an optimization for the scorer.
  recordOutcome(type, statsBefore, statsAfter, userRating = null) {
    this.load();
    const before = {
      cpu: parseFloat(statsBefore?.cpu?.current || 0),
      mem: parseFloat(statsBefore?.memory?.current || 0),
      gpu: parseFloat(statsBefore?.gpu?.current || 0)
    };
    const after = {
      cpu: parseFloat(statsAfter?.cpu?.current || 0),
      mem: parseFloat(statsAfter?.memory?.current || 0),
      gpu: parseFloat(statsAfter?.gpu?.current || 0)
    };
    this.optimizer.train(statsBefore, type, before, after, userRating);
    this._save();
  }

  // Manually label a session for the Naive Bayes classifier.
  trainSession(cpu, mem, gpu, processes, label) {
    this.load();
    this.session.train(cpu, mem, gpu, processes, label);
    this._save();
  }

  // Ask the scorer which optimization is recommended for the current state.
  predictOptimization(stats, trends = {}) {
    this.load();
    return this.optimizer.predict(stats, trends);
  }

  // Returns stats for all 5 models (for the UI dashboard).
  getFullStats() {
    this.load();
    return {
      anomalyDetector:    this.anomaly.getStats(),
      forecast:           this.forecast.getStats(),
      userProfile:        this.cluster.getStats(),
      sessionClassifier:  this.session.getStats(),
      optimizationScorer: this.optimizer.getStats()
    };
  }
}

module.exports = LocalMLHub;
