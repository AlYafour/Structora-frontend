import { useEffect } from 'react';
import { useTabManager } from '../contexts/TabManagerContext';

/**
 * Call this in any page component to set the active tab's title.
 * Re-fires whenever title changes (e.g. after async data loads).
 */
export function useTabTitle(title, titleAr) {
  const { updateTabTitle } = useTabManager();
  useEffect(() => {
    if (title) updateTabTitle(title, titleAr ?? title);
  }, [title, titleAr]); // eslint-disable-line react-hooks/exhaustive-deps
}
