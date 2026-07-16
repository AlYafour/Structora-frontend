// Cross-tab coordinated JWT refresh.
//
// The backend rotates + immediately blacklists the refresh token on every
// use (SIMPLE_JWT.ROTATE_REFRESH_TOKENS / BLACKLIST_AFTER_ROTATION). Without
// coordination, two tabs (or a background poller and an active tab) can both
// hit /auth/token/refresh/ around the same moment using the same still-valid
// refresh cookie; only the first succeeds and the second gets rejected,
// which today triggers a destructive logout in a tab the user may be
// actively working in. This module ensures only one tab actually performs
// the network call at a time, using the Web Locks API (native, cross-tab,
// same-origin) with a localStorage-based fallback for older browsers.
import axios from "axios";

const LOCK_NAME = "structora-token-refresh";
const LAST_REFRESH_KEY = "structora_last_refresh_at";
const RECENT_REFRESH_WINDOW_MS = 4000;

const FALLBACK_LOCK_KEY = "structora_refresh_lock";
const FALLBACK_LOCK_TTL_MS = 5000;
const FALLBACK_POLL_INTERVAL_MS = 100;
const FALLBACK_POLL_DEADLINE_MS = 3000;

function recentlyRefreshedSince(thresholdTs) {
  const last = Number(localStorage.getItem(LAST_REFRESH_KEY) || 0);
  return last > thresholdTs;
}

async function doRefreshCall(API_BASE_URL) {
  await axios.post(`${API_BASE_URL}auth/token/refresh/`, {}, { withCredentials: true });
  localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Best-effort leader election for browsers without navigator.locks.
// Not a perfect mutex, but collapses the overwhelming majority of
// same-browser races on the rare unsupported browser/webview.
async function fallbackLockedRefresh(startedAt, API_BASE_URL) {
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + FALLBACK_POLL_DEADLINE_MS;

  while (Date.now() < deadline) {
    if (recentlyRefreshedSince(startedAt - RECENT_REFRESH_WINDOW_MS)) return;

    const rawLock = localStorage.getItem(FALLBACK_LOCK_KEY);
    const lock = rawLock ? JSON.parse(rawLock) : null;
    const lockIsStale = !lock || Date.now() - lock.ts > FALLBACK_LOCK_TTL_MS;

    if (lockIsStale) {
      localStorage.setItem(FALLBACK_LOCK_KEY, JSON.stringify({ owner, ts: Date.now() }));
      // Re-read to confirm we actually won (best-effort — localStorage writes
      // across tabs aren't atomic, but this narrows the window significantly).
      await sleep(20);
      const confirm = JSON.parse(localStorage.getItem(FALLBACK_LOCK_KEY) || "null");
      if (confirm?.owner === owner) {
        try {
          if (!recentlyRefreshedSince(startedAt - RECENT_REFRESH_WINDOW_MS)) {
            await doRefreshCall(API_BASE_URL);
          }
        } finally {
          localStorage.removeItem(FALLBACK_LOCK_KEY);
        }
        return;
      }
    }

    await sleep(FALLBACK_POLL_INTERVAL_MS);
  }

  // Deadline exceeded — fall through and attempt the call directly rather
  // than hanging the caller forever.
  if (!recentlyRefreshedSince(startedAt - RECENT_REFRESH_WINDOW_MS)) {
    await doRefreshCall(API_BASE_URL);
  }
}

export async function refreshAccessTokenCoordinated(API_BASE_URL) {
  const startedAt = Date.now();

  // Fast path: another tab already refreshed moments ago.
  if (recentlyRefreshedSince(startedAt - RECENT_REFRESH_WINDOW_MS)) return;

  if (navigator.locks?.request) {
    return navigator.locks.request(LOCK_NAME, { mode: "exclusive" }, async () => {
      // Re-check inside the lock: whoever queued behind the lock holder
      // never needs to hit the network at all.
      if (recentlyRefreshedSince(startedAt - RECENT_REFRESH_WINDOW_MS)) return;
      await doRefreshCall(API_BASE_URL);
    });
  }

  return fallbackLockedRefresh(startedAt, API_BASE_URL);
}
