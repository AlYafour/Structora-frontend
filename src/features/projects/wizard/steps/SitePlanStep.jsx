import { useEffect, useState, useRef } from "react";
import useViewMode from "../hooks/useViewMode";
import { useTranslation } from "react-i18next";
import { api } from "../../../../services/api";

// Components
import ErrorDialog from "../components/ErrorDialog";
import { EMPTY_OWNER, generateOwnerUid } from "../components/OwnerForm";
import WizardShell from "../components/WizardShell";
import StepActions from "../components/StepActions";
import Button from "../../../../components/common/Button";

// Section Components
import AttachmentsSection from "../components/AttachmentsSection";
import PropertyDetailsSection from "../components/PropertyDetailsSection";
import OwnerDetailsSection from "../components/OwnerDetailsSection";
import DeveloperDetailsSection from "../components/DeveloperDetailsSection";
import ApplicationDetailsSection from "../components/ApplicationDetailsSection";
import ProjectSourceSection from "../components/ProjectSourceSection";
import RightHolderSection from "../components/RightHolderSection";

import { useLanguage } from "../../../../hooks";
import useSitePlan from "../../../../hooks/useSitePlan";
import { normalizeNationality } from "../../../../utils/constants";
import { formatSitePlanServerErrors } from "../../../../utils/errors/sitePlanErrorFormatter";
import { getErrorMessage } from "../../../../utils/errorHandler";
import { toApiDateUnified, toInputDateUnified } from "../../../../utils/formatters/date";
import {
  extractFileNameFromUrl,
  validateFileState,
  fetchFileWithAuth,
} from "../../../../utils/helpers/file";
import { renameFileForUpload } from "../../../../utils/helpers/file";
import { logger } from "../../../../utils/logger";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

/**
 * SitePlanStep Component
 *
 * Main orchestrator for the Site Plan wizard step. Handles:
 * - State management for all sections
 * - API calls (save/load)
 * - Validation logic
 * - Rendering sub-components
 *
 * @param {Object} props - Component props
 * @param {string|number} props.projectId - Project ID
 * @param {Object} props.setup - Setup configuration
 * @param {Function} props.onPrev - Previous step callback
 * @param {Function} props.onNext - Next step callback
 * @param {boolean} props.isView - View mode flag
 * @param {boolean} props.isNewProject - Whether this is a new project
 * @param {Function} props.onCreateProject - Create project callback
 */
