// Unified hook for managing contract data
import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { toInputDate, toIsoDate } from "../../../utils/formatters";
import { toYesNo } from "../../../utils/helpers";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import { logger } from "../../../utils/logger";

const INITIAL_FORM = {
  contract_classification: "",
  contract_type: "",
  tender_no: "",
  contract_date: "",
  owners: [],
  contractor_name: "",
  contractor_name_en: "",
  contractor_trade_license: "",
  contractor_phone: "",
  contractor_email: "",
  total_project_value: "",
  total_bank_value: "",
  total_owner_value: "",
  project_duration_months: "",
  total_floor_area: "",
  owner_includes_consultant: "no",
  owner_fee_design_percent: "",
  owner_fee_supervision_percent: "",
  owner_fee_design_pay_to: "contractor",
  owner_fee_supervision_pay_to: "contractor",
  owner_fee_extra_mode: "percent",
  owner_fee_extra_value: "",
  owner_fee_extra_includes_vat: "no",
  bank_includes_consultant: "no",
  bank_fee_design_percent: "",
  bank_fee_supervision_percent: "",
  bank_fee_extra_mode: "percent",
  bank_fee_extra_value: "",
  bank_fee_extra_includes_vat: "no",
  project_end_date: "",
  contract_file: null,
  contract_file_url: null,
  contract_file_name: null,
  contract_appendix_file: null,
  contract_appendix_file_url: null,
  contract_appendix_file_name: null,
  contract_explanation_file: null,
  contract_explanation_file_url: null,
  contract_explanation_file_name: null,
  general_notes: "",
  project_description: "", // Project description in contract
  attachments: [], // Dynamic attachments
  extensions: [], // Extensions: [{reason: string, days: number, months: number}, ...]
  // Static contract attachments
  quantities_table_file: null,
  quantities_table_file_url: null,
  quantities_table_file_name: null,
  approved_materials_table_file: null,
  approved_materials_table_file_url: null,
  approved_materials_table_file_name: null,
  price_offer_file: null,
  price_offer_file_url: null,
  price_offer_file_name: null,
  // Contractual drawings (all types)
  architectural_drawings_file: null,
  architectural_drawings_file_url: null,
  architectural_drawings_file_name: null,
  structural_drawings_file: null,
  structural_drawings_file_url: null,
  structural_drawings_file_name: null,
  ac_drawings_file: null,
  ac_drawings_file_url: null,
  ac_drawings_file_name: null,
  electrical_drawings_file: null,
  electrical_drawings_file_url: null,
  electrical_drawings_file_name: null,
  water_supply_drawings_file: null,
  water_supply_drawings_file_url: null,
  water_supply_drawings_file_name: null,
  drainage_drawings_file: null,
  drainage_drawings_file_url: null,
  drainage_drawings_file_name: null,
  telecommunication_drawings_file: null,
  telecommunication_drawings_file_url: null,
  telecommunication_drawings_file_name: null,
  fire_fighting_drawings_file: null,
  fire_fighting_drawings_file_url: null,
  fire_fighting_drawings_file_name: null,
  cctv_drawings_file: null,
  cctv_drawings_file_url: null,
  cctv_drawings_file_name: null,
  // Legacy fields - for backward compatibility only
  mep_drawings_file: null,
  mep_drawings_file_url: null,
  mep_drawings_file_name: null,
  decoration_drawings_file: null,
  decoration_drawings_file_url: null,
  decoration_drawings_file_name: null,
  contractual_drawings_file: null,
  contractual_drawings_file_url: null,
  contractual_drawings_file_name: null,
  general_specifications_file: null,
  general_specifications_file_url: null,
  general_specifications_file_name: null,
};

