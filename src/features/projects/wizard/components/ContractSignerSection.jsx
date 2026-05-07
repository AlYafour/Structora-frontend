import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FormSection, FormGrid, FormViewField } from "../../../../components/ui/form";
import Field from "../../../../components/forms/Field";
import DateInput from "../../../../components/forms/DateInput";
import FileUpload from "../../../../components/file-upload/FileUpload";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import { formatDate } from "../../../../utils/formatters";
import { handleEmiratesIdInput, calculateBirthDateFromEmiratesId } from "../../../../utils/formatters/id";
import RtlSelect from "../../../../components/forms/RtlSelect";
import { NATIONALITIES } from "../../../../utils/constants";
import UniqueFieldInput from "../../../../components/forms/UniqueFieldInput";
import PhoneInput from "../../../../components/forms/PhoneInput";
import useUniquenessCheck from "../../../../hooks/useUniquenessCheck";
import "./wizard.css";

/**
 * ContractSignerSection — replaces the old authorized owner in site plan.
 *
 * Choices:
 *  1. "owner"              — the owner signs (show owners from siteplan)
 *  2. "authorized_person"  — a person authorized to sign on behalf
 *     → shows: name, ID, email, phone, ID attachment, authorization doc
 */
export default function ContractSignerSection({ form, setF, viewMode, projectId }) {
  const { t, i18n } = useTranslation();
  const isAR = i18n.language === "ar";

  const nationalityOptions = NATIONALITIES.map(n => ({
    value: n.value,
    label: isAR ? n.label.ar : n.label.en
  }));

  const signerType = form.signer_type || "owner"; // default to owner

  const authorizedPerson = form.authorized_person || {};
  const updateAP = (field, value) => {
    setF("authorized_person", { ...authorizedPerson, [field]: value });
  };

  // Uniqueness checks for ID number and phone
  const { checkUniqueness } = useUniquenessCheck();
  const [idDuplicateError, setIdDuplicateError] = useState(null);
  const [phoneDuplicateError, setPhoneDuplicateError] = useState(null);
  const idDebounceRef = useRef(null);
  const phoneDebounceRef = useRef(null);

  const checkIdUniqueness = useCallback((val) => {
    if (idDebounceRef.current) clearTimeout(idDebounceRef.current);
    if (!val || val.replace(/[-\s]/g, "").length < 15) { setIdDuplicateError(null); return; }
    idDebounceRef.current = setTimeout(async () => {
      const result = await checkUniqueness("id_number", val, "authorized_person", form.contract_id || "");
      if (!result.cancelled && result.exists) {
        const typeLabel = t(`entity_types.${result.owner_type}`) || result.owner_type;
        setIdDuplicateError(t("validation.duplicate_id_number", { name: result.owner_name, type: typeLabel }));
      } else if (!result.cancelled) {
        setIdDuplicateError(null);
      }
    }, 600);
  }, [checkUniqueness, form.contract_id, t]);

  const checkPhoneUniqueness = useCallback((val) => {
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    if (!val || val.length < 7) { setPhoneDuplicateError(null); return; }
    phoneDebounceRef.current = setTimeout(async () => {
      const result = await checkUniqueness("phone", val, "authorized_person", form.contract_id || "");
      if (!result.cancelled && result.exists) {
        const typeLabel = t(`entity_types.${result.owner_type}`) || result.owner_type;
        setPhoneDuplicateError(t("validation.duplicate_phone", { name: result.owner_name, type: typeLabel }));
      } else if (!result.cancelled) {
        setPhoneDuplicateError(null);
      }
    }, 600);
  }, [checkUniqueness, form.contract_id, t]);

  // ID expiry validation helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const idExpiryDate = authorizedPerson.id_expiry_date ? new Date(authorizedPerson.id_expiry_date) : null;
  const isIdExpired = idExpiryDate && idExpiryDate <= today;
  const daysUntilExpiry = idExpiryDate ? Math.ceil((idExpiryDate - today) / (1000 * 60 * 60 * 24)) : null;
  const isIdExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

  // View mode
  if (viewMode) {
    return (
      <FormSection title={`4) ${t("contract.sections.signer") || "الموقع على العقد"}`}>
        <FormViewField
          label={t("contract.signer_type_label") || "نوع الموقع"}
          value={signerType === "authorized_person"
            ? (t("contract.signer_authorized_person") || "شخص مفوض بالتوقيع")
            : (t("contract.signer_owner") || "المالك")}
        />

        {signerType === "authorized_person" && (
          <div className="ds-detail-card ds-mt-4">
            <FormGrid cols={4}>
              <FormViewField label={t("contract.authorized_person_name_ar")} value={authorizedPerson.name} />
              <FormViewField label={t("contract.authorized_person_name_en")} value={authorizedPerson.name_en} />
              <FormViewField label={t("nationality")} value={authorizedPerson.nationality} />
              <FormViewField label={t("id_number")} value={authorizedPerson.id_number} />
              {authorizedPerson.birth_date && (
                <FormViewField label={t("birth_date")} value={formatDate(authorizedPerson.birth_date, i18n.language)} />
              )}
              <FormViewField label={t("contract.authorized_person_id_expiry")} value={authorizedPerson.id_expiry_date ? formatDate(authorizedPerson.id_expiry_date, i18n.language) : ""} />
              <FormViewField label={t("email")} value={authorizedPerson.email} />
              <FormViewField label={t("phone")} value={authorizedPerson.phone} />
            </FormGrid>

            {isIdExpiringSoon && (
              <div className="wizard-id-expiry-warning ds-mt-3">
                {t("contract.id_expiry_warning_30_days")}
              </div>
            )}
            {isIdExpired && (
              <div className="wizard-id-expiry-error ds-mt-3">
                {t("contract.id_expiry_must_be_future")}
              </div>
            )}

            {authorizedPerson.id_file_url && (
              <Field label={t("id_attachment")} className="ds-mt-4">
                <FileAttachmentView
                  fileUrl={authorizedPerson.id_file_url}
                  fileName={authorizedPerson.id_file_name || extractFileNameFromUrl(authorizedPerson.id_file_url)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/contract/`}
                />
              </Field>
            )}

            {authorizedPerson.authorization_file_url && (
              <Field label={t("contract.authorization_document") || "مستند تفويض التوقيع"} className="ds-mt-4">
                <FileAttachmentView
                  fileUrl={authorizedPerson.authorization_file_url}
                  fileName={authorizedPerson.authorization_file_name || extractFileNameFromUrl(authorizedPerson.authorization_file_url)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/contract/`}
                />
              </Field>
            )}
          </div>
        )}
      </FormSection>
    );
  }

  // Edit mode
  return (
    <FormSection title={t("contract.sections.signer") || "الموقع على العقد"}>
      {/* Signer type selection */}
      <div className="wizard-signer-type-selector">
        <button
          type="button"
          className={`wizard-signer-type-btn ${signerType === "owner" ? "wizard-signer-type-btn--active" : ""}`}
          onClick={() => setF("signer_type", "owner")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="wizard-signer-type-btn__icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span>{t("contract.signer_owner") || "المالك"}</span>
        </button>
        <button
          type="button"
          className={`wizard-signer-type-btn ${signerType === "authorized_person" ? "wizard-signer-type-btn--active" : ""}`}
          onClick={() => setF("signer_type", "authorized_person")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="wizard-signer-type-btn__icon">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          <span>{t("contract.signer_authorized_person") || "شخص مفوض بالتوقيع"}</span>
        </button>
      </div>

      {/* Authorized person form */}
      {signerType === "authorized_person" && (
        <div className="ds-detail-card ds-mt-4">
          <h5 className="wizard-funding-card__title ds-mb-4">
            {t("contract.authorized_person_details") || "بيانات المفوض بالتوقيع"}
          </h5>

          <FormGrid cols={4}>
            <Field label={t("contract.authorized_person_name_ar")}>
              <input
                className="input"
                type="text"
                value={authorizedPerson.name || ""}
                onChange={(e) => {
                  const value = e.target.value;

                  // Allow only Arabic letters + spaces
                  const arabicRegex = /^[\u0600-\u06FF\s]*$/;

                  if (arabicRegex.test(value)) {
                    updateAP("name", value);
                  }
                }}
                placeholder={t("contract.authorized_person_name_placeholder") || "اسم المفوض"}
                dir="rtl"
              />
            </Field>

            <Field label={t("contract.authorized_person_name_en")}>
              <input
                className="input"
                type="text"
                value={authorizedPerson.name_en || ""}
                onChange={(e) => updateAP("name_en", e.target.value)}
                placeholder={t("contract.authorized_person_name_en_placeholder") || "Name in English as per ID"}
                dir="ltr"
              />
            </Field>

            <Field label={t("nationality")}>
              <RtlSelect
                className="rtl-select"
                options={nationalityOptions}
                value={authorizedPerson.nationality || ""}
                onChange={(v) => updateAP("nationality", v)}
                placeholder={t("select_nationality")}
              />
            </Field>

            <Field label={t("id_number")}>
              <input
                className={`input${idDuplicateError ? " input--error" : ""}`}
                value={authorizedPerson.id_number || ""}
                onChange={(e) => {
                  handleEmiratesIdInput(e, (v) => {
                    updateAP("id_number", v);
                    checkIdUniqueness(v);
                    // Auto-calculate birth date from Emirates ID
                    if (v && v.replace(/[-\s]/g, "").length === 15) {
                      const birthDate = calculateBirthDateFromEmiratesId(v);
                      if (birthDate) {
                        updateAP("birth_date", birthDate);
                      }
                    }
                  });
                }}
                maxLength={18}
                placeholder={t("id_placeholder")}
                dir="ltr"
              />
              {idDuplicateError && (
                <div className="wizard-field-error wizard-field-error--duplicate">{idDuplicateError}</div>
              )}
            </Field>

            <Field label={t("contract.authorized_person_id_expiry")}>
              <DateInput
                value={authorizedPerson.id_expiry_date || ""}
                onChange={(val) => updateAP("id_expiry_date", val)}
                min={new Date().toISOString().split("T")[0]}
              />
              {isIdExpired && (
                <div className="wizard-id-expiry-error ds-mt-2">
                  {t("contract.id_expiry_must_be_future")}
                </div>
              )}
              {isIdExpiringSoon && (
                <div className="wizard-id-expiry-warning ds-mt-2">
                  {t("contract.id_expiry_warning_30_days")}
                </div>
              )}
            </Field>

            <Field label={t("email")}>
              <UniqueFieldInput
                fieldType="email"
                value={authorizedPerson.email || ""}
                onChange={(val) => updateAP("email", val)}
                excludeType="authorized_person"
                excludeId={form.contract_id || ""}
                placeholder={t("email_placeholder") || "Email@example.com"}
              />
            </Field>

            <Field label={t("phone")}>
              <PhoneInput
                value={(authorizedPerson.phone || "").replace("+971", "")}
                onChange={(val) => {
                  const fullPhone = val ? `+971${val}` : "";
                  updateAP("phone", fullPhone);
                  checkPhoneUniqueness(fullPhone);
                }}
                excludeType="authorized_person"
                excludeId={form.contract_id || ""}
              />
              {phoneDuplicateError && (
                <div className="wizard-field-error wizard-field-error--duplicate">{phoneDuplicateError}</div>
              )}
            </Field>
          </FormGrid>

          {/* All 3 attachments side by side — compact */}
          <FormGrid cols={3} className="ds-mt-4 wizard-ap-files">
            <Field label={t("signature")}>
              <FileUpload
                value={authorizedPerson.signature_file instanceof File ? authorizedPerson.signature_file : null}
                onChange={(file) => updateAP("signature_file", file)}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                maxSizeMB={5}
                showPreview={true}
                existingFileUrl={authorizedPerson.signature_url || null}
                existingFileName={t("signature")}
                onRemoveExisting={() => {
                  updateAP("signature_file", null);
                  updateAP("signature_url", null);
                }}
                fileType="signature"
              />
            </Field>

            <Field label={t("id_attachment")}>
              <FileUpload
                value={authorizedPerson.id_file}
                onChange={(file) => updateAP("id_file", file)}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSizeMB={30}
                showPreview={false}
                existingFileUrl={authorizedPerson.id_file_url}
                existingFileName={authorizedPerson.id_file_name || (authorizedPerson.id_file_url ? extractFileNameFromUrl(authorizedPerson.id_file_url) : "")}
                onRemoveExisting={() => {
                  updateAP("id_file", null);
                  updateAP("id_file_url", null);
                  updateAP("id_file_name", null);
                }}
                fileType="authorized_person_id"
              />
            </Field>

            <Field label={t("contract.authorization_document") || "مستند تفويض التوقيع"}>
              <FileUpload
                value={authorizedPerson.authorization_file}
                onChange={(file) => updateAP("authorization_file", file)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                maxSizeMB={30}
                showPreview={false}
                existingFileUrl={authorizedPerson.authorization_file_url}
                existingFileName={authorizedPerson.authorization_file_name || (authorizedPerson.authorization_file_url ? extractFileNameFromUrl(authorizedPerson.authorization_file_url) : "")}
                onRemoveExisting={() => {
                  updateAP("authorization_file", null);
                  updateAP("authorization_file_url", null);
                  updateAP("authorization_file_name", null);
                }}
                fileType="authorization_document"
              />
            </Field>
          </FormGrid>
        </div>
      )}
    </FormSection>
  );
}
