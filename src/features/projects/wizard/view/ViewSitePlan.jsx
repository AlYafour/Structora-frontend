import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import useProject from "../../../../hooks/useProject";
import SitePlanStep from "../steps/SitePlanStep";

export default function ViewSitePlan() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const { project, loading } = useProject(projectId);

  const setup = useMemo(() => ({
    projectType: project?.project_type || "",
    contractType: project?.contract_type || "",
  }), [project]);

  return (
    <PageLayout loading={loading}>
      <div className="container">
        <ViewPageHeader title={t("view_site_plan_title")} projectId={projectId} />
        {!loading && (
          <div className="mt-12">
            <SitePlanStep projectId={projectId} setup={setup} onPrev={null} onNext={null} isView={true} />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