export default function SitePlanStep({
  projectId,
  setup,
  onPrev,
  onNext,
  isView: isViewProp,
  isNewProject = false,
  onCreateProject,
  onSitePlanReady,
  noPermit = false,
  isActive = true,
  onDocFilesChange,
  onFormSectionChange,
  hasBlockingErrors = false,
  prefillData = null,
  prefillFile = null,
  prefillOwnerIdFile = null,
  prefillOwnerSignatureFile = null,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const { isArabic: isAR } = useLanguage();

  const {
    form,
    setForm,
    setF,
    owners,
    setOwners,
    existingId,
    setExistingId,
    isView: isViewState,
    setIsView,
    onSqmChange,
    onSqftChange,
    addOwner,
    removeOwner,
    updateOwner,
    rightHolders,
    addRightHolder,
    removeRightHolder,
    updateRightHolder,
  } = useSitePlan(projectId, setup);

  // Pre-fill from AI preview data (runs once on mount for new projects)
  useEffect(() => {
    if (!isNewProject || existingId) return;
    if (prefillData) {
      const { owners: prefillOwners, ...siteplanFields } = prefillData;
      if (Object.values(siteplanFields).some(v => v)) {
        setForm(prev => ({ ...prev, ...siteplanFields }));
      }
      if (prefillOwners?.length) {
        setOwners(prefillOwners.map((o, i) => ({
          ...EMPTY_OWNER, ...o, uid: generateOwnerUid(),
          nationality: o.nationality ? normalizeNationality(o.nationality) : (EMPTY_OWNER.nationality || ""),
          ...(i === 0 && prefillOwnerIdFile instanceof File ? { id_attachment: prefillOwnerIdFile } : {}),
          ...(i === 0 && prefillOwnerSignatureFile instanceof File ? { signature: prefillOwnerSignatureFile } : {}),
        })));
      }
    }
    if (prefillFile instanceof File) {
      setF("site_plan_file", prefillFile);
      setSitePlanUploaded(true);
    }
    if (prefillOwnerIdFile instanceof File) {
      if (!prefillData?.owners?.length) updateOwner(0, "id_attachment", prefillOwnerIdFile);
      setOwnerIdUploaded(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // View Mode Sync
  const [viewMode, updateViewMode] = useViewMode(isViewProp, isViewState, setIsView);
  const [errorMsg, setErrorMsg] = useState("");
  const [sitePlanFileUrl, setSitePlanFileUrl] = useState("");
  const [ownerFileUrls, setOwnerFileUrls] = useState({});
  const [ownerFileNames, setOwnerFileNames] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [contractOwners, setContractOwners] = useState([]);
  const [verifiedFields, setVerifiedFields] = useState({});
  const [aiFilledFields, setAiFilledFields] = useState([]);
  const [showPdfPanel, setShowPdfPanel] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [showIdPanel, setShowIdPanel] = useState(false);
  const [idPanelOwnerIdx, setIdPanelOwnerIdx] = useState(0);
  const [idZoom, setIdZoom] = useState(100);
  const progressTimerRef = useRef(null);
  const navTimerRef = useRef(null);
  const [sitePlanPreviewSrc, setSitePlanPreviewSrc] = useState("");
  const [idPreviewSrc, setIdPreviewSrc] = useState("");
  const [previewError, setPreviewError] = useState("");

  // Report the complete owner section only when at least one owner has meaningful data
  useEffect(() => {
    const hasData = (owners || []).some(o => o.owner_name_ar || o.owner_name_en || o.id_number);
    if (!hasData) return;
    onFormSectionChange?.("owner_section", {
      owners: owners.map(o => ({
        owner_name_ar:  o.owner_name_ar  || "",
        owner_name_en:  o.owner_name_en  || "",
        id_number:      o.id_number      || "",
        nationality:    o.nationality    || "",
        id_expiry_date: o.id_expiry_date || "",
        id_issue_date:  o.id_issue_date  || "",
        gender:         o.gender         || "",
        share_percent:  o.share_percent  || "",
      })),
    });
  }, [owners, onFormSectionChange]);

  // Report siteplan_section so field validation can check allocation_date
  useEffect(() => {
    onFormSectionChange?.("siteplan_section", {
      allocation_date: form.allocation_date || "",
    });
  }, [form.allocation_date, onFormSectionChange]);

  useEffect(() => {
    if (!showPdfPanel) {
      setSitePlanPreviewSrc("");
      return;
    }

    let cancelled = false;
    let objectUrl = "";

    async function loadPreview() {
      setPreviewError("");

      try {
        if (form.site_plan_file instanceof File) {
          objectUrl = URL.createObjectURL(form.site_plan_file);
          if (!cancelled) setSitePlanPreviewSrc(objectUrl);
          return;
        }

        if (sitePlanFileUrl) {
          const blob = await fetchFileWithAuth(sitePlanFileUrl);
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) setSitePlanPreviewSrc(objectUrl);
        }
      } catch (error) {
        logger.error("Error loading site plan preview", error);
        if (!cancelled) {
          setSitePlanPreviewSrc("");
          setPreviewError(t("file_preview_failed") || "Could not preview file");
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [showPdfPanel, form.site_plan_file, sitePlanFileUrl, t]);

  useEffect(() => {
    if (!showIdPanel) {
      setIdPreviewSrc("");
      return;
    }

    let cancelled = false;
    let objectUrl = "";

    async function loadPreview() {
      setPreviewError("");

      try {
        const owner = owners[idPanelOwnerIdx];
        const fileObj = owner?.id_attachment instanceof File ? owner.id_attachment : null;
        const fileUrl =
          ownerFileUrls[idPanelOwnerIdx] ||
          (typeof owner?.id_attachment === "string" ? owner.id_attachment.trim() : "");

        if (fileObj) {
          objectUrl = URL.createObjectURL(fileObj);
          if (!cancelled) setIdPreviewSrc(objectUrl);
          return;
        }

        if (fileUrl) {
          const blob = await fetchFileWithAuth(fileUrl);
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) setIdPreviewSrc(objectUrl);
        }
      } catch (error) {
        logger.error("Error loading owner ID preview", error);
        if (!cancelled) {
          setIdPreviewSrc("");
          setPreviewError(t("file_preview_failed") || "Could not preview file");
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [showIdPanel, idPanelOwnerIdx, owners, ownerFileUrls, t]);

  // Section visibility: show sections only after relevant file is uploaded
  const [sitePlanUploaded, setSitePlanUploaded] = useState(false);
  const [ownerIdUploaded, setOwnerIdUploaded] = useState(false);

  // noPermit flow: "هل يوجد مخطط أرض؟" — null=unanswered, true=yes, "later"=later, "no"=no
  const [hasSitePlan, setHasSitePlan] = useState(null);

  useEffect(() => {
    return () => {
      clearTimeout(progressTimerRef.current);
      clearTimeout(navTimerRef.current);
    };
  }, []);

  // Sync body class so wizard-content shrinks when any panel is open
  useEffect(() => {
    const open = showPdfPanel || showIdPanel;
    document.body.classList.toggle("pdf-panel-open", open);
    return () => document.body.classList.remove("pdf-panel-open");
  }, [showPdfPanel, showIdPanel]);

  // Close preview panels when the user navigates away from this step
  useEffect(() => {
    if (!isActive) {
      setShowPdfPanel(false);
      setShowIdPanel(false);
    }
  }, [isActive]);

  // Field verification toggle — also opens the PDF panel so user can cross-check
  const toggleVerify = (fieldName) => {
    setVerifiedFields((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));

    const ownerMatch = fieldName.match(/_(\d+)$/);

    if (ownerMatch) {
      const ownerIdx = Number(ownerMatch[1]);

      setIdPanelOwnerIdx(ownerIdx);
      setShowIdPanel(true);
      setShowPdfPanel(false);
      setIdZoom(175);
      return;
    }

    if (sitePlanFileUrl || form.site_plan_file instanceof File) {
      setShowPdfPanel(true);
      setShowIdPanel(false);
      setPdfZoom(175);
    }
  };

  // Auto-generate application number year prefix when date changes (manual input only).
  // Uses setForm functional update to read latest state — avoids stale closure issue.
  useEffect(() => {
    if (!form.application_date || viewMode) return;
    const date = new Date(form.application_date);
    if (isNaN(date.getTime())) return;
    const year = date.getFullYear().toString();

    setForm((prev) => {
      const currentNumber = prev.application_number || "";
      const parts = currentNumber.split('/');
      const numberAfterSlash = parts.length > 1 ? parts[1].trim() : "";

      // Full number already set (e.g. from PDF extraction) — only fix year prefix if wrong
      if (numberAfterSlash.length > 0) {
        if (parts[0] === year) return prev; // nothing to change
        return { ...prev, application_number: `${year}/${numberAfterSlash}` };
      }

      // Empty or no slash — set year prefix only
      if (!currentNumber.trim() || !currentNumber.includes('/')) {
        return { ...prev, application_number: `${year}/` };
      }

      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.application_date, viewMode]);

  // If existing project (not new), show all sections immediately
  useEffect(() => {
    if (!isNewProject) {
      setSitePlanUploaded(true);
      setOwnerIdUploaded(true);
    }
  }, [isNewProject]);

  // Load saved files from backend
  useEffect(() => {
    if (!projectId) return;

    let mounted = true;

    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);
        if (!mounted) return;

        if (Array.isArray(data) && data.length > 0) {
          const siteplanData = data[0];

          // Load site plan file URL
          if (siteplanData.site_plan_file) {
            setSitePlanFileUrl(siteplanData.site_plan_file);
            setSitePlanUploaded(true);
          } else {
            setSitePlanFileUrl("");
          }

          if (siteplanData.owners && Array.isArray(siteplanData.owners)) {
            const urls = {};
            const names = {};

            siteplanData.owners.forEach((owner, idx) => {
              if (
                owner.id_attachment &&
                typeof owner.id_attachment === "string" &&
                owner.id_attachment.trim() !== ""
              ) {
                urls[idx] = owner.id_attachment;
                names[idx] = extractFileNameFromUrl(owner.id_attachment);
                setOwnerIdUploaded(true);
              }
            });

            setOwnerFileUrls(urls);
            setOwnerFileNames(names);
          } else {
            setOwnerFileUrls({});
            setOwnerFileNames({});
          }
        } else {
          setSitePlanFileUrl("");
          setOwnerFileUrls({});
          setOwnerFileNames({});
        }
      } catch (_e) {
        setSitePlanFileUrl("");
        setOwnerFileUrls({});
        setOwnerFileNames({});
      }
    })();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  // Load contract owners for data matching
  useEffect(() => {
    if (!projectId || !viewMode) return;

    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/contract/`);
        if (Array.isArray(data) && data.length > 0) {
          const contractData = data[0];
          if (contractData.owners && Array.isArray(contractData.owners) && contractData.owners.length > 0) {
            setContractOwners(contractData.owners);
          }
        }
      } catch (_e) {
        // Silent error handling
      }
    })();
  }, [projectId, viewMode]);

  // Note: Authorized owner selection has been moved to the Contract step

  // Sync owner file URLs when owners change
  useEffect(() => {
    if (!owners || owners.length === 0) {
      setOwnerFileUrls({});
      setOwnerFileNames({});
      return;
    }

    const currentUrls = {};
    const currentNames = {};

    owners.forEach((owner, idx) => {
      if (owner.id_attachment instanceof File) {
        return;
      }

      if (
        owner.id_attachment &&
        typeof owner.id_attachment === "string" &&
        owner.id_attachment.trim() !== ""
      ) {
        currentUrls[idx] = owner.id_attachment;
        currentNames[idx] = extractFileNameFromUrl(owner.id_attachment);
      }
    });

    setOwnerFileUrls(currentUrls);
    setOwnerFileNames(currentNames);
  }, [owners]);

  /**
   * Handle site plan file selection — extract data from PDF automatically
   */
  const handleSitePlanFileChange = async (file) => {
    setF("site_plan_file", file);
    if (file instanceof File) onDocFilesChange?.("site_plan", file);

    if (file instanceof File) {
      setSitePlanUploaded(true);
      setShowPdfPanel(true);
      setShowIdPanel(false);
    }

    if (!file || !(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf")) {
      return;
    }

    setIsExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: result } = await api.post("extract-siteplan-data/", fd);

      if (result?.error === "wrong_document_type") {
        setF("site_plan_file", null);
        setErrorMsg(t("wrong_document_type_site_plan"));
        return;
      }

      if (result?.data && Object.keys(result.data).length > 0) {
        const d = result.data;

        // Batch-fill all extracted property fields in ONE state update
        // to prevent race conditions (e.g. zone getting reset before municipality settles)
        setForm((prev) => {
          const next = { ...prev };
          const fill = (field, value) => { if (value) next[field] = value; };
          fill("municipality", d.municipality);
          fill("zone", d.zone);
          fill("sector", d.sector);
          fill("land_no", d.land_no);
          fill("road_name", d.road_name);
          fill("plot_address", d.plot_address);
          fill("allocation_type", d.allocation_type);
          fill("land_use", d.land_use);
          fill("construction_status", d.construction_status);
          fill("base_district", d.base_district);
          fill("overlay_district", d.overlay_district);
          fill("allocation_date", d.allocation_date);
          fill("application_number", d.application_number);
          fill("application_date", d.application_date);
          // Area
          if (d.plot_area_sqm) {
            next.plot_area_sqm = d.plot_area_sqm;
            // Auto-calculate sqft
            try { next.plot_area_sqft = String(Math.round(parseFloat(d.plot_area_sqm) * 10.7639 * 100) / 100); }
            catch (_) { /* ignore */ }
          } else if (d.plot_area_sqft) {
            next.plot_area_sqft = d.plot_area_sqft;
          }
          return next;
        });

        // Owner names come from ID card upload only — not from the site plan PDF

        // Track which fields were populated by AI so user must verify them
        const newAiFields = [];
        if (d.municipality) newAiFields.push("municipality");
        if (d.zone) newAiFields.push("zone");
        if (d.sector) newAiFields.push("sector");
        if (d.land_no) newAiFields.push("land_no");
        if (d.allocation_type) newAiFields.push("allocation_type");
        if (d.land_use) newAiFields.push("land_use");
        if (d.construction_status) newAiFields.push("construction_status");
        if (d.allocation_date) newAiFields.push("allocation_date");
        if (d.application_date) newAiFields.push("application_date");
        if (d.application_number) newAiFields.push("application_number");
        if (d.plot_area_sqm) newAiFields.push("plot_area_sqm");
        if (d.plot_area_sqft) newAiFields.push("plot_area_sqft");
        if (newAiFields.length > 0) {
          setAiFilledFields((prev) => [...new Set([...prev, ...newAiFields])]);
        }
      }
    } catch (err) {
      if (err?.response?.data?.error === "wrong_document_type") {
        setF("site_plan_file", null);
        setErrorMsg(t("wrong_document_type_site_plan"));
      } else {
        logger.warn("Could not extract data from site plan PDF", err);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  /**
   * Handle owner ID card file change from AttachmentsSection — extract data via OCR
   */
  const handleOwnerIdFileChange = async (ownerIndex, file) => {
    updateOwner(ownerIndex, "id_attachment", file);
    if (file instanceof File && ownerIndex === 0) {
      // Clear name/ID fields so stale data from the previous card doesn't
      // produce false form-vs-document mismatches while the new card is extracted.
      updateOwner(ownerIndex, "owner_name_ar", "");
      updateOwner(ownerIndex, "owner_name_en", "");
      updateOwner(ownerIndex, "id_number", "");
      onFormSectionChange?.("owner_section", null);
      onDocFilesChange?.("owner_id", file);
    }

    if (file instanceof File) {
      setOwnerIdUploaded(true);
      setIdPanelOwnerIdx(ownerIndex);
      setShowIdPanel(true);
      setShowPdfPanel(false);
    }

    if (!file || !(file instanceof File)) return;

    const name = file.name.toLowerCase();
    const isValid = name.endsWith('.pdf') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
    if (!isValid) return;

    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data: result } = await api.post("extract-id-card-data/", fd);

      if (result?.error === "wrong_document_type") {
        updateOwner(ownerIndex, "id_attachment", null);
        setErrorMsg(t("wrong_document_type_id_card"));
        return;
      }

      if (result?.data && Object.keys(result.data).length > 0) {
        const d = result.data;
        // Single atomic setOwners update — reads latest state via prev, avoids race conditions
        setOwners((prev) => {
          const updated = [...prev];
          const o = updated[ownerIndex];
          if (!o) return prev;
          // ID card is authoritative — always overwrite with extracted values
          updated[ownerIndex] = {
            ...o,
            ...(d.owner_name_ar ? { owner_name_ar: d.owner_name_ar } : {}),
            ...(d.owner_name_en ? { owner_name_en: d.owner_name_en } : {}),
            ...(d.id_number ? { id_number: d.id_number } : {}),
            ...(d.nationality ? { nationality: normalizeNationality(d.nationality) } : {}),
            ...(d.id_expiry_date ? { id_expiry_date: d.id_expiry_date } : {}),
            ...(d.id_issue_date ? { id_issue_date: d.id_issue_date } : {}),
            ...(d.gender === "male" || d.gender === "female" ? { gender: d.gender } : {}),
          };
          return updated;
        });
      }
      // Track which owner fields were populated by AI so user must verify them
      const newAiFields = [];
      const i = ownerIndex;
      if (result?.data?.owner_name_ar) newAiFields.push(`owner_name_ar_${i}`);
      if (result?.data?.owner_name_en) newAiFields.push(`owner_name_en_${i}`);
      if (result?.data?.id_number) newAiFields.push(`id_number_${i}`);
      if (result?.data?.nationality) newAiFields.push(`nationality_${i}`);
      if (result?.data?.id_expiry_date) newAiFields.push(`id_expiry_date_${i}`);
      if (result?.data?.gender === "male" || result?.data?.gender === "female") newAiFields.push(`gender_${i}`);
      if (newAiFields.length > 0) {
        setAiFilledFields((prev) => [...new Set([...prev, ...newAiFields])]);
      }
    } catch (err) {
      if (err?.response?.data?.error === "wrong_document_type") {
        updateOwner(ownerIndex, "id_attachment", null);
        setErrorMsg(t("wrong_document_type_id_card"));
      } else {
        logger.warn("Could not extract data from ID card", err);
      }
    }
  };

  /**
   * Build FormData payload for API submission
   * @returns {FormData} - Payload for API
   * @throws {Error} - Validation errors
   */
  const buildPayload = () => {
    const application_date_api = toApiDateUnified(form.application_date);
    const allocation_date_api = toApiDateUnified(form.allocation_date);

    const normalized = {
      ...form,
      application_date: application_date_api || undefined,
      allocation_date: allocation_date_api || undefined,
    };

    // Validate dates
    if (application_date_api && allocation_date_api) {
      const alloc = new Date(allocation_date_api);
      const app = new Date(application_date_api);

      if (alloc >= app) {
        const msg = t("errors.allocation_before_application");
        throw new Error(msg);
      }
    }

    // Validate owner share percentages
    const sum = owners.reduce((s, o) => s + (parseFloat(o.share_percent) || 0), 0);

    if (Math.round(sum) !== 100) {
      throw new Error(t("errors.owners_share_sum_100"));
    }

    // Validate owner names
    owners.forEach((o, idx) => {
      if (!o.owner_name_ar?.trim() && !o.owner_name_en?.trim()) {
        throw new Error(t("errors.owner_name_bilingual_required", { idx: idx + 1 }));
      }
    });

    const fd = new FormData();

    // Fields to skip (sent separately or not required)
    const SKIP_FIELDS = ['owners', 'siteplan_snapshot', 'site_plan_file', 'id', 'project', 'created_at', 'updated_at'];

    Object.entries(normalized).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return;
      if (SKIP_FIELDS.includes(k)) return;

      // Convert objects to JSON (except File and Blob) - prevents [object Object]
      if (typeof v === "object" && !(v instanceof File) && !(v instanceof Blob)) {
        fd.append(k, JSON.stringify(v));
      } else {
        fd.append(k, v);
      }
    });

    let validOwnerIndex = 0;

    owners.forEach((o, originalIdx) => {
      const nameAr = (o.owner_name_ar || "").trim();
      const nameEn = (o.owner_name_en || "").trim();

      if (!nameAr && !nameEn) return;

      const idx = validOwnerIndex++;

      if (o.id) {
        fd.append(`owners[${idx}][id]`, String(o.id));
      }

      fd.append(`owners[${idx}][owner_name_ar]`, nameAr);
      fd.append(`owners[${idx}][owner_name_en]`, nameEn);
      fd.append(`owners[${idx}][owner_name]`, nameAr);

      fd.append(`owners[${idx}][id_number]`, o.id_number || "");
      fd.append(`owners[${idx}][nationality]`, o.nationality || "");
      fd.append(`owners[${idx}][phone]`, o.phone || "");
      fd.append(`owners[${idx}][email]`, o.email || "");
      fd.append(`owners[${idx}][right_hold_type]`, o.right_hold_type || "Ownership");

      const sharePercent = o.share_percent || "100";
      const sharePercentNum = parseFloat(sharePercent);
      fd.append(`owners[${idx}][share_percent]`, isNaN(sharePercentNum) ? "100" : String(sharePercentNum));
      fd.append(`owners[${idx}][share_possession]`, o.share_possession || "");
      fd.append(`owners[${idx}][is_authorized]`, o.is_authorized ? "true" : "false");

      const expiry = toApiDateUnified(o.id_expiry_date);
      if (expiry) fd.append(`owners[${idx}][id_expiry_date]`, expiry);

      const issueDate = toApiDateUnified(o.id_issue_date);
      if (issueDate) fd.append(`owners[${idx}][id_issue_date]`, issueDate);

      // Handle owner ID attachment file
      const idAttachmentState = validateFileState(o.id_attachment);

      if (idAttachmentState.type === 'file') {
        const labelText = t("id_attachment");
        const renamedFile = renameFileForUpload(idAttachmentState.value, 'id_attachment', idx, labelText);
        fd.append(`owners[${idx}][id_attachment]`, renamedFile, renamedFile.name);
      } else if (idAttachmentState.type === 'empty' && ownerFileUrls[originalIdx] && o.id) {
        fd.append(`owners[${idx}][id_attachment_delete]`, "true");
      }

      // Handle owner signature file
      if (o.signature instanceof File) {
        fd.append(`owners[${idx}][signature]`, o.signature, o.signature.name);
      } else if (o.signature_delete && o.id) {
        fd.append(`owners[${idx}][signature_delete]`, "true");
      }
    });

    // Add site plan file
    if (form.site_plan_file instanceof File) {
      const labelText = t("attach_land_site_plan");
      const renamedFile = renameFileForUpload(form.site_plan_file, 'site_plan_file', 0, labelText);
      fd.append("site_plan_file", renamedFile, renamedFile.name);
    }

    // Add right holders
    rightHolders.forEach((rh, idx) => {
      if (!(rh.name_ar || "").trim() && !(rh.name_en || "").trim()) return;
      if (rh.id) fd.append(`right_holders[${idx}][id]`, String(rh.id));
      fd.append(`right_holders[${idx}][name_ar]`, rh.name_ar || "");
      fd.append(`right_holders[${idx}][name_en]`, rh.name_en || "");
      fd.append(`right_holders[${idx}][license_no]`, rh.license_no || "");
      fd.append(`right_holders[${idx}][right_hold_type]`, rh.right_hold_type || "Ownership");
      fd.append(`right_holders[${idx}][share_and_acquisition]`, rh.share_and_acquisition || "");
      fd.append(`right_holders[${idx}][total_shares]`, rh.total_shares || "");
    });

    return fd;
  };

  /**
   * Save and proceed to next step or create new project
   */
  const saveAndNext = async () => {
    setShowPdfPanel(false);
    setShowIdPanel(false);
    // noPermit + user chose "no" or "later" → skip siteplan entirely
    if (noPermit && (hasSitePlan === "no" || hasSitePlan === "later")) {
      if (onSitePlanReady) {
        onSitePlanReady({ formData: null, snapshot: null });
      } else if (typeof onNext === "function") {
        onNext();
      }
      return;
    }

    // Require verification of all AI-extracted fields before saving
    const unverifiedAiFields = aiFilledFields.filter((f) => !verifiedFields[f]);
    if (unverifiedAiFields.length > 0) {
      setErrorMsg(t("verify_ai_fields_required"));
      return;
    }

    // New project flow: validate and pass FormData up to WizardPage (no API call yet)
    if (isNewProject) {
      if (onSitePlanReady) {
        try {
          const payload = buildPayload();
          // Build a plain-object snapshot for draft saving (FormData is not serializable)
          const snapshot = {
            municipality: form.municipality || "",
            zone: form.zone || "",
            sector: form.sector || "",
            land_no: form.land_no || "",
            plot_area_sqm: form.plot_area_sqm || "",
            allocation_type: form.allocation_type || "",
            land_use: form.land_use || "",
            construction_status: form.construction_status || "",
            owners_count: owners.length,
            owners: owners.map(o => ({
              owner_name_ar: o.owner_name_ar || "",
              owner_name_en: o.owner_name_en || "",
              id_number: o.id_number || "",
              share_percent: o.share_percent || "100",
              is_authorized: o.is_authorized || false,
              phone: o.phone || "",
              email: o.email || "",
            })),
            owners_summary: owners.map(o => ({
              owner_name_ar: o.owner_name_ar || "",
              owner_name_en: o.owner_name_en || "",
              id_number: o.id_number || "",
              share_percent: o.share_percent || "100",
            })),
          };
          onSitePlanReady({ formData: payload, snapshot });
        } catch (err) {
          setErrorMsg(err?.message || t("unknown_error"));
        }
        return;
      }
      // Legacy fallback: old onCreateProject flow
      if (onCreateProject) {
        try {
          const payload = buildPayload();
          setIsUploading(true);
          setUploadProgress(50);
          await onCreateProject(payload);
          setUploadProgress(100);
          progressTimerRef.current = setTimeout(() => setUploadProgress(0), 1000);
        } catch (err) {
          setErrorMsg(err?.message || t("unknown_error"));
          setIsUploading(false);
          setUploadProgress(0);
        }
        return;
      }
      setErrorMsg(t("unknown_error"));
      return;
    }

    if (!projectId) {
      const msg = t("open_specific_project_to_save");
      setErrorMsg(msg);
      return;
    }

    try {
      const payload = buildPayload();
      setIsUploading(true);
      setUploadProgress(0);

      const onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      };

      let response;

      if (existingId) {
        response = await api.patch(`projects/${projectId}/siteplan/${existingId}/`, payload, { onUploadProgress });
      } else {
        response = await api.post(`projects/${projectId}/siteplan/`, payload, { onUploadProgress });
        if (response?.data?.id) {
          setExistingId(response.data.id);
        }
      }

      setErrorMsg("");
      setIsUploading(false);
      setUploadProgress(100);
      progressTimerRef.current = setTimeout(() => setUploadProgress(0), 1000);

      // For section-only mode (editing), reload and return to view
      if (!isNewProject && !onNext) {
        try {
          const { data } = await api.get(`projects/${projectId}/siteplan/`);
          if (Array.isArray(data) && data.length > 0) {
            const siteplanData = data[0];

            if (siteplanData.site_plan_file) {
              setSitePlanFileUrl(siteplanData.site_plan_file);
            } else {
              setSitePlanFileUrl("");
            }
            setF("site_plan_file", null);

            if (siteplanData.owners && Array.isArray(siteplanData.owners)) {
              const urls = {};
              const names = {};
              siteplanData.owners.forEach((owner, idx) => {
                if (
                  owner.id_attachment &&
                  typeof owner.id_attachment === "string" &&
                  owner.id_attachment.trim() !== ""
                ) {
                  urls[idx] = owner.id_attachment;
                  names[idx] = extractFileNameFromUrl(owner.id_attachment);
                }
              });
              setOwnerFileUrls(urls);
              setOwnerFileNames(names);
            } else {
              setOwnerFileUrls({});
              setOwnerFileNames({});
            }
          } else {
            setOwnerFileUrls({});
            setOwnerFileNames({});
          }
        } catch (_e) {
          logger.error("Error reloading siteplan data", _e);
        }

        updateViewMode(true);
        window.dispatchEvent(new CustomEvent("siteplan-updated", { detail: { projectId } }));
        navTimerRef.current = setTimeout(() => {
          navigate(`/projects/${projectId}`);
        }, 500);
        return;
      }

      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);

        if (!Array.isArray(data) || data.length === 0) {
          setSitePlanFileUrl("");
          setOwnerFileUrls({});
          setOwnerFileNames({});
          return;
        }

        const siteplanData = data[0];

        if (siteplanData.site_plan_file) {
          setSitePlanFileUrl(siteplanData.site_plan_file);
        } else {
          setSitePlanFileUrl("");
        }
        setF("site_plan_file", null);

        const urls = {};
        const names = {};

        if (siteplanData.owners && Array.isArray(siteplanData.owners)) {
          const updatedOwners = siteplanData.owners.map((o, idx, arr) => ({
            ...EMPTY_OWNER,
            ...o,
            _uid: o._uid || generateOwnerUid(),
            id: o.id,
            owner_name_ar: o.owner_name_ar || o.owner_name || "",
            owner_name_en: o.owner_name_en || "",
            id_number: o.id_number || "",
            nationality: o.nationality || "",
            phone: o.phone || "",
            email: o.email || "",
            right_hold_type: o.right_hold_type || "Ownership",
            share_possession: o.share_possession || "",
            id_expiry_date: toInputDateUnified(o.id_expiry_date),
            share_percent: arr.length === 1 ? "100" : String(o.share_percent ?? 0),
            is_authorized: o.is_authorized || (idx === 0 && !Object.prototype.hasOwnProperty.call(o, 'is_authorized')),
            id_attachment: (typeof o.id_attachment === "string" && o.id_attachment.trim()) ? o.id_attachment : null,
          }));

          setOwners(updatedOwners);

          updatedOwners.forEach((owner, idx) => {
            if (owner.id_attachment && typeof owner.id_attachment === "string" && owner.id_attachment.trim()) {
              urls[idx] = owner.id_attachment;
              names[idx] = extractFileNameFromUrl(owner.id_attachment);
            }
          });
        }

        setOwnerFileUrls(urls);
        setOwnerFileNames(names);
      } catch (_e) {
        setSitePlanFileUrl("");
        setOwnerFileUrls({});
        setOwnerFileNames({});
      }

      updateViewMode(true);

      window.dispatchEvent(
        new CustomEvent("siteplan-owners-updated", { detail: { projectId } })
      );

      if (typeof onNext === "function") {
        onNext();
      }

    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);

      logger.error('SitePlan save error', {
        message: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        config: {
          url: err?.config?.url,
          method: err?.config?.method,
        }
      });

      const serverData = err?.response?.data;
      const status = err?.response?.status;

      if (status >= 500) {
        setErrorMsg(t("errors.server_support"));
      } else {
        const formatted = formatSitePlanServerErrors(serverData);
        if (formatted) {
          setErrorMsg(formatted);
        } else {
          setErrorMsg(getErrorMessage(err) || t("save_failed"));
        }
      }
    }
  };

  return (
    <WizardShell
      footer={!viewMode && (!noPermit || (hasSitePlan !== null && hasSitePlan !== undefined)) && (
        <StepActions
          onPrev={onPrev}
          onNext={saveAndNext}
          isLoading={isUploading}
          showPrev={!!onPrev && !isNewProject}
          isLastStep={!isNewProject && !onNext}
          disableNext={hasBlockingErrors}
        />
      )}
    >
      <ErrorDialog errorMsg={errorMsg} setErrorMsg={setErrorMsg} />

      {/* Site plan side panel */}
      {showPdfPanel && (sitePlanFileUrl || form.site_plan_file instanceof File) && (
        <div className="siteplan-pdf-panel">
          <div className="siteplan-pdf-panel__header">
            <span className="siteplan-pdf-panel__title">{t("attach_land_site_plan")}</span>
            <div className="siteplan-pdf-panel__zoom">
              <button className="siteplan-pdf-panel__zoom-btn" onClick={() => setPdfZoom(z => Math.max(50, z - 25))}>−</button>
              <span className="siteplan-pdf-panel__zoom-val">{pdfZoom}%</span>
              <button className="siteplan-pdf-panel__zoom-btn" onClick={() => setPdfZoom(z => Math.min(300, z + 25))}>+</button>
              <button className="siteplan-pdf-panel__zoom-btn" onClick={() => setPdfZoom(100)} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>↺</button>
            </div>
            <button className="siteplan-pdf-panel__close" onClick={() => setShowPdfPanel(false)} title={t("close")}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="siteplan-pdf-panel__body">
            {previewError ? (
              <div className="siteplan-pdf-panel__error">{previewError}</div>
            ) : sitePlanPreviewSrc ? (
              <iframe
                src={sitePlanPreviewSrc}
                title={t("attach_land_site_plan")}
                className="siteplan-pdf-panel__iframe"
                style={{ zoom: `${pdfZoom}%` }}
              />
            ) : (
              <div className="siteplan-pdf-panel__loading">{t("loading")}</div>
            )}

          </div>
        </div>
      )}

      {/* ID card side panel */}
      {showIdPanel && (() => {
        const idFileUrl = ownerFileUrls[idPanelOwnerIdx] ||
          (typeof owners[idPanelOwnerIdx]?.id_attachment === "string" && owners[idPanelOwnerIdx]?.id_attachment.trim() !== ""
            ? owners[idPanelOwnerIdx]?.id_attachment : "");
        const idFileObj = owners[idPanelOwnerIdx]?.id_attachment instanceof File ? owners[idPanelOwnerIdx]?.id_attachment : null;
        const idSrc = idFileObj ? URL.createObjectURL(idFileObj) : idFileUrl;
        if (!idSrc) return null;
        return (
          <div className="siteplan-pdf-panel">
            <div className="siteplan-pdf-panel__header">
              <span className="siteplan-pdf-panel__title">{t("id_attachment")} — {t("owner")} {idPanelOwnerIdx + 1}</span>
              <div className="siteplan-pdf-panel__zoom">
                <button className="siteplan-pdf-panel__zoom-btn" onClick={() => setIdZoom(z => Math.max(50, z - 25))}>−</button>
                <span className="siteplan-pdf-panel__zoom-val">{idZoom}%</span>
                <button className="siteplan-pdf-panel__zoom-btn" onClick={() => setIdZoom(z => Math.min(300, z + 25))}>+</button>
                <button className="siteplan-pdf-panel__zoom-btn" onClick={() => setIdZoom(100)} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>↺</button>
              </div>
              <button className="siteplan-pdf-panel__close" onClick={() => setShowIdPanel(false)} title={t("close")}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="siteplan-pdf-panel__body">
              {previewError ? (
                <div className="siteplan-pdf-panel__error">{previewError}</div>
              ) : idPreviewSrc ? (
                <iframe
                  src={idPreviewSrc}
                  title={t("id_attachment")}
                  className="siteplan-pdf-panel__iframe"
                  style={{ zoom: `${idZoom}%` }}
                />
              ) : (
                <div className="siteplan-pdf-panel__loading">{t("loading")}</div>
              )}

            </div>
          </div>
        );
      })()}

      {/* noPermit: ask if a site plan exists before showing upload section */}
      {noPermit && !viewMode && hasSitePlan === null && (
        <div className="siteplan-question-card">
          <div className="siteplan-question-card__title">{t("has_site_plan_question")}</div>
          <div className="siteplan-question-card__actions">
            <button
              type="button"
              className="siteplan-question-card__btn siteplan-question-card__btn--yes"
              onClick={() => setHasSitePlan(true)}
            >
              {t("yes")}
            </button>
            <button
              type="button"
              className="siteplan-question-card__btn siteplan-question-card__btn--later"
              onClick={() => setHasSitePlan("no")}
            >
              {t("no")}
            </button>
            <button
              type="button"
              className="siteplan-question-card__btn siteplan-question-card__btn--later"
              onClick={() => setHasSitePlan("later")}
            >
              {t("later")}
            </button>
          </div>
        </div>
      )}

      {/* noPermit + "no": no site plan at all */}
      {noPermit && !viewMode && hasSitePlan === "no" && (
        <div className="siteplan-question-card siteplan-question-card--later">
          <div className="siteplan-question-card__badge">{t("no")}</div>
          <button
            type="button"
            className="siteplan-question-card__change"
            onClick={() => setHasSitePlan(null)}
          >
            {t("change")}
          </button>
        </div>
      )}

      {/* noPermit + "later": will be added later */}
      {noPermit && !viewMode && hasSitePlan === "later" && (
        <div className="siteplan-question-card siteplan-question-card--later">
          <div className="siteplan-question-card__badge">{t("siteplan_will_be_added_later")}</div>
          <button
            type="button"
            className="siteplan-question-card__change"
            onClick={() => setHasSitePlan(null)}
          >
            {t("change")}
          </button>
        </div>
      )}

      {/* Show upload section only when: no-permit answered "yes", or normal flow, or existing project */}
      {(!noPermit || hasSitePlan === true || viewMode) && (
        <>
          <AttachmentsSection
            form={form}
            setF={setF}
            viewMode={viewMode}
            sitePlanFileUrl={sitePlanFileUrl}
            setSitePlanFileUrl={setSitePlanFileUrl}
            onSitePlanFileChange={handleSitePlanFileChange}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
            isExtracting={isExtracting}
            owners={owners}
            updateOwner={updateOwner}
            ownerFileUrls={ownerFileUrls}
            ownerFileNames={ownerFileNames}
            onOwnerIdFileChange={handleOwnerIdFileChange}
            projectId={projectId}
            onSitePlanView={() => { setShowPdfPanel(v => !v); setShowIdPanel(false); }}
            onOwnerIdView={(idx) => { setIdPanelOwnerIdx(idx); setShowIdPanel(true); setShowPdfPanel(false); }}
          />

          {isNewProject && !sitePlanUploaded && !viewMode && (
            <div className="siteplan-upload-hint">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{t("upload_siteplan_to_continue")}</span>
            </div>
          )}
        </>
      )}

      {(!noPermit || hasSitePlan === true || viewMode) && (sitePlanUploaded || viewMode) && (
        <>
          <PropertyDetailsSection
            form={form}
            setF={setF}
            viewMode={viewMode}
            onSqmChange={onSqmChange}
            onSqftChange={onSqftChange}
            language={i18n.language}
            verifiedFields={verifiedFields}
            onToggleVerify={toggleVerify}
          />

          <DeveloperDetailsSection
            form={form}
            setF={setF}
            viewMode={viewMode}
          />

          <ApplicationDetailsSection
            form={form}
            setF={setF}
            viewMode={viewMode}
            sitePlanFileUrl={sitePlanFileUrl}
            setSitePlanFileUrl={setSitePlanFileUrl}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
            isExtracting={isExtracting}
            onSitePlanFileChange={handleSitePlanFileChange}
            projectId={projectId}
            language={i18n.language}
            hideFileUpload={true}
            verifiedFields={verifiedFields}
            onToggleVerify={toggleVerify}
          />
        </>
      )}

      {(!noPermit || hasSitePlan === true || viewMode) && (sitePlanUploaded || viewMode) && (
        <OwnerDetailsSection
          owners={owners}
          viewMode={viewMode}
          addOwner={addOwner}
          removeOwner={removeOwner}
          updateOwner={updateOwner}
          ownerFileUrls={ownerFileUrls}
          ownerFileNames={ownerFileNames}
          projectId={projectId}
          isAR={isAR}
          contractOwners={contractOwners}
          hideIdUpload={false}
          onAuthorizedChange={(idx) => {
            setOwners((prev) => prev.map((o, i) => ({ ...o, is_authorized: i === idx })));
          }}
          verifiedFields={verifiedFields}
          onToggleVerify={toggleVerify}
          onOwnerIdFileChange={handleOwnerIdFileChange}
        />
      )}

      {(!noPermit || hasSitePlan === true || viewMode) && (sitePlanUploaded || viewMode) && (
        <>
          <RightHolderSection
            rightHolders={rightHolders}
            viewMode={viewMode}
            onAdd={addRightHolder}
            onRemove={removeRightHolder}
            onUpdate={updateRightHolder}
          />

          <ProjectSourceSection
            form={form}
            setF={setF}
            viewMode={viewMode}
          />
        </>
      )}
    </WizardShell>
  );
}
