// Owns the app-wide mutation lock. A timed-out UAC request is not cancellation.
class OptimizationRunner {
  constructor({ publish = () => {}, getExecutionState = () => ({}), now = Date.now, schedule = setInterval, cancel = clearInterval } = {}) {
    this.publish = publish;
    this.getExecutionState = getExecutionState;
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.state = null;
    this.timer = null;
    this.sequence = 0;
  }

  getState() { return this.state ? { ...this.state, elapsedMs: Math.max(0, (this.state.endedAt ?? this.now()) - this.state.startedAt) } : null; }
  _emit() { try { this.publish(this.getState()); } catch (_) { /* Closing a window must not interrupt execution. */ } }
  update(progress = {}) {
    if (!this.state?.active || this.state.status === 'blocked') return;
    for (const key of ['phase', 'step', 'total', 'label', 'message']) {
      if (progress[key] !== undefined) this.state[key] = progress[key];
    }
    this._emit();
  }
  _finish(status, message) {
    if (!this.state) return;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    Object.assign(this.state, { active: false, status, phase: 'finalizing', endedAt: this.now(), message });
    if (status === 'completed') this.state.step = this.state.total;
    this._emit();
  }
  executionSettled() {
    if (this.state?.status === 'blocked' && !this.getExecutionState().active) {
      this._finish('failed', 'A execução terminou após exceder o prazo. Confira o resultado antes de repetir o ajuste.');
    }
  }
  async run(operation, action) {
    this.executionSettled();
    if (this.state?.active || this.getExecutionState().active) {
      return { success: false, code: 'OPTIMIZATION_BUSY', error: 'Já existe um ajuste em execução. Aguarde a conclusão.', optimization: this.getState() };
    }
    this.state = { operationId: String(++this.sequence), operation, active: true, status: 'running', phase: 'preparing', step: 0, total: 1, label: '', startedAt: this.now() };
    this.timer = this.schedule(() => this._emit(), 1000);
    this.timer?.unref?.();
    this._emit();
    let result;
    try { result = await action(progress => this.update(progress)); }
    catch (error) { result = { success: false, code: error.code, error: error.message || String(error) }; }
    if (!result || typeof result.success !== 'boolean') result = { success: false, error: 'O ajuste não retornou um resultado válido.' };
    if (this.getExecutionState().active) {
      Object.assign(this.state, { status: 'blocked', phase: 'executing', message: result.error || 'Aguardando confirmação do processo elevado. Novos ajustes permanecem bloqueados.' });
      this._emit();
      return { ...result, success: false, code: result.code || 'ELEVATION_BLOCKED', optimization: this.getState() };
    }
    this._finish(result.success ? 'completed' : 'failed', result.error);
    return { ...result, operationId: this.state.operationId };
  }
}
module.exports = OptimizationRunner;
