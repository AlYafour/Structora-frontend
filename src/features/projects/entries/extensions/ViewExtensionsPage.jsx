import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { pdf } from '@react-pdf/renderer';
import { projectApi } from "../../../../services/projects";
import { api } from "../../../../services/api";
import { logger } from "../../../../utils/logger";
import { useNotifications } from "../../../../contexts/NotificationContext";
import ExtensionLetterDocument from "./ExtensionLetterDocument";

async function toBase64(url) {
  if (!url) return null;
  try {
    let path = url;
    try {
      path = new URL(url).pathname;
      path = path.replace(/^\/api\//, '');
    } catch {}
    const { data } = await api.get(path, { responseType: 'blob' });
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => res(null);
      r.readAsDataURL(data);
    });
  } catch { return null; }
}
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
  const [startOrderId, setStartOrderId] = useState(null);
  const [downloadingIdx, setDownloadingIdx] = useState(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const raw = await projectApi.getStartOrder(projectId);
      const data = Array.isArray(raw) && raw.length ? raw[0] : raw;
      if (data?.id) setStartOrderId(data.id);
      if (data?.extensions && Array.isArray(data.extensions) && data.extensions.length > 0) {
        setExtensions(data.extensions);
      }
    } catch (err) {
      logger.debug("ViewExtensionsPage: load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLetter = async (idx) => {
    if (!startOrderId) return;
    setDownloadingIdx(idx);
    try {
      const data = await projectApi.getExtensionLetterData(projectId, startOrderId, idx);
      if (data.attachment_url && data.attachment_is_image) {
        const b64 = await toBase64(data.attachment_url);
        if (b64) data.attachment_url = b64;
        else data.attachment_is_image = false;
      }
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
      setDownloadingIdx(null);
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
                        onClick={() => handleDownloadLetter(idx)}
                        disabled={downloadingIdx === idx}
                      >
                        {downloadingIdx === idx ? t("downloading") : t("download_extension_letter")}
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
