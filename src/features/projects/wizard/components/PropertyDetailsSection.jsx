import { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CollapsibleSection from "./CollapsibleSection";
import {
  FormField,
  FormGrid,
  FormInput,
  FormSelect,
  FormViewField,
} from "../../../../components/ui/form";
import RtlSelect from "../../../../components/forms/RtlSelect";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import DateInput from "../../../../components/forms/DateInput";
import { MUNICIPALITIES, ZONES } from "../../../../utils/constants";
import { toLocalizedUse } from "../../../../utils/licenseHelpers";
import { formatDate } from "../../../../utils/formatters";
import VerifiableField from "./VerifiableField";

const CUSTOM_ZONES_KEY = "custom_zones_v1";

function loadCustomZones() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_ZONES_KEY) || "{}"); }
  catch { return {}; }
}
function saveCustomZone(municipality, value) {
  const all = loadCustomZones();
  const list = all[municipality] || [];
  if (!list.includes(value)) {
    all[municipality] = [...list, value];
    localStorage.setItem(CUSTOM_ZONES_KEY, JSON.stringify(all));
  }
}

/**
 * PropertyDetailsSection Component
 *
 * Displays and edits property details including municipality, zone, sector,
 * plot area (sqm/sqft), land number, allocation type, land use, construction status, and allocation date.
 */

// Dependent land use options based on allocation type
const LAND_USE_BY_ALLOCATION = {
  Residential: [
    { value: "residential_residentialLand", labelKey: "land_use_residential_land" },
    { value: "RESIDENCES_residentialLand", labelKey: "land_use_residences" },
    { value: "investment_residentialVilla", labelKey: "land_use_investment_villa" },
    { value: "investment_residentialVillas", labelKey: "land_use_investment_villas" },
  ],
  Industrial: [
    { value: "industrial_industrialLand", labelKey: "land_use_industrial_land" },
    { value: "industrial_factory", labelKey: "land_use_factory" },
  ],
  Temporary: [
    { value: "industrial_tempTransportation", labelKey: "land_use_temp_transportation" },
  ],
  PublicBuilding: [
    { value: "MASAJED_MOSQUE", labelKey: "land_use_mosque" },
  ],
  Commercial: [],
  Government: [],
};

