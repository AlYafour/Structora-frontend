import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { formatDate } from "../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";

/* ── Section sub-component ── */
function Section({ title, children }) {
  return (
    <div className="operational-tab__section">
      <h3 className="prj-section-heading">{title}</h3>
      {children}
    </div>
  );
}

/* ── Awarding Section ── */
function AwardingSection({ projectId, awarding, t }) {
  const hasData = !!awarding;

  return (
    <Section title={t("awarding_gulf_bank_contract_info")}>
      <div className="prj-tab-actions ds-mb-4">
        {hasData ? (
          <>
            <Button as={Link} to={`/projects/${projectId}/awarding/view`} variant="secondary" size="sm">
              {t("view")}
            </Button>
            <Button as={Link} to={`/projects/${projectId}/awarding/${awarding.id}/edit`} variant="primary" size="sm">
              {t("edit")}
            </Button>
          </>
        ) : (
          <Button as={Link} to={`/projects/${projectId}/awarding/create`} variant="primary" size="sm">
            {t("add")}
          </Button>
        )}
      </div>
      {hasData ? (
        <>
          <div className="ds-grid-auto-240">
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
            <div className="ds-mt-4">
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
        <div className="prj-empty-state">{t("awarding_not_added")}</div>
      )}
    </Section>
  );
}

/* ── Start Order Section ── */
function StartOrderSection({ projectId, startOrder, t }) {
  const hasData = !!startOrder;

  return (
    <Section title={t("start_order")}>
      <div className="prj-tab-actions ds-mb-4">
        {hasData ? (
          <>
            <Button as={Link} to={`/projects/${projectId}/start-order/view`} variant="secondary" size="sm">
              {t("view")}
            </Button>
            <Button as={Link} to={`/projects/${projectId}/start-order/${startOrder.id}/edit`} variant="primary" size="sm">
              {t("edit")}
            </Button>
          </>
        ) : (
          <Button as={Link} to={`/projects/${projectId}/start-order/create`} variant="primary" size="sm">
            {t("add")}
          </Button>
        )}
      </div>
      {hasData ? (
        <>
          <div className="ds-grid-auto-240">
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
            <div className="ds-mt-4">
              <Card className="ds-p-5">
                <div className="prj-info-label ds-mb-2">{t("start_order_notes")}</div>
                <div className="prj-info-value">{startOrder.start_order_notes}</div>
              </Card>
            </div>
          )}
          {startOrder.start_order_file && (
            <div className="ds-mt-4">
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
        <div className="prj-empty-state">{t("start_order_not_added")}</div>
      )}
    </Section>
  );
}

/* ── Project Schedule Section ── */
function ScheduleSection({ projectId, projectSchedule, t }) {
  const hasData = !!projectSchedule;

  return (
    <Section title={t("project_schedule")}>
      <div className="prj-tab-actions ds-mb-4">
        {hasData ? (
          <>
            <Button as={Link} to={`/projects/${projectId}/project-schedule/view`} variant="secondary" size="sm">
              {t("view")}
            </Button>
            <Button as={Link} to={`/projects/${projectId}/project-schedule/${projectSchedule.id}/edit`} variant="primary" size="sm">
              {t("edit")}
            </Button>
          </>
        ) : (
          <Button as={Link} to={`/projects/${projectId}/project-schedule/create`} variant="primary" size="sm">
            {t("add")}
          </Button>
        )}
      </div>
      {hasData ? (
        <>
          <div className="ds-grid-auto-240">
            {projectSchedule.project_start_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("project_start_date")}</div>
                <div className="prj-info-value">{formatDate(projectSchedule.project_start_date)}</div>
              </Card>
            )}
            {projectSchedule.project_end_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("project_end_date")}</div>
                <div className="prj-info-value">{formatDate(projectSchedule.project_end_date)}</div>
              </Card>
            )}
          </div>
          {projectSchedule.schedule_file && (
            <div className="ds-mt-4">
              <Card className="ds-p-5">
                <div className="prj-info-label ds-mb-3">{t("schedule_file")}</div>
                <FileAttachmentView
                  fileUrl={projectSchedule.schedule_file}
                  fileName={projectSchedule.schedule_file_name || extractFileNameFromUrl(projectSchedule.schedule_file)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/project-schedule/`}
                />
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="prj-empty-state">{t("project_schedule_not_added")}</div>
      )}
    </Section>
  );
}

/* ── Excavation Notice Section ── */
function ExcavationSection({ projectId, excavationNotice, t }) {
  const hasData = !!excavationNotice;

  return (
    <Section title={t("excavation_start_notice")}>
      <div className="prj-tab-actions ds-mb-4">
        {hasData ? (
          <>
            <Button as={Link} to={`/projects/${projectId}/excavation-notice/view`} variant="secondary" size="sm">
              {t("view")}
            </Button>
            <Button as={Link} to={`/projects/${projectId}/excavation-notice/${excavationNotice.id}/edit`} variant="primary" size="sm">
              {t("edit")}
            </Button>
          </>
        ) : (
          <Button as={Link} to={`/projects/${projectId}/excavation-notice/create`} variant="primary" size="sm">
            {t("add")}
          </Button>
        )}
      </div>
      {hasData ? (
        <>
          <div className="ds-grid-auto-240">
            {excavationNotice.notice_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("notice_date")}</div>
                <div className="prj-info-value">{formatDate(excavationNotice.notice_date)}</div>
              </Card>
            )}
          </div>
          {excavationNotice.notice_file && (
            <div className="ds-mt-4">
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
        <div className="prj-empty-state">{t("excavation_notice_not_added")}</div>
      )}
    </Section>
  );
}

/* ── Combined Operational Tab ── */
const OperationalTab = memo(function OperationalTab({
  projectId,
  awarding,
  startOrder,
  projectSchedule,
  excavationNotice,
}) {
  const { t } = useTranslation();

  return (
    <div className="prj-tab-panel operational-tab">
      <AwardingSection projectId={projectId} awarding={awarding} t={t} />
      <StartOrderSection projectId={projectId} startOrder={startOrder} t={t} />
      <ScheduleSection projectId={projectId} projectSchedule={projectSchedule} t={t} />
      <ExcavationSection projectId={projectId} excavationNotice={excavationNotice} t={t} />
    </div>
  );
});

export default OperationalTab;
