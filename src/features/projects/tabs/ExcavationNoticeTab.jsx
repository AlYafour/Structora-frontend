import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { formatDate } from "../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";

const ExcavationNoticeTab = memo(function ExcavationNoticeTab({ projectId, excavationNotice }) {
  const { t } = useTranslation();
  const hasData = !!excavationNotice;

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          {hasData ? (
            <>
              <Button as={Link} to={`/projects/${projectId}/excavation-notice/view`} variant="secondary" size="md">
                {t("view")}
              </Button>
              <Button as={Link} to={`/projects/${projectId}/excavation-notice/${excavationNotice.id}/edit`} variant="primary" size="md">
                {t("edit")}
              </Button>
            </>
          ) : (
            <Button as={Link} to={`/projects/${projectId}/excavation-notice/create`} variant="primary" size="md">
              {t("add")}
            </Button>
          )}
        </div>
      </div>
      {hasData ? (
        <>
          <div className="ds-grid-auto-240 ds-mt-4">
            {excavationNotice.notice_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("notice_date")}</div>
                <div className="prj-info-value">{formatDate(excavationNotice.notice_date)}</div>
              </Card>
            )}
          </div>

          {excavationNotice.notice_file && (
            <div className="ds-mt-5">
              <h3 className="prj-section-heading">{t("attachments")}</h3>
              <Card className="ds-p-5">
                <div className="prj-info-label ds-mb-3">{t("notice_file")}</div>
                <FileAttachmentView
                  fileUrl={excavationNotice.notice_file}
                  fileName={excavationNotice.notice_file_name || extractFileNameFromUrl(excavationNotice.notice_file)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/excavation-notice/`}
                />
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="prj-empty-state">
          {t("excavation_notice_not_added")}
        </div>
      )}
    </div>
  );
});

export default ExcavationNoticeTab;
