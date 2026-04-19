import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { api } from "../../../../services/api";
import { formatDate } from "../../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import { logger } from "../../../../utils/logger";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

export default function ViewAwardingPage() {
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
 const response = await api.get(`projects/${projectId}/awarding/`);
 if (Array.isArray(response.data) && response.data.length) {
 setData(response.data[0]);
 }
 } catch (e) {
 if (e?.response?.status !== 404) {
 logger.error("Error loading awarding", e);
 }
 } finally {
 setLoading(false);
 }
 };

 if (!loading && !data) {
 navigate(`/projects/${projectId}?tab=awarding`, { replace: true });
 return null;
 }

 return (
 <PageLayout loading={loading} loadingText={t("loading")}>
 <div className="container ds-page-narrow">
 <ViewPageHeader
 title={t("view_awarding")}
 projectId={projectId}
 showWizard={false}
 backLabel={t("back")}
 backTo={`/projects/${projectId}?tab=awarding`}
 />
 {data && (
 <div className="card ds-mt-4">
 <div className="card__header">
 {t("awarding_details")}
 </div>
 <div className="card__body">
 <div className="prj-info-grid">
 {data.award_date && (
 <div className="prj-info-item">
 <div className="prj-info-label">{t("award_date")}</div>
 <div className="prj-info-value">{formatDate(data.award_date)}</div>
 </div>
 )}
 {data.project_number && (
 <div className="prj-info-item">
 <div className="prj-info-label">{t("project_number")}</div>
 <div className="prj-info-value">{data.project_number}</div>
 </div>
 )}
 {data.consultant_registration_number && (
 <div className="prj-info-item">
 <div className="prj-info-label">{t("consultant_registration_number")}</div>
 <div className="prj-info-value">{data.consultant_registration_number}</div>
 </div>
 )}
 {data.contractor_registration_number && (
 <div className="prj-info-item">
 <div className="prj-info-label">{t("contractor_registration_number")}</div>
 <div className="prj-info-value">{data.contractor_registration_number}</div>
 </div>
 )}
 {data.awarding_file && (
 <div className="prj-info-item prj-info-item--wide">
 <div className="prj-info-label">{t("awarding_file")}</div>
 <div className="prj-info-value">
 <FileAttachmentView
 fileUrl={data.awarding_file}
 fileName={data.awarding_file_name || extractFileNameFromUrl(data.awarding_file)}
 projectId={projectId}
 endpoint={`projects/${projectId}/awarding/`}
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
