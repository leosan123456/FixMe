const { GoogleGenerativeAI } = require('@google/generative-ai');

const ANALYSIS_SCHEMA = {
  systemProfile: { cpuBottleneck: Boolean, memoryBottleneck: Boolean, gpuBottleneck: Boolean, topIssues: Array },
  optimizationPlan: Array, // [{id, title, priority, impact, category, commands}]
  predictions: { estimatedFpsGain: Number, estimatedLatencyReduction: Number, estimatedBootImprovement: Number },
  insights: Array // string[]
};

class DeepAI {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.patternMemory = [];        // local pattern history
    this.sessionHistory = [];       // multi-turn conversation
    this.systemFingerprint = null;  // last full system profile
    this._ready = false;
  }

  _init() {
    if (this._ready) return;
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this._ready = true;
  }

  // ── Deep system profile ────────────────────────────────────────────────────

  buildSystemFingerprint(hwStats, processStats, optimizationHistory) {
    const now = new Date();
    const fingerprint = {
      timestamp: now.toISOString(),
      hardware: {
        cpu: { usage: hwStats.cpu || 0, cores: hwStats.cpuCores || 0, model: hwStats.cpuModel || 'Unknown' },
        memory: { usagePercent: hwStats.memory || 0, totalGb: hwStats.memTotal || 0 },
        gpu: { usage: hwStats.gpu || 0, model: hwStats.gpuModel || 'Unknown' }
      },
      runtime: {
        hour: now.getHours(),
        weekday: now.getDay(),
        processCount: processStats?.count || 0,
        topCpuProcesses: (processStats?.topCpu || []).slice(0, 5),
        topMemProcesses: (processStats?.topMem || []).slice(0, 5)
      },
      history: {
        totalOptimizations: (optimizationHistory || []).length,
        recentTypes: (optimizationHistory || []).slice(-10).map(h => h.optimization_type),
        successRate: this._calcSuccessRate(optimizationHistory || [])
      },
      patterns: this._extractLocalPatterns()
    };
    this.systemFingerprint = fingerprint;
    return fingerprint;
  }

  _calcSuccessRate(history) {
    if (!history.length) return 0;
    return Math.round((history.filter(h => h.success).length / history.length) * 100);
  }

  _extractLocalPatterns() {
    if (this.patternMemory.length < 3) return [];
    const recent = this.patternMemory.slice(-20);
    const cpuAvg = recent.reduce((s, p) => s + p.cpu, 0) / recent.length;
    const memAvg = recent.reduce((s, p) => s + p.mem, 0) / recent.length;
    const patterns = [];
    if (cpuAvg > 70) patterns.push('chronic_high_cpu');
    if (memAvg > 80) patterns.push('chronic_high_memory');
    const spikes = recent.filter(p => p.cpu > 90).length;
    if (spikes > 5) patterns.push('frequent_cpu_spikes');
    return patterns;
  }

  recordPattern(cpu, mem, gpu) {
    this.patternMemory.push({ ts: Date.now(), cpu, mem, gpu });
    if (this.patternMemory.length > 100) this.patternMemory = this.patternMemory.slice(-100);
  }

  // ── Multi-turn deep analysis ───────────────────────────────────────────────

  async deepAnalyze(fingerprint, userContext = '') {
    this._init();

    const systemPrompt = `You are an expert Windows performance engineer specializing in gaming optimization.
You have deep knowledge of: Windows registry, kernel scheduler, MMCSS, power plans, DirectX, GPU drivers,
memory management, network stack tuning, and process priority optimization.

Analyze the system profile and return a structured JSON optimization plan.
Always respond with ONLY valid JSON matching this structure:
{
  "systemProfile": {
    "cpuBottleneck": boolean,
    "memoryBottleneck": boolean,
    "gpuBottleneck": boolean,
    "topIssues": ["issue1", "issue2", "issue3"]
  },
  "optimizationPlan": [
    {
      "id": "unique_id",
      "title": "Optimization title",
      "priority": 1-10,
      "impact": "high|medium|low",
      "category": "cpu|memory|gpu|network|scheduler|registry|services",
      "description": "What this does and why",
      "safetyLevel": "safe|moderate|advanced",
      "estimatedGain": "description of expected improvement"
    }
  ],
  "predictions": {
    "estimatedFpsGain": 0-30,
    "estimatedLatencyReduction": 0-50,
    "estimatedBootImprovement": 0-40
  },
  "insights": ["insight1", "insight2", "insight3"]
}`;

    const userMessage = `System fingerprint:
${JSON.stringify(fingerprint, null, 2)}

${userContext ? `Additional context from user: ${userContext}` : ''}

Provide a comprehensive deep optimization analysis. Focus on the most impactful changes for this specific hardware configuration.
Consider the usage patterns and history to tailor recommendations.`;

    this.sessionHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    const chat = this.model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will analyze system profiles and return structured JSON optimization plans.' }] },
        ...this.sessionHistory.slice(0, -1)
      ]
    });

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    this.sessionHistory.push({ role: 'model', parts: [{ text: responseText }] });

    // keep session manageable
    if (this.sessionHistory.length > 20) {
      this.sessionHistory = this.sessionHistory.slice(-16);
    }

    return this._parseResponse(responseText);
  }

  // ── Follow-up / refinement ─────────────────────────────────────────────────

  async refineAnalysis(question) {
    this._init();
    if (!this.systemFingerprint) throw new Error('Run deepAnalyze first');

    const prompt = `Based on the system we just analyzed, answer this specific question and provide additional optimizations if relevant.
Question: ${question}
Respond with JSON: { "answer": "...", "additionalOptimizations": [...same structure as optimizationPlan...], "warnings": ["..."] }`;

    this.sessionHistory.push({ role: 'user', parts: [{ text: prompt }] });

    const chat = this.model.startChat({ history: this.sessionHistory.slice(0, -1) });
    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();

    this.sessionHistory.push({ role: 'model', parts: [{ text: responseText }] });

    return this._parseResponse(responseText);
  }

  // ── Targeted analysis ─────────────────────────────────────────────────────

  async analyzeBottleneck(type, metrics) {
    this._init();

    const prompts = {
      cpu: `The CPU is running at ${metrics.usage}% usage. Top processes: ${JSON.stringify(metrics.topProcesses || [])}.
Cores: ${metrics.cores}. Model: ${metrics.model}.
Identify the root cause and provide 3-5 specific optimizations to reduce CPU load. JSON only.`,
      memory: `Memory pressure detected: ${metrics.usagePercent}% used of ${metrics.totalGb}GB.
Provide memory optimization steps including registry tweaks, service adjustments, and Windows memory management settings. JSON only.`,
      gpu: `GPU at ${metrics.usage}% with model ${metrics.model}.
Provide DirectX, driver, and scheduler optimizations specific to this GPU tier. JSON only.`,
      network: `Network latency issue detected. Provide Windows network stack optimizations (TCP/IP tuning, QoS, interrupt moderation). JSON only.`
    };

    const prompt = (prompts[type] || prompts.cpu) + `
Respond with JSON: {
  "rootCause": "...",
  "optimizations": [{ "title": "...", "steps": ["..."], "impact": "high|medium|low", "registryKeys": [...] }],
  "warnings": ["..."]
}`;

    const result = await this.model.generateContent(prompt);
    return this._parseResponse(result.response.text());
  }

  // ── Process intelligence ───────────────────────────────────────────────────

  async analyzeProcessList(processes) {
    this._init();

    const prompt = `Analyze this Windows process list for a gaming PC and identify:
1. Processes safe to kill during gaming
2. Processes that are suspicious/malware candidates
3. Processes with priority/affinity recommendations

Process list: ${JSON.stringify(processes.slice(0, 30))}

JSON response: {
  "safeToKill": [{ "name": "...", "reason": "..." }],
  "suspicious": [{ "name": "...", "reason": "...", "riskLevel": "low|medium|high" }],
  "priorityTweaks": [{ "name": "...", "suggestedPriority": "high|above_normal|normal|below_normal", "reason": "..." }]
}`;

    const result = await this.model.generateContent(prompt);
    return this._parseResponse(result.response.text());
  }

  // ── Learning from outcomes ─────────────────────────────────────────────────

  async learnFromOutcome(optimizationId, before, after, userRating) {
    const delta = {
      cpuDelta: (before.cpu || 0) - (after.cpu || 0),
      memDelta: (before.mem || 0) - (after.mem || 0),
      gpuDelta: (before.gpu || 0) - (after.gpu || 0)
    };

    const lesson = {
      optimizationId,
      delta,
      userRating,
      timestamp: Date.now(),
      effective: userRating >= 4 || (delta.cpuDelta > 5 || delta.memDelta > 5)
    };

    // Update local pattern memory with effectiveness signal
    if (lesson.effective) {
      this.patternMemory.push({ ...delta, effective: true, ts: Date.now(), cpu: after.cpu, mem: after.mem, gpu: after.gpu });
    }

    return lesson;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _parseResponse(text) {
    try {
      const cleaned = text
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('No JSON object found');
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (err) {
      return { error: 'Failed to parse AI response', raw: text.slice(0, 500) };
    }
  }

  clearSession() {
    this.sessionHistory = [];
    this.systemFingerprint = null;
  }

  getSessionSummary() {
    return {
      turns: Math.floor(this.sessionHistory.length / 2),
      patternsTracked: this.patternMemory.length,
      hasFingerprint: !!this.systemFingerprint,
      ready: this._ready
    };
  }
}

module.exports = DeepAI;
