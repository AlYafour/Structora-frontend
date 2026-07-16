// Minimal pub/sub for the auth session lifecycle, mirroring toastEmitter.js.
// Kept separate from toastEmitter because a session-expiry needs to drive a
// persistent modal + navigation decision, not an auto-hiding toast.
const listeners = new Set();

export const sessionEmitter = {
  emit(payload) {
    listeners.forEach((fn) => fn(payload));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
