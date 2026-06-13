import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import useViewMode from "../hooks/useViewMode";
import { useTranslation } from "react-i18next";
import { api, API_BASE_URL } from "../../../../services/api";
import { useLanguage } from "../../../../hooks";
import { useAuth } from "../../../../contexts/AuthContext";
import { FiCamera, FiX } from "react-icons/fi";

// Unified Design System Components
import {
  FormField,
  FormInput,
  FormSection,
  FormGrid,
  FormChips,
  FormTextarea,
  FormViewField,
} from "../../../../components/ui/form";

// Components
import ErrorDialog from "../components/ErrorDialog";
import Field from "../../../../components/forms/Field";
import WizardShell from "../components/WizardShell";
import StepActions from "../components/StepActions";
import ConsultantFeesSection from "../components/ConsultantFeesSection";
import Button from "../../../../components/common/Button";
import BrandedLoader from "../../../../components/common/BrandedLoader";
import ContractBasicInfoSection from "../components/ContractBasicInfoSection";
import ContractPartiesSection from "../components/ContractPartiesSection";
import ContractSignerSection from "../components/ContractSignerSection";
import ContractAttachmentsSection from "../components/ContractAttachmentsSection";
import OfficialCommunicationSection from "../components/OfficialCommunicationSection";
import ContractDrawingsSection from "../components/ContractDrawingsSection";
import ContractClausesSection from "../components/ContractClausesSection";
import useContract from "../../../../hooks/useContract";
import useStepSave from "../hooks/useStepSave";
import { WIZARD_CONTRACT_TYPES, WIZARD_CONTRACT_CLASSIFICATIONS } from "../../../../utils/constants";
import { toIsoDate, num } from "../../../../utils/formatters";
import { toBool, formatServerErrors } from "../../../../utils/helpers";
import { validateEmail } from "../../../../utils/validators/email";
import { logger } from "../../../../utils/logger";
import { getErrorMessage } from "../../../../utils/errorHandler";
import { extractFileNameFromUrl, buildFileUrl } from "../../../../utils/helpers/file";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';
import UniqueFieldInput from "../../../../components/forms/UniqueFieldInput";

