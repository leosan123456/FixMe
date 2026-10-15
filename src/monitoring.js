// One collection at a time, including when a renderer restarts monitoring.
class MonitoringLoop {
  constructor({ collect, publish, onError = () => {}, schedule = setTimeout, cancel = clearTimeout }) {
    this.collect = collect;
    this.publish = publish;
    this.onError = onError;
    this.schedule = schedule;
    this.cancel = cancel;
    this.session = null;
    this.timer = null;
    this.inFlight = null;
  }

  start(sender, intervalMs = 2000) {
    if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs)) {
      throw new Error('Intervalo de monitoramento inválido');
    }
    if (sender.isDestroyed()) throw new Error('Janela de monitoramento indisponível');
    this.stop();
    const session = { sender, intervalMs: Math.max(1000, Math.min(60000, intervalMs)) };
    session.onDestroyed = () => { if (this.session === session) this.stop(); };
    this.session = session;
    sender.once('destroyed', session.onDestroyed);
    this._schedule(session);
  }

  stop() {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    if (this.session) this.session.sender.removeListener('destroyed', this.session.onDestroyed);
    this.session = null;
  }

  _active(session) {
    return this.session === session && !session.sender.isDestroyed();
  }

  _schedule(session) {
    if (!this._active(session)) return;
    this.timer = this.schedule(() => {
      this.timer = null;
      return this._poll(session);
    }, session.intervalMs);
  }

  async _poll(session) {
    // A stopped session may still be collecting. Wait for it before starting
    // the replacement, and discard its result instead of publishing stale data.
    if (this.inFlight) {
      try { await this.inFlight; } catch (_) {}
    }
    if (!this._active(session)) return;
    const collection = Promise.resolve().then(() => this.collect());
    this.inFlight = collection;
    try {
      const stats = await collection;
      if (this._active(session)) this.publish(stats, session.sender);
    } catch (err) {
      if (this._active(session)) this.onError(err);
    } finally {
      if (this.inFlight === collection) this.inFlight = null;
      this._schedule(session);
    }
  }
}

module.exports = MonitoringLoop;
