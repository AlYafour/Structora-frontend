import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { projectApi } from "../../../../services/projects";
import { logger } from "../../../../utils/logger";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import ContractExtension from "../../wizard/components/ContractExtension";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

export default function ViewExtensionsPage() {
 const { projectId } = useParams();
 const { t } = useTranslation();
 const navigate = useTenantNavigate();
 const [loading, setLoading] = useState(true);
 const [extensions, setExtensions] = useState([]);

 useEffect(() => {
 loadData();
 }, [projectId]);

 const loadData = async () => {
 try {
 const raw = await projectApi.getStartOrder(projectId);
 // API returns array for list endpoint; extract first item
 const data = Array.isArray(raw) && raw.length ? raw[0] : raw;
 if (data?.extensions && Array.isArray(data.extensions) && data.extensions.length > 0) {
 setExtensions(data.extensions);
 }
 } catch (err) {
 logger.debug("ViewExtensionsPage: load failed", err);
 } finally {
 setLoading(false);
 }
 };

 if (!loading && extensions.length === 0) {
 navigate(`/projects/${projectId}?tab=extensions`, { replace: true });
 return null;
 }

 return (
 <PageLayout loading={loading} loadingText={t("loading")}>
 <div className="container ds-page-narrow">
 <ViewPageHeader
 title={t("view_extensions")}
 projectId={projectId}
 showWizard={false}
 backLabel={t("back")}
 backTo={`/projects/${projectId}?tab=extensions`}
 />
 {extensions.length > 0 && (
 <div className="card ds-mt-4">
 <div className="card__header">
 {t("extensions_details")}
 </div>
 <div className="card__body">
 <div className="prj-view-grid-row">
 {extensions.map((ext, idx) => (
 <ContractExtension
 key={ext.id || idx}
 extension={ext}
 index={idx}
 extensionIndex={idx}
 isView={true}
 onUpdate={() => {}}
 onRemove={() => {}}
 canRemove={false}
 projectId={projectId}
 />
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 </PageLayout>
 );
}
