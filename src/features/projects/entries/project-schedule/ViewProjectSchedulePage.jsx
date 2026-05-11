import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { projectApi } from "../../../../services/projects";
import { logger } from "../../../../utils/logger";
import { formatDate } from "../../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

export default function ViewProjectSchedulePage() {
 const { projectId } = useParams();
 const { t } = useTranslation();
 const navigate = useTenantNavigate();
 const [loading, setLoading] = useState(true);
 const [data, setData] = useState(null);

 useEffect(() => {
 loadData();
 }, [projectId]);

 const loadData = async () => {
  try {
    const result = await projectApi.getProjectSchedule(projectId);

    const item = Array.isArray(result) ? result[0] : result;

    setData(item || null);
  } catch (err) {
    logger.debug("ViewProjectSchedulePage: load failed", err);
    setData(null);
  } finally {
    setLoading(false);
  }
};

 if (!loading && !data) {
 navigate(`/projects/${projectId}?tab=project_schedule`, { replace: true });
 return null;
 }

 return (
 <PageLayout loading={loading} loadingText={t("loading")}>
 <div className="container ds-page-narrow">
 <ViewPageHeader
 title={t("view_project_schedule")}
 projectId={projectId}
 showWizard={false}
 backLabel={t("back")}
 backTo={`/projects/${projectId}?tab=project_schedule`}
 />
 {data && (
 <div className="card ds-mt-4">
 <div className="card__header">
 {t("project_schedule_details")}
 </div>
 <div className="card__body">
 <div className="prj-info-grid">
 {data.project_start_date && (
 <div className="prj-info-item">
 <div className="prj-info-label">{t("project_start_date")}</div>
 <div className="prj-info-value">{formatDate(data.project_start_date)}</div>
 </div>
 )}
 {data.project_end_date && (
 <div className="prj-info-item">
 <div className="prj-info-label">{t("project_end_date")}</div>
 <div className="prj-info-value">{formatDate(data.project_end_date)}</div>
 </div>
 )}
 {data.schedule_file && (
 <div className="prj-info-item prj-info-item--wide">
 <div className="prj-info-label">{t("schedule_file")}</div>
 <div className="prj-info-value">
 <FileAttachmentView
 fileUrl={data.schedule_file}
 fileName={data.schedule_file_name || extractFileNameFromUrl(data.schedule_file)}
 projectId={projectId}
 endpoint={`projects/${projectId}/project-schedule/`}
 />
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 </PageLayout>
 );
}
