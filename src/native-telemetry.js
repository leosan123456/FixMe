'use strict';

// Real Windows performance-counter telemetry (PDH, the OS's native C API) via
// koffi FFI — no compiler/build step required. Replaces the VRAM-usage-ratio
// proxy for GPU load with the actual `\GPU Engine(*)\Utilization Percentage`
// counter, and optionally a more accurate CPU reading via Processor Information.
// Every public method is fail-soft: on any error it disables itself and returns
// null so callers (hardware.js) can fall back to the systeminformation values.

let koffi = null;
let pdh = null;
let funcs = null;
let types = null;

const PDH_FMT_DOUBLE = 0x00000200;
const PDH_MORE_DATA = 0x800007D2;

function u32(status) { return status >>> 0; }

// Pure helper (no PDH/koffi dependency) — sums utilization across all counter
// instances belonging to a given GPU engine type, e.g. '3D'. Exported so it can
// be unit-tested with fabricated fixtures.
function _sumEngineType(items, engineType) {
  const suffix = `engtype_${String(engineType).toLowerCase()}`;
  let sum = 0;
  for (const it of items || []) {
    const name = (it && it.szName || '').toLowerCase();
    if (it && it.FmtValue && it.FmtValue.CStatus === 0 && name.endsWith(suffix)) {
      sum += it.FmtValue.doubleValue;
    }
  }
  return sum;
}

function _loadKoffi() {
  if (koffi) return true;
  try {
    const k = require('koffi');
    const lib = k.load('pdh.dll');

    const HANDLE = k.pointer('HANDLE', k.opaque());
    const PDH_HQUERY = k.alias('PDH_HQUERY', HANDLE);
    const PDH_HCOUNTER = k.alias('PDH_HCOUNTER', HANDLE);

    const PDH_FMT_COUNTERVALUE = k.struct('PDH_FMT_COUNTERVALUE', {
      CStatus: 'uint32',
      doubleValue: 'double'
    });
    const PDH_FMT_COUNTERVALUE_ITEM_W = k.struct('PDH_FMT_COUNTERVALUE_ITEM_W', {
      szName: 'str16',
      FmtValue: PDH_FMT_COUNTERVALUE
    });

    funcs = {
      PdhOpenQueryW: lib.func('long __stdcall PdhOpenQueryW(const char16_t *szDataSource, size_t dwUserData, _Out_ PDH_HQUERY *phQuery)'),
      PdhAddEnglishCounterW: lib.func('long __stdcall PdhAddEnglishCounterW(PDH_HQUERY hQuery, const char16_t *szFullCounterPath, size_t dwUserData, _Out_ PDH_HCOUNTER *phCounter)'),
      PdhCollectQueryData: lib.func('long __stdcall PdhCollectQueryData(PDH_HQUERY hQuery)'),
      PdhGetFormattedCounterArrayW: lib.func('long __stdcall PdhGetFormattedCounterArrayW(PDH_HCOUNTER hCounter, uint32_t dwFormat, _Inout_ uint32_t *lpdwBufferSize, _Inout_ uint32_t *lpdwItemCount, void *ItemBuffer)'),
      PdhGetFormattedCounterValue: lib.func('long __stdcall PdhGetFormattedCounterValue(PDH_HCOUNTER hCounter, uint32_t dwFormat, uint32_t *lpdwType, _Out_ PDH_FMT_COUNTERVALUE *pValue)'),
      PdhCloseQuery: lib.func('long __stdcall PdhCloseQuery(PDH_HQUERY hQuery)')
    };
    types = { PDH_FMT_COUNTERVALUE, PDH_FMT_COUNTERVALUE_ITEM_W };

    koffi = k;
    pdh = lib;
    return true;
  } catch (err) {
    koffi = null;
    return false;
  }
}

class NativeTelemetry {
  constructor() {
    this._probed = false;
    this._query = null;
    this._gpuCounter = null;
    this._cpuCounter = null;
    this._caps = { available: false, koffiLoaded: false, gpuCounterFound: false, cpuCounterFound: false, reason: 'not_probed' };
  }

