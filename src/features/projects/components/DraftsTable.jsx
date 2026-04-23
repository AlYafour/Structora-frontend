import React from "react";
import { useTranslation } from "react-i18next";
import Checkbox from "../../../components/forms/Checkbox";
import ActionMenu from "../../../components/common/ActionMenu";

const STEP_MAP = {
  setup: { index: 0, key: "wizard_step_setup" },
  siteplan: { index: 1, key: "wizard_step_siteplan" },
  license: { index: 2, key: "wizard_step_license" },
  contract: { index: 3, key: "wizard_step_contract" },
};

export default function DraftsTable({
  drafts = [],
  selectedDraftIds,
  isAllDraftsSelected,
  toggleSelectAllDrafts,
  toggleDraftSelect,
  handleResumeDraft,
  handleDeleteDraft,
  deletingDraftId,
  formatDate,
}) {
  const { t } = useTranslation();

  return (
    <div className="drafts-table-wrap">
      <table className="ds-table drafts-table">
        <thead>
          <tr>
            <th className="drafts-col-checkbox">
              <Checkbox
                checked={isAllDraftsSelected}
                onChange={toggleSelectAllDrafts}
                aria-label={t("select_all")}
              />
            </th>
            <th className="drafts-col-number">#</th>
            <th className="drafts-col-name">{t("project_name")}</th>
            <th className="drafts-col-step">{t("draft_step_label")}</th>
            <th className="drafts-col-date">{t("draft_last_updated")}</th>
            <th className="drafts-col-actions">{t("action")}</th>
          </tr>
        </thead>

        <tbody>
          {drafts.map((draft, index) => {
            const stepInfo = STEP_MAP[draft.current_step] || STEP_MAP.setup;
            const stepLabel = t(stepInfo.key);
            const title =
              draft.title || draft.data?.project_name || t("untitled_draft");
            const updatedAt = formatDate(draft.updated_at);
            const isSelected = selectedDraftIds.has(draft.id);

            return (
              <tr key={draft.id} className={isSelected ? "is-selected" : ""}>
                <td className="drafts-col-checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleDraftSelect(draft.id)}
                    aria-label={`${t("select")} ${title}`}
                  />
                </td>

                <td className="drafts-col-number">{index + 1}</td>

                <td className="drafts-col-name">
                  <div className="drafts-table__name">
                    <div className="drafts-table__title">{title}</div>
                    <div className="drafts-table__meta">{t("draft")}</div>
                  </div>
                </td>

                <td className="drafts-col-step">
                  <div className="drafts-table__step">
                    <span className="drafts-table__step-name">{stepLabel}</span>
                    <span className="drafts-table__step-indicator">
                      {[0, 1, 2, 3].map((s) => (
                        <span
                          key={s}
                          className={`drafts-table__step-dot ${
                            s <= stepInfo.index
                              ? "drafts-table__step-dot--active"
                              : ""
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                </td>

                <td className="drafts-col-date">{updatedAt}</td>

                <td className="drafts-col-actions">
                  <ActionMenu
                    items={[
                      {
                        key: "resume",
                        label: t("resume_draft"),
                        onClick: () => handleResumeDraft(draft),
                      },
                      {
                        key: "delete",
                        label:
                          deletingDraftId === draft.id
                            ? t("deleting")
                            : t("delete_draft"),
                        onClick: () => handleDeleteDraft(draft.id),
                        disabled: deletingDraftId === draft.id,
                        danger: true,
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={6} className="drafts-table__foot">
              {t("matching_total", { count: drafts.length, total: drafts.length })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}