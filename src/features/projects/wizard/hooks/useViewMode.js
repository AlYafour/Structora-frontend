import { useState, useEffect } from "react";

/**
 * Shared view-mode logic for wizard steps.
 * Syncs local viewMode with either the prop driven by WizardPage
 * (isViewProp) or the fallback state coming from useWizardState (isViewState).
 *
 * @param {boolean|undefined} isViewProp  – value passed from parent (may be undefined)
 * @param {boolean}           isViewState – fallback from useWizardState
 * @param {function}          setIsView   – setter from useWizardState
 * @returns {[boolean, function]} [viewMode, updateViewMode]
 */
export default function useViewMode(isViewProp, isViewState, setIsView) {
  const [viewMode, setViewMode] = useState(() => {
    if (isViewProp !== undefined) return isViewProp === true;
    return isViewState === true;
  });

  useEffect(() => {
    if (isViewProp !== undefined) {
      setViewMode(isViewProp === true);
    } else {
      setViewMode(isViewState === true);
    }
  }, [isViewProp, isViewState]);

  const updateViewMode = (next) => {
    setViewMode(next);
    if (isViewProp === undefined) {
      setIsView(next);
    }
  };

  return [viewMode, updateViewMode];
}
