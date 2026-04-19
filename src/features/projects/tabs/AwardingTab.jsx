import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { formatDate } from "../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";

const AwardingTab = memo(function AwardingTab({ projectId, awarding }) {
  const { t } = useTranslation();
  const hasData = !!awarding;

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          {hasData ? (
            <>
              <Button as={Link} to={`/projects/${projectId}/awarding/view`} variant="secondary" size="md">
                {t("view")}
              </Button>
              <Button as={Link} to={`/projects/${projectId}/awarding/${awarding.id}/edit`} variant="primary" size="md">
                {t("edit")}
              </Button>
            </>
          ) : (
            <Button as={Link} to={`/projects/${projectId}/awarding/create`} variant="primary" size="md">
              {t("add")}
            </Button>
          )}
        </div>
      </div>
      {hasData ? (
        <>
          <div className="ds-grid-auto-240 ds-mt-4">
            {awarding.award_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("award_date")}</div>
                <div className="prj-info-value">{formatDate(awarding.award_date)}</div>
              </Card>
            )}
            {awarding.project_number && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("project_number")}</div>
                <div className="prj-info-value">{awarding.project_number}</div>
              </Card>
            )}
            {awarding.consultant_registration_number && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("consultant_registration_number")}</div>
                <div className="prj-info-value">{awarding.consultant_registration_number}</div>
              </Card>
            )}
            {awarding.contractor_registration_number && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("contractor_registration_number")}</div>
                <div className="prj-info-value">{awarding.contractor_registration_number}</div>
              </Card>
            )}
          </div>

          {awarding.awarding_file && (
            <div className="ds-mt-5">
              <h3 className="prj-section-heading">{t("attachments")}</h3>
              <Card className="ds-p-5">
                <div className="prj-info-label ds-mb-3">{t("awarding_file")}</div>
                <FileAttachmentView
                  fileUrl={awarding.awarding_file}
                  fileName={awarding.awarding_file_name || extractFileNameFromUrl(awarding.awarding_file)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/awarding/`}
                />
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="prj-empty-state">
          {t("awarding_not_added")}
        </div>
      )}
    </div>
  );
});

export default AwardingTab;
