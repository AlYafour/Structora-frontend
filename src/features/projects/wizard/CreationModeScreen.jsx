import { useTranslation } from "react-i18next";
import { FiCheck } from "react-icons/fi";
import useTenantNavigate from "../../../hooks/useTenantNavigate";
import PageHeader from "../../../components/layout/PageHeader";
import WizardShell from "./components/WizardShell";
import "./components/wizard.css";
import "./components/ProjectTypeSelector.css";

export default function CreationModeScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const isRTL = /^ar\b/i.test(i18n.language || "");

  const goTo = (path) => navigate(path);

  return (
    <div className="container">
      <PageHeader
        onBack={() => navigate("/projects")}
        backLabel={t("wizard.back_to_projects")}
        title={t("wizard_creation_mode_title")}
        className="wizard-page-header wizard-page-header--no-stepper"
      />

      <div className="wizard-content">
        <WizardShell>
          <div className="pts-container" dir={isRTL ? "rtl" : "ltr"}>
            <div className="pts-header">
              <p className="pts-subtitle">{t("wizard_creation_mode_subtitle")}</p>
            </div>

            <div className="pts-choice-box">
              {/* Manual creation */}
              <div
                className="pts-choice"
                role="button"
                tabIndex={0}
                onClick={() => goTo("/wizard/new")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goTo("/wizard/new");
                  }
                }}
              >
                <div className="pts-choice__check"><FiCheck size={12} /></div>
                <div className="pts-choice__icon">
                  <span style={{ fontSize: "1.4rem" }}>✏️</span>
                </div>
                <div className="pts-choice__label">{t("wizard_creation_mode_manual")}</div>
                <div className="pts-choice__desc">{t("wizard_creation_mode_manual_desc")}</div>
              </div>

              {/* AI creation */}
              <div
                className="pts-choice"
                role="button"
                tabIndex={0}
                onClick={() => goTo("/wizard/ai")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goTo("/wizard/ai");
                  }
                }}
              >
                <div className="pts-choice__check"><FiCheck size={12} /></div>
                <div className="pts-choice__icon">
                  <span style={{ fontSize: "1.4rem" }}>✦</span>
                </div>
                <div style={{ marginBottom: "4px" }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    color: "var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    borderRadius: "6px",
                    padding: "2px 8px",
                  }}>
                    {t("wizard_creation_mode_ai_badge")}
                  </span>
                </div>
                <div className="pts-choice__label">{t("wizard_creation_mode_ai")}</div>
                <div className="pts-choice__desc">{t("wizard_creation_mode_ai_desc")}</div>
              </div>
            </div>
          </div>
        </WizardShell>
      </div>
    </div>
  );
}
