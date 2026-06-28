import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiZap } from "react-icons/fi";
import useTenantNavigate from "../../../hooks/useTenantNavigate";
import PageHeader from "../../../components/layout/PageHeader";
import WizardShell from "./components/WizardShell";
import Button from "../../../components/common/Button";
import { aiAssistantApi } from "../../ai-assistant/aiAssistantApi";
import FileUpload from "../../../components/file-upload/FileUpload";
import "./components/wizard.css";
import "./components/ProjectTypeSelector.css";
import "./AiUploadScreen.css";

function FileSlot({ label, required, file, onChange, disabled }) {
  const { t } = useTranslation();
  return (
    <div className="aus-file-slot">
      <div className="aus-file-label">
        <span className="aus-file-label__text">{label}</span>
        {required
          ? <span className="aus-badge aus-badge--required">{t("ai_assistant_required")}</span>
          : <span className="aus-badge aus-badge--optional">{t("ai_assistant_optional")}</span>
        }
      </div>
      <FileUpload
        value={file}
        onChange={onChange}
        accept="application/pdf,image/jpeg,image/png,image/webp"
        maxSizeMB={30}
        disabled={disabled}
        showPreview={false}
        label=""
      />
    </div>
  );
}

export default function AiUploadScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const isRTL = /^ar\b/i.test(i18n.language || "");
  const lang = isRTL ? "ar" : "en";

  const [files, setFiles] = useState({
    site_plan: null,
    owner_id: null,
    build_permit: null,
    contract: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canAnalyze = !!(files.site_plan && files.owner_id);

  const handleAnalyze = async () => {
    if (!canAnalyze || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await aiAssistantApi.createProject(files, lang);
      if (data.success && data.preview) {
        navigate("/wizard/new", { state: { aiPreviewData: data.preview, aiFiles: files, aiValidationIssues: data.validation_issues || [] } });
      } else {
        setError(data.error || t("ai_assistant_create_failed"));
      }
    } catch (err) {
      setError(err?.response?.data?.error || t("ai_assistant_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <PageHeader
        onBack={() => navigate("/wizard")}
        backLabel={t("back")}
        title={t("wizard_ai_upload_title")}
        className="wizard-page-header wizard-page-header--no-stepper"
      />

      <div className="wizard-content">
        <WizardShell
          footer={loading ? null : (
            <div className="wizard-actions-bar" dir={isRTL ? "rtl" : "ltr"}>
              <div className="wizard-actions-bar__inner">
                <span />
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="wizard-actions__btn-size"
                >
                  {t("wizard_ai_upload_analyze")}
                </Button>
              </div>
            </div>
          )}
        >
          {loading ? (
            <div className="aus-processing" dir={isRTL ? "rtl" : "ltr"}>
              <div className="aus-processing__star">✦</div>
              <h3 className="aus-processing__title">
                {isRTL ? "جارٍ إنشاء المشروع بالذكاء الاصطناعي..." : "AI Project Creation in Progress..."}
              </h3>
              <p className="aus-processing__sub">
                {isRTL
                  ? "يقوم الذكاء الاصطناعي بقراءة مستنداتك واستخراج بيانات المشروع، يرجى الانتظار"
                  : "AI is reading your documents and extracting project data, please wait"}
              </p>
              <div className="aus-processing__dots">
                <span /><span /><span />
              </div>
            </div>
          ) : (
            <div className="pts-container" dir={isRTL ? "rtl" : "ltr"}>
              <div className="pts-header">
                <div style={{ fontSize: "2rem", lineHeight: 1 }}>✦</div>
                <p className="pts-subtitle">{t("wizard_ai_upload_subtitle")}</p>
              </div>

              <div className="pts-ai-search">
                <div className="pts-ai-search__label">
                  <FiZap size={14} className="pts-ai-search__zap" />
                  {isRTL ? "وثائق المشروع" : "Project Documents"}
                </div>

                <div className="aus-files-grid">
                  <FileSlot
                    label={t("ai_assistant_file_site_plan")}
                    required
                    file={files.site_plan}
                    onChange={(f) => setFiles(p => ({ ...p, site_plan: f }))}
                  />
                  <FileSlot
                    label={t("ai_assistant_file_owner_id")}
                    required
                    file={files.owner_id}
                    onChange={(f) => setFiles(p => ({ ...p, owner_id: f }))}
                  />
                  <FileSlot
                    label={t("ai_assistant_file_contract")}
                    required={false}
                    file={files.contract}
                    onChange={(f) => setFiles(p => ({ ...p, contract: f }))}
                  />
                  <FileSlot
                    label={t("ai_assistant_file_build_permit")}
                    required={false}
                    file={files.build_permit}
                    onChange={(f) => setFiles(p => ({ ...p, build_permit: f }))}
                  />
                </div>
              </div>

              {error && <div className="pts-ai-search__error">{error}</div>}
            </div>
          )}
        </WizardShell>
      </div>
    </div>
  );
}
