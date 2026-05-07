// Unified owner form component
import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import RtlSelect from "../../../../components/forms/RtlSelect";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import FileUpload from "../../../../components/file-upload/FileUpload";
import DateInput from "../../../../components/forms/DateInput";
import UniqueFieldInput from "../../../../components/forms/UniqueFieldInput";
import PhoneInput from "../../../../components/forms/PhoneInput";
import useUniquenessCheck from "../../../../hooks/useUniquenessCheck";
import "./wizard.css";
import { NATIONALITIES } from "../../../../utils/constants";
import { handleEmiratesIdInput } from "../../../../utils/formatters/id";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import { formatUAEPhone, calculateBirthDateFromEmiratesId } from "../../../../utils/formatters/id";
import { formatOwnerName } from "../../../../utils/helpers/string";
import { formatDate } from "../../../../utils/formatters";
import { api } from "../../../../services/api";
import { logger } from "../../../../utils/logger";
import VerifiableField from "./VerifiableField";

let _ownerUidCounter = 0;
export function generateOwnerUid() {
  return `owner_${Date.now()}_${++_ownerUidCounter}`;
}

export const EMPTY_OWNER = {
 _uid: "",  // Stable unique key for React rendering (set on creation)
 owner_name_ar: "",
 owner_name_en: "",
 gender: "male",
 nationality: "",
 id_number: "",
 id_issue_date: "",
 id_expiry_date: "",
 id_attachment: null,
 right_hold_type: "Ownership",
 share_possession: "",
 share_percent: "100",
 phone: "",
 email: "",
 is_authorized: false, // Authorized owner
};

