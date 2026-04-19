import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { formatDate } from "../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";

const StartOrderTab = memo(function StartOrderTab({ projectId, startOrder }) {
  const { t } = useTranslation();
  const hasData = !!startOrder;

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          {hasData ? (
            <>
              <Button as={Link} to={`/projects/${projectId}/start-order/view`} variant="secondary" size="md">
                {t("view")}
              </Button>
              <Button as={Link} to={`/projects/${projectId}/start-order/${startOrder.id}/edit`} variant="primary" size="md">
                {t("edit")}
              </Button>
            </>
          ) : (
            <Button as={Link} to={`/projects/${projectId}/start-order/create`} variant="primary" size="md">
              {t("add")}
            </Button>
          )}
        </div>
      </div>
      {hasData ? (
        <>
          <div className="ds-grid-auto-240 ds-mt-4">
            {startOrder.start_order_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("start_order_date")}</div>
                <div className="prj-info-value">{formatDate(startOrder.start_order_date)}</div>
              </Card>
            )}
            {startOrder.project_end_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("project_end_date_calculated")}</div>
                <div className="prj-info-value">{formatDate(startOrder.project_end_date)}</div>
              </Card>
            )}
          </div>

          {startOrder.start_order_notes && (
            <div className="ds-mt-5">
              <h3 className="prj-section-heading">{t("start_order_notes")}</h3>
              <Card className="ds-p-5">
                <div className="prj-info-value">{startOrder.start_order_notes}</div>
              </Card>
            </div>
          )}

          {startOrder.start_order_file && (
            <div className="ds-mt-5">
              <h3 className="prj-section-heading">{t("attachments")}</h3>
              <Card className="ds-p-5">
                <div className="prj-info-label ds-mb-3">{t("start_order_file")}</div>
                <FileAttachmentView
                  fileUrl={startOrder.start_order_file}
                  fileName={startOrder.start_order_file_name || extractFileNameFromUrl(startOrder.start_order_file)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/start-order/`}
                />
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="prj-empty-state">
          {t("start_order_not_added")}
        </div>
      )}
    </div>
  );
});

export default StartOrderTab;