  // One-time, lazy — never called from the constructor or app boot. Any failure
  // permanently disables native telemetry for the rest of the process lifetime
  // (no automatic per-tick retries).
  probe() {
    if (this._probed) return this._caps;
    this._probed = true;

    if (!_loadKoffi()) {
      this._caps = { available: false, koffiLoaded: false, gpuCounterFound: false, cpuCounterFound: false, reason: 'koffi_unavailable' };
      return this._caps;
    }

    try {
      const queryOut = [null];
      let status = funcs.PdhOpenQueryW(null, 0, queryOut);
      if (u32(status) !== 0) throw new Error('PdhOpenQueryW 0x' + u32(status).toString(16));
      this._query = queryOut[0];

      let gpuFound = false;
      try {
        const counterOut = [null];
        status = funcs.PdhAddEnglishCounterW(this._query, '\\GPU Engine(*)\\Utilization Percentage', 0, counterOut);
        if (u32(status) === 0) { this._gpuCounter = counterOut[0]; gpuFound = true; }
      } catch (_) { /* GPU counter unavailable — keep probing CPU */ }

      let cpuFound = false;
      try {
        const counterOut = [null];
        status = funcs.PdhAddEnglishCounterW(this._query, '\\Processor Information(_Total)\\% Processor Utility', 0, counterOut);
        if (u32(status) === 0) { this._cpuCounter = counterOut[0]; cpuFound = true; }
      } catch (_) { /* CPU counter unavailable */ }

      if (!gpuFound && !cpuFound) throw new Error('no counters resolved');

      funcs.PdhCollectQueryData(this._query); // dry-run — confirms the query itself works

      this._caps = { available: true, koffiLoaded: true, gpuCounterFound: gpuFound, cpuCounterFound: cpuFound, reason: null };
    } catch (err) {
      this._caps = { available: false, koffiLoaded: true, gpuCounterFound: false, cpuCounterFound: false, reason: String(err && err.message || err) };
      this._query = null;
      this._gpuCounter = null;
      this._cpuCounter = null;
    }

    return this._caps;
  }

  getCapabilities() {
    return { ...this._caps };
  }

  _disable(reason) {
    this._caps = { ...this._caps, available: false, reason };
  }

  _readGpuArray() {
    const bufSize = [0];
    const itemCount = [0];
    let status = funcs.PdhGetFormattedCounterArrayW(this._gpuCounter, PDH_FMT_DOUBLE, bufSize, itemCount, null);
    if (u32(status) !== PDH_MORE_DATA && u32(status) !== 0) throw new Error('array probe 0x' + u32(status).toString(16));
    if (bufSize[0] === 0) return 0;

    const buffer = Buffer.alloc(bufSize[0]);
    status = funcs.PdhGetFormattedCounterArrayW(this._gpuCounter, PDH_FMT_DOUBLE, bufSize, itemCount, buffer);
    if (u32(status) !== 0) throw new Error('array fetch 0x' + u32(status).toString(16));

    const items = koffi.decode(buffer, koffi.array(types.PDH_FMT_COUNTERVALUE_ITEM_W, itemCount[0]));
    const sum = _sumEngineType(items, '3D');
    return sum === null ? null : Math.max(0, Math.min(100, sum));
  }

  _readCpuValue() {
    const valueOut = {};
    const status = funcs.PdhGetFormattedCounterValue(this._cpuCounter, PDH_FMT_DOUBLE, null, valueOut);
    if (u32(status) !== 0 || !valueOut || valueOut.CStatus !== 0) return null;
    return Math.max(0, Math.min(100, valueOut.doubleValue));
  }

  // Single collection point per call — both readings come from the same sample,
  // and this must be called at most once per polling tick. PDH rate counters need
  // two samples to settle; the caller's own polling cadence (~2s) supplies that gap.
  async getMetrics() {
    if (!this._probed) this.probe();
    if (!this._caps.available) return { gpu: null, cpu: null };

    try {
      const status = funcs.PdhCollectQueryData(this._query);
      if (u32(status) !== 0) return { gpu: null, cpu: null };
    } catch (err) {
      this._disable('collect_failed: ' + String(err && err.message || err));
      return { gpu: null, cpu: null };
    }

    let gpu = null;
    if (this._caps.gpuCounterFound) {
      try { gpu = this._readGpuArray(); }
      catch (err) { this._caps = { ...this._caps, gpuCounterFound: false, reason: 'gpu_read_failed: ' + String(err && err.message || err) }; }
    }

    let cpu = null;
    if (this._caps.cpuCounterFound) {
      try { cpu = this._readCpuValue(); }
      catch (err) { this._caps = { ...this._caps, cpuCounterFound: false, reason: 'cpu_read_failed: ' + String(err && err.message || err) }; }
    }

    return { gpu, cpu };
  }

  async getGpuUtilization() {
    const { gpu } = await this.getMetrics();
    return gpu;
  }

  close() {
    try { if (this._query && funcs) funcs.PdhCloseQuery(this._query); } catch (_) { /* best-effort */ }
    this._query = null;
  }
}

module.exports = NativeTelemetry;
module.exports._sumEngineType = _sumEngineType;
