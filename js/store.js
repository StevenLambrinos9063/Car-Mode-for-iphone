// localStorage wrapper that never throws (private mode, blocked storage).
const P = 'cm.';

export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(P + key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(P + key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  remove(key) {
    try { localStorage.removeItem(P + key); } catch { /* ignore */ }
  },
};
