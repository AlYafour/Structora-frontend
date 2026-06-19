import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTenantSlug } from '../hooks/useTenantNavigate';

const TabManagerContext = createContext(null);

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeTab(path, title = 'Loading...', titleAr = '') {
  return { id: makeId(), path, title, titleAr: titleAr || title };
}

function storageKey(slug) {
  return `structora_tabs__${slug}`;
}

export function TabManagerProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = useTenantSlug();

  const isTabSwitching = useRef(false);
  const initializedRef = useRef(false);

  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  // Load tabs from localStorage on first mount (once slug is available)
  useEffect(() => {
    if (!slug || initializedRef.current) return;
    initializedRef.current = true;

    const currentPath = location.pathname + location.search;
    try {
      const saved = localStorage.getItem(storageKey(slug));
      if (saved) {
        const { tabs: savedTabs, activeTabId: savedActiveId } = JSON.parse(saved);
        if (Array.isArray(savedTabs) && savedTabs.length > 0) {
          setTabs(savedTabs);
          setActiveTabId(savedActiveId || savedTabs[0].id);
          return;
        }
      }
    } catch {
      // Corrupted storage — fall through to create fresh tab
    }

    // No saved tabs — create one at the current location
    const firstTab = makeTab(currentPath);
    setTabs([firstTab]);
    setActiveTabId(firstTab.id);
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage whenever tabs or activeTabId change
  useEffect(() => {
    if (!slug || tabs.length === 0) return;
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify({ tabs, activeTabId }));
    } catch {
      // Storage quota exceeded — silently ignore
    }
  }, [tabs, activeTabId, slug]);

  // Track organic navigation — update active tab's stored path
  useEffect(() => {
    if (isTabSwitching.current) {
      isTabSwitching.current = false;
      return;
    }
    if (!activeTabId) return;
    const newPath = location.pathname + location.search;
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, path: newPath } : t
    ));
  }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = useCallback((id) => {
    setTabs(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      isTabSwitching.current = true;
      setActiveTabId(id);
      navigate(target.path);
      return prev;
    });
  }, [navigate]);

  const openTab = useCallback((path, title = 'New Tab', titleAr = '') => {
    setTabs(prev => {
      if (prev.length >= 10) return prev; // limit enforced by caller with toast
      const tab = makeTab(path, title, titleAr);
      isTabSwitching.current = true;
      setActiveTabId(tab.id);
      navigate(path);
      return [...prev, tab];
    });
  }, [navigate]);

  const openTabWithLimit = useCallback((path, title = 'New Tab', titleAr = '', showToast) => {
    setTabs(prev => {
      if (prev.length >= 10) {
        if (showToast) showToast();
        return prev;
      }
      const tab = makeTab(path, title, titleAr);
      isTabSwitching.current = true;
      setActiveTabId(tab.id);
      navigate(path);
      return [...prev, tab];
    });
  }, [navigate]);

  const closeTab = useCallback((id) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev; // always keep at least one
      const idx = prev.findIndex(t => t.id === id);
      if (idx === -1) return prev;
      const next = prev.filter(t => t.id !== id);

      setActiveTabId(current => {
        if (current !== id) return current;
        // Activate nearest tab
        const newActive = next[Math.max(0, idx - 1)];
        isTabSwitching.current = true;
        navigate(newActive.path);
        return newActive.id;
      });

      return next;
    });
  }, [navigate]);

  const updateTabTitle = useCallback((title, titleAr) => {
    if (!title) return;
    setActiveTabId(current => {
      setTabs(prev => prev.map(t =>
        t.id === current ? { ...t, title, titleAr: titleAr || title } : t
      ));
      return current;
    });
  }, []);

  const value = {
    tabs,
    activeTabId,
    openTab,
    openTabWithLimit,
    closeTab,
    switchTab,
    updateTabTitle,
    slug,
  };

  return (
    <TabManagerContext.Provider value={value}>
      {children}
    </TabManagerContext.Provider>
  );
}

export function useTabManager() {
  const ctx = useContext(TabManagerContext);
  if (!ctx) throw new Error('useTabManager must be used inside TabManagerProvider');
  return ctx;
}
