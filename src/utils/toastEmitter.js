// Cross-module event bridge: allows non-React code (api.js, logger.js)
// to trigger toast notifications in the React NotificationContext.
const listeners = new Set();

export const toastEmitter = {
  emit(type, message) {
    listeners.forEach(fn => fn({ type, message }));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