export default function OwnerForm({ owner, index, isView, onUpdate, onRemove, canRemove, isAR, idAttachmentUrl, projectId, idAttachmentFileName, hideContactInfo = false, hideIdUpload = false, isAuthorized = false, onAuthorizedChange, verifiedFields = {}, onToggleVerify }) {
 const { t, i18n } = useTranslation();
 const nationalityOptions = NATIONALITIES.map(n => ({
 value: n.value,
 label: isAR ? n.label.ar : n.label.en
 }));

 // Uniqueness checks for phone and id_number
 const { checkUniqueness } = useUniquenessCheck();
 const [phoneDupError, setPhoneDupError] = useState(null);
 const [idDupError, setIdDupError] = useState(null);
 const phoneDebouce = useRef(null);
 const idDebouce = useRef(null);

 const checkPhone = useCallback((val) => {
   if (phoneDebouce.current) clearTimeout(phoneDebouce.current);
   if (!val || val.length < 7) { setPhoneDupError(null); return; }
   phoneDebouce.current = setTimeout(async () => {
     const r = await checkUniqueness("phone", val, "owner", owner.id || "");
     if (!r.cancelled && r.exists) {
       const typeLabel = t(`entity_types.${r.owner_type}`) || r.owner_type;
       setPhoneDupError(t("validation.duplicate_phone", { name: r.owner_name, type: typeLabel }));
     } else if (!r.cancelled) setPhoneDupError(null);
   }, 600);
 }, [checkUniqueness, owner.id, t]);

 const checkId = useCallback((val) => {
   if (idDebouce.current) clearTimeout(idDebouce.current);
   if (!val || val.replace(/[-\s]/g, "").length < 15) { setIdDupError(null); return; }
   idDebouce.current = setTimeout(async () => {
     const r = await checkUniqueness("id_number", val, "owner", owner.id || "");
     if (!r.cancelled && r.exists) {
       const typeLabel = t(`entity_types.${r.owner_type}`) || r.owner_type;
       setIdDupError(t("validation.duplicate_id_number", { name: r.owner_name, type: typeLabel }));
     } else if (!r.cancelled) setIdDupError(null);
   }, 600);
 }, [checkUniqueness, owner.id, t]);

 const [isExtractingId, setIsExtractingId] = useState(false);

 // Handle ID attachment upload — extract data via OCR
 const handleIdAttachmentChange = async (file) => {
   onUpdate(index, "id_attachment", file);

   if (!file || !(file instanceof File)) return;

   const name = file.name.toLowerCase();
   const isValid = name.endsWith('.pdf') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
   if (!isValid) return;

   setIsExtractingId(true);
   try {
     const fd = new FormData();
     fd.append("file", file);
     const { data: result } = await api.post("extract-id-card-data/", fd);


     if (result?.data && Object.keys(result.data).length > 0) {
       const d = result.data;
       // Always overwrite with AI-extracted data (Claude Vision is reliable)
       if (d.owner_name_ar) onUpdate(index, "owner_name_ar", d.owner_name_ar);
       if (d.owner_name_en) onUpdate(index, "owner_name_en", d.owner_name_en);
       if (d.id_number) onUpdate(index, "id_number", d.id_number);
       if (d.nationality) onUpdate(index, "nationality", d.nationality);
       if (d.id_expiry_date) onUpdate(index, "id_expiry_date", d.id_expiry_date);
       if (d.id_issue_date) onUpdate(index, "id_issue_date", d.id_issue_date);
     }
   } catch (err) {
     logger.warn("Could not extract data from ID card", err);
   } finally {
     setIsExtractingId(false);
   }
 };

 if (isView) {
 return (
 <div className="owner-block">
 <div className="owner-block__header">
   <div className="owner-block__title">
     <span className="owner-block__num">{index + 1}</span>
     <span className="owner-block__label">{t("owner")} {index + 1}</span>
     {owner.is_authorized && (
       <span className="owner-block__auth-badge">{t("authorized_owner")} ✓</span>
     )}
   </div>
 </div>
 <div className="form-grid cols-4" style={{ padding: "16px 18px" }}>
 <ViewRow label={t("owner_name_ar")} value={owner.owner_name_ar} />
 <ViewRow label={t("owner_name_en")} value={owner.owner_name_en} />
 <ViewRow label={t("nationality")} value={owner.nationality} />
 <ViewRow label={t("gender")} value={owner.gender === 'female' ? t("female") : t("male")} />
 <ViewRow label={t("phone")} value={owner.phone} />
 <ViewRow label={t("email")} value={owner.email} />
 <ViewRow label={t("id_number")} value={owner.id_number} />
 {owner.birth_date && (
 <ViewRow label={t("birth_date")} value={formatDate(owner.birth_date, i18n.language)} />
 )}
 <ViewRow label={t("expiry_date")} value={formatDate(owner.id_expiry_date, i18n.language)} />
 {!hideIdUpload && (
 <Field label={t("id_attachment")}>
 <FileAttachmentView
 fileUrl={
 typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== ""
 ? owner.id_attachment
 : idAttachmentUrl
 }
 fileName={
 typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== ""
 ? extractFileNameFromUrl(owner.id_attachment)
 : (idAttachmentFileName || (idAttachmentUrl ? extractFileNameFromUrl(idAttachmentUrl) : "") || (owner.id_attachment?.name || ""))
 }
 projectId={projectId}
 endpoint={`projects/${projectId}/siteplan/`}
 />
 </Field>
 )}
 <ViewRow label={t("right_hold_type")} value={owner.right_hold_type} />
 <ViewRow
 label={t("share_percent")}
 value={owner.share_percent ? `${parseFloat(owner.share_percent) % 1 === 0 ? parseInt(owner.share_percent, 10) : parseFloat(owner.share_percent)}%` : "0%"}
 />
 </div>
 </div>
 );
 }

 return (
 <div className="owner-block">
 {/* Owner header: number + label + authorized radio + delete */}
 <div className="owner-block__header">
   <div className="owner-block__title">
     <span className="owner-block__num">{index + 1}</span>
     <span className="owner-block__label">{t("owner")} {index + 1}</span>
     {isAuthorized && (
       <span className="owner-block__auth-badge">{t("authorized_owner")} ✓</span>
     )}
   </div>
   <div className="owner-block__header-actions">
     {onAuthorizedChange && (
       <label className="owner-block__auth-toggle">
         <input
           type="radio"
           name="authorized_owner"
           checked={isAuthorized}
           onChange={() => onAuthorizedChange(index)}
         />
         <span>{t("authorized_owner")}</span>
       </label>
     )}
     {canRemove && (
       <button
         type="button"
         className="owner-block__delete-btn"
         onClick={() => onRemove(index)}
         title={t("remove")}
       >
         <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <polyline points="3 6 5 6 21 6" />
           <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
           <path d="M10 11v6M14 11v6" />
           <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
         </svg>
         {t("remove")}
       </button>
     )}
   </div>
 </div>
 {/* Row 1: Names + Nationality + Gender */}
 <div className="form-grid cols-4">
 <VerifiableField fieldName={`owner_name_ar_${index}`} verified={verifiedFields[`owner_name_ar_${index}`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("owner_name_ar")}>
 <input className="input" value={owner.owner_name_ar} onChange={(e) => onUpdate(index, "owner_name_ar", e.target.value)} />
 </Field>
 </VerifiableField>
 <VerifiableField fieldName={`owner_name_en_${index}`} verified={verifiedFields[`owner_name_en_${index}`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("owner_name_en")}>
 <input className="input" value={owner.owner_name_en} onChange={(e) => { const formatted = formatOwnerName(e.target.value); onUpdate(index, "owner_name_en", formatted); }} />
 </Field>
 </VerifiableField>
 <VerifiableField fieldName={`nationality_${index}`} verified={verifiedFields[`nationality_${index}`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("nationality")}>
 <RtlSelect className="rtl-select" options={nationalityOptions} value={owner.nationality} onChange={(v) => onUpdate(index, "nationality", v)} placeholder={t("select_nationality")} />
 </Field>
 </VerifiableField>
 <VerifiableField fieldName={`gender_${index}`} verified={verifiedFields[`gender_${index}`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("gender")}>
 <select className="input" value={owner.gender || "male"} onChange={(e) => onUpdate(index, "gender", e.target.value)}>
 <option value="male">{t("male")}</option>
 <option value="female">{t("female")}</option>
 </select>
 </Field>
 </VerifiableField>
 </div>

 {/* Row 2: Contact Info */}
 {!hideContactInfo && (
 <div className="form-grid cols-3 mt-8">
 <Field label={t("phone")}>
 <PhoneInput value={owner.phone ? owner.phone.replace("+971", "") : ""} onChange={(val) => { const formatted = val ? `+971${val}` : ""; onUpdate(index, "phone", formatted); checkPhone(formatted); }} excludeType="owner" excludeId={owner.id || ""} />
 {phoneDupError && <div className="wizard-field-error wizard-field-error--duplicate">{phoneDupError}</div>}
 </Field>
 <Field label={t("email")}>
 <UniqueFieldInput fieldType="email" value={owner.email || ""} onChange={(val) => onUpdate(index, "email", val)} excludeType="owner" excludeId={owner.id || ""} placeholder={t("email_placeholder") || "Email@example.com"} />
 </Field>
 <div />
 </div>
 )}

 {/* Row 3: ID Number + Expiry */}
 <div className="form-grid cols-3 mt-8">
 <VerifiableField fieldName={`id_number_${index}`} verified={verifiedFields[`id_number_${index}`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("id_number")}>
 <input
 className={`input${idDupError ? " input--error" : ""}`}
 value={owner.id_number || ""}
 onChange={(e) => { handleEmiratesIdInput(e, (v) => { onUpdate(index, "id_number", v); checkId(v); if (v && v.replace(/[-\s]/g, "").length === 15) { const birthDate = calculateBirthDateFromEmiratesId(v); if (birthDate) onUpdate(index, "birth_date", birthDate); } }); }}
 maxLength={18}
 placeholder={t("id_placeholder")}
 />
 {idDupError && <div className="wizard-field-error wizard-field-error--duplicate">{idDupError}</div>}
 </Field>
 </VerifiableField>
 <VerifiableField fieldName={`id_expiry_date_${index}`} verified={verifiedFields[`id_expiry_date_${index}`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("expiry_date")}>
 <DateInput className="input" value={owner.id_expiry_date || ""} onChange={(value) => onUpdate(index, "id_expiry_date", value)} />
 </Field>
 </VerifiableField>
 </div>

 {/* Row 4: Right hold type + Share percent + Signature (same row) */}
 <div className="form-grid cols-4 mt-8">
 <VerifiableField fieldName={`right_hold_type_${index}`} verified={verifiedFields[`right_hold_type_${index}`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("right_hold_type")}>
 <select className="input" value={owner.right_hold_type} onChange={(e) => onUpdate(index, "right_hold_type", e.target.value)}>
 <option value={t("right_hold_type_grant")}>{t("right_hold_type_grant")}</option>
 <option value={t("right_hold_type_purchase")}>{t("right_hold_type_purchase")}</option>
 </select>
 </Field>
 </VerifiableField>
 <VerifiableField fieldName={`share_percent_${index}`} verified={verifiedFields[`share_percent_${index}`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("share_percent")}>
 <div className="wizard-percent-wrapper">
 <input className="input" type="number" min="0" max="100" value={owner.share_percent}
 onChange={(e) => onUpdate(index, "share_percent", e.target.value)}
 onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }} />
 <span className="wizard-percent-suffix">%</span>
 </div>
 </Field>
 </VerifiableField>
 {/* Signature — spans cols 3+4 */}
 <div style={{ gridColumn: "span 2" }}>
 <Field label={t("signature")}>
   <FileUpload
     value={owner.signature instanceof File ? owner.signature : null}
     onChange={(file) => onUpdate(index, "signature", file)}
     accept="image/png,image/jpeg,image/jpg,image/webp"
     maxSizeMB={5}
     showPreview={true}
     existingFileUrl={owner.signature_url || null}
     existingFileName={t("signature")}
     onRemoveExisting={() => { onUpdate(index, "signature", null); onUpdate(index, "signature_url", null); }}
     fileType="signature"
   />
 </Field>
 </div>
 </div>

 {/* Row 5: ID attachment only */}
 {!hideIdUpload && (
 <div className="form-grid cols-2 mt-8">
 <Field label={t("id_attachment")}>
 <FileUpload
 value={owner.id_attachment instanceof File ? owner.id_attachment : null}
 onChange={handleIdAttachmentChange}
 accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
 maxSizeMB={30}
 showPreview={true}
 existingFileUrl={typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== "" ? owner.id_attachment : idAttachmentUrl}
 existingFileName={typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== "" ? extractFileNameFromUrl(owner.id_attachment) : (idAttachmentFileName || (idAttachmentUrl ? extractFileNameFromUrl(idAttachmentUrl) : ""))}
 onRemoveExisting={() => onUpdate(index, "id_attachment", null)}
 compressionOptions={{ maxSizeMB: 1, maxWidthOrHeight: 1920 }}
 />
 {isExtractingId && (
   <div className="wizard-extract-indicator" style={{ marginTop: '0.5rem' }}>
     <svg className="wizard-extract-indicator__spinner" viewBox="0 0 24 24" width="16" height="16">
       <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
     </svg>
     <span>{t("extracting_id_data")}</span>
   </div>
 )}
 </Field>
 <div />
 </div>
 )}
 </div>
 );
}

