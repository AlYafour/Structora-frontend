import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { consultantApi } from "../../../services/consultants";
import { api } from "../../../services/api";
import { logger } from "../../../utils/logger";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Field from "../../../components/forms/Field";
import FormSection from "../../../components/forms/FormSection";
import FormGrid from "../../../components/forms/FormGrid";
import FileUpload from "../../../components/file-upload/FileUpload";
import UniqueFieldInput from "../../../components/forms/UniqueFieldInput";
import PhoneInput from "../../../components/forms/PhoneInput";
import Dialog from "../../../components/common/Dialog";
import { useNotifications } from "../../../contexts/NotificationContext";
import { FaSave, FaUser, FaPhone, FaPen, FaImage } from "react-icons/fa";
import "../../../components/forms/EntityEditLayout.css";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function EditConsultantPage() {
 const { consultantId } = useParams();
 const location = useLocation();
 const navigate = useTenantNavigate();
 const { t, i18n } = useTranslation();
 const isAR = /^ar\b/i.test(i18n.language || "");
 const isNew = consultantId === "new" || !consultantId;

 const { success: toastSuccess } = useNotifications();
 const [consultantData, setConsultantData] = useState(location.state?.consultantData || null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });
 const navTimerRef = useRef(null);

 useEffect(() => {
  return () => clearTimeout(navTimerRef.current);
 }, []);

 const [form, setForm] = useState({
  name: "", name_en: "", license_no: "", registration_number: "",
  phone: "", office_phone: "", email: "", address: "", notes: "",
  image: null, image_url: null, signature: null, signature_url: null,
  stamp: null, stamp_url: null,
 });
 const [stampCleared, setStampCleared] = useState(false);

 useEffect(() => { loadConsultant(); }, [consultantId]);

 const loadConsultant = async () => {
  if (isNew) { setLoading(false); return; }
  setLoading(true);
  try {
   const data = await consultantApi.getById(consultantId);
   setConsultantData(data);
   setForm({
    name: data.name || "", name_en: data.name_en || "",
    license_no: data.license_no || "", registration_number: data.registration_number || "",
    phone: data.phone || "", office_phone: data.office_phone || "",
    email: data.email || "",
    address: data.address || "", notes: data.notes || "",
    image: null, image_url: data.image_url || null,
    signature: null, signature_url: data.signature_url || null,
    stamp: null, stamp_url: data.stamp_url || null,
   });
  } catch (e) {
   logger.error("Error loading consultant", e);
   setErrorDialog({ open: true, message: t("consultant_data_not_found") });
   navTimerRef.current = setTimeout(() => navigate("/consultants"), 2000);
  } finally { setLoading(false); }
 };

 const handleChange = (field, value) => {
  setForm((prev) => ({ ...prev, [field]: value }));
 };

 const handleSave = async () => {
  if (!form.name.trim()) { setErrorDialog({ open: true, message: t("consultant_name_required") }); return; }
  setSaving(true);
  try {
   let payload;
   const hasFiles = form.signature instanceof File || form.image instanceof File || form.stamp instanceof File || stampCleared;
   if (hasFiles) {
    payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("name_en", form.name_en.trim() || "");
    payload.append("license_no", form.license_no.trim() || "");
    payload.append("registration_number", form.registration_number.trim() || "");
    payload.append("phone", form.phone.trim() || "");
    payload.append("office_phone", form.office_phone.trim() || "");
    payload.append("email", form.email.trim() || "");
    payload.append("address", form.address.trim() || "");
    payload.append("notes", form.notes.trim() || "");
    if (form.image instanceof File) payload.append("image", form.image);
    if (form.signature instanceof File) payload.append("signature", form.signature);
    if (form.stamp instanceof File) payload.append("stamp", form.stamp);
    if (stampCleared && !(form.stamp instanceof File)) payload.append("clear_stamp", "true");
   } else {
    payload = {
     name: form.name.trim(), name_en: form.name_en.trim() || "",
     license_no: form.license_no.trim() || "", registration_number: form.registration_number.trim() || "",
     phone: form.phone.trim() || "", office_phone: form.office_phone.trim() || "",
     email: form.email.trim() || "",
     address: form.address.trim() || "", notes: form.notes.trim() || "",
    };
   }
   if (isNew) {
    const { data } = await api.post("consultants/", payload);
    toastSuccess(t("consultant_created_success"));
    navTimerRef.current = setTimeout(() => navigate(`/consultants/${data.id}`), 1200);
   } else {
    const data = await consultantApi.update(consultantId, payload);
    setConsultantData(data);
    setStampCleared(false);
    toastSuccess(t("consultant_updated_success"));
    navTimerRef.current = setTimeout(() => navigate(`/consultants/${consultantId}`), 1200);
   }
  } catch (e) {
   logger.error("Error saving consultant", e);
   const serverData = e.data || e.originalError?.response?.data || e.response?.data || {};
   const fieldErrors = Object.entries(serverData)
    .filter(([k]) => !['detail', 'message', 'error', 'status_code', 'debug', 'non_field_errors'].includes(k))
    .map(([, v]) => Array.isArray(v) ? v[0] : v)
    .filter(Boolean);
   const errorMessage = fieldErrors.length > 0
    ? fieldErrors.join("\n")
    : serverData.detail || serverData.error || serverData.message || t("save_error");
   setErrorDialog({ open: true, message: errorMessage });
  } finally { setSaving(false); }
 };

 if (loading) return <PageLayout loading={true} loadingText={t("loading")} />;

 if (errorDialog.open && !isNew && !form.name) {
  return (
   <PageLayout>
    <div className="container">
     <div className="card">
      <p>{errorDialog.message}</p>
      <Button onClick={() => navigate("/consultants")} variant="primary">{t("back_to_consultants")}</Button>
     </div>
    </div>
   </PageLayout>
  );
 }

 return (
  <PageLayout>
   <div className="container">
    <div className="card">
     {/* Header */}
     <div className="prj-header">
      <div className="ds-flex ds-gap-3 ds-mb-2">
       <Button as={Link} to={isNew ? "/consultants" : `/consultants/${consultantId}`} variant="ghost" size="sm">
        ← {isNew ? t("back_to_consultants") : t("back")}
       </Button>
      </div>
      <h1 className="prj-title">{isNew ? t("add_consultant") : t("edit_consultant")}</h1>
      <p className="prj-subtitle">{isNew ? t("add_consultant_subtitle") : t("edit_consultant_subtitle")}</p>
     </div>

     <Dialog
      open={errorDialog.open}
      title={t("error")}
      onClose={() => setErrorDialog({ open: false, message: "" })}
      confirmLabel={t("ok")}
      onConfirm={() => setErrorDialog({ open: false, message: "" })}
      danger
      size="small"
     >
      <p style={{ whiteSpace: "pre-line" }}>{errorDialog.message}</p>
     </Dialog>

     {/* 1) Consultant Details */}
     <FormSection title={t("consultant_details")} icon={<FaUser />} collapsible>
      <FormGrid cols={2}>
       <Field label={t("consultant_name")} required>
        <input className="input" value={form.name}
         onChange={(e) => handleChange("name", e.target.value)}
         disabled={saving} placeholder={t("consultant_name_placeholder")} />
       </Field>
       <Field label={t("consultant_name_en")}>
        <input className="input" dir="ltr" value={form.name_en}
         onChange={(e) => handleChange("name_en", e.target.value)}
         disabled={saving} placeholder="Consultant Name (English)" />
       </Field>
       <Field label={t("consultant_municipality_license")}>
        <input className="input" value={form.license_no}
         onChange={(e) => handleChange("license_no", e.target.value)}
         disabled={saving} placeholder={t("consultant_municipality_license_placeholder")} />
       </Field>
       <Field label={t("consultant_fab_registration")}>
        <input className="input" value={form.registration_number}
         onChange={(e) => handleChange("registration_number", e.target.value)}
         disabled={saving} placeholder={t("consultant_fab_registration_placeholder")} />
       </Field>
      </FormGrid>
     </FormSection>

     {/* 2) Contact Information */}
     <FormSection title={t("contact_info")} icon={<FaPhone />} collapsible>
      <FormGrid cols={2}>
       <Field label={t("phone")}>
        <PhoneInput value={form.phone}
         onChange={(val) => handleChange("phone", val)}
         excludeType="consultant" excludeId={consultantId || ""}
         disabled={saving} />
       </Field>
       <Field label={t("consultant_office_phone")}>
        <input className="input" value={form.office_phone}
         onChange={(e) => handleChange("office_phone", e.target.value)}
         disabled={saving} placeholder={t("consultant_office_phone_placeholder")} dir="ltr" />
       </Field>
       <Field label={t("email")}>
        <UniqueFieldInput fieldType="email" className="input" dir="ltr"
         value={form.email} onChange={(val) => handleChange("email", val)}
         excludeType="consultant" excludeId={consultantId || ""}
         disabled={saving} placeholder="Email@example.com" />
       </Field>
       <Field label={t("address")}>
        <input className="input" value={form.address}
         onChange={(e) => handleChange("address", e.target.value)}
         disabled={saving} placeholder={t("address_placeholder")} />
       </Field>
      </FormGrid>
      <FormGrid cols={1} className="ds-mt-4">
       <Field label={t("notes")}>
        <textarea className="input" rows={3} value={form.notes}
         onChange={(e) => handleChange("notes", e.target.value)}
         disabled={saving} placeholder={t("notes_placeholder")} />
       </Field>
      </FormGrid>
     </FormSection>

     {/* 3) Attachments */}
     <FormSection title={t("attachments")} icon={<FaImage />} collapsible>
      <FormGrid cols={2}>
       <Field label={t("logo")}>
        <FileUpload value={form.image}
         onChange={(file) => { if (file) handleChange("image", file); }}
         accept="image/png,image/jpeg,image/jpg,image/webp" maxSizeMB={5}
         showPreview={true} existingFileUrl={form.image_url}
         existingFileName={t("logo")}
         onRemoveExisting={() => setForm((prev) => ({ ...prev, image: null, image_url: null }))}
         disabled={saving} fileType="image" />
       </Field>
       <Field label={t("signature")}>
        <FileUpload value={form.signature}
         onChange={(file) => { if (file) handleChange("signature", file); }}
         accept="image/png,image/jpeg,image/jpg,image/webp" maxSizeMB={5}
         showPreview={true} existingFileUrl={form.signature_url}
         existingFileName={t("signature")}
         onRemoveExisting={() => setForm((prev) => ({ ...prev, signature: null, signature_url: null }))}
         disabled={saving} fileType="signature" />
       </Field>
       <Field label={t("consultant_stamp")}>
        <FileUpload value={form.stamp}
         onChange={(file) => { if (file) handleChange("stamp", file); }}
         accept="image/png,image/jpeg,image/jpg,image/webp" maxSizeMB={5}
         showPreview={true} existingFileUrl={form.stamp_url}
         existingFileName={t("consultant_stamp")}
         onRemoveExisting={() => { setForm((prev) => ({ ...prev, stamp: null, stamp_url: null })); setStampCleared(true); }}
         disabled={saving} fileType="stamp" />
       </Field>
      </FormGrid>
     </FormSection>

     {consultantData && consultantData.projects_count > 0 && (
      <div className="ds-note-box">
       <p className="prj-muted">
        {t("consultant_projects_count")?.replace("{{count}}", consultantData.projects_count) ||
         `This consultant is associated with ${consultantData.projects_count} project(s)`}
       </p>
      </div>
     )}

     {/* Footer */}
     <div className="entity-edit__footer">
      <Button variant="primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
       <FaSave className={isAR ? "ds-ml-2" : "ds-mr-2"} />
       {saving ? t("saving") : t("save")}
      </Button>
      <Button variant="ghost" disabled={saving}
       onClick={() => { if (isNew) navigate("/consultants"); else navigate(`/consultants/${consultantId}`); }}>
       {t("cancel")}
      </Button>
     </div>
    </div>
   </div>
  </PageLayout>
 );
}