export default function useContract(projectId) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [existingId, setExistingId] = useState(null);
  const [isView, setIsView] = useState(false);
  const [loading, setLoading] = useState(!!projectId);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // For new projects: load contractor defaults from tenant settings
  useEffect(() => {
    if (projectId) return; // handled by the full load effect below
    (async () => {
      try {
        const { data: settings } = await api.get("auth/tenant-settings/current/");
        if (settings) {
          setForm((prev) => ({
            ...prev,
            contractor_name: settings.contractor_name || settings.company_name || prev.contractor_name || "",
            contractor_name_en: settings.contractor_name_en || prev.contractor_name_en || "",
            contractor_trade_license: settings.contractor_license_no || settings.company_license_number || prev.contractor_trade_license || "",
            contractor_phone: settings.company_phone || prev.contractor_phone || "",
            contractor_email: settings.company_email || prev.contractor_email || "",
          }));
        }
      } catch (_e) { /* ignore */ }
    })();
  }, [projectId]);

  // Read existing contract + siteplan owners in one shot to avoid race conditions
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    (async () => {
      try {
        const [contractRes, spRes, settingsRes, licRes] = await Promise.allSettled([
          api.get(`projects/${projectId}/contract/`),
          api.get(`projects/${projectId}/siteplan/`),
          api.get("auth/tenant-settings/current/"),
          api.get(`projects/${projectId}/license/`),
        ]);

        // --- Tenant settings (contractor defaults) ---
        const tenantSettings = settingsRes.status === "fulfilled" ? settingsRes.value.data : null;

        // --- Siteplan owners ---
        let sitePlanOwners = [];
        if (spRes.status === "fulfilled" && Array.isArray(spRes.value?.data) && spRes.value.data.length) {
          const sp = spRes.value.data[0];
          sitePlanOwners = Array.isArray(sp.owners) ? sp.owners.map(o => ({ ...o })) : [];
        }

        const { data } = contractRes.status === "fulfilled"
          ? contractRes.value
          : { data: [] };
        if (!Array.isArray(data)) return;
        if (Array.isArray(data) && data.length) {
          const s = data[0];
          setExistingId(s.id);
          // NOTE: contractor fields are filled by to_representation from tenant_settings
          
          
          // Filter attachments to remove any "main_contract" type attachments
          //    because the main contract has its own section and should not appear in contract appendices
          const filteredAttachments = Array.isArray(s.attachments)
            ? s.attachments
                .filter(att => {
                  if (!att) return false;
                  // Remove "main_contract" type attachments
                  if (att.type === "main_contract") return false;
                  // Remove empty attachments (no file, no notes, no price)
                  const hasFile = att.file_url && String(att.file_url).trim() !== "";
                  const hasNotes = att.notes && String(att.notes).trim() !== "";
                  const hasPrice = att.price !== undefined && att.price !== null && String(att.price).trim() !== "" && att.price !== 0;
                  if (!hasFile && !hasNotes && !hasPrice) return false;
                  return true;
                })
                .map(att => {
                  
                  // Try to read file_url from multiple possible sources
                  const fileUrl = att.file_url || att.file || null;
                  // Try to read file_name from multiple possible sources
                  const fileName = att.file_name || (fileUrl ? extractFileNameFromUrl(fileUrl) : null);
                  
                  const mappedAtt = {
                    type: att.type || "appendix",
                    date: att.date || "",
                    notes: att.notes || "",
                    file: null, // Don't load File object
                    file_url: fileUrl,
                    file_name: fileName,
                  };
                  
                  
                  return mappedAtt;
                })
            : [];
          
          
          // Helper function to format numeric values with commas
          const formatNumberValue = (value) => {
            if (value === null || value === undefined || value === "") return "";
            const num = parseFloat(value);
            if (isNaN(num)) return value;
            return num.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
          };

          // Contractor fields come from s (contract API response).
          // ContractSerializer.to_representation() already fills them from TenantSettings in the backend.
          // We only use tenantSettings as a fallback for new (unsaved) contracts where s fields are empty.
          // الشركة = المقاول — backend to_representation already fills these from company fields
          const contractorDefaults = {
            contractor_name: s.contractor_name || tenantSettings?.contractor_name || tenantSettings?.company_name || "",
            contractor_name_en: s.contractor_name_en || tenantSettings?.contractor_name_en || "",
            contractor_trade_license: s.contractor_trade_license || tenantSettings?.contractor_license_no || tenantSettings?.company_license_number || "",
            contractor_phone: s.contractor_phone || tenantSettings?.company_phone || "",
            contractor_email: s.contractor_email || tenantSettings?.company_email || "",
          };

          setForm((prev) => ({
            ...prev,
            ...s,
            ...contractorDefaults,
            // Ensure contract_classification is loaded explicitly
            contract_classification: s.contract_classification || prev.contract_classification || "",
            contract_date: toInputDate(s.contract_date) || prev.contract_date || "",
            owner_includes_consultant: toYesNo(s.owner_includes_consultant),
            bank_includes_consultant: toYesNo(s.bank_includes_consultant),
            // Load Pay To fields with default values
            owner_fee_design_pay_to: s.owner_fee_design_pay_to || prev.owner_fee_design_pay_to || "contractor",
            owner_fee_supervision_pay_to: s.owner_fee_supervision_pay_to || prev.owner_fee_supervision_pay_to || "contractor",
            // Format numeric values with commas when loading from the API
            owner_fee_extra_value: formatNumberValue(s.owner_fee_extra_value),
            bank_fee_extra_value: formatNumberValue(s.bank_fee_extra_value),
            // Load extensions with new fields
            extensions: Array.isArray(s.extensions) 
              ? s.extensions.map(ext => ({
                  reason: ext.reason || "",
                  days: ext.days || 0,
                  months: ext.months || 0,
                  extension_date: ext.extension_date || "",
                  approval_number: ext.approval_number || "",
                  file: null, // Don't load File object
                  file_url: ext.file_url || null,
                  file_name: ext.file_name || null,
                }))
              : [],
            // Load owners: prefer contract owners, fallback to siteplan owners
            owners: Array.isArray(s.owners) && s.owners.length > 0 ? s.owners : sitePlanOwners,
            // Use filtered attachments (without main_contract) ensuring file_url and file_name exist
            attachments: filteredAttachments,
            // Load contract files with file_url and file_name
            contract_file: null,
            contract_file_url: s.contract_file || null,
            contract_file_name: s.contract_file ? (s.contract_file_name || extractFileNameFromUrl(s.contract_file) || null) : null,
            contract_appendix_file: null,
            contract_appendix_file_url: s.contract_appendix_file || null,
            contract_appendix_file_name: s.contract_appendix_file ? (s.contract_appendix_file_name || extractFileNameFromUrl(s.contract_appendix_file) || null) : null,
            contract_explanation_file: null,
            contract_explanation_file_url: s.contract_explanation_file || null,
            contract_explanation_file_name: s.contract_explanation_file ? (s.contract_explanation_file_name || extractFileNameFromUrl(s.contract_explanation_file) || null) : null,
            // Load static attachments with file_url and file_name
            quantities_table_file: null,
            quantities_table_file_url: s.quantities_table_file || null,
            quantities_table_file_name: s.quantities_table_file ? (s.quantities_table_file_name || extractFileNameFromUrl(s.quantities_table_file) || null) : null,
            approved_materials_table_file: null,
            approved_materials_table_file_url: s.approved_materials_table_file || null,
            approved_materials_table_file_name: s.approved_materials_table_file ? (s.approved_materials_table_file_name || extractFileNameFromUrl(s.approved_materials_table_file) || null) : null,
            price_offer_file: null,
            price_offer_file_url: s.price_offer_file || null,
            price_offer_file_name: s.price_offer_file ? (s.price_offer_file_name || extractFileNameFromUrl(s.price_offer_file) || null) : null,
            // Load new contractual drawings
            architectural_drawings_file: null,
            architectural_drawings_file_url: s.architectural_drawings_file || null,
            architectural_drawings_file_name: s.architectural_drawings_file ? (s.architectural_drawings_file_name || extractFileNameFromUrl(s.architectural_drawings_file) || null) : null,
            structural_drawings_file: null,
            structural_drawings_file_url: s.structural_drawings_file || null,
            structural_drawings_file_name: s.structural_drawings_file ? (s.structural_drawings_file_name || extractFileNameFromUrl(s.structural_drawings_file) || null) : null,
            ac_drawings_file: null,
            ac_drawings_file_url: s.ac_drawings_file || null,
            ac_drawings_file_name: s.ac_drawings_file ? (s.ac_drawings_file_name || extractFileNameFromUrl(s.ac_drawings_file) || null) : null,
            electrical_drawings_file: null,
            electrical_drawings_file_url: s.electrical_drawings_file || null,
            electrical_drawings_file_name: s.electrical_drawings_file ? (s.electrical_drawings_file_name || extractFileNameFromUrl(s.electrical_drawings_file) || null) : null,
            water_supply_drawings_file: null,
            water_supply_drawings_file_url: s.water_supply_drawings_file || null,
            water_supply_drawings_file_name: s.water_supply_drawings_file ? (s.water_supply_drawings_file_name || extractFileNameFromUrl(s.water_supply_drawings_file) || null) : null,
            drainage_drawings_file: null,
            drainage_drawings_file_url: s.drainage_drawings_file || null,
            drainage_drawings_file_name: s.drainage_drawings_file ? (s.drainage_drawings_file_name || extractFileNameFromUrl(s.drainage_drawings_file) || null) : null,
            telecommunication_drawings_file: null,
            telecommunication_drawings_file_url: s.telecommunication_drawings_file || null,
            telecommunication_drawings_file_name: s.telecommunication_drawings_file ? (s.telecommunication_drawings_file_name || extractFileNameFromUrl(s.telecommunication_drawings_file) || null) : null,
            fire_fighting_drawings_file: null,
            fire_fighting_drawings_file_url: s.fire_fighting_drawings_file || null,
            fire_fighting_drawings_file_name: s.fire_fighting_drawings_file ? (s.fire_fighting_drawings_file_name || extractFileNameFromUrl(s.fire_fighting_drawings_file) || null) : null,
            cctv_drawings_file: null,
            cctv_drawings_file_url: s.cctv_drawings_file || null,
            cctv_drawings_file_name: s.cctv_drawings_file ? (s.cctv_drawings_file_name || extractFileNameFromUrl(s.cctv_drawings_file) || null) : null,
            // Legacy fields - for backward compatibility
            mep_drawings_file: null,
            mep_drawings_file_url: s.mep_drawings_file || null,
            mep_drawings_file_name: s.mep_drawings_file ? (s.mep_drawings_file_name || extractFileNameFromUrl(s.mep_drawings_file) || null) : null,
            decoration_drawings_file: null,
            decoration_drawings_file_url: s.decoration_drawings_file || null,
            decoration_drawings_file_name: s.decoration_drawings_file ? (s.decoration_drawings_file_name || extractFileNameFromUrl(s.decoration_drawings_file) || null) : null,
            contractual_drawings_file: null,
            contractual_drawings_file_url: s.contractual_drawings_file || null,
            contractual_drawings_file_name: s.contractual_drawings_file ? (s.contractual_drawings_file_name || extractFileNameFromUrl(s.contractual_drawings_file) || null) : null,
            general_specifications_file: null,
            general_specifications_file_url: s.general_specifications_file || null,
            general_specifications_file_name: s.general_specifications_file ? (s.general_specifications_file_name || extractFileNameFromUrl(s.general_specifications_file) || null) : null,
          }));
          // Don't set setIsView(true) automatically - stays in edit mode until user chooses view
          // Always sync consultant company name from license — license is source of truth
          if (licRes.status === "fulfilled" && Array.isArray(licRes.value?.data) && licRes.value.data.length > 0) {
            const lic = licRes.value.data[0];
            const consultantName =
              lic.supervision_consultant?.name || lic.supervision_consultant_name ||
              lic.design_consultant?.name || lic.design_consultant_name || "";
            const consultantNameEn =
              lic.supervision_consultant?.name_en || lic.supervision_consultant_name_en ||
              lic.design_consultant?.name_en || lic.design_consultant_name_en || "";
            if (consultantName || consultantNameEn) {
              setForm((prev) => {
                const prevComm = prev.official_communication || {};
                const prevConsultant = prevComm.consultant || {};
                return {
                  ...prev,
                  official_communication: {
                    ...prevComm,
                    consultant: {
                      ...prevConsultant,
                      company_name: consultantName || prevConsultant.company_name,
                      company_name_en: consultantNameEn || prevConsultant.company_name_en,
                    },
                  },
                };
              });
            }
          }
        } else {
          // No contract yet — use already-fetched tenant settings
          if (tenantSettings) {
            setForm((prev) => ({
              ...prev,
              contractor_name: tenantSettings.contractor_name || tenantSettings.company_name || prev.contractor_name || "",
              contractor_name_en: tenantSettings.contractor_name_en || prev.contractor_name_en || "",
              contractor_trade_license: tenantSettings.contractor_license_no || tenantSettings.company_license_number || prev.contractor_trade_license || "",
              contractor_phone: tenantSettings.company_phone || prev.contractor_phone || "",
              contractor_email: tenantSettings.company_email || prev.contractor_email || "",
            }));
          }

          // Auto-populate consultant company name from already-fetched license
          if (licRes.status === "fulfilled" && Array.isArray(licRes.value?.data) && licRes.value.data.length > 0) {
            const lic = licRes.value.data[0];
            const consultantName =
              lic.supervision_consultant?.name || lic.supervision_consultant_name ||
              lic.design_consultant?.name || lic.design_consultant_name || "";
            const consultantNameEn =
              lic.supervision_consultant?.name_en || lic.supervision_consultant_name_en ||
              lic.design_consultant?.name_en || lic.design_consultant_name_en || "";
            if (consultantName || consultantNameEn) {
              setForm((prev) => {
                const prevComm = prev.official_communication || {};
                const prevConsultant = prevComm.consultant || {};
                return {
                  ...prev,
                  official_communication: {
                    ...prevComm,
                    consultant: {
                      ...prevConsultant,
                      company_name: consultantName || prevConsultant.company_name,
                      company_name_en: consultantNameEn || prevConsultant.company_name_en,
                    },
                  },
                };
              });
            }
          }

          // Owners for new contract: use siteplan owners
          if (sitePlanOwners.length > 0) {
            setForm((prev) => {
              if (Array.isArray(prev.owners) && prev.owners.length > 0) return prev;
              return { ...prev, owners: sitePlanOwners };
            });
          }
        }
      } catch (err) { logger.debug("useContract: load contract failed", err); }
      finally { setLoading(false); }
    })();
  }, [projectId]);

  // Automatic today's date assignment has been removed
  // User must enter the contract date manually per the document

  return { form, setForm, setF, existingId, setExistingId, isView, setIsView, loading };
}

