import { useCallback, useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { pdf } from '@react-pdf/renderer';
import { projectApi } from "../../../../services/projects";
import { logger } from "../../../../utils/logger";
import { useNotifications } from "../../../../contexts/NotificationContext";
import ExtensionLetterDocument from "./ExtensionLetterDocument";
import { prepareExtensionLetterAssets } from "./extensionLetterAssets";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import ContractExtension from "../../wizard/components/ContractExtension";
import Button from "../../../../components/common/Button";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

export default function ViewExtensionsPage() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const { error: showError } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [extensions, setExtensions] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const data = await projectApi.getExtensions(projectId);
      setExtensions(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.debug("ViewExtensionsPage: load failed", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadLetter = async (ext, idx) => {
    if (!ext?.id) return;
    setDownloadingId(ext.id);
    try {
      const rawData = await projectApi.getProjectExtensionLetterData(projectId, ext.id);
      const data = await prepareExtensionLetterAssets(rawData);
      const blob = await pdf(<ExtensionLetterDocument data={data} />).toBlob();
      const refNo = data.approval_number || `EOT${String(idx + 1).padStart(4, "0")}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Extension_Letter_${refNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error("Download extension letter failed", err);
      showError(t("download_extension_letter_failed"));
    } finally {
      setDownloadingId(null);
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
                  <div key={ext.id || idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>
                        {t("extensions")} {idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadLetter(ext, idx)}
                        disabled={downloadingId === ext.id}
                      >
                        {downloadingId === ext.id ? t("downloading") : t("download_extension_letter")}
                      </Button>
                    </div>
                    <ContractExtension
                      extension={ext}
                      index={idx}
                      extensionIndex={idx}
                      isView={true}
                      onUpdate={() => {}}
                      onRemove={() => {}}
                      canRemove={false}
                      projectId={projectId}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
