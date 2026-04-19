// Unified hook for managing license data
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { toInputDate } from "../../../utils/formatters";
import { toLocalizedUse, isRO } from "../../../utils/licenseHelpers";
import { logger } from "../../../utils/logger";

const INITIAL_FORM = {
  license_type: "",
  project_no: "",
  project_name: "",
  license_project_no: "",
  license_project_name: "",
  license_no: "",
  issue_date: "",
  license_file_ref: "",
  license_stage_or_worktype: "",
  city: "",
  license_status: "",
  zone: "",
  sector: "",
  plot_no: "",
  plot_area_sqm: "",
  land_use: "",
  land_use_sub: "",
  land_plan_no: "",
  plot_address: "",
  consultant_name: "",
  consultant_license_no: "",
  contractor_name: "",
  contractor_license_no: "",
  expiry_date: "",
  technical_decision_ref: "",
  technical_decision_date: "",
  license_notes: "",
  building_license_file: null,
  consultant_same: true,
  design_consultant_name: "",
  design_consultant_name_en: "",
  design_consultant_license_no: "",
  design_consultant_registration_no: "",
  supervision_consultant_name: "",
  supervision_consultant_name_en: "",
  supervision_consultant_license_no: "",
  supervision_consultant_registration_no: "",
  contractor_name_en: "",
  contractor_phone: "",
  contractor_email: "",
};

export function normalizeOwner(o) {
  return {
    owner_name_ar: o.owner_name_ar || o.owner_name || "",
    owner_name_en: o.owner_name_en || "",
    nationality: o.nationality || "",
    id_number: o.id_number || "", // Ensure id_number is preserved
    id_expiry_date: o.id_expiry_date || "",
    right_hold_type: o.right_hold_type || "Ownership",
    share_possession: o.share_possession || "",
    share_percent: (o.share_percent ?? "").toString(),
    phone: o.phone || "",
    email: o.email || "",
  };
}

