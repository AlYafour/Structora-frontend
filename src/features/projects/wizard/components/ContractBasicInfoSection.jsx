import { useTranslation } from "react-i18next";
import {
  FormField,
  FormGrid,
  FormInput,
  FormTextarea,
  FormViewField,
} from "../../../../components/ui/form";
import RtlSelect from "../../../../components/forms/RtlSelect";
import DateInput from "../../../../components/forms/DateInput";
import CurrencyField from "../../../../components/forms/CurrencyField";
import { formatDate } from "../../../../utils/formatters";
import { formatMoney, formatMoneyArabic } from "../../../../utils/formatters";

import { num, numberToArabicWords, formatNumberWithCommas } from "../../../../utils/formatters/number";

/**
 * ContractBasicInfoSection - Contract basic information section
 * Displays contract type, date, tender number, and file uploads
 */
export default function ContractBasicInfoSection({
  form,
  setF,
  viewMode,
  projectId,
  contractTypes,
  noPermit = false,
}) {
  const { t, i18n: i18next } = useTranslation();
  const isAR = i18next.language === "ar";
  const isHousing = !noPermit && form.contract_classification === "housing_loan_program";

  return (
    <div className="wizard-section">
      {/* Header with contract type */}
      <div className="wizard-section__header wizard-section-header-actions">
        <h4 className="wizard-section__title ds-m-0">
          {`2) ${t("contract_information")}`}
        </h4>
        {!viewMode && (
          <div className="wizard-section-header-slot">
            <FormField label={t("contract.fields.contract_type")} className="ds-m-0">
              <RtlSelect
                className="rtl-select"
                dir={isAR ? "rtl" : "ltr"}
                options={contractTypes}
                value={form.contract_type}
                onChange={(v) => setF("contract_type", v)}
                placeholder={t("contract.placeholders.select_contract_type")}
              />
            </FormField>
          </div>
        )}
        {viewMode && (
          <div className="wizard-section-header-slot">
            <FormViewField
              label={t("contract.fields.contract_type")}
              value={contractTypes.find((x) => x.value === form.contract_type)?.label || form.contract_type}
            />
          </div>
        )}
      </div>

      {/* Cards side by side */}
      <FormGrid cols={2} gap="md" className="ds-items-start">
        {/* Original contract information card */}
        <div className="wizard-section-card">
          <div className="wizard-section-card__header">
            <h5 className="wizard-section-card__title">
              {t("contract_original_info")}
            </h5>
            {noPermit && !viewMode && (
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 400 }}>
                {t("contract_attachments_note") || "الوثائق والأوراق التعاقدية تُرفق في قسم مرفقات العقد"}
              </span>
            )}
          </div>
          <div className="wizard-section-card__body">
            {viewMode ? (
              <FormGrid cols={2} gap="md">
                <FormViewField
                  label={t("contract_reference_number")}
                  value={form.tender_no}
                />
                <FormViewField
                  label={t("contract.fields.contract_date")}
                  value={formatDate(form.contract_date, i18next.language)}
                />
                {form.project_description && (
                  <FormViewField
                    label={t("contract_project_desc")}
                    value={form.project_description}
                    className="wizard-col-full"
                  />
                )}
              </FormGrid>
            ) : (
              <FormGrid cols={2} gap="md">
                <FormField
                  label={t("contract_reference_number")}
                >
                  <FormInput
                    value={form.tender_no}
                    onChange={(e) => setF("tender_no", e.target.value)}
                  />
                </FormField>
                <FormField label={t("contract.fields.contract_date")}>
                  <DateInput
                    value={form.contract_date || ""}
                    onChange={(value) => setF("contract_date", value)}
                  />
                </FormField>
                <FormField label={t("contract_project_desc")} className="wizard-col-full">
                  <FormTextarea
                    rows={4}
                    value={form.project_description ?? ""}
                    onChange={(e) => setF("project_description", e.target.value || "")}
                    placeholder={t("contract_project_desc_placeholder")}
                  />
                </FormField>
              </FormGrid>
            )}
          </div>
        </div>

        {/* Contract value and duration card */}
        <div className="wizard-section-card">
          <div className="wizard-section-card__header">
            <h5 className="wizard-section-card__title">
              {t("contract_value_duration")}
            </h5>
          </div>
          <div className="wizard-section-card__body">
            {viewMode ? (
              <FormGrid cols={2} gap="md">
                <FormField label={t("contract_amount")} className="wizard-col-full">
                  <div>
                    <div className="font-mono fw-600">
                      {formatMoney(form.total_project_value, { lang: isAR ? "ar" : "en" })}
                    </div>
                    <div className="mini mt-8">
                      {formatMoneyArabic(form.total_project_value)}
                    </div>
                  </div>
                </FormField>
                {isHousing && (
                  <>
                    <FormField label={t("contract.fields.total_bank_value")}>
                      <div>
                        <div className="font-mono fw-600">
                          {formatMoney(form.total_bank_value, { lang: isAR ? "ar" : "en" })}
                        </div>
                        <div className="mini mt-8">
                          {formatMoneyArabic(form.total_bank_value)}
                        </div>
                      </div>
                    </FormField>
                    <FormField label={t("contract.fields.total_owner_value_calc")}>
                      <div>
                        <div className="font-mono fw-600">
                          {formatMoney(form.total_owner_value, { lang: isAR ? "ar" : "en" })}
                        </div>
                        <div className="mini mt-8">
                          {formatMoneyArabic(form.total_owner_value)}
                        </div>
                      </div>
                    </FormField>
                  </>
                )}
                <FormViewField label={t("contract.fields.project_duration_months")} value={form.project_duration_months} />
                {form.project_duration_days ? (
                  <FormViewField label={t("project_duration_days")} value={form.project_duration_days} />
                ) : null}
              </FormGrid>
            ) : (
              <FormGrid cols={2} gap="md">
                <FormField
                  label={t("contract.fields.total_project_value")}
                  hint={noPermit ? t("contract_value_excl_vat_note") : undefined}
                  className="wizard-col-full"
                >
                  <CurrencyField
                    value={formatNumberWithCommas(form.total_project_value)}
                    onChange={(val) => setF("total_project_value", val)}
                    placeholder="0.00"
                  />
                </FormField>
                {isHousing && (
                  <>
                    <FormField label={t("contract.fields.total_bank_value")}>
                      <CurrencyField
                        value={formatNumberWithCommas(form.total_bank_value)}
                        onChange={(val) => setF("total_bank_value", val)}
                        placeholder="0.00"
                      />
                    </FormField>
                    <FormField label={t("contract.fields.total_owner_value_calc")}>
                      <CurrencyField
                        value={formatNumberWithCommas(form.total_owner_value)}
                        onChange={() => {}}
                        readOnly
                        placeholder="0.00"
                        className="input--readonly"
                      />
                    </FormField>
                  </>
                )}
                <FormField label={t("contract.fields.project_duration_months")}>
                  <FormInput
                    type="text"
                    inputMode="numeric"
                    value={form.project_duration_months}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setF("project_duration_months", v);
                    }}
                    placeholder={t("contract.placeholders.project_duration_months") || ""}
                  />
                </FormField>
                <FormField label={t("project_duration_days")} hint={t("optional")}>
                  <FormInput
                    type="text"
                    inputMode="numeric"
                    value={form.project_duration_days || ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setF("project_duration_days", v);
                    }}
                    placeholder={t("project_duration_days_placeholder") || ""}
                  />
                </FormField>
              </FormGrid>
            )}
          </div>
        </div>
      </FormGrid>
    </div>
  );
}