export default function ContractStep({ projectId, onPrev, onNext, isView: isViewProp, isNewProject = false, onCreateProject, setup, onSetupChange, siteplanSnapshot, noPermit = false, onDocFilesChange, onFormSectionChange, hasBlockingErrors = false }) {
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const { isArabic: isAR } = useLanguage();
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.name === "company_super_admin" || user?.is_superuser;
  const { form, setForm, setF, existingId, setExistingId, isView: isViewState, setIsView, loading: contractLoading } = useContract(projectId);
  const authorizedOwnerLoadingRef = useRef(false);
  const authorizedOwnerLoadedOnceRef = useRef(false);
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(navTimerRef.current);
  }, []);

  // Report the complete contract section only when at least one date has been entered
  useEffect(() => {
    if (!form.contract_date && !form.project_end_date) return;
    onFormSectionChange?.("contract_section", {
      contract_date:           form.contract_date           || "",
      total_project_value:     form.total_project_value ? String(parseFloat(String(form.total_project_value).replace(/,/g, "")) || "") : "",
      total_bank_value:        form.total_bank_value    ? String(parseFloat(String(form.total_bank_value).replace(/,/g, ""))    || "") : "",
      total_owner_value:       form.total_owner_value   ? String(parseFloat(String(form.total_owner_value).replace(/,/g, ""))   || "") : "",
    });
  }, [
    form.contract_date,
    form.total_project_value, form.total_bank_value, form.total_owner_value,
    onFormSectionChange,
  ]);

  const [viewMode, updateViewMode] = useViewMode(isViewProp, isViewState, setIsView);
  const { isSaving, errorMsg, setErrorMsg, runSave } = useStepSave();

  const handleContractFileChange = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: result } = await api.post("ai-assistant/parse-contract/", fd);
      if (result?.error === "wrong_document_type") {
        setF("contract_file", null);
        setErrorMsg(t("wrong_document_type_contract"));
      }
    } catch (err) {
      if (err?.response?.data?.error === "wrong_document_type") {
        setF("contract_file", null);
        setErrorMsg(t("wrong_document_type_contract"));
      }
    }
  };

  // ─── Project Codes & Image ───
  const internalCode = setup?.internalCode || "";   // auto-generated (read-only)
  const legacyCode = setup?.legacyCode || "";       // old code (optional, editable)
  const setSetupField = (k, v) => onSetupChange?.((prev) => ({ ...prev, [k]: v }));
  const [projectImage, setProjectImage] = useState(null);
  const [projectImagePreview, setProjectImagePreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const imageInputRef = useRef(null);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    setProjectImage(file);
    setProjectImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
    setSetupField("_projectImageFile", file);
  }, [onSetupChange]);

  const handleImageRemove = useCallback(() => {
    setProjectImage(null);
    setProjectImagePreview(null);
    setImageRemoved(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setSetupField("_projectImageFile", null);
  }, [onSetupChange]);

  // Load project image for existing projects
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/`);
        if (data?.project_image && !projectImagePreview) {
          const imgUrl = data.project_image.startsWith("http")
            ? data.project_image
            : buildFileUrl(data.project_image);
          setProjectImagePreview(imgUrl);
        }
      } catch (_e) { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Static lists — built from shared constants, translated at render time
  const contractClassificationOptions = useMemo(
    () => WIZARD_CONTRACT_CLASSIFICATIONS.map((item) => ({
      value: item.value,
      label: t(item.labelKey),
      desc: t(item.descKey),
    })),
    [t]
  );

  // PDF review states
  const [contractReviewState, setContractReviewState] = useState({ confirmedPages: new Set(), totalPages: 0 });
  const [contractReviewDone, setContractReviewDone] = useState(false);
  const [appendixReviewStates, setAppendixReviewStates] = useState({});
  const [appendixReviewDone, setAppendixReviewDone] = useState({});
  const [authDocReviewState, setAuthDocReviewState] = useState({ confirmedPages: new Set(), totalPages: 0 });
  const [authDocReviewDone, setAuthDocReviewDone] = useState(false);
  const [acknowledgmentChecked, setAcknowledgmentChecked] = useState(false);
  const [contractorSignatureUrl, setContractorSignatureUrl] = useState(null);
  const [consultantSignatures, setConsultantSignatures] = useState([]);

  // Reset auth doc review when authorization file changes
  const prevAuthFileRef = useRef(form.authorized_person?.authorization_file);
  useEffect(() => {
    const currentFile = form.authorized_person?.authorization_file;
    if (currentFile !== prevAuthFileRef.current) {
      prevAuthFileRef.current = currentFile;
      setAuthDocReviewState({ confirmedPages: new Set(), totalPages: 0 });
      setAuthDocReviewDone(false);
      setAcknowledgmentChecked(false);
    }
  }, [form.authorized_person?.authorization_file]);

  const handleAppendixReviewStateChange = useCallback((key, state) => {
    setAppendixReviewStates(prev => ({ ...prev, [key]: state }));
  }, []);
  const handleAppendixReviewComplete = useCallback((key, done) => {
    setAppendixReviewDone(prev => ({ ...prev, [key]: done }));
  }, []);

  // Unified list of all file fields (to avoid repetition)
  const FILE_FIELDS = useMemo(() => [
    "contract_file",
    "contract_appendix_file",
    "contract_explanation_file",
    "quantities_table_file",
    "approved_materials_table_file",
    "price_offer_file",
    "architectural_drawings_file",
    "structural_drawings_file",
    "ac_drawings_file",
    "electrical_drawings_file",
    "water_supply_drawings_file",
    "drainage_drawings_file",
    "telecommunication_drawings_file",
    "fire_fighting_drawings_file",
    "cctv_drawings_file",
    "mep_drawings_file",
    "decoration_drawings_file",
    "contractual_drawings_file",
    "general_specifications_file",
  ], []);

  /** Load file URLs/names from contract API data into form state */
  const syncFileUrlsFromApi = (contractData) => {
    for (const field of FILE_FIELDS) {
      if (contractData[field]) {
        const url = contractData[field];
        const nameKey = `${field}_name`;
        const fileName = contractData[nameKey] || extractFileNameFromUrl(url);
        setF(`${field}_url`, url);
        setF(nameKey, fileName);
      }
    }
  };

  /** Clear File objects from form after successful save */
  const clearFileObjects = () => {
    for (const field of FILE_FIELDS) {
      if (form[field] instanceof File) setF(field, null);
    }
  };

  /** Parse dynamic attachments from API response */
  const parseAttachmentsFromApi = (rawAttachments) => {
    if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) return [];
    return rawAttachments
      .filter(att => {
        if (!att) return false;
        // Filter out main_contract type
        if (att.type === "main_contract") return false;
        // Filter out empty attachments (no file, no notes, no price)
        const hasFile = att.file_url && String(att.file_url).trim() !== "";
        const hasNotes = att.notes && String(att.notes).trim() !== "";
        const hasPrice = att.price !== undefined && att.price !== null && String(att.price).trim() !== "" && att.price !== 0;
        if (!hasFile && !hasNotes && !hasPrice) return false;
        return true;
      })
      .map(att => ({
        type: att.type || "appendix",
        date: att.date || "",
        notes: att.notes || "",
        price: att.price ?? "",
        file: null,
        file_url: att.file_url || null,
        file_name: att.file_name || (att.file_url ? extractFileNameFromUrl(att.file_url) : null),
      }));
  };

  const CONTRACT_TYPES = useMemo(
    () => WIZARD_CONTRACT_TYPES.map((item) => ({ value: item.value, label: t(item.key) })),
    [t]
  );

  // Auto-calculate owner funding
  useEffect(() => {
    const total = num(form.total_project_value, 0);
    const isHousing = !noPermit && form.contract_classification === "housing_loan_program";

    const bank = isHousing ? num(form.total_bank_value, 0) : 0;
    const owner = isHousing ? Math.max(0, total - bank) : total;

    const currentOwner = num(form.total_owner_value, 0);

    if (Math.abs(owner - currentOwner) > 0.01) {
      setF("total_owner_value", String(owner));
    }

    if (!isHousing && num(form.total_bank_value, 0) !== 0) {
      setF("total_bank_value", "0");
    }
  }, [
    form.contract_classification,
    form.total_project_value,
    form.total_bank_value,
    form.total_owner_value,
    noPermit,
    setF,
  ]);

  // File URLs and attachments are loaded by useContract — no separate fetch needed here

  // Load signatures for reference panel
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        // Load contractor signature from company settings
        const { data: settings } = await api.get("auth/tenant-settings/current/");
        if (settings?.contractor_signature_url) {
          setContractorSignatureUrl(settings.contractor_signature_url);
        }
      } catch (_e) { /* ignore */ }

      try {
        // Load consultant signatures for this project
        const { data: consultants } = await api.get(`project-consultants/?project=${projectId}`);
        if (Array.isArray(consultants)) {
          const sigs = consultants
            .filter(pc => pc.consultant?.signature_url)
            .map(pc => ({
              url: pc.consultant.signature_url,
              label: `${t("consultant")} - ${pc.consultant.name || pc.consultant.name_en || ""}`,
            }));
          setConsultantSignatures(sigs);
        }
      } catch (_e) { /* ignore */ }
    })();
  }, [projectId, t]);

  // Build signatures array for PDF reviewer
  const signatures = useMemo(() => {
    const sigs = [];

    // Contractor/company signature
    if (contractorSignatureUrl) {
      sigs.push({ url: contractorSignatureUrl, label: t("entity_types.contractor") });
    }

    // Owner signatures (authorized owners, fallback to all if none marked)
    const owners = Array.isArray(form.owners) ? form.owners : [];
    const sigOwners = owners.filter(o => o.is_authorized).length > 0
      ? owners.filter(o => o.is_authorized)
      : owners;
    sigOwners.forEach(o => {
      const ownerLabel = `${t("entity_types.owner")} - ${o.owner_name_ar || o.owner_name_en || ""}`;
      if (o.signature instanceof File) {
        sigs.push({ url: URL.createObjectURL(o.signature), label: ownerLabel, _blobFile: true });
      } else if (o.signature_url) {
        sigs.push({ url: o.signature_url, label: ownerLabel });
      }
    });

    // Authorized person signature
    if (form.signer_type === "authorized_person") {
      const ap = form.authorized_person;
      if (ap?.signature_file instanceof File) {
        sigs.push({ url: URL.createObjectURL(ap.signature_file), label: t("entity_types.authorized_person"), _blobFile: true });
      } else if (ap?.signature_url) {
        sigs.push({ url: ap.signature_url, label: t("entity_types.authorized_person") });
      }
    }

    // Consultant signatures
    sigs.push(...consultantSignatures);

    return sigs;
  }, [contractorSignatureUrl, form.owners, form.signer_type, form.authorized_person, consultantSignatures, t]);

  // Cleanup blob URLs created for File-based signatures
  useEffect(() => {
    return () => {
      signatures.forEach(sig => {
        if (sig._blobFile && sig.url) {
          URL.revokeObjectURL(sig.url);
        }
      });
    };
  }, [signatures]);

  // For NEW projects: populate owners from siteplan snapshot (passed from WizardPage)
  useEffect(() => {
    if (!isNewProject || !siteplanSnapshot) return;
    const snapshotOwners = Array.isArray(siteplanSnapshot.owners) ? siteplanSnapshot.owners : [];
    if (snapshotOwners.length > 0) {
      setForm((prev) => ({
        ...prev,
        owners: snapshotOwners.map(o => ({
          owner_name_ar: o.owner_name_ar || "",
          owner_name_en: o.owner_name_en || "",
          id_number: o.id_number || "",
          share_percent: o.share_percent || "100",
          is_authorized: o.is_authorized || false,
          phone: o.phone || "",
          email: o.email || "",
        })),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewProject, siteplanSnapshot]);

  // Sync authorized owner from SitePlan as the source of truth (existing projects only)
  useEffect(() => {
    if (!projectId) return;

    const loadAuthorizedOwner = async (force = false) => {
      if (authorizedOwnerLoadingRef.current) return;
      if (!force && authorizedOwnerLoadedOnceRef.current) return;
      authorizedOwnerLoadingRef.current = true;
      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);
        if (Array.isArray(data) && data.length > 0) {
          const spOwners = Array.isArray(data[0]?.owners) ? data[0].owners : [];
          if (spOwners.length) {
            setForm((prev) => {
              const currentOwners = Array.isArray(prev.owners) ? prev.owners : [];
              const mergedOwners = spOwners.map((spOwner) => {
                const matchingOwner = currentOwners.find(
                  (co) =>
                    (spOwner.id_number && co.id_number && spOwner.id_number.trim() === co.id_number.trim()) ||
                    (spOwner.owner_name_ar && co.owner_name_ar && spOwner.owner_name_ar.trim() === co.owner_name_ar.trim())
                );

                return {
                  ...spOwner,
                  phone: matchingOwner?.phone || spOwner.phone || "",
                  email: matchingOwner?.email || spOwner.email || "",
                };
              });
              return {
                ...prev,
                owners: mergedOwners,
              };
            });
          } else {
            setForm((prev) => ({
              ...prev,
              owners: Array.isArray(prev.owners) ? prev.owners : [],
            }));
          }
        }
        authorizedOwnerLoadedOnceRef.current = true;
      } catch (e) {
        logger.error("Failed to load siteplan owners", e);
      }
      authorizedOwnerLoadingRef.current = false;
    };

    loadAuthorizedOwner(false);

    const handler = (ev) => {
      if (ev?.detail?.projectId && ev.detail.projectId !== projectId) return;
      loadAuthorizedOwner(true);
    };
    window.addEventListener("siteplan-owners-updated", handler);
    return () => window.removeEventListener("siteplan-owners-updated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Build payload and save
  const buildPayload = () => {
    const contractType = (form.contract_type || "").trim();
    if (!contractType || contractType === "") {
      throw new Error(t("contract.errors.select_type"));
    }

    if (!form.contract_date) throw new Error(t("contract.errors.select_date"));

    const contractClassification = (form.contract_classification || "").trim();
    if (!noPermit && !contractClassification) {
      throw new Error(t("contract.errors.select_classification"));
    }

    const totalValue = form.total_project_value;
    if (!totalValue || totalValue === "" || totalValue === null || totalValue === undefined) {
      throw new Error(t("contract.errors.total_project_value_positive"));
    }

    let total = num(totalValue, NaN);
    if (!Number.isFinite(total) || total <= 0) {
      throw new Error(t("contract.errors.total_project_value_positive"));
    }

    const isHousing = !noPermit && form.contract_classification === "housing_loan_program";

    let bank = isHousing ? num(form.total_bank_value, NaN) : 0;
    let owner = isHousing ? Math.max(0, total - bank) : total;

    const MAX_VALUE = 999999999999.99;

    total = Math.min(total, MAX_VALUE);
    if (isHousing) {
      bank = Math.min(bank, MAX_VALUE);
    }
    owner = Math.min(owner, MAX_VALUE);

    if (isHousing) {
      if (!Number.isFinite(bank) || bank < 0) {
        throw new Error(t("contract.errors.bank_value_nonnegative"));
      }
      const currentOwner = num(form.total_owner_value, NaN);
      if (Math.abs(currentOwner - owner) > 0.01) {
        throw new Error(t("contract.errors.owner_value_autocalc"));
      }
    }

    // Validate authorized person ID expiry date
    if (form.signer_type === "authorized_person" && form.authorized_person?.id_expiry_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(form.authorized_person.id_expiry_date);
      if (expiryDate <= today) {
        throw new Error(t("contract.id_expiry_must_be_future"));
      }
    }

    // Validate authorized person email
    if (form.signer_type === "authorized_person" && form.authorized_person?.email) {
      const emailErr = validateEmail(form.authorized_person.email);
      if (emailErr) throw new Error(t(emailErr));
    }

    // Validate owner emails
    const ownersArr = Array.isArray(form.owners) ? form.owners : [];
    for (const owner of ownersArr) {
      if (owner.email) {
        const emailErr = validateEmail(owner.email);
        if (emailErr) throw new Error(t(emailErr));
      }
    }

    // Validate official communication
    // noPermit + signer=owner: the signer IS the owner, so owner comm section is hidden
    const skipOwnerComm = noPermit && (form.signer_type || "owner") === "owner";
    const commData = form.official_communication || {};
    const ownerComm = commData.owner || {};
    const consultantComm = commData.consultant || {};
    if (!skipOwnerComm) {
      if (!ownerComm.name) throw new Error(t("contract.comm_errors.owner_name_required"));
      const commOwnerEmails = Array.isArray(ownerComm.emails) ? ownerComm.emails.filter(Boolean) : [];
      if (commOwnerEmails.length === 0) throw new Error(t("contract.comm_errors.owner_email_required"));
      for (const email of commOwnerEmails) {
        const emailErr = validateEmail(email);
        if (emailErr) throw new Error(t(emailErr));
      }
    }
    // Consultant contacts validation (supports both old single and new multi format)
    const consultantContacts = Array.isArray(consultantComm.contacts) && consultantComm.contacts.length > 0
      ? consultantComm.contacts
      : (consultantComm.name || consultantComm.email)
        ? [{ name: consultantComm.name || "", email: consultantComm.email || "", phone: "", position: "" }]
        : [];
    for (const contact of consultantContacts) {
      if (contact.name && !contact.email) throw new Error(t("contract.comm_errors.consultant_email_required"));
      if (contact.email) {
        const emailErr = validateEmail(contact.email);
        if (emailErr) throw new Error(t(emailErr));
      }
    }

    const ownerEmails = Array.isArray(form.official_communication?.owner?.emails)
      ? form.official_communication.owner.emails
      : [];

    const getOwnerEmailError = (email) => {
      if (!email) return "";
      const err = validateEmail(email);
      return err ? t(err) : "";
    };

    // Validate contract PDF review (only if contract file exists and is PDF)
    const hasNewContractPdf =
      form.contract_file instanceof File &&
      form.contract_file.name?.toLowerCase().endsWith(".pdf");

    if (hasNewContractPdf && !contractReviewDone) {
      throw new Error(t("contract_review.review_required"));
    }

    // Validate appendix PDF reviews
    const appendixPdfs = (form.attachments || [])
      .filter(att => att && att.type !== "main_contract")
      .map((att, idx) => {
        const origIdx = (form.attachments || []).findIndex(a => a === att);
        const key = origIdx !== -1 ? origIdx : idx;
        const isPdf = (att.file instanceof File && att.file.name?.endsWith(".pdf"))
          || (att.file_url && att.file_url.toLowerCase().endsWith(".pdf"));
        return { key, isPdf };
      })
      .filter(x => x.isPdf);

    for (const { key } of appendixPdfs) {
      if (!appendixReviewDone[key]) {
        throw new Error(t("contract_review.review_required"));
      }
    }

    // Validate authorization document PDF review
    const hasAuthDoc = form.signer_type === "authorized_person" && (
      (form.authorized_person?.authorization_file instanceof File && form.authorized_person.authorization_file.name?.endsWith(".pdf"))
      || (form.authorized_person?.authorization_file_url && form.authorized_person.authorization_file_url.toLowerCase().endsWith(".pdf"))
    );
    if (hasAuthDoc && !authDocReviewDone) {
      throw new Error(t("contract_review.auth_doc_review_required"));
    }

    // Validate acknowledgment checkbox (if any reviewable PDF exists)
    const hasAnyReviewablePdf = hasNewContractPdf || appendixPdfs.length > 0 || hasAuthDoc;
    const allReviewsDone = (!hasNewContractPdf || contractReviewDone)
      && appendixPdfs.every(({ key }) => appendixReviewDone[key])
      && (!hasAuthDoc || authDocReviewDone);
    if (hasAnyReviewablePdf && allReviewsDone && !acknowledgmentChecked) {
      throw new Error(t("contract_review.acknowledgment_required"));
    }

    const allOwners = form.owners || [];
    const explicitlyAuthorized = allOwners.filter(o => o.is_authorized === true);
    // If none explicitly marked, treat all owners as authorized (fallback)
    const authorizedOwners = explicitlyAuthorized.length > 0 ? explicitlyAuthorized : allOwners;

    const roundedTotal = parseFloat(total.toFixed(2));
    const roundedBank = isHousing ? parseFloat(bank.toFixed(2)) : 0;
    const roundedOwner = parseFloat(owner.toFixed(2));

    const jsonPayload = {
      contract_classification: form.contract_classification || "",
      contract_type: contractType,
      tender_no: form.tender_no || "",
      contract_date: toIsoDate(form.contract_date),
      owners: authorizedOwners,
      contractor_name: form.contractor_name || "",
      contractor_name_en: form.contractor_name_en || "",
      contractor_trade_license: form.contractor_trade_license || "",
      contractor_phone: form.contractor_phone || "",
      contractor_email: form.contractor_email || "",
      total_project_value: roundedTotal,
      total_bank_value: roundedBank,
      total_owner_value: roundedOwner,
      project_duration_months: num(form.project_duration_months, 0),
      project_duration_days: num(form.project_duration_days, 0),
      total_floor_area: num(form.total_floor_area, null),
      owner_includes_consultant: toBool(form.owner_includes_consultant),
      owner_fee_design_percent: num(form.owner_fee_design_percent, 0),
      owner_fee_supervision_percent: num(form.owner_fee_supervision_percent, 0),
      owner_fee_design_pay_to: form.owner_fee_design_pay_to || "contractor",
      owner_fee_supervision_pay_to: form.owner_fee_supervision_pay_to || "contractor",
      owner_fee_extra_mode: form.owner_fee_extra_mode || "percent",
      owner_fee_extra_value: num(form.owner_fee_extra_value, 0),
      owner_fee_extra_includes_vat: form.owner_fee_extra_includes_vat || "no",
      owner_fee_extra_description: form.owner_fee_extra_description || "",
      bank_includes_consultant: toBool(form.bank_includes_consultant),
      bank_fee_design_percent: num(form.bank_fee_design_percent, 0),
      bank_fee_supervision_percent: num(form.bank_fee_supervision_percent, 0),
      bank_fee_extra_mode: form.bank_fee_extra_mode || "percent",
      bank_fee_extra_value: num(form.bank_fee_extra_value, 0),
      bank_fee_extra_includes_vat: form.bank_fee_extra_includes_vat || "no",
      bank_fee_extra_description: form.bank_fee_extra_description || "",
      project_end_date: form.project_end_date || null,
      official_communication: form.official_communication || {},
      general_notes: form.general_notes || "",
      // noPermit: include consultant_data if user confirmed yes OR if existing data is present
      ...(noPermit && (hasConsultant === true || (form.consultant_data && (form.consultant_data.name_ar || form.consultant_data.name_en)))
        ? { consultant_data: form.consultant_data || {} }
        : {}),
      project_description: form.project_description || "",
      general_clauses: Array.isArray(form.general_clauses) ? form.general_clauses : [],
      definitions: Array.isArray(form.definitions) ? form.definitions : [],
      contract_sections: Array.isArray(form.contract_sections) ? form.contract_sections : [],
      signer_type: form.signer_type || "owner",
      authorized_person: form.signer_type === "authorized_person" ? {
        name: form.authorized_person?.name || "",
        name_en: form.authorized_person?.name_en || "",
        nationality: form.authorized_person?.nationality || "",
        id_number: form.authorized_person?.id_number || "",
        birth_date: form.authorized_person?.birth_date || "",
        id_expiry_date: form.authorized_person?.id_expiry_date || "",
        email: form.authorized_person?.email || "",
        phone: form.authorized_person?.phone || "",
        signature_url: form.authorized_person?.signature_url || "",
      } : null,
    };

    const fd = new FormData();

    Object.entries(jsonPayload).forEach(([k, v]) => {
      if (k === "contract_file" ||
        k === "contract_appendix_file" || k === "contract_explanation_file") {
        return;
      }
      if (k === "owners") {
        if (Array.isArray(v) && v.length > 0) {
          fd.append(k, JSON.stringify(v));
        } else {
          fd.append(k, "[]");
        }
        return;
      }
      if (k === "contract_classification") {
        fd.append(k, v || "");
        return;
      }
      if (v === null || v === undefined || v === "") return;
      if (typeof v === "object" && !(v instanceof File) && !(v instanceof Blob) && !Array.isArray(v)) {
        fd.append(k, JSON.stringify(v));
      } else if (Array.isArray(v)) {
        fd.append(k, JSON.stringify(v));
      } else {
        fd.append(k, v);
      }
    });

    if (form.attachments && Array.isArray(form.attachments) && form.attachments.length > 0) {
      const validAttachments = form.attachments.filter((att) => {
        if (!att || typeof att !== "object") return false;
        if (att.type === "main_contract") {
          return false;
        }
        const hasType = att.type && String(att.type).trim() !== "";
        const hasFile = att.file instanceof File || (att.file_url && String(att.file_url).trim() !== "");
        const hasNotes = att.notes && String(att.notes).trim() !== "";
        const hasPrice = att.price !== undefined && att.price !== null && String(att.price).trim() !== "";
        return hasType || hasFile || hasNotes || hasPrice;
      });

      const attachmentsData = validAttachments.map((att) => {
        const rawPrice = att.price;
        const parsedPrice = rawPrice === "" || rawPrice === null || rawPrice === undefined ? null : Number(rawPrice);
        const attData = {
          type: String(att.type || "appendix").trim(),
          date: toIsoDate(att.date) || null,
          notes: String(att.notes || "").trim(),
          price: Number.isFinite(parsedPrice) ? parsedPrice : null,
          file_url: att.file_url || null,
          file_name: att.file_name || null,
        };
        return attData;
      });
      fd.append("attachments", JSON.stringify(attachmentsData));

      validAttachments.forEach((att, idx) => {
        if (att.file instanceof File) {
          fd.append(`attachments[${idx}][file]`, att.file, att.file.name);
        }
      });
    } else {
      fd.append("attachments", "[]");
    }

    for (const field of FILE_FIELDS) {
      if (form[field] instanceof File) {
        fd.append(field, form[field]);
      }
    }

    // Append authorized person files
    if (form.signer_type === "authorized_person" && form.authorized_person) {
      if (form.authorized_person.id_file instanceof File) {
        fd.append("authorized_person_id_file", form.authorized_person.id_file);
      }
      if (form.authorized_person.authorization_file instanceof File) {
        fd.append("authorized_person_authorization_file", form.authorized_person.authorization_file);
      }
      if (form.authorized_person.signature_file instanceof File) {
        fd.append("authorized_person_signature_file", form.authorized_person.signature_file);
      }
    }

    return fd;
  };

  const save = async () => {
    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setErrorMsg(err?.message || t("save_failed"));
      return;
    }

    // New project flow: build payload and call onCreateProject (creates everything at once)
    if (isNewProject && onCreateProject) {
      await runSave(async () => {
        await onCreateProject(payload);
      }, (err) => {
        const formatted = formatServerErrors(err?.response?.data);
        return formatted || err?.message || t("save_failed");
      });
      return;
    }

    if (!projectId) {
      setErrorMsg(t("open_specific_project_to_save"));
      return;
    }

    await runSave(async () => {
      // Save legacy code if provided
      await api.patch(`projects/${projectId}/`, { legacy_code: legacyCode || "" });

      // Upload new image or clear removed image
      if (projectImage && projectImage.size > 0) {
        const { getCsrfToken } = await import("../../../../utils/cookies");
        const imgForm = new FormData();
        imgForm.append("project_image", projectImage, projectImage.name);
        const headers = {};
        const csrf = getCsrfToken();
        if (csrf) headers["X-CSRFToken"] = csrf;
        await fetch(`${API_BASE_URL}projects/${projectId}/`, {
          method: "PATCH", credentials: "include", headers, body: imgForm,
        });
      } else if (imageRemoved) {
        const { getCsrfToken } = await import("../../../../utils/cookies");
        const imgForm = new FormData();
        imgForm.append("project_image", "");
        const headers = {};
        const csrf = getCsrfToken();
        if (csrf) headers["X-CSRFToken"] = csrf;
        await fetch(`${API_BASE_URL}projects/${projectId}/`, {
          method: "PATCH", credentials: "include", headers, body: imgForm,
        });
        setImageRemoved(false);
      }

      if (existingId) {
        await api.patch(`projects/${projectId}/contract/${existingId}/`, payload);
      } else {
        const { data: created } = await api.post(`projects/${projectId}/contract/`, payload);
        if (created?.id) setExistingId(created.id);
      }

      try {
        const { data } = await api.get(`projects/${projectId}/contract/`);
        if (Array.isArray(data) && data.length > 0) {
          const contractData = data[0];
          syncFileUrlsFromApi(contractData);
          setF("attachments", parseAttachmentsFromApi(contractData.attachments));
        }
      } catch (e) {
        logger.error("Error loading contract file URLs", e);
      }

      clearFileObjects();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("contract-updated", { detail: { projectId } }));
      }
      updateViewMode(true);
      navTimerRef.current = setTimeout(() => navigate(`/projects/${projectId}`), 500);
    }, (err) => {
      const formatted = formatServerErrors(err?.response?.data);
      return formatted || getErrorMessage(err) || t("save_failed");
    });
  };

  const isPrivateFunding = form.contract_classification === "private_funding";

  // noPermit: "هل يوجد استشاري؟" — null=unanswered, true=yes, false=no
  const [hasConsultant, setHasConsultant] = useState(null);

  // noPermit: consultant fields stored in form under "consultant_data" sub-object
  const consultantData = form.consultant_data || {};
  const setConsultantField = (k, v) => setF("consultant_data", { ...consultantData, [k]: v });

  // Auto-set hasConsultant when contract data loads for existing projects (runs once when data arrives)
  const consultantAutoSetRef = useRef(false);
  useEffect(() => {
    if (!noPermit || consultantAutoSetRef.current) return;
    const cd = form.consultant_data;
    if (!cd) return;
    consultantAutoSetRef.current = true;
    if (cd.name_ar || cd.name_en) {
      setHasConsultant(true);
    } else {
      // Data loaded but no consultant name — leave as null so user sees the question
      consultantAutoSetRef.current = false;
    }
  }, [noPermit, form.consultant_data]);

  if (contractLoading && projectId) {
    return (
      <WizardShell>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 240 }}>
          <BrandedLoader size={48} />
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      footer={!viewMode && (
        <StepActions
          onPrev={onPrev}
          onNext={save}
          isLoading={isSaving}
          showPrev={!!onPrev}
          isLastStep={!onNext}
          disableNext={hasBlockingErrors}
        />
      )}
    >
      <ErrorDialog errorMsg={errorMsg} setErrorMsg={setErrorMsg} />

      {/* 1. Project Setup — Codes, Classification & Image */}
      {setup && (
        <div className="wizard-section">
          <div className="wizard-section__header">
            <h4 className="wizard-section__title">{`1) ${t("wizard_step_setup")}`}</h4>
          </div>

          {/* ── Single card: Codes + Image + Classification ── */}
          <div className="wizard-section-card">
            <div className="wizard-section-card__header">
              <h5 className="wizard-section-card__title">{t("project_codes_and_classification")}</h5>
            </div>
            <div className="wizard-section-card__body">

              {/* Top row: codes (left) + image (right) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" }}>

                {/* Codes */}
                <FormGrid cols={2} gap="md">
                  <FormField label={t("internal_project_code")}>
                    {internalCode ? (
                      <FormViewField value={internalCode} className="mono" />
                    ) : (
                      <FormViewField value={isNewProject ? `— ${t("auto_generated_code")}` : null} />
                    )}
                  </FormField>
                  <FormField label={t("legacy_project_code")} hint={t("optional")}>
                    {viewMode ? (
                      <FormViewField value={legacyCode || null} className="mono" />
                    ) : (
                      <FormInput
                        type="text"
                        placeholder={t("legacy_project_code_placeholder")}
                        value={legacyCode}
                        onChange={(e) => setSetupField("legacyCode", e.target.value)}
                        maxLength={100}
                        className="mono"
                      />
                    )}
                  </FormField>
                </FormGrid>

                {/* Project Image */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 120 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                    {t("project_image")}
                    <span style={{ marginInlineStart: 4, fontSize: 11, opacity: 0.6 }}>({t("optional")})</span>
                  </span>
                  {viewMode ? (
                    projectImagePreview ? (
                      <div className="project-img-preview project-img-preview--sm">
                        <img src={projectImagePreview} alt={t("project_image")} />
                      </div>
                    ) : (
                      <div className="project-img-empty project-img-empty--sm">
                        <FiCamera />
                      </div>
                    )
                  ) : (
                    <>
                      <div
                        className={`project-img-drop project-img-drop--sm ${projectImagePreview ? "project-img-drop--filled" : ""}`}
                        onClick={() => imageInputRef.current?.click()}
                        role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") imageInputRef.current?.click(); }}
                      >
                        {projectImagePreview ? (
                          <>
                            <img src={projectImagePreview} alt={t("project_image")} />
                            <div className="project-img-drop__overlay">
                              <button type="button" className="project-img-drop__btn"
                                onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}>
                                <FiCamera />
                              </button>
                              <button type="button" className="project-img-drop__btn project-img-drop__btn--del"
                                onClick={(e) => { e.stopPropagation(); handleImageRemove(); }}>
                                <FiX />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="project-img-drop__hint">
                            <FiCamera />
                          </div>
                        )}
                      </div>
                      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} hidden />
                    </>
                  )}
                </div>
              </div>

              {/* Classification — full width below (hidden when noPermit) */}
              {!noPermit && (
                <FormField label={t("contract.sections.classification")} required style={{ marginTop: 8 }}>
                  {viewMode ? (
                    <FormViewField
                      value={contractClassificationOptions.find(m => m.value === form.contract_classification)?.label || null}
                    />
                  ) : (
                    <FormChips
                      options={contractClassificationOptions.map(m => [m.value, m.label, m.desc])}
                      value={form.contract_classification}
                      onChange={(v) => setF("contract_classification", v)}
                      className="form-chips--cols3"
                    />
                  )}
                </FormField>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 2. Contract Basic Information */}
      <ContractBasicInfoSection
        form={form}
        setF={setF}
        viewMode={viewMode}
        projectId={projectId}
        contractTypes={CONTRACT_TYPES}
        noPermit={noPermit}
      />

      {/* 3. Contract Parties — Owner, Contractor, Consultant */}
      <ContractPartiesSection
        form={form}
        setF={setF}
        viewMode={viewMode}
        noPermit={noPermit}
      />

      {/* 4. Contract Signer — Owner or Authorized Person */}
      <ContractSignerSection
        form={form}
        setF={setF}
        viewMode={viewMode}
        projectId={projectId}
      />

      {/* 5. Official Communication — hidden when noPermit and signer is the owner (same person) */}
      {(!noPermit || (form.signer_type || "owner") !== "owner") && (
        <OfficialCommunicationSection
          form={form}
          setF={setF}
          viewMode={viewMode}
        />
      )}

      {/* 6. Consultant section — noPermit: yes/no question + data fields; normal: fees */}
      {noPermit ? (
        <FormSection title={`6) ${t("consultant")}`}>
          {/* Yes/No question — edit mode only, when answer not yet given */}
          {!viewMode && hasConsultant === null && (
            <div className="siteplan-question-card">
              <div className="siteplan-question-card__title">{t("has_consultant_question")}</div>
              <div className="siteplan-question-card__actions">
                <button type="button" className="siteplan-question-card__btn siteplan-question-card__btn--yes" onClick={() => setHasConsultant(true)}>
                  {t("yes")}
                </button>
                <button type="button" className="siteplan-question-card__btn siteplan-question-card__btn--later" onClick={() => setHasConsultant(false)}>
                  {t("no")}
                </button>
              </div>
            </div>
          )}

          {/* No consultant badge — edit: when user chose no; view: when no data */}
          {(hasConsultant === false || (viewMode && !consultantData.name_ar && !consultantData.name_en)) && (
            <div className="siteplan-question-card siteplan-question-card--later">
              <div className="siteplan-question-card__badge">{t("no")}</div>
              {!viewMode && (
                <button type="button" className="siteplan-question-card__change" onClick={() => setHasConsultant(null)}>
                  {t("change")}
                </button>
              )}
            </div>
          )}

          {/* Consultant data fields */}
          {(hasConsultant === true || (viewMode && (consultantData.name_ar || consultantData.name_en))) && (
            <div className="wizard-section-card">
              <div className="wizard-section-card__body">
                {!viewMode && (
                  <button type="button" className="siteplan-question-card__change" style={{ marginBottom: 12 }} onClick={() => setHasConsultant(null)}>
                    {t("change")}
                  </button>
                )}
                <div className="form-grid cols-2 wizard-gap-4">
                  <Field label={t("consultant_name_ar_label")}>
                    {viewMode ? (
                      <div className="wizard-view-value">{consultantData.name_ar || t("empty_value")}</div>
                    ) : (
                      <input className="input" type="text" value={consultantData.name_ar || ""} onChange={(e) => setConsultantField("name_ar", e.target.value)} />
                    )}
                  </Field>
                  <Field label={t("consultant_name_en_label")}>
                    {viewMode ? (
                      <div className="wizard-view-value">{consultantData.name_en || t("empty_value")}</div>
                    ) : (
                      <input className="input" type="text" value={consultantData.name_en || ""} onChange={(e) => setConsultantField("name_en", e.target.value)} />
                    )}
                  </Field>
                  <Field label={t("consultant_license_no_label")}>
                    {viewMode ? (
                      <div className="wizard-view-value">{consultantData.license_no || t("empty_value")}</div>
                    ) : (
                      <input className="input" type="text" value={consultantData.license_no || ""} onChange={(e) => setConsultantField("license_no", e.target.value)} />
                    )}
                  </Field>
                  <Field label={t("consultant_responsible_person")}>
                    {viewMode ? (
                      <div className="wizard-view-value">{consultantData.responsible_person || t("empty_value")}</div>
                    ) : (
                      <input className="input" type="text" value={consultantData.responsible_person || ""} onChange={(e) => setConsultantField("responsible_person", e.target.value)} placeholder={t("consultant_responsible_person_placeholder")} />
                    )}
                  </Field>
                  <Field label={t("email")} className="wizard-col-full">
                    {viewMode ? (
                      <div className="wizard-view-value">
                        {consultantData.email || t("empty_value")}
                      </div>
                    ) : (
                      <UniqueFieldInput
                        fieldType="email"
                        value={consultantData.email || ""}
                        onChange={(val) => setConsultantField("email", val)}
                        excludeType="consultant"
                        excludeId="" // or consultantData.id if you have it
                        className="input"
                        placeholder={t("consultant_email_label")}
                        dir="ltr"
                      />
                    )}
                  </Field>
                </div>

                {/* Consultant fees — shown when consultant exists; forceShow bypasses the YesNoChips gate */}
                <div style={{ marginTop: 20 }}>
                  <h5 className="wizard-funding-card__title" style={{ marginBottom: 12 }}>
                    {t("contract.sections.consultant_fees")}
                  </h5>
                  <ConsultantFeesSection prefix="owner" form={form} setF={setF} isView={viewMode} isAR={isAR} forceShow />
                </div>
              </div>
            </div>
          )}
        </FormSection>
      ) : (
        <FormSection title={`6) ${t("contract.sections.consultant_fees")}`}>
          <FormGrid cols={isPrivateFunding ? 1 : 2} gap="lg" className="wizard-align-start">
            <div className="wizard-funding-card">
              <h5 className="wizard-funding-card__title">
                {t("contract.fees.owner.title")}
              </h5>
              <ConsultantFeesSection prefix="owner" form={form} setF={setF} isView={viewMode} isAR={isAR} />
            </div>

            {!isPrivateFunding && (
              <div className="wizard-funding-card">
                <h5 className="wizard-funding-card__title">
                  {t("contract.fees.bank.title")}
                </h5>
                <ConsultantFeesSection prefix="bank" form={form} setF={setF} isView={viewMode} isAR={isAR} />
              </div>
            )}
          </FormGrid>
        </FormSection>
      )}

      {/* 7. Contract Clauses — user enters Arabic clauses, definitions, and numbered sections */}
      <ContractClausesSection
        form={form}
        setF={setF}
        viewMode={viewMode}
      />

      {/* 8. Contract attachments */}
      <ContractAttachmentsSection
        form={form}
        setF={setF}
        viewMode={viewMode}
        projectId={projectId}
        isPrivateFunding={isPrivateFunding}
        noPermit={noPermit}
        isSuperAdmin={isSuperAdmin}
        contractReviewState={contractReviewState}
        onContractReviewStateChange={setContractReviewState}
        onContractReviewComplete={setContractReviewDone}
        appendixReviewStates={appendixReviewStates}
        onAppendixReviewStateChange={handleAppendixReviewStateChange}
        onAppendixReviewComplete={handleAppendixReviewComplete}
        authDocFile={form.signer_type === "authorized_person" ? form.authorized_person?.authorization_file : null}
        authDocFileUrl={form.signer_type === "authorized_person" ? form.authorized_person?.authorization_file_url : null}
        authDocReviewState={authDocReviewState}
        onAuthDocReviewStateChange={setAuthDocReviewState}
        onAuthDocReviewComplete={setAuthDocReviewDone}
        signatures={signatures}
        acknowledgmentChecked={acknowledgmentChecked}
        onAcknowledgmentChange={setAcknowledgmentChecked}
        reviewerName={user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || user.email : ""}
        onDocFilesChange={onDocFilesChange}
        onContractFileChange={handleContractFileChange}
      />

      {/* Contract drawings */}
      <ContractDrawingsSection
        form={form}
        setF={setF}
        viewMode={viewMode}
        projectId={projectId}
      />

      {/* 10. General notes */}
      <div className="wizard-section">
        <div className="wizard-section__header">
          <h4 className="wizard-section__title">{`10) ${t("contract.sections.general_notes")}`}</h4>
        </div>
        {viewMode ? (
          <FormViewField value={form.general_notes} />
        ) : (
          <FormField>
            <FormTextarea
              rows={5}
              value={form.general_notes || ""}
              onChange={(e) => setF("general_notes", e.target.value)}
              placeholder={t("contract.placeholders.general_notes")}
            />
          </FormField>
        )}
      </div>
    </WizardShell>
  );
}
