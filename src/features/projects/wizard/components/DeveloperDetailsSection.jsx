import { useTranslation } from "react-i18next";
import {
  FormField,
  FormGrid,
  FormInput,
  FormViewField,
} from "../../../../components/ui/form";
import CollapsibleSection from "./CollapsibleSection";

/**
 * DeveloperDetailsSection Component
 *
 * Displays and edits developer information (conditional on land_use === "Investment"):
 * - Developer name
 * - Project number (CR number)
 * - Project name (Developer's project name)
 *
 * @param {Object} props - Component props
 * @param {Object} props.form - Form data object containing developer details
 * @param {Function} props.setF - Function to update form fields
 * @param {boolean} props.viewMode - Whether the component is in view mode
 */
export default function DeveloperDetailsSection({ form, setF, viewMode }) {
  const { t } = useTranslation();

  // Developer labels with context
  const devParen = ` (${t("developer", "المطور")})`;
  const projectNoLabel = `${t("project_no")}${devParen}`;
  const projectNameLabel = `${t("project_name_f")}${devParen}`;

  // Only show section if land_use is Investment OR if viewing and developer data exists
  const shouldShow =
    form.land_use === "Investment" ||
    (viewMode && (form.developer_name || form.project_no || form.project_name));

  if (!shouldShow) {
    return null;
  }

  return (
    <CollapsibleSection title={t("developer_details")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}>
      {viewMode ? (
        <FormGrid cols={3}>
          {form.developer_name || form.project_no || form.project_name ? (
            <>
              {form.developer_name && (
                <FormViewField label={t("developer_name")} value={form.developer_name} />
              )}
              {form.project_no && (
                <FormViewField label={projectNoLabel} value={form.project_no} />
              )}
              {form.project_name && (
                <FormViewField label={projectNameLabel} value={form.project_name} />
              )}
            </>
          ) : (
            <div className="card text-center prj-muted p-20">
              {t("no_developer_data")}
            </div>
          )}
        </FormGrid>
      ) : (
        <FormGrid cols={3}>
          <FormField label={t("developer_name")}>
            <FormInput
              value={form.developer_name || ""}
              onChange={(e) => setF("developer_name", e.target.value)}
            />
          </FormField>
          <FormField label={projectNoLabel}>
            <FormInput
              type="text"
              value={form.project_no || ""}
              onChange={(e) => setF("project_no", e.target.value)}
            />
          </FormField>
          <FormField label={projectNameLabel}>
            <FormInput
              value={form.project_name || ""}
              onChange={(e) => setF("project_name", e.target.value)}
            />
          </FormField>
        </FormGrid>
      )}
    </CollapsibleSection>
  );
}
