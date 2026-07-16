import { useEffect } from "react";

// setInterval that pauses while the tab is hidden and stops entirely when
// disabled (e.g. logged out). Background tabs no longer keep hammering
// protected endpoints with a stale/expired session, which was a major
// contributor to cross-tab token-refresh races.
export default function useVisibilityPolling(pollFn, intervalMs, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    let intervalId = null;

    const start = () => {
      if (!intervalId) intervalId = setInterval(pollFn, intervalMs);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    if (document.visibilityState === "visible") start();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollFn();
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [pollFn, intervalMs, enabled]);
}
