import { useState, useCallback } from "react";

/**
 * Shared save state for wizard steps.
 * Handles isSaving, errorMsg, and wraps an async save function
 * so each step doesn't repeat the same try/catch/finally boilerplate.
 *
 * Usage:
 *   const { isSaving, errorMsg, setErrorMsg, runSave } = useStepSave();
 *   const handleSave = () => runSave(async () => {
 *     const payload = buildPayload();
 *     await api.post(..., payload);
 *   }, formatError);
 */
export default function useStepSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /**
   * Wraps an async operation with save state management.
   * @param {() => Promise<void>} fn - The async save function
   * @param {(err: any) => string} [formatError] - Optional error formatter; defaults to err.message
   */
  const runSave = useCallback(async (fn, formatError) => {
    setIsSaving(true);
    setErrorMsg("");
    try {
      await fn();
      setErrorMsg("");
    } catch (err) {
      const msg = formatError ? formatError(err) : (err?.message || "");
      setErrorMsg(msg);
      throw err; // re-throw so callers can handle if needed
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { isSaving, errorMsg, setErrorMsg, runSave };
}
