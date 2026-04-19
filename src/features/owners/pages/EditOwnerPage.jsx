import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { projectApi } from "../../../services/projects";
import { api } from "../../../services/api";
import { logger } from "../../../utils/logger";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Field from "../../../components/forms/Field";
import FormSection from "../../../components/forms/FormSection";
import FormGrid from "../../../components/forms/FormGrid";
import UniqueFieldInput from "../../../components/forms/UniqueFieldInput";
import PhoneInput from "../../../components/forms/PhoneInput";
import Dialog from "../../../components/common/Dialog";
import { useNotifications } from "../../../contexts/NotificationContext";
import { FaSave, FaUser, FaPhone } from "react-icons/fa";
import "../../../components/forms/EntityEditLayout.css";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function EditOwnerPage() {
 const { ownerName } = useParams();
 const location = useLocation();
 const navigate = useTenantNavigate();
 const { t, i18n } = useTranslation();
 const isAR = /^ar\b/i.test(i18n.language || "");
 const [ownerData, setOwnerData] = useState(location.state?.ownerData || null);
 const { success: toastSuccess } = useNotifications();
 const [saving, setSaving] = useState(false);
 const [errorDialog, setErrorDialog] = useState({ open: false, message: "" });
 const navTimerRef = useRef(null);

 useEffect(() => {
  return () => clearTimeout(navTimerRef.current);
 }, []);

 const [form, setForm] = useState({
  name_ar: "",
  name_en: "",
  nationality: "",
  id_number: "",
  phone: "",
  email: "",
 });

 useEffect(() => {
  if (ownerData) {
   const fullData = ownerData.fullData || {};
   setForm({
    name_ar: ownerData.nameAr || ownerData.name || "",
    name_en: ownerData.nameEn || "",
    nationality: fullData.nationality || "",
    id_number: fullData.id_number || "",
    phone: fullData.phone || "",
    email: fullData.email || "",
   });
  } else {
   navigate("/owners");
  }
 }, [ownerData, navigate]);

 const handleChange = (field, value) => {
  setForm((prev) => ({ ...prev, [field]: value }));
 };

 const handleSave = async () => {
  if (!ownerData || !form.name_ar.trim()) {
   setErrorDialog({ open: true, message: t("owner_name_required") });
   return;
  }

  setSaving(true);

  try {
   const projectsToUpdate = ownerData.projects || [];
   let updatedCount = 0;
   let failedCount = 0;

   for (const project of projectsToUpdate) {
    try {
     const siteplans = await projectApi.getSitePlan(project.id);
     const siteplan = Array.isArray(siteplans) ? siteplans[0] : siteplans;

     if (siteplan && siteplan.owners && Array.isArray(siteplan.owners)) {
      const ownerIndex = siteplan.owners.findIndex(
       (o) =>
        (o.owner_name_ar || o.owner_name || "").toLowerCase().trim() ===
         (ownerData.nameAr || ownerData.name || "").toLowerCase().trim() &&
        (o.id_number || "") === (ownerData.fullData?.id_number || "")
      );

      if (ownerIndex !== -1) {
       const updatedOwners = [...siteplan.owners];
       const currentOwner = updatedOwners[ownerIndex];

       updatedOwners[ownerIndex] = {
        ...currentOwner,
        owner_name_ar: form.name_ar,
        owner_name_en: form.name_en || form.name_ar,
        nationality: form.nationality,
        id_number: form.id_number,
        phone: form.phone,
        email: form.email,
       };

       const updatePayload = {
        owners: updatedOwners.map((o) => ({
         id: o.id,
         owner_name_ar: o.owner_name_ar,
         owner_name_en: o.owner_name_en,
         nationality: o.nationality,
         id_number: o.id_number,
         phone: o.phone,
         email: o.email,
         id_expiry_date: o.id_expiry_date,
         right_hold_type: o.right_hold_type || "Ownership",
         share_possession: o.share_possession,
         share_percent: o.share_percent,
        })),
       };

       await api.patch(`projects/${project.id}/siteplan/${siteplan.id}/`, updatePayload);
       updatedCount++;
      }
     }
    } catch (e) {
     logger.error(`Error updating project ${project.id}`, e);
     failedCount++;
    }
   }

   if (updatedCount > 0) {
    toastSuccess(
     t("owner_updated_success")?.replace("{{count}}", updatedCount) ||
      `Owner updated in ${updatedCount} project(s)`
    );
    navTimerRef.current = setTimeout(() => {
     navigate("/owners");
    }, 1500);
   } else if (failedCount > 0) {
    setErrorDialog({ open: true, message: t("update_failed") });
   }
  } catch (e) {
   logger.error("Error updating owner", e);
   const serverData = e.data || e.originalError?.response?.data || e.response?.data || {};
   const fieldErrors = Object.entries(serverData)
    .filter(([k]) => !['detail', 'message', 'error', 'status_code', 'debug', 'non_field_errors'].includes(k))
    .map(([, v]) => Array.isArray(v) ? v[0] : v)
    .filter(Boolean);
   const errorMessage = fieldErrors.length > 0
    ? fieldErrors.join("\n")
    : serverData.detail || serverData.error || serverData.message || t("update_error");
   setErrorDialog({ open: true, message: errorMessage });
  } finally {
   setSaving(false);
  }
 };

 if (!ownerData) {
  return (
   <PageLayout>
    <div className="container">
     <div className="card">
      <p>{t("owner_data_not_found")}</p>
      <Button onClick={() => navigate("/owners")} variant="primary">
       {t("back_to_owners")}
      </Button>
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
       <Button as={Link} to="/owners" variant="ghost" size="sm">
        ← {t("back_to_owners")}
       </Button>
      </div>
      <h1 className="prj-title">{t("edit_owner")}</h1>
      <p className="prj-subtitle">{t("edit_owner_subtitle")}</p>
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

     {/* Owner Details */}
     <FormSection title={t("owner_details")} icon={<FaUser />}>
      <FormGrid cols={2}>
       <Field label={t("owner_name_ar")} required>
        <input
         className="input"
         value={form.name_ar || ""}
         onChange={(e) => handleChange("name_ar", e.target.value)}
         disabled={saving}
        />
       </Field>
       <Field label={t("owner_name_en")}>
        <input
         className="input"
         dir="ltr"
         value={form.name_en || ""}
         onChange={(e) => handleChange("name_en", e.target.value)}
         disabled={saving}
        />
       </Field>
       <Field label={t("nationality")}>
        <input
         className="input"
         value={form.nationality || ""}
         onChange={(e) => handleChange("nationality", e.target.value)}
         disabled={saving}
        />
       </Field>
       <Field label={t("id_number")}>
        <input
         className="input"
         dir="ltr"
         value={form.id_number || ""}
         onChange={(e) => handleChange("id_number", e.target.value)}
         disabled={saving}
        />
       </Field>
      </FormGrid>
     </FormSection>

     {/* Contact Information */}
     <FormSection title={t("contact_info")} icon={<FaPhone />} noBorder>
      <FormGrid cols={2}>
       <Field label={t("phone")}>
        <PhoneInput value={form.phone || ""}
         onChange={(val) => handleChange("phone", val)}
         excludeType="owner" excludeId={ownerData?.id || ""}
         disabled={saving} />
       </Field>
       <Field label={t("email")}>
        <UniqueFieldInput
         fieldType="email"
         className="input"
         dir="ltr"
         value={form.email || ""}
         onChange={(val) => handleChange("email", val)}
         excludeType="owner"
         excludeId={ownerData?.id || ""}
         disabled={saving}
         placeholder={t("email_placeholder") || "Email@example.com"}
        />
       </Field>
      </FormGrid>
     </FormSection>

     <div className="ds-note-box">
      <p className="prj-muted">
       {t("affects_projects_count")?.replace("{{count}}", ownerData.projects?.length || 0) ||
        `This will update ${ownerData.projects?.length || 0} project(s)`}
      </p>
     </div>

     {/* Footer */}
     <div className="entity-edit__footer">
      <Button
       variant="primary"
       onClick={handleSave}
       disabled={saving || !form.name_ar.trim()}
      >
       <FaSave className={isAR ? "ds-ml-2" : "ds-mr-2"} />
       {saving ? t("saving") : t("save")}
      </Button>
      <Button
       variant="ghost"
       onClick={() => navigate("/owners")}
       disabled={saving}
      >
       {t("cancel")}
      </Button>
     </div>
    </div>
   </div>
  </PageLayout>
 );
}
