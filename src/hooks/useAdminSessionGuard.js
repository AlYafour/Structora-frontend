import { useEffect, useRef, useCallback } from 'react';

const ADMIN_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];
const SESSION_KEY = 'admin_last_activity';

/**
 * Admin session guard hook.
 * - Tracks user activity and logs out after 30 min idle
 * - Only active when user is a superuser on admin routes
 */
export default function useAdminSessionGuard(user, logout) {
  const timerRef = useRef(null);
  const isAdmin = user?.is_superuser && window.location.pathname.startsWith('/admin');

  const resetTimer = useCallback(() => {
    if (!isAdmin) return;

    // Record activity timestamp
    sessionStorage.setItem(SESSION_KEY, Date.now().toString());

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Session expired — force logout
      sessionStorage.removeItem(SESSION_KEY);
      logout();
    }, ADMIN_IDLE_TIMEOUT);
  }, [isAdmin, logout]);

  useEffect(() => {
    if (!isAdmin) return;

    // Check if session has already expired (e.g., tab was backgrounded)
    const lastActivity = sessionStorage.getItem(SESSION_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > ADMIN_IDLE_TIMEOUT) {
        sessionStorage.removeItem(SESSION_KEY);
        logout();
        return;
      }
    }

    // Start tracking
    resetTimer();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [isAdmin, resetTimer, logout]);
}
