// src/pages/wizard/hooks/useWizardState.js
import { useEffect, useState } from "react";

const STORAGE_KEY = "wizard_setup_state_v1";

const DEFAULT_SETUP = {
  projectType: "",
  contractType: "",
  contractClassification: "",
  projectCategory: "",
  maintenanceType: "",
  internalCode: "",
  legacyCode: "",
  contractYear: new Date().getFullYear(),
  _classification: null,
};

export default function useWizardState() {
  const [setup, setSetup] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETUP, ...JSON.parse(saved) } : { ...DEFAULT_SETUP };
    } catch {
      return { ...DEFAULT_SETUP };
    }
  });

  useEffect(() => {
    try {
      // Exclude File objects from localStorage (not serializable)
      const { _projectImageFile, ...serializable } = setup;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch { /* localStorage write may fail in private browsing */ }
  }, [setup]);

  return { setup, setSetup };
}
