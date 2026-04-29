import { useTranslation } from "react-i18next";
import PageHeader from "../layout/PageHeader";
import Button from "./Button";
import './FinancialActionBar.css';

/**
 * FinancialActionBar - Action bar for create/edit financial pages
 * Delegates to the unified PageHeader component
 */
export default function FinancialActionBar({
  onBack,
  onSave,
  saveLabel,
  backLabel,
  saving = false,
  saveDisabled = false,
  showBack = true,
  showSave = true,
  formId,
  className = "",
  title,
  subtitle,
  children,
}) {
  const { t } = useTranslation();

  const defaultSaveLabel = saveLabel || (saving ? (t("saving")) : (t("save")));

  const saveButton = showSave ? (
    <Button
      type={formId ? "submit" : "button"}
      form={formId}
      variant="primary"
      disabled={saveDisabled || saving}
      loading={saving}
      size="sm"
      onClick={formId ? undefined : onSave}
    >
      {defaultSaveLabel}
    </Button>
  ) : null;

  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      onBack={showBack ? onBack : undefined}
      backLabel={backLabel}
      actions={saveButton}
      className={className}
    >
      {children}
    </PageHeader>
  );
}
