import { createContext, useContext, useState, useCallback } from 'react';

const VAT_KEY = 'vat_display_mode'; // localStorage key

const VatDisplayContext = createContext({
  showWithVat: false,
  toggle: () => {},
});

export function VatDisplayProvider({ children }) {
  const [showWithVat, setShowWithVat] = useState(() => {
    try { return localStorage.getItem(VAT_KEY) === 'true'; }
    catch { return false; }
  });

  const toggle = useCallback(() => {
    setShowWithVat(prev => {
      const next = !prev;
      try { localStorage.setItem(VAT_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <VatDisplayContext.Provider value={{ showWithVat, toggle }}>
      {children}
    </VatDisplayContext.Provider>
  );
}

export function useVatDisplay() {
  return useContext(VatDisplayContext);
}
