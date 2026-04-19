import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { projectApi } from "../../../../services/projects";
import { logger } from "../../../../utils/logger";
import { formatDate } from "../../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import PageLayout from "../../../../components/layout/PageLayout";
import FinancialActionBar from "../../../../components/common/FinancialActionBar";
import ProjectEntryInfo from "../../../../components/common/ProjectEntryInfo";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

export default function ViewStartOrderPage() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [project, setProject] = useState(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    projectApi.getById(projectId).then(setProject).catch((err) => {
      logger.debug("Failed to load project", err);
    });
    try {
      const result = await projectApi.getStartOrder(projectId);
      // API returns array for list endpoint; extract first item
      if (Array.isArray(result) && result.length) {
        setData(result[0]);
      } else if (result && !Array.isArray(result)) {
        setData(result);
      }
    } catch (err) {
      logger.debug("ViewStartOrderPage: load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate(`/projects/${projectId}?tab=start_order`);

  if (!loading && !data) {
    navigate(`/projects/${projectId}?tab=start_order`, { replace: true });
    return null;
  }

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="entry-form">
        <FinancialActionBar onBack={handleBack} showSave={false}>
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>

        {data && (
          <div className="card">
            <div className="card__header">
              {t("start_order_details")}
            </div>
            <div className="card__body">
              <div className="prj-info-grid">
                {data.start_order_date && (
                  <div className="prj-info-item">
                    <div className="prj-info-label">{t("start_order_date")}</div>
                    <div className="prj-info-value">{formatDate(data.start_order_date)}</div>
                  </div>
                )}
                {data.project_end_date && (
                  <div className="prj-info-item">
                    <div className="prj-info-label">{t("project_end_date_calculated")}</div>
                    <div className="prj-info-value">{formatDate(data.project_end_date)}</div>
                  </div>
                )}
                {data.start_order_notes && (
                  <div className="prj-info-item prj-info-item--wide">
                    <div className="prj-info-label">{t("start_order_notes")}</div>
                    <div className="prj-info-value">{data.start_order_notes}</div>
                  </div>
                )}

                <div className="prj-info-item prj-info-item--wide">
                  <div className="prj-info-label">{t("start_order_file")}</div>
                  {data.start_order_file ? (
                    <FileAttachmentView
                      fileUrl={data.start_order_file}
                      fileName={data.start_order_file_name || extractFileNameFromUrl(data.start_order_file)}
                      projectId={projectId}
                      endpoint={`projects/${projectId}/start-order/`}
                    />
                  ) : (
                    <div className="prj-info-value prj-empty-inline">{t("no_attachment")}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
