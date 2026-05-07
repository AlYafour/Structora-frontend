// Unified component for consultant fees section
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import DirhamsIcon from "../../../../components/common/DirhamsIcon";
import { VAT_RATE } from "../../../../utils/constants";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import RtlSelect from "../../../../components/forms/RtlSelect";
import NumberField from "../../../../components/forms/NumberField";
import YesNoChips from "../../../../components/ui/YesNoChips";

// Remove trailing zeros from displayed values only (e.g., 2.00 -> 2)
// Does not change the original value, only for display formatting
const formatPercentValue = (value) => {
  if (!value || value === "" || value === "0") return "0";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  // Remove trailing zeros: if integer (2.00) -> 2, otherwise (2.5) -> 2.5
  return num % 1 === 0 ? String(Math.floor(num)) : String(num);
};

export default function ConsultantFeesSection({
  prefix, // "owner" or "bank"
  form,
  setF,
  isView,
  isAR,
  forceShow = false, // bypass the YesNoChips gate (used in noPermit mode where consultant is already confirmed)
}) {
  const { t } = useTranslation();

  const EXTRA_FEE_MODE = useMemo(
    () => [
      { value: "percent", label: t("contract.fees.mode.percent") },
      { value: "fixed", label: t("contract.fees.mode.fixed") },
      { value: "other", label: t("contract.fees.mode.other") },
    ],
    [t]
  );

  const PAY_TO_OPTIONS = useMemo(
    () => [
      { value: "consultant", label: t("contract.fees.pay_to.consultant") },
      { value: "contractor", label: t("contract.fees.pay_to.contractor") },
    ],
    [t]
  );

  const includesConsultant = form[`${prefix}_includes_consultant`];
  const showFees = forceShow || includesConsultant === "yes";

  const handlePercentChange = (field) => (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setF(field, "");
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) return;
    const normalized = num % 1 === 0 ? String(Math.floor(num)) : String(num);
    setF(field, normalized);
  };

  if (isView) {
    return (
      <div className="form-grid cols-1">
        {!forceShow && (
          <ViewRow
            label={t("contract.fees.include_consultant")}
            value={includesConsultant === "yes" ? t("yes") : t("no")}
          />
        )}
        {showFees && (
          <>
            <div className="form-grid cols-2">
              <ViewRow
                label={t("contract.fees.design_percent")}
                value={form[`${prefix}_fee_design_percent`] ? `${formatPercentValue(form[`${prefix}_fee_design_percent`])}%` : "0%"}
              />
              <ViewRow
                label={t("contract.fees.supervision_percent")}
                value={form[`${prefix}_fee_supervision_percent`] ? `${formatPercentValue(form[`${prefix}_fee_supervision_percent`])}%` : "0%"}
              />
            </div>
            {prefix === "owner" && (
              <>
                <ViewRow
                  label={t("contract.fees.design_pay_to")}
                  value={PAY_TO_OPTIONS.find(opt => opt.value === form[`${prefix}_fee_design_pay_to`])?.label || PAY_TO_OPTIONS.find(opt => opt.value === "contractor")?.label}
                />
                <ViewRow
                  label={t("contract.fees.supervision_pay_to")}
                  value={PAY_TO_OPTIONS.find(opt => opt.value === form[`${prefix}_fee_supervision_pay_to`])?.label || PAY_TO_OPTIONS.find(opt => opt.value === "contractor")?.label}
                />
              </>
            )}
            <ViewRow
              label={t("contract.fees.extra_type")}
              value={EXTRA_FEE_MODE.find(m => m.value === form[`${prefix}_fee_extra_mode`])?.label || form[`${prefix}_fee_extra_mode`]}
            />
            <ViewRow
              label={t("contract.fees.extra_value")}
              value={form[`${prefix}_fee_extra_value`] || "0.00"}
            />
            {form[`${prefix}_fee_extra_mode`] === "fixed" && (
              <ViewRow
                label={t("contract.fees.extra_includes_vat")}
                value={form[`${prefix}_fee_extra_includes_vat`] === "yes" ? t("yes") : t("no")}
              />
            )}
            {form[`${prefix}_fee_extra_description`] && (
              <ViewRow
                label={t("contract.fees.extra_description")}
                value={form[`${prefix}_fee_extra_description`]}
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="consultant-fees">
      {!forceShow && (
        <Field label={t("contract.fees.include_consultant")}>
          <YesNoChips
            value={includesConsultant}
            onChange={(v) => setF(`${prefix}_includes_consultant`, v)}
          />
        </Field>
      )}

      {showFees && (
        <>
          {/* Percentage Section */}
          <div className="consultant-fees__group">
            <div className="consultant-fees__group-label">
              {t("contract.fees.percentages_label") || (isAR ? "النسب المئوية" : "Fee Percentages")}
            </div>
            <div className="form-grid cols-2">
              <Field label={t("contract.fees.design_percent")}>
                <div className="wizard-percent-wrapper">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form[`${prefix}_fee_design_percent`] || ""}
                    onChange={handlePercentChange(`${prefix}_fee_design_percent`)}
                    onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }}
                    placeholder="0"
                    dir={isAR ? "rtl" : "ltr"}
                  />
                  <span className="wizard-percent-suffix">%</span>
                </div>
              </Field>
              <Field label={t("contract.fees.supervision_percent")}>
                <div className="wizard-percent-wrapper">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form[`${prefix}_fee_supervision_percent`] || ""}
                    onChange={handlePercentChange(`${prefix}_fee_supervision_percent`)}
                    onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }}
                    placeholder="0"
                    dir={isAR ? "rtl" : "ltr"}
                  />
                  <span className="wizard-percent-suffix">%</span>
                </div>
              </Field>
            </div>
          </div>

          {/* Pay To Section (owner only) */}
          {prefix === "owner" && (
            <div className="consultant-fees__group">
              <div className="consultant-fees__group-label">
                {t("contract.fees.payment_direction_label") || (isAR ? "جهة الصرف" : "Payment Direction")}
              </div>
              <div className="form-grid cols-2">
                <Field label={t("contract.fees.design_pay_to")}>
                  <RtlSelect
                    className="rtl-select"
                    dir={isAR ? "rtl" : "ltr"}
                    options={PAY_TO_OPTIONS}
                    value={form[`${prefix}_fee_design_pay_to`] || "contractor"}
                    onChange={(v) => setF(`${prefix}_fee_design_pay_to`, v)}
                  />
                </Field>
                <Field label={t("contract.fees.supervision_pay_to")}>
                  <RtlSelect
                    className="rtl-select"
                    dir={isAR ? "rtl" : "ltr"}
                    options={PAY_TO_OPTIONS}
                    value={form[`${prefix}_fee_supervision_pay_to`] || "contractor"}
                    onChange={(v) => setF(`${prefix}_fee_supervision_pay_to`, v)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Extra Fees Section */}
          <div className="consultant-fees__group">
            <div className="consultant-fees__group-label">
              {t("contract.fees.extra_fees_label") || (isAR ? "رسوم إضافية" : "Additional Fees")}
            </div>
            <div className="form-grid cols-3">
              <Field label={t("contract.fees.extra_type")}>
                <RtlSelect
                  className="rtl-select"
                  dir={isAR ? "rtl" : "ltr"}
                  options={EXTRA_FEE_MODE}
                  value={form[`${prefix}_fee_extra_mode`]}
                  onChange={(v) => setF(`${prefix}_fee_extra_mode`, v)}
                />
              </Field>
              <Field label={t("contract.fees.extra_value")}>
                <NumberField
                  value={form[`${prefix}_fee_extra_value`]}
                  onChange={(v) => setF(`${prefix}_fee_extra_value`, v)}
                />
              </Field>
              <Field label={t("contract.fees.extra_description")}>
                <input
                  className="input"
                  type="text"
                  value={form[`${prefix}_fee_extra_description`] || ""}
                  onChange={(e) => setF(`${prefix}_fee_extra_description`, e.target.value)}
                  placeholder={t("contract.fees.extra_description_placeholder")}
                />
              </Field>
            </div>
            {form[`${prefix}_fee_extra_mode`] === "fixed" && (
              <Field label={t("contract.fees.extra_includes_vat")} style={{ marginTop: 8 }}>
                <YesNoChips
                  value={form[`${prefix}_fee_extra_includes_vat`]}
                  onChange={(v) => {
                    const currentVatMode = form[`${prefix}_fee_extra_includes_vat`];

                    // do nothing if same value clicked again
                    if (currentVatMode === v) return;

                    const currentValue = parseFloat(form[`${prefix}_fee_extra_value`] || 0);

                    let newValue = currentValue;

                    // convert only when switching modes
                    if (!isNaN(currentValue) && currentValue > 0) {
                      if (currentVatMode === "yes" && v === "no") {
                        // remove VAT
                        newValue = currentValue / 1.05;
                      } else if (currentVatMode === "no" && v === "yes") {
                        // add VAT
                        newValue = currentValue * 1.05;
                      }
                    }

                    setF(`${prefix}_fee_extra_includes_vat`, v);
                    setF(`${prefix}_fee_extra_value`, newValue.toFixed(2));
                  }}
                />
              </Field>
            )}
            {/* VAT breakdown — shown when fixed mode and value entered */}
            {form[`${prefix}_fee_extra_mode`] === "fixed" && form[`${prefix}_fee_extra_value`] && (() => {
              const cleanValue = parseFloat(String(form[`${prefix}_fee_extra_value`] || 0).replace(/,/g, "")) || 0;
              return (
                <div className="consultant-fees__vat-breakdown">
                  {form[`${prefix}_fee_extra_includes_vat`] === "yes" ? (
                    <>
                      <div className="consultant-fees__vat-row consultant-fees__vat-row--main">
                        <span>{t("contract.fees.vat_total_incl")}</span>
                        <span className="consultant-fees__vat-amount">
                          {cleanValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAR ? "د.إ" : <DirhamsIcon size={10} color="#374151" />}
                        </span>
                      </div>
                      <div className="consultant-fees__vat-row">
                        <span>{t("contract.fees.vat_amount_excl")}</span>
                        <span className="consultant-fees__vat-amount">
                          {(cleanValue / 1.05).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAR ? "د.إ" : <DirhamsIcon size={10} color="#374151" />}
                        </span>
                      </div>
                      <div className="consultant-fees__vat-row">
                        <span>{t("contract.fees.vat_5_percent")}</span>
                        <span className="consultant-fees__vat-amount">
                          {(cleanValue * 0.05 / 1.05).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAR ? "د.إ" : <DirhamsIcon size={10} color="#374151" />}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="consultant-fees__vat-row consultant-fees__vat-row--main">
                        <span>{t("contract.fees.vat_amount_excl")}</span>
                        <span className="consultant-fees__vat-amount">
                          {cleanValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAR ? "د.إ" : <DirhamsIcon size={10} color="#374151" />}
                        </span>
                      </div>
                      <div className="consultant-fees__vat-row">
                        <span>{t("contract.fees.vat_5_percent")}</span>
                        <span className="consultant-fees__vat-amount">
                          {(cleanValue * 0.05).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAR ? "د.إ" : <DirhamsIcon size={10} color="#374151" />}
                        </span>
                      </div>
                      <div className="consultant-fees__vat-row">
                        <span>{t("contract.fees.vat_total_incl")}</span>
                        <span className="consultant-fees__vat-amount">
                          {(cleanValue * (1 + VAT_RATE)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAR ? "د.إ" : <DirhamsIcon size={10} color="#374151" />}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

