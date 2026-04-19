import { useTranslation } from "react-i18next";
import Button from "../../../../components/common/Button";
import CollapsibleSection from "./CollapsibleSection";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";

/**
 * RightHolderSection — صاحب الحق
 * Based on Abu Dhabi Real Estate Centre document format.
 */
export default function RightHolderSection({
  rightHolders,
  viewMode,
  onAdd,
  onRemove,
  onUpdate,
}) {
  const { t } = useTranslation();

  return (
    <CollapsibleSection
      title={t("right_holder_section")}
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <path d="M20 8v6" />
          <path d="M23 11h-6" />
        </svg>
      }
    >
      {viewMode ? (
        <div className="stack">
          {rightHolders.length === 0 ? (
            <div className="card text-center prj-muted p-20">
              {t("no_right_holders_added")}
            </div>
          ) : (
            rightHolders.map((rh, i) => (
              <div key={rh.id || rh._uid || i} className="card">
                <div className="form-grid cols-3">
                  <ViewRow label={t("rh_name_ar")} value={rh.name_ar} />
                  <ViewRow label={t("rh_name_en")} value={rh.name_en} />
                  <ViewRow label={t("rh_license_no")} value={rh.license_no} />
                  <ViewRow
                    label={t("right_hold_type")}
                    value={
                      rh.right_hold_type === "Usufruct"
                        ? t("right_hold_type_usufruct")
                        : rh.right_hold_type === "Ownership"
                          ? t("right_hold_type_ownership")
                          : rh.right_hold_type
                    }
                  />
                  <ViewRow label={t("share_and_acquisition")} value={rh.share_and_acquisition} />
                  <ViewRow label={t("total_shares")} value={rh.total_shares} />
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {rightHolders.map((rh, i) => (
            <div key={rh._uid || rh.id || i} className="owner-block">
              <div className="form-grid cols-3">
                <Field label={t("rh_name_ar")}>
                  <input
                    className="input"
                    value={rh.name_ar || ""}
                    onChange={(e) => onUpdate(i, "name_ar", e.target.value)}
                  />
                </Field>
                <Field label={t("rh_name_en")}>
                  <input
                    className="input"
                    value={rh.name_en || ""}
                    onChange={(e) => onUpdate(i, "name_en", e.target.value)}
                  />
                </Field>
                <Field label={t("rh_license_no")}>
                  <input
                    className="input"
                    value={rh.license_no || ""}
                    onChange={(e) => onUpdate(i, "license_no", e.target.value)}
                  />
                </Field>
              </div>
              <div className="form-grid cols-4 mt-8">
                <Field label={t("right_hold_type")}>
                  <select
                    className="input"
                    value={rh.right_hold_type || "Ownership"}
                    onChange={(e) => onUpdate(i, "right_hold_type", e.target.value)}
                  >
                    <option value="Ownership">{t("right_hold_type_ownership")}</option>
                    <option value="Usufruct">{t("right_hold_type_usufruct")}</option>
                  </select>
                </Field>
                <Field label={t("share_and_acquisition")}>
                  <input
                    className="input"
                    value={rh.share_and_acquisition || ""}
                    onChange={(e) => onUpdate(i, "share_and_acquisition", e.target.value)}
                  />
                </Field>
                <Field label={t("total_shares")}>
                  <input
                    className="input"
                    value={rh.total_shares || ""}
                    onChange={(e) => onUpdate(i, "total_shares", e.target.value)}
                    placeholder="50%"
                  />
                </Field>
                <Field label={t("action")}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRemove(i)}
                  >
                    {t("remove")}
                  </Button>
                </Field>
              </div>
            </div>
          ))}
          <div className="ds-mt-3">
            <Button variant="secondary" onClick={onAdd}>
              {t("add_right_holder")}
            </Button>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
