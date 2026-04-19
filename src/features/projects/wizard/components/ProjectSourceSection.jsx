import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FormField,
  FormTextarea,
  FormViewField,
} from "../../../../components/ui/form";
import { api } from "../../../../services/api";
import CollapsibleSection from "./CollapsibleSection";

/**
 * ProjectSourceSection Component
 *
 * Displays and edits the project source information with real-time
 * AI translation (Arabic → English).
 */
export default function ProjectSourceSection({ form, setF, viewMode }) {
  const { t } = useTranslation();
  const [translating, setTranslating] = useState(false);
  const debounceRef = useRef(null);

  // Detect if text contains Arabic characters
  const hasArabic = (text) => /[\u0600-\u06FF]/.test(text);

  // Debounced translation
  const translateText = useCallback(async (text) => {
    if (!text.trim() || !hasArabic(text)) {
      setF("source_of_project_en", "");
      return;
    }

    setTranslating(true);
    try {
      const { data } = await api.post("translate/", {
        text,
        source: "ar",
        target: "en",
      });
      if (data?.translated) {
        setF("source_of_project_en", data.translated);
      }
    } catch {
      // Silently fail — translation is a nice-to-have
    } finally {
      setTranslating(false);
    }
  }, [setF]);

  const handleChange = (e) => {
    const text = e.target.value;
    setF("source_of_project", text);

    // Debounce translation: wait 800ms after user stops typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      translateText(text);
    }, 800);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <CollapsibleSection title={t("project_source")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}>
      {viewMode ? (
        <div className="wizard-source-view">
          <FormViewField value={form.source_of_project} label={t("arabic")} />
          {form.source_of_project_en && (
            <FormViewField value={form.source_of_project_en} label={t("english")} />
          )}
        </div>
      ) : (
        <div className="wizard-source-card">
          {/* Arabic side */}
          <div className="wizard-source-pane wizard-source-pane--ar">
            <div className="wizard-source-pane__header">
              <span className="wizard-source-pane__lang">ع</span>
              <span className="wizard-source-pane__label">{t("arabic")}</span>
            </div>
            <textarea
              className="wizard-source-pane__input"
              rows={4}
              value={form.source_of_project || ""}
              onChange={handleChange}
              placeholder={t("project_source_placeholder")}
              dir="rtl"
            />
          </div>

          {/* Divider */}
          <div className="wizard-source-divider" />

          {/* English side */}
          <div className="wizard-source-pane wizard-source-pane--en">
            <div className="wizard-source-pane__header">
              <span className="wizard-source-pane__lang">EN</span>
              <span className="wizard-source-pane__label">
                {translating ? (
                  <span className="wizard-source-pane__translating">
                    <span className="wizard-source-pane__dot" />
                    {t("translating")}...
                  </span>
                ) : t("english")}
              </span>
            </div>
            <textarea
              className="wizard-source-pane__input"
              rows={4}
              value={form.source_of_project_en || ""}
              onChange={(e) => setF("source_of_project_en", e.target.value)}
              placeholder={t("auto_translated_english")}
              dir="ltr"
            />
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