export default function useLicense(projectId) {
  const { i18n } = useTranslation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [owners, setOwners] = useState([]);
  const [existingId, setExistingId] = useState(null);
  const [isView, setIsView] = useState(false);
  const contractorDefaultsLoaded = useRef(false);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Load contractor defaults from tenant/company settings
  // المقاول = الشركة — contractor fields are auto-filled from company data
  useEffect(() => {
    if (contractorDefaultsLoaded.current) return;
    let mounted = true;

    (async () => {
      try {
        const { data } = await api.get("auth/tenant-settings/current/");
        if (!mounted || !data) return;
        contractorDefaultsLoaded.current = true;

        // الشركة = المقاول — company fields are the source of truth
        const defaults = {
          contractor_name:       data.company_name           || "",
          contractor_name_en:    data.contractor_name_en     || "",
          contractor_license_no: data.company_license_number || "",
          contractor_phone:      data.company_phone          || "",
          contractor_email:      data.company_email          || "",
        };

        setForm((prev) => {
          // Only fill empty fields — don't overwrite data loaded from an existing license
          const next = { ...prev };
          Object.entries(defaults).forEach(([key, val]) => {
            if (!next[key] && val) next[key] = val;
          });
          return next;
        });
      } catch (e) {
        logger.error("useLicense: failed to load contractor defaults", e);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Load existing license
  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/license/`);
        if (!mounted) return;
        if (Array.isArray(data) && data.length) {
          const s = data[0];
          setExistingId(s.id);
          setForm((prev) => ({
            ...INITIAL_FORM,
            ...s,
            consultant_same: s.consultant_same ?? true,
            design_consultant_name: s.design_consultant_name || "",
            design_consultant_name_en: s.design_consultant_name_en || "",
            design_consultant_license_no: s.design_consultant_license_no || "",
            design_consultant_registration_no: s.design_consultant_registration_no || "",
            supervision_consultant_name: s.supervision_consultant_name || "",
            supervision_consultant_name_en: s.supervision_consultant_name_en || "",
            supervision_consultant_license_no: s.supervision_consultant_license_no || "",
            supervision_consultant_registration_no: s.supervision_consultant_registration_no || "",
            contractor_name: s.contractor_name || prev.contractor_name || "",
            contractor_name_en: s.contractor_name_en || prev.contractor_name_en || "",
            contractor_license_no: s.contractor_license_no || prev.contractor_license_no || "",
            contractor_phone: s.contractor_phone || prev.contractor_phone || "",
            contractor_email: s.contractor_email || prev.contractor_email || "",
            issue_date: toInputDate(s.issue_date),
            last_issue_date: toInputDate(s.last_issue_date),
            expiry_date: toInputDate(s.expiry_date),
            technical_decision_date: toInputDate(s.technical_decision_date),
            land_use: toLocalizedUse(s.land_use ?? prev.land_use, i18n.language),
            land_use_sub: toLocalizedUse(s.land_use_sub ?? prev.land_use_sub, i18n.language),
            building_license_file: null,
          }));

          // Do not take owners from license - always fetch from SitePlan
          // This ensures owners are unified across the system
        } else {
          // If no data exists, reset the form
          if (mounted) {
            setForm(INITIAL_FORM);
            setOwners([]);
            setExistingId(null);
          }
        }
      } catch (err) {
        // Error handled by caller
        if (mounted) {
          setForm(INITIAL_FORM);
          setOwners([]);
          setExistingId(null);
        }
      }
    })();
    return () => { mounted = false; };
  }, [projectId, i18n.language]);

  // Read SitePlan to populate fields - always fetch owners and data from SitePlan
  // This useEffect always runs to ensure data is up-to-date from SitePlan
  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    
    const loadSitePlanData = async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);
        if (!mounted) return;
        if (!Array.isArray(data) || !data.length) return;
        const s = data[0];

        setForm((prev) => {
          const next = { ...prev };
          const landUseRaw = s.allocation_name_ar || s.allocation_name || s.allocation_type || "";
          const landUseSubRaw = s.land_use_ar || s.land_use || "";

          // Always update data from SitePlan (even if already present)
          // This ensures data is up-to-date from the primary source
          if (s.municipality) next.city = s.municipality;
          if (s.zone) next.zone = s.zone;
          if (s.land_no) next.plot_no = s.land_no;
          if (s.sector) next.sector = s.sector;
          if (s.plot_address) next.plot_address = s.plot_address;
          if (s.plot_area_sqm) next.plot_area_sqm = s.plot_area_sqm;

          if (landUseRaw) next.land_use = toLocalizedUse(landUseRaw, i18n.language);
          if (landUseSubRaw) next.land_use_sub = toLocalizedUse(landUseSubRaw, i18n.language);

          return next;
        });

        // Always fetch owners from SitePlan (even if they exist in the license)
        // This ensures owners are unified across the system
        if (Array.isArray(s.owners) && s.owners.length > 0) {
          setOwners(s.owners.map(normalizeOwner));
        } else {
          setOwners([]);
        }
      } catch (e) {
        // Silent error handling
      }
    };
    
    // Immediate load
    loadSitePlanData();
    
    // Listen for owner updates from SitePlan
    const handleOwnersUpdate = (event) => {
      if (event.detail?.projectId === projectId) {
        loadSitePlanData();
      }
    };
    
    const handleOwnersLoaded = (event) => {
      if (event.detail?.projectId === projectId && event.detail?.owners) {
        // Update owners directly from the event
        setOwners(event.detail.owners.map(normalizeOwner));
        // Don't call loadSitePlanData here - handleOwnersUpdate will handle it to avoid duplicate calls
      }
    };
    
    window.addEventListener('siteplan-owners-updated', handleOwnersUpdate);
    window.addEventListener('siteplan-owners-loaded', handleOwnersLoaded);
    
    return () => { 
      mounted = false;
      window.removeEventListener('siteplan-owners-updated', handleOwnersUpdate);
      window.removeEventListener('siteplan-owners-loaded', handleOwnersLoaded);
    };
  }, [projectId, i18n.language]);

  // Language switch
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      land_use: toLocalizedUse(prev.land_use, i18n.language),
      land_use_sub: toLocalizedUse(prev.land_use_sub, i18n.language),
    }));
  }, [i18n.language, setForm]);

  return { form, setForm, setF, owners, setOwners, existingId, setExistingId, isView, setIsView, isRO };
}

