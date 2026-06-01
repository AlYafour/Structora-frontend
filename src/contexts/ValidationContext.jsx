import { createContext, useContext, useState, useCallback } from "react";

const ValidationContext = createContext(null);

export function ValidationProvider({ children }) {
  const [validationIssues, setValidationIssues] = useState(null);

  const pushValidationResults = useCallback((issues) => {
    setValidationIssues(issues && issues.length > 0 ? issues : null);
  }, []);

  const clearValidationResults = useCallback(() => {
    setValidationIssues(null);
  }, []);

  return (
    <ValidationContext.Provider value={{ validationIssues, pushValidationResults, clearValidationResults }}>
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  return useContext(ValidationContext);
}