export default function PropertyDetailsSection({
  form,
  setF,
  viewMode,
  onSqmChange,
  onSqftChange,
  language,
  verifiedFields = {},
  onToggleVerify,
}) {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(language || i18n.language || "");
  const [customZones, setCustomZones] = useState(() => loadCustomZones());

  // Municipality options
  const municipalityOptions = useMemo(
    () =>
      MUNICIPALITIES.map((m) => ({
        value: m.value,
        label: isAR ? m.label.ar : m.label.en,
      })),
    [isAR]
  );

  // Zone options: built-in list + custom zones saved by user
  const zonesOptions = useMemo(() => {
    const builtIn = (ZONES[form.municipality] || []).map((z) => ({
      value: z.value,
      label: isAR ? z.label.ar : z.label.en,
    }));
    const custom = (customZones[form.municipality] || [])
      .filter((v) => !builtIn.find((o) => o.value === v))
      .map((v) => ({ value: v, label: v }));
    return [...builtIn, ...custom];
  }, [form.municipality, isAR, customZones]);

  // Reset zone only when user manually changes municipality (not during auto-fill from PDF).
  // We track the previous municipality to detect manual changes vs simultaneous auto-fill.
  useEffect(() => {
    const zoneValues = (ZONES[form.municipality] || []).map((z) => z.value);
    // Only reset if zone is set AND municipality is set AND zone truly doesn't belong to this municipality.
    // Use a short delay so that simultaneous setF("municipality") + setF("zone") calls from PDF
    // extraction both land before we check validity.
    if (!form.zone || !form.municipality) return;
    const timer = setTimeout(() => {
      const latestZoneValues = (ZONES[form.municipality] || []).map((z) => z.value);
      if (form.zone && !latestZoneValues.includes(form.zone)) {
        setF("zone", "");
      }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.municipality]);

  // Allocation Type options
  const allocationTypeOptions = [
    { value: "Residential", label: t("allocation_residential") },
    { value: "Industrial", label: t("allocation_industrial") },
    { value: "Temporary", label: t("allocation_temporary") },
    { value: "PublicBuilding", label: t("allocation_public_building") },
    { value: "Commercial", label: t("allocation_commercial") },
    { value: "Government", label: t("allocation_government") },
  ];

  // Land Use options — dependent on allocation type
  const landUseOptions = useMemo(() => {
    const items = LAND_USE_BY_ALLOCATION[form.allocation_type] || [];
    return items.map((item) => ({
      value: item.value,
      label: t(item.labelKey),
    }));
  }, [form.allocation_type, t]);

  // Reset land_use when allocation_type changes and current value is invalid
  useEffect(() => {
    const validValues = (LAND_USE_BY_ALLOCATION[form.allocation_type] || []).map((i) => i.value);
    if (form.land_use && !validValues.includes(form.land_use)) {
      setF("land_use", "");
    }
  }, [form.allocation_type, form.land_use, setF]);

  // Construction Status options
  const constructionStatusOptions = [
    { value: "not_constructed", label: t("construction_not_constructed") },
    { value: "under_construction", label: t("construction_under_construction") },
    { value: "permit_issued", label: t("construction_permit_issued") },
    { value: "constructed", label: t("construction_constructed") },
  ];

  return (
    <CollapsibleSection title={t("property_details")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}>
      {viewMode ? (
        <FormGrid cols={3}>
          <FormViewField label={t("municipality")} value={form.municipality} />
          <FormViewField label={t("zone")} value={form.zone} />
          <FormViewField label={t("sector")} value={form.sector} />
          <FormViewField label={t("plot_area_sqm")} value={form.plot_area_sqm} />
          <FormViewField label={t("plot_area_sqft")} value={form.plot_area_sqft} />
          <FormViewField label={t("land_no")} value={form.land_no} />
          <FormViewField
            label={t("allocation_type")}
            value={toLocalizedUse(form.allocation_type, i18n.language)}
          />
          <FormViewField
            label={t("land_use")}
            value={form.land_use ? t((LAND_USE_BY_ALLOCATION[form.allocation_type] || []).find((i) => i.value === form.land_use)?.labelKey || form.land_use) : ""}
          />
          <FormViewField
            label={t("construction_status")}
            value={form.construction_status ? t(`construction_${form.construction_status}`) : ""}
          />
          {form.allocation_date && (
            <FormViewField
              label={t("allocation_date")}
              value={formatDate(form.allocation_date, i18n.language)}
            />
          )}
          {/* latitude/longitude hidden from UI but kept in form state */}
        </FormGrid>
      ) : (
        <>
        <FormGrid cols={3}>
          <VerifiableField fieldName="municipality" verified={verifiedFields.municipality} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("municipality")}>
            <RtlSelect
              className="rtl-select"
              options={municipalityOptions}
              value={form.municipality}
              onChange={(v) => {
                setF("municipality", v);
                setF("zone", "");
              }}
              placeholder={t("select_municipality")}
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="zone" verified={verifiedFields.zone} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("zone")}>
            <Autocomplete
              freeSolo
              disabled={!form.municipality}
              options={zonesOptions}
              getOptionLabel={(o) => (typeof o === "string" ? o : o.label)}
              value={zonesOptions.find((o) => o.value === form.zone) || form.zone || null}
              onChange={(_, newVal) => {
                const v = typeof newVal === "string" ? newVal : newVal?.value || "";
                setF("zone", v);
                if (v && form.municipality && !zonesOptions.find((o) => o.value === v)) {
                  saveCustomZone(form.municipality, v);
                  setCustomZones(loadCustomZones());
                }
              }}
              onInputChange={(_, inputVal, reason) => {
                if (reason === "input") setF("zone", inputVal);
              }}
              onBlur={(e) => {
                const v = e.target.value?.trim();
                if (v && form.municipality && !zonesOptions.find((o) => o.value === v || o.label === v)) {
                  saveCustomZone(form.municipality, v);
                  setCustomZones(loadCustomZones());
                  setF("zone", v);
                }
              }}
              size="small"
              componentsProps={{ popper: { sx: { zIndex: 9999 } } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={form.municipality ? t("select_zone") : t("select_municipality_first")}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      minHeight: "40px",
                      "& fieldset": { borderColor: "var(--border, #e5e7eb)" },
                      "&:hover fieldset": { borderColor: "var(--accent, #C8A84E)" },
                      "&.Mui-focused fieldset": { borderColor: "var(--accent, #C8A84E)", boxShadow: "0 0 0 3px rgba(200,168,78,.12)" },
                    },
                    "& .MuiInputBase-input": { textAlign: isAR ? "right" : "left", fontSize: "0.875rem" },
                  }}
                />
              )}
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="sector" verified={verifiedFields.sector} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("sector")}>
            <FormInput
              value={form.sector}
              onChange={(e) => setF("sector", e.target.value.toUpperCase())}
              className="input--uppercase"
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="plot_area_sqm" verified={verifiedFields.plot_area_sqm} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("plot_area_sqm")}>
            <FormInput
              type="text"
              inputMode="decimal"
              endIcon={<span className="form-input-unit">m²</span>}
              value={form.plot_area_sqm ? form.plot_area_sqm.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              onChange={(e) => {
                const withoutCommas = e.target.value.replace(/,/g, "");
                const cleaned = withoutCommas.replace(/[^\d.]/g, "");
                const parts = cleaned.split(".");
                let final = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;

                const [integerPart] = final.split(".");
                if (integerPart && integerPart.length > 10) {
                  final = integerPart.slice(0, 10) + (parts.length > 1 ? "." + parts.slice(1).join("") : "");
                }

                onSqmChange(final);
              }}
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="plot_area_sqft" verified={verifiedFields.plot_area_sqft} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("plot_area_sqft")}>
            <FormInput
              type="text"
              inputMode="decimal"
              endIcon={<span className="form-input-unit">ft²</span>}
              value={form.plot_area_sqft ? form.plot_area_sqft.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              onChange={(e) => {
                const withoutCommas = e.target.value.replace(/,/g, "");
                const cleaned = withoutCommas.replace(/[^\d.]/g, "");
                const parts = cleaned.split(".");
                let final = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;

                const totalDigits = final.replace(/\./g, "").length;
                if (totalDigits > 12) {
                  const [integerPart, decimalPart] = final.split(".");
                  if (decimalPart) {
                    const maxDecimal = 12 - integerPart.length;
                    final = integerPart + "." + decimalPart.slice(0, maxDecimal);
                  } else {
                    final = final.slice(0, 12);
                  }
                }

                onSqftChange(final);
              }}
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="land_no" verified={verifiedFields.land_no} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("land_no")}>
            <FormInput
              type="text"
              value={form.land_no}
              onChange={(e) => setF("land_no", e.target.value.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, "").toUpperCase())}
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="allocation_type" verified={verifiedFields.allocation_type} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("allocation_type")}>
            <FormSelect
              options={allocationTypeOptions}
              value={form.allocation_type}
              onChange={(value) => setF("allocation_type", value)}
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="land_use" verified={verifiedFields.land_use} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("land_use")}>
            <FormSelect
              options={landUseOptions}
              value={form.land_use}
              onChange={(value) => setF("land_use", value)}
              disabled={!form.allocation_type}
              placeholder={!form.allocation_type ? t("select_allocation_type_first") : undefined}
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="construction_status" verified={verifiedFields.construction_status} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("construction_status")}>
            <FormSelect
              options={constructionStatusOptions}
              value={form.construction_status}
              onChange={(value) => setF("construction_status", value)}
            />
          </FormField>
          </VerifiableField>
          <VerifiableField fieldName="allocation_date" verified={verifiedFields.allocation_date} onToggle={onToggleVerify} viewMode={viewMode}>
          <FormField label={t("allocation_date")}>
            <DateInput
              value={form.allocation_date}
              onChange={(value) => setF("allocation_date", value)}
              placeholder="dd / mm / yyyy"
            />
          </FormField>
          </VerifiableField>
        </FormGrid>
        {/* latitude/longitude hidden from UI but kept in form state */}
        </>
      )}
    </CollapsibleSection>
  );
}
