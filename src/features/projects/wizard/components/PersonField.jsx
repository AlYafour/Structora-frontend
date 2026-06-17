/**
 * Unified component for consultant or contractor field with search
 *
 * @version 2.0.0 - Migrated from react-select to MUI
 * @migration This component now uses MUI Autocomplete instead of react-select/creatable
 * for bundle size optimization (~100KB saved)
 */
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import Field from "../../../../components/forms/Field";
import PhoneInput from "../../../../components/forms/PhoneInput";
import ViewRow from "../../../../components/forms/ViewRow";
import { loadSavedList, saveToList } from "../../../../utils/helpers/storage";
import { api } from "../../../../services/api";
import { logger } from "../../../../utils/logger";
import { sanitizeEmailInput } from "../../../../utils/validators/email";
import VerifiableField from "./VerifiableField";
import "./PersonField.css";

const filter = createFilterOptions();

// Cache for consultants from database (shared across all PersonField instances)
const consultantsCache = {
 data: [],
 timestamp: null,
 loading: false,
 CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

export default function PersonField({
 type = "consultant", // "consultant" or "contractor"
 label,
 licenseLabel,
 nameValue,
 nameEnValue,
 licenseValue,
 registrationNumberValue,
 phoneValue,
 emailValue,
 onNameChange,
 onNameEnChange,
 onLicenseChange,
 onRegistrationNumberChange,
 onPhoneChange,
 onEmailChange,
 isView,
 onSelect,
 verifiedFields = {},
 onToggleVerify,
 fieldPrefix = "",
}) {
 const { t, i18n } = useTranslation();
 const isAR = /^ar\b/i.test(i18n.language || "");
 const [showSuggestions, setShowSuggestions] = useState(false);
 const storageKey = type === "consultant" ? "consultants" : "contractors";
 const [savedList, setSavedList] = useState(() => loadSavedList(storageKey));
 const [dbConsultants, setDbConsultants] = useState([]);
 const [loadingConsultants, setLoadingConsultants] = useState(false);
 const [inputValue, setInputValue] = useState("");

 // Fetch consultants from /consultants/ API directly (for consultant type only)
 useEffect(() => {
 if (type !== "consultant" || isView) {
 return;
 }

 // Check cache first
 const now = Date.now();
 const isCacheValid =
 consultantsCache.data.length > 0 &&
 consultantsCache.timestamp &&
 now - consultantsCache.timestamp < consultantsCache.CACHE_DURATION;

 if (isCacheValid) {
 // Use data directly from cache
 setDbConsultants(consultantsCache.data);
 return;
 }

 // If loading is in progress, wait
 if (consultantsCache.loading) {
 return;
 }

 const loadConsultantsFromAPI = async () => {
 consultantsCache.loading = true;
 setLoadingConsultants(true);

 try {
 // Fetch consultants directly from /consultants/ API
 const { data } = await api.get("consultants/");
 const consultantsList = Array.isArray(data)
 ? data
 : data?.results || data?.items || data?.data || [];

 // Convert data to required format
 const formattedConsultants = consultantsList
 .map((c) => ({
 id: c.id,
 name: c.name || "",
 name_en: c.name_en || "",
 license: c.license_no || "",
 registration_number: c.registration_number || "",
 stamp_url: c.stamp_url || null,
 }))
 .sort((a, b) => {
 return (a.name || "").localeCompare(b.name || "", isAR ? "ar" : "en");
 });

 // Save to cache
 consultantsCache.data = formattedConsultants;
 consultantsCache.timestamp = Date.now();
 setDbConsultants(formattedConsultants);
 } catch (e) {
 logger.error("Error loading consultants from API", e);
 setDbConsultants([]);
 } finally {
 consultantsCache.loading = false;
 setLoadingConsultants(false);
 }
 };

 loadConsultantsFromAPI();
 }, [type, isView, isAR]);

 // Use only consultants from database (same logic as ConsultantsPage)
 const allConsultants = useMemo(() => {
 if (type !== "consultant") return savedList;

 // Use only consultants from database, without merging with locally saved list
 return dbConsultants;
 }, [dbConsultants, savedList, type]);

 // Convert consultants to dropdown options
 const consultantOptions = useMemo(() => {
 if (type !== "consultant") return [];
 return allConsultants.map((c) => ({
 value: c.name,
 label: c.name,
 license: c.license,
 name_en: c.name_en || "",
 registration_number: c.registration_number || "",
 }));
 }, [allConsultants, type]);


 // Improved search - search in any part of the name
 const filteredList = useMemo(() => {
 if (!nameValue) return savedList;
 const searchTerm = nameValue.toLowerCase();
 return savedList.filter(
 (c) =>
 c.name.toLowerCase().includes(searchTerm) ||
 (c.license && c.license.toLowerCase().includes(searchTerm))
 );
 }, [savedList, nameValue]);

 const namePlaceholder =
 type === "consultant"
 ? t("consultant_name_placeholder")
 : t("contractor_name_placeholder");
 const licensePlaceholder =
 type === "consultant"
 ? t("consultant_license_placeholder")
 : t("contractor_license_placeholder");
 const notFoundText =
 type === "consultant"
 ? t("consultant_not_found", { defaultValue: "" })
 : t("contractor_not_found");

 // Find the selected value for Autocomplete (must be before early returns for hooks ordering)
 const selectedConsultantOption = useMemo(() => {
 if (!nameValue) return null;
 const found = consultantOptions.find(
 (opt) => opt.value === nameValue || opt.label === nameValue
 );
 if (found) return found;
 return { value: nameValue, label: nameValue, isNew: true };
 }, [nameValue, consultantOptions]);

 if (isView) {
 // For contractor: use grid 2 columns in viewMode as well
 if (type === "contractor") {
 return (
 <div className="form-grid cols-2 ds-w-full">
 <ViewRow label={t("owner_name_ar")} value={nameValue} />
 <ViewRow
 label={t("owner_name_en")}
 value={nameEnValue}
 />
 <ViewRow label={licenseLabel} value={licenseValue} />
 <ViewRow label={t("phone")} value={phoneValue || ""} />
 <ViewRow
 label={t("email")}
 value={emailValue || ""}
 />
 <div></div>
 </div>
 );
 }
 // For consultant: use grid 2 columns in viewMode as well
 return (
 <div className="form-grid cols-2 ds-w-full">
 <ViewRow
 label={t("consultant_name_ar")}
 value={nameValue}
 />
 <ViewRow
 label={t("consultant_name_en")}
 value={nameEnValue}
 />
 <ViewRow label={licenseLabel} value={licenseValue} />
 <ViewRow label={t("consultant_fab_registration")} value={registrationNumberValue || ""} />
 </div>
 );
 }

 // Auto-save name_en when changed
 const handleNameEnChange = (value) => {
 if (onNameEnChange) {
 onNameEnChange(value);
 }

 // If name and license exist, auto-save name_en
 if (nameValue && licenseValue && value) {
 const existingItem = savedList.find(
 (c) => c.name === nameValue && c.license === licenseValue
 );

 if (existingItem) {
 // Update name_en for existing consultant/contractor
 saveToList(storageKey, {
 ...existingItem,
 name_en: value,
 });
 setSavedList(loadSavedList(storageKey));
 }
 }
 };

 // Auto-save phone when changed (contractor only)
 const handlePhoneChange = (value) => {
 if (onPhoneChange) {
 onPhoneChange(value);
 }

 // If name and license exist, auto-save phone
 if (type === "contractor" && nameValue && licenseValue && value) {
 const existingItem = savedList.find(
 (c) => c.name === nameValue && c.license === licenseValue
 );

 if (existingItem) {
 // Update phone for existing contractor
 saveToList(storageKey, {
 ...existingItem,
 phone: value,
 });
 setSavedList(loadSavedList(storageKey));
 }
 }
 };

 // Auto-save email when changed (contractor only)
 const handleEmailChange = (value) => {
 if (onEmailChange) {
 onEmailChange(value);
 }

 // If name and license exist, auto-save email
 if (type === "contractor" && nameValue && licenseValue && value) {
 const existingItem = savedList.find(
 (c) => c.name === nameValue && c.license === licenseValue
 );

 if (existingItem) {
 // Update email for existing contractor
 saveToList(storageKey, {
 ...existingItem,
 email: value,
 });
 setSavedList(loadSavedList(storageKey));
 }
 }
 };

 // Auto-load contractor data when license or name changes
 const handleLicenseChange = (value) => {
 if (onLicenseChange) {
 onLicenseChange(value);
 }

 // If contractor and both name and license are entered, try to load saved data
 if (type === "contractor" && nameValue && value) {
 const existingItem = savedList.find(
 (c) => c.name === nameValue && c.license === value
 );

 if (existingItem) {
 // Auto-load saved data
 if (existingItem.name_en && onNameEnChange) {
 onNameEnChange(existingItem.name_en);
 }
 if (existingItem.phone && onPhoneChange) {
 onPhoneChange(existingItem.phone);
 }
 if (existingItem.email && onEmailChange) {
 onEmailChange(existingItem.email);
 }
 }
 }
 };

 // Auto-load contractor data when name changes
 const handleNameChange = (value) => {
 if (onNameChange) {
 onNameChange(value);
 }
 setShowSuggestions(true);

 // If contractor and both name and license are entered, try to load saved data
 if (type === "contractor" && value && licenseValue) {
 const existingItem = savedList.find(
 (c) => c.name === value && c.license === licenseValue
 );

 if (existingItem) {
 // Auto-load saved data
 if (existingItem.name_en && onNameEnChange) {
 onNameEnChange(existingItem.name_en);
 }
 if (existingItem.phone && onPhoneChange) {
 onPhoneChange(existingItem.phone);
 }
 if (existingItem.email && onEmailChange) {
 onEmailChange(existingItem.email);
 }
 }
 }
 };

 // For contractor: use 2-column grid
 if (type === "contractor") {
 return (
 <div className="form-grid cols-2 ds-w-full">
 <Field label={t("owner_name_ar")}>
 <div className="pos-relative">
 <input
 className="input"
 placeholder={namePlaceholder}
 value={nameValue || ""}
 onChange={(e) => {
 handleNameChange(e.target.value);
 }}
 onFocus={() => setShowSuggestions(true)}
 onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
 />
 {showSuggestions && nameValue && (
 <div className="dropdown-list">
 {filteredList.length > 0 ? (
 filteredList.map((c, i) => (
 <div
 key={c.id || c.name || i}
 className="dropdown-item"
 onMouseDown={() => {
 handleNameChange(c.name || "");
 onNameEnChange && onNameEnChange(c.name_en || "");
 handleLicenseChange(c.license || "");
 onPhoneChange && onPhoneChange(c.phone || "");
 onEmailChange && onEmailChange(c.email || "");
 if (onSelect) onSelect(c);
 }}
 >
 {c.name}
 </div>
 ))
 ) : (
 notFoundText && (
 <div className="dropdown-item opacity-70">{notFoundText}</div>
 )
 )}
 </div>
 )}
 </div>
 </Field>
 <Field label={t("owner_name_en")} name="owner_name_en">
 <input
 className="input"
 placeholder={t("owner_name_en_placeholder")}
 value={nameEnValue || ""}
 onChange={(e) => {
 handleNameEnChange(e.target.value);
 }}
 />
 </Field>
 <Field label={licenseLabel} name="owner_license">
 <input
 className="input"
 placeholder={licensePlaceholder}
 value={licenseValue || ""}
 onChange={(e) => {
 handleLicenseChange(e.target.value);
 }}
 />
 </Field>
 <Field label={t("phone")}>
 <PhoneInput
  value={phoneValue ? phoneValue.replace("+971", "") : ""}
  onChange={(val) => {
   const formatted = val ? `+971${val}` : "";
   handlePhoneChange(formatted);
  }}
  excludeType="consultant"
 />
 </Field>
 <Field label={t("email")}>
 <input
 className="input"
 type="email"
 placeholder={t("email_placeholder")}
 value={emailValue || ""}
 onChange={(e) => {
 handleEmailChange(sanitizeEmailInput(e.target.value));
 }}
 />
 </Field>
 <div></div>
 </div>
 );
 }

 const licenseColCount = onRegistrationNumberChange ? "cols-3" : "cols-3";

 return (
 <div className={`form-grid ${licenseColCount}`}>
 {/* Name AR */}
 <VerifiableField fieldName={`${fieldPrefix}name`} verified={verifiedFields[`${fieldPrefix}name`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("owner_name_ar")}>
 <Autocomplete
 freeSolo
 selectOnFocus
 clearOnBlur
 handleHomeEndKeys
 options={consultantOptions}
 value={selectedConsultantOption}
 inputValue={inputValue}
 onInputChange={(_event, newInputValue) => { setInputValue(newInputValue); }}
 onChange={(_event, newValue, reason) => {
   if (reason === "clear") {
     onNameChange(""); onNameEnChange?.(""); onLicenseChange(""); onRegistrationNumberChange?.(""); setAddedJustNow(false); return;
   }
   if (typeof newValue === "string") { onNameChange(newValue); setAddedJustNow(false); }
   else if (newValue?.inputValue) { onNameChange(newValue.inputValue); setAddedJustNow(false); }
   else if (newValue) {
     const sel = allConsultants.find(c => c.name === newValue.value);
     if (sel) {
       onNameChange(sel.name); onNameEnChange?.(sel.name_en || "");
       let lic = sel.license || "";
       if (lic && !lic.startsWith("CN-")) lic = "CN-" + lic.replace(/^CN-/, "");
       onLicenseChange(lic); onRegistrationNumberChange?.(sel.registration_number || "");
       setAddedJustNow(false); if (onSelect) onSelect(sel);
     } else { onNameChange(newValue.value); }
   } else { onNameChange(""); }
 }}
 getOptionLabel={(option) => { if (typeof option === "string") return option; if (option.inputValue) return option.inputValue; return option?.label ?? ""; }}
 isOptionEqualToValue={(option, val) => { if (!option || !val) return false; return option.value === val.value || option.label === val.label; }}
 filterOptions={(opts, params) => {
   const filtered = filter(opts, params);
   const { inputValue: input } = params;
   const isExisting = opts.some(o => input.toLowerCase() === o.label?.toLowerCase());
   if (input !== "" && !isExisting) filtered.push({ inputValue: input, label: `${t('add_option')} "${input}"`, isCreate: true });
   return filtered;
 }}
 loading={loadingConsultants}
 size="small"
 componentsProps={{ popper: { sx: { zIndex: 9999 } } }}
 renderInput={(params) => (
   <TextField
     {...params}
     placeholder={namePlaceholder}
     InputProps={{ ...params.InputProps, endAdornment: <>{loadingConsultants ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</> }}
     sx={{
       "& .MuiOutlinedInput-root": {
         minHeight: "42px", borderRadius: "10px",
         "& fieldset": { borderColor: "var(--border)", borderWidth: "1.5px" },
         "&:hover fieldset": { borderColor: "rgba(200,168,78,0.45)" },
         "&.Mui-focused fieldset": { borderColor: "var(--accent,#C8A84E)", boxShadow: "0 0 0 3px rgba(200,168,78,0.12)" },
       },
       "& .MuiInputBase-input": { textAlign: isAR ? "right" : "left", fontSize: "0.875rem" },
     }}
   />
 )}
 renderOption={(optionProps, option) => (
   <li {...optionProps} key={option.inputValue || option.value} style={{ textAlign: isAR ? "right" : "left" }}>
     {option.isCreate ? <Box sx={{ display:"flex", alignItems:"center", gap:1, color:"var(--accent,#C8A84E)" }}><AddIcon fontSize="small" /><Typography variant="body2">{option.label}</Typography></Box> : option.label}
   </li>
 )}
 noOptionsText={inputValue ? t("press_enter_to_add", { value: inputValue }) : t("no_results")}
 />
 </Field>
 </VerifiableField>

 {/* Name EN */}
 <VerifiableField fieldName={`${fieldPrefix}name_en`} verified={verifiedFields[`${fieldPrefix}name_en`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("owner_name_en")}>
 <input className="input" placeholder={t("owner_name_en_placeholder")} value={nameEnValue || ""} onChange={(e) => handleNameEnChange(e.target.value)} />
 </Field>
 </VerifiableField>

 {/* License */}
 <VerifiableField fieldName={`${fieldPrefix}license`} verified={verifiedFields[`${fieldPrefix}license`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={licenseLabel}>
 <input
   className={`input ${type === "consultant" ? "input--uppercase" : ""}`}
   placeholder={licensePlaceholder}
   value={licenseValue || ""}
   onChange={(e) => {
     let value = e.target.value;
     if (type === "consultant" && value && !value.startsWith("CN-")) { value = "CN-" + value.replace(/^CN-/, ""); }
     onLicenseChange(value);
   }}
 />
 </Field>
 </VerifiableField>

 {/* Registration number — spans full row if present */}
 {onRegistrationNumberChange && (
 <div style={{ gridColumn: "span 3" }}>
 <VerifiableField fieldName={`${fieldPrefix}registration`} verified={verifiedFields[`${fieldPrefix}registration`]} onToggle={onToggleVerify} viewMode={isView}>
 <Field label={t("consultant_fab_registration")}>
 <input className="input" placeholder={t("consultant_fab_registration_placeholder")} value={registrationNumberValue || ""} onChange={(e) => onRegistrationNumberChange(e.target.value)} />
 </Field>
 </VerifiableField>
 </div>
 )}
 </div>
 );
}
