import { createContext, useContext, useState, useCallback, useMemo, useRef } from "react";

const ValidationContext = createContext(null);

export function ValidationProvider({ children }) {
  const [documentIssues, setDocumentIssues] = useState(null);
  const [fieldIssues, setFieldIssues] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const prevErrorSigRef = useRef(null);

  const validationIssues = useMemo(() => {
    const all = [...(documentIssues || []), ...(fieldIssues || [])];
    return all.length > 0 ? all : null;
  }, [documentIssues, fieldIssues]);

  // Called by document validation — replaces doc issues, auto-opens popup only for new errors
  const pushValidationResults = useCallback((issues) => {
    const list = issues?.length > 0 ? issues : null;
    setDocumentIssues(list);
    const errorSig = (list || [])
      .filter(i => i.severity === "error")
      .map(i => i.code)
      .sort()
      .join(",");
    if (errorSig && errorSig !== prevErrorSigRef.current) {
      setPopupOpen(true);
    }
    prevErrorSigRef.current = errorSig || null;
  }, []);

  // Called by field validation on step save — replaces field issues, never auto-opens popup
  const pushFieldIssues = useCallback((issues) => {
    setFieldIssues(issues?.length > 0 ? issues : null);
  }, []);

  const clearValidationResults = useCallback(() => {
    setDocumentIssues(null);
    setFieldIssues(null);
    prevErrorSigRef.current = null;
  }, []);

  const closePopup = useCallback(() => setPopupOpen(false), []);
  const openPopup  = useCallback(() => setPopupOpen(true),  []);

  return (
    <ValidationContext.Provider value={{
      validationIssues,
      pushValidationResults,
      pushFieldIssues,
      clearValidationResults,
      popupOpen,
      openPopup,
      closePopup,
    }}>
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  return useContext(ValidationContext);
}
