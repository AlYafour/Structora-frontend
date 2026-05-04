import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// English translations
import enCommon from '../locales/en/common.json';
import enErrors from '../locales/en/errors.json';
import enProjects from '../locales/en/projects.json';
import enPayments from '../locales/en/payments.json';
import enInvoices from '../locales/en/invoices.json';
import enVariations from '../locales/en/variations.json';
import enForms from '../locales/en/forms.json';

// Arabic translations
import arCommon from '../locales/ar/common.json';
import arErrors from '../locales/ar/errors.json';
import arProjects from '../locales/ar/projects.json';
import arPayments from '../locales/ar/payments.json';
import arInvoices from '../locales/ar/invoices.json';
import arVariations from '../locales/ar/variations.json';
import arForms from '../locales/ar/forms.json';

const resources = {
  en: {
    translation: {
      ...enCommon, ...enErrors, ...enProjects,
      ...enPayments, ...enInvoices, ...enVariations, ...enForms
    }
  },
  ar: {
    translation: {
      ...arCommon, ...arErrors, ...arProjects,
      ...arPayments, ...arInvoices, ...arVariations, ...arForms
    }
  }
};

// Retrieve saved language from localStorage
const getStoredLanguage = () => {
  try {
    const stored = localStorage.getItem("app_language");
    // Verify the saved language is valid (ar or en)
    if (stored === "ar" || stored === "en") {
      return stored;
    }
  } catch {
    /* localStorage may be unavailable in private browsing */
  }
  return null;
};

// Save language to localStorage
const saveLanguage = (language) => {
  try {
    localStorage.setItem("app_language", language);
  } catch {
    /* localStorage may be unavailable in private browsing */
  }
};

const getInitialLanguage = () => {
  // 1. Most recent explicit user selection wins (set on every language change)
  const storedLanguage = getStoredLanguage();
  if (storedLanguage) {
    return storedLanguage;
  }

  // 2. Fallback: user profile preference (may come from backend on login)
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.preferred_language === 'ar' || user?.preferred_language === 'en') {
        return user.preferred_language;
      }
    }
  } catch {
    // silent
  }

  // 3. Default: Arabic
  return "ar";
};

const defaultLanguage = getInitialLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Set page direction based on language (supports ar / ar-AE / ar-SA ...)
export function applyDir(lang) {
  const isRTL = /^ar\b/i.test(lang || "");
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
}

// Apply direction on load
applyDir(i18n.language);

i18n.on("languageChanged", async (language) => {
  // 1. Always persist the selection immediately
  saveLanguage(language);
  applyDir(language);

  // 2. Sync to user object in localStorage + backend if logged in
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      user.preferred_language = language;
      localStorage.setItem('user', JSON.stringify(user));

      // Update in backend (async - don't wait)
      try {
        const { api } = await import('../services/api');
        await api.patch('auth/users/update_profile/', { preferred_language: language });
      } catch {
        // Silent fail - don't disrupt the user experience
      }
    }
  } catch {
    // Silent fail
  }
});

export default i18n;
