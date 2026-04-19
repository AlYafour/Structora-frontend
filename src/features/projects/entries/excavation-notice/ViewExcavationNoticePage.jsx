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

export default function ViewExcavationNoticePage() {
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
 const result = await projectApi.getExcavationNotice(projectId);
 setData(result);
 } catch (err) {
 logger.debug("ViewExcavationNoticePage: load failed", err);
 } finally {
 setLoading(false);
 }
 };

 if (!loading && !data) {
 navigate(`/projects/${projectId}?tab=excavation_notice`, { replace: true });
 return null;
 }

 return (
 <PageLayout loading={loading} loadingText={t("loading")}>
 <div className="container ds-page-narrow">
 <ViewPageHeader
 title={t("view_excavation_notice")}
 projectId={projectId}
 showWizard={false}
 backLabel={t("back")}
 backTo={`/projects/${projectId}?tab=excavation_notice`}
 />
 {data && (
 <div className="card ds-mt-4">
 <div className="card__header">
 {t("excavation_notice_details")}
 </div>
 <div className="card__body">
 <div className="prj-info-grid">
 {data.notice_date && (
 <div className="prj-info-item">
 <div className="prj-info-label">{t("notice_date")}</div>
 <div className="prj-info-value">{formatDate(data.notice_date)}</div>
 </div>
 )}
 {data.notice_file && (
 <div className="prj-info-item prj-info-item--wide">
 <div className="prj-info-label">{t("notice_file")}</div>
 <div className="prj-info-value">
 <FileAttachmentView
 fileUrl={data.notice_file}
 fileName={data.notice_file_name || extractFileNameFromUrl(data.notice_file)}
 projectId={projectId}
 endpoint={`projects/${projectId}/excavation-notice/`}
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
