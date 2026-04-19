// License-specific helper functions
const EN_AR = { Residential: "سكني", Commercial: "تجاري", Government: "حكومي", Investment: "استثماري", Industrial: "صناعي", Temporary: "مؤقت", PublicBuilding: "مباني عامة" };
const AR_EN = Object.fromEntries(Object.entries(EN_AR).map(([en, ar]) => [ar, en]));

export const toLocalizedUse = (v, lang) => (!v ? "" : /^ar\b/i.test(lang) ? (EN_AR[v] || v) : (AR_EN[v] || v));

// Maps compound land_use keys (from backend) → i18n translation keys
export const LAND_USE_LABEL_KEYS = {
  residential_residentialLand: "land_use_residential_land",
  RESIDENCES_residentialLand:  "land_use_residences",
  investment_residentialVilla:  "land_use_investment_villa",
  investment_residentialVillas: "land_use_investment_villas",
  industrial_industrialLand:    "land_use_industrial_land",
  industrial_factory:           "land_use_factory",
  industrial_tempTransportation:"land_use_temp_transportation",
  MASAJED_MOSQUE:               "land_use_mosque",
};

// Read-only fields from SitePlan
export const RO_FIELDS = new Set([
  "city", "zone", "sector", "plot_no", "plot_area_sqm",
  "land_use", "land_use_sub", "land_plan_no", "plot_address",
  "project_no", "project_name"
]);

export const isRO = (k) => RO_FIELDS.has(k);

