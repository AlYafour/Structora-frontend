import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Language and directionality detection hook
 * Replaces duplicate language detection logic across 30+ files
 *
 * @returns {Object} Language state and utilities
 *
 * @example
 * const { isArabic, isRTL, language, dir } = useLanguage();
 *
 * // Conditional rendering
 * {isArabic ? 'Hello (Arabic)' : 'Hello'}
 *
 * // RTL layout
 * <div dir={dir} className={isRTL ? 'rtl' : 'ltr'}>
 *
 * // Formatting
 * formatDate(date, language)
 */
export function useLanguage() {
  const { i18n } = useTranslation();

  const language = useMemo(() => {
    return i18n.language || 'en';
  }, [i18n.language]);

  const isArabic = useMemo(() => {
    return /^ar\b/i.test(language);
  }, [language]);

  const isRTL = useMemo(() => {
    // Right-to-left languages: Arabic, Hebrew, Urdu, etc.
    return /^(ar|he|ur|fa|yi)\b/i.test(language);
  }, [language]);

  const dir = useMemo(() => {
    return isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  const languageCode = useMemo(() => {
    // Extract base language code (e.g., 'en' from 'en-US')
    return language.split('-')[0];
  }, [language]);

  return {
    // Primary state
    language,
    languageCode,
    isArabic,
    isRTL,
    dir,

    // Utilities
    isEnglish: !isArabic,
    isLTR: !isRTL,

    // Helper functions
    t: i18n.t,
    changeLanguage: i18n.changeLanguage,
  };
}

export default useLanguage;
