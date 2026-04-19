/**
 * ViewPageHeader - Wrapper around PageHeader for project view pages
 * Provides back-to-project navigation and optional wizard link
 */
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import PageHeader from "../layout/PageHeader";
import Button from "../common/Button";
import useTenantNavigate from '../../hooks/useTenantNavigate';

export default function ViewPageHeader({
  title,
  projectId,
  showWizard = true,
  backLabel,
  backTo = null,
}) {
  const navigate = useTenantNavigate();
  const { t } = useTranslation();
  const backPath = backTo || `/projects/${projectId}`;

  const actions = showWizard ? (
    <Button as={Link} to={`/projects/${projectId}/wizard`} size="sm">
      {t("open_wizard")}
    </Button>
  ) : null;

  return (
    <PageHeader
      title={title}
      onBack={() => navigate(backPath)}
      backLabel={backLabel || (t("project_dashboard"))}
      actions={actions}
    />
  );
}
