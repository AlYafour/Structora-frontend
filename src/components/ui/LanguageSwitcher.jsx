import { useTranslation } from "react-i18next";
import { FaGlobe } from "react-icons/fa";
import Button from "../common/Button";
import { api } from "../../services/api";
import { isLoggedIn } from "../../utils/cookies";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === "ar";

  const toggle = async () => {
    const newLanguage = isRTL ? "en" : "ar";

    try {
      if (isLoggedIn()) {
        // Update in Backend (async - don't wait)
        api.patch('auth/users/update_profile/', { preferred_language: newLanguage }).catch(() => {
          // Silent fail - don't disrupt user experience
        });
      }
    } catch (e) {
      // Silent fail
    }

    i18n.changeLanguage(newLanguage);
  };

  return (
    <Button
      variant="secondary"
      onClick={toggle}
      title={t("language_switch_title")}
      className="navbar-btn"
    >
      <FaGlobe className="ds-me-2" />
      {t("language")}
    </Button>
  );
}
