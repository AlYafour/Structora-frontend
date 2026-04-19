// Shared application constants

// ── Timing constants ──
export const QUERY_STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const QUERY_GC_TIME = 10 * 60 * 1000; // 10 minutes
export const API_TIMEOUT = 300_000; // 5 minutes
export const ADMIN_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ── Financial constants ──
export const VAT_RATE = 0.05; // 5%

// ── Regex patterns ──
export const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const COUNTRIES = [
  { value: "AE", label: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" } },
  { value: "SA", label: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" } },
  { value: "OM", label: { en: "Oman", ar: "سلطنة عمان" } },
  { value: "BH", label: { en: "Bahrain", ar: "البحرين" } },
  { value: "KW", label: { en: "Kuwait", ar: "الكويت" } },
  { value: "QA", label: { en: "Qatar", ar: "قطر" } },
  { value: "EG", label: { en: "Egypt", ar: "مصر" } },
  { value: "JO", label: { en: "Jordan", ar: "الأردن" } },
  { value: "IQ", label: { en: "Iraq", ar: "العراق" } },
  { value: "SY", label: { en: "Syria", ar: "سوريا" } },
  { value: "LB", label: { en: "Lebanon", ar: "لبنان" } },
  { value: "PS", label: { en: "Palestine", ar: "فلسطين" } },
  { value: "YE", label: { en: "Yemen", ar: "اليمن" } },
  { value: "SD", label: { en: "Sudan", ar: "السودان" } },
  { value: "MA", label: { en: "Morocco", ar: "المغرب" } },
  { value: "TN", label: { en: "Tunisia", ar: "تونس" } },
  { value: "DZ", label: { en: "Algeria", ar: "الجزائر" } },
  { value: "IN", label: { en: "India", ar: "الهند" } },
  { value: "PK", label: { en: "Pakistan", ar: "باكستان" } },
  { value: "GB", label: { en: "United Kingdom", ar: "المملكة المتحدة" } },
  { value: "US", label: { en: "United States", ar: "الولايات المتحدة" } },
  { value: "TR", label: { en: "Turkey", ar: "تركيا" } },
  { value: "CN", label: { en: "China", ar: "الصين" } },
];

export const UAE_CITIES = [
  { value: "Abu Dhabi", label: { en: "Abu Dhabi", ar: "أبوظبي" } },
  { value: "Dubai", label: { en: "Dubai", ar: "دبي" } },
  { value: "Sharjah", label: { en: "Sharjah", ar: "الشارقة" } },
  { value: "Ajman", label: { en: "Ajman", ar: "عجمان" } },
  { value: "Ras Al Khaimah", label: { en: "Ras Al Khaimah", ar: "رأس الخيمة" } },
  { value: "Fujairah", label: { en: "Fujairah", ar: "الفجيرة" } },
  { value: "Umm Al Quwain", label: { en: "Umm Al Quwain", ar: "أم القيوين" } },
  { value: "Al Ain", label: { en: "Al Ain", ar: "العين" } },
];

export const MUNICIPALITIES = [
  { value: "Abu Dhabi City", label: { en: "Abu Dhabi City", ar: "أبوظبي" } },
  { value: "Al Ain", label: { en: "Al Ain", ar: "العين" } },
  { value: "Al Dhafra", label: { en: "Al Dhafra", ar: "الظفرة" } },
];

export const ZONES = {
  "Abu Dhabi City": [
    { value: "Al Bateen", label: { en: "Al Bateen", ar: "البطين" } },
    { value: "Madinat Al Riyadh", label: { en: "Madinat Al Riyadh", ar: "مدينة الرياض" } },
    { value: "Khalifa City", label: { en: "Khalifa City", ar: "خليفة سيتي" } },
    { value: "Mohammed Bin Zayed City", label: { en: "Mohammed Bin Zayed City", ar: "مدينة محمد بن زايد" } },
    { value: "Madinat Zayed", label: { en: "Madinat Zayed", ar: "مدينة زايد" } },
    { value: "Al Shamkha", label: { en: "Al Shamkha", ar: "الشامخة" } },
    { value: "Al Shawamekh", label: { en: "Al Shawamekh", ar: "الشوامخ" } },
    { value: "Yas Island", label: { en: "Yas Island", ar: "جزيرة ياس" } },
    { value: "Saadiyat Island", label: { en: "Saadiyat Island", ar: "جزيرة السعديات" } },
    { value: "Al Reem Island", label: { en: "Al Reem Island", ar: "جزيرة الريم" } },
    { value: "Al Raha Beach", label: { en: "Al Raha Beach", ar: "الراحة بيتش" } },
    { value: "Al Shatee", label: { en: "Al Shatee", ar: "الشاطئ" } },
    { value: "Al Shahama", label: { en: "Al Shahama", ar: "الشهامة" } },
  ],
  "Al Ain": [
    { value: "Al Yahar", label: { en: "Al Yahar", ar: "اليحر" } },
    { value: "Al Hayer", label: { en: "Al Hayer", ar: "الهير" } },
    { value: "Zakhir", label: { en: "Zakhir", ar: "زاخر" } },
    { value: "Al Jahili", label: { en: "Al Jahili", ar: "الجاهلي" } },
    { value: "Al Sarouj", label: { en: "Al Sarouj", ar: "الصاروج" } },
  ],
  "Al Dhafra": [
    { value: "Madinat Zayed", label: { en: "Madinat Zayed", ar: "مدينة زايد" } },
    { value: "Ghayathi", label: { en: "Ghayathi", ar: "غياثي" } },
    { value: "Al Ruwais", label: { en: "Al Ruwais", ar: "الرويس" } },
    { value: "As Sila", label: { en: "As Sila", ar: "السلع" } },
    { value: "Delma Island", label: { en: "Delma Island", ar: "دلما" } },
  ],
};

export const NATIONALITIES = [
  { value: "Emirati", label: { en: "Emirati", ar: "إماراتي" } },
  { value: "Saudi", label: { en: "Saudi", ar: "سعودي" } },
  { value: "Egyptian", label: { en: "Egyptian", ar: "مصري" } },
  { value: "Jordanian", label: { en: "Jordanian", ar: "أردني" } },
  { value: "Syrian", label: { en: "Syrian", ar: "سوري" } },
  { value: "Lebanese", label: { en: "Lebanese", ar: "لبناني" } },
  { value: "Palestinian", label: { en: "Palestinian", ar: "فلسطيني" } },
  { value: "Sudanese", label: { en: "Sudanese", ar: "سوداني" } },
  { value: "Indian", label: { en: "Indian", ar: "هندي" } },
  { value: "Pakistani", label: { en: "Pakistani", ar: "باكستاني" } },
  { value: "Bangladeshi", label: { en: "Bangladeshi", ar: "بنغالي" } },
  { value: "Filipino", label: { en: "Filipino", ar: "فلبيني" } },
  { value: "British", label: { en: "British", ar: "بريطاني" } },
  { value: "American", label: { en: "American", ar: "أمريكي" } },
  { value: "French", label: { en: "French", ar: "فرنسي" } },
  { value: "German", label: { en: "German", ar: "ألماني" } },
  { value: "Chinese", label: { en: "Chinese", ar: "صيني" } },
  { value: "Turkish", label: { en: "Turkish", ar: "تركي" } },
  { value: "Moroccan", label: { en: "Moroccan", ar: "مغربي" } },
  { value: "Tunisian", label: { en: "Tunisian", ar: "تونسي" } },
  { value: "Algerian", label: { en: "Algerian", ar: "جزائري" } },
  { value: "Iraqi", label: { en: "Iraqi", ar: "عراقي" } },
  { value: "Yemeni", label: { en: "Yemeni", ar: "يمني" } },
  { value: "Kuwaiti", label: { en: "Kuwaiti", ar: "كويتي" } },
  { value: "Qatari", label: { en: "Qatari", ar: "قطري" } },
  { value: "Bahraini", label: { en: "Bahraini", ar: "بحريني" } },
  { value: "Omani", label: { en: "Omani", ar: "عُماني" } },
];

export const PROJECT_TYPES = {
  ar: [
    ["villa", "فيلا"],
    ["commercial", "تجاري"],
    ["maintenance", "أعمال صيانة"],
    ["governmental", "مشاريع حكومية"],
    ["fitout", "أعمال تجديد وتجهيز داخلي"],
  ],
  en: [
    ["villa", "Villa"],
    ["commercial", "Commercial"],
    ["maintenance", "Maintenance Works"],
    ["governmental", "Governmental"],
    ["fitout", "Renovation & Fit-Out"],
  ],
};

export const VILLA_CATEGORIES = {
  ar: [
    ["residential", "فيلا سكنية"],
    ["commercial", "فيلا تجارية"],
  ],
  en: [
    ["residential", "Residential Villa"],
    ["commercial", "Commercial Villa"],
  ],
};

export const CONTRACT_TYPES = {
  ar: [
    ["new", "عقد إنشاء جديد"],
    ["continue", "عقد استكمال"],
    ["maintenance", "عقد صيانة"],
    ["fitout", "عقد تجهيز داخلي"],
  ],
  en: [
    ["new", "New Contract"],
    ["continue", "Continuation Contract"],
    ["maintenance", "Maintenance Contract"],
    ["fitout", "Fit-Out Contract"],
  ],
};

// Project code categories (for auto-generated project codes)
export const PROJECT_CATEGORIES = {
  ar: [
    ["CON", "إنشاءات"],
    ["MNT", "صيانة"],
    ["REN", "تجديد وتأهيل"],
    ["FIT", "فت أوت / تجهيز داخلي"],
  ],
  en: [
    ["CON", "Construction"],
    ["MNT", "Maintenance"],
    ["REN", "Renovation"],
    ["FIT", "Fit-Out"],
  ],
};

// Maintenance types (only for MNT category)
export const MAINTENANCE_TYPES = {
  ar: [
    ["AM", "صيانة دورية"],
    ["SM", "صيانة مقطوعة"],
  ],
  en: [
    ["AM", "Annual Maintenance"],
    ["SM", "Single Maintenance"],
  ],
};

// Map contract_type to default project_category
export const CONTRACT_TYPE_TO_CATEGORY = {
  new: "CON",
  continue: "CON",
  maintenance: "MNT",
  fitout: "FIT",
};

// Contract types for the wizard (project contract step)
export const WIZARD_CONTRACT_TYPES = [
  { value: "lump_sum",      key: "contract.types.lump_sum" },
  { value: "percentage",    key: "contract.types.percentage" },
  { value: "design_build",  key: "contract.types.design_build" },
  { value: "re_measurement",key: "contract.types.re_measurement" },
];

// Contract classification options for the wizard
export const WIZARD_CONTRACT_CLASSIFICATIONS = [
  { value: "housing_loan_program", labelKey: "contract.classification.housing_loan_program.label", descKey: "contract.classification.housing_loan_program.desc" },
  { value: "private_funding",      labelKey: "contract.classification.private_funding.label",      descKey: "contract.classification.private_funding.desc" },
  { value: "ruler_court_funding",  labelKey: "contract.classification.ruler_court_funding.label",  descKey: "contract.classification.ruler_court_funding.desc" },
];

// Maps raw nationality text (from AI/OCR) to app's NATIONALITIES constant value
export const NATIONALITY_NORMALIZE = {
  "united arab emirates": "Emirati",
  "uae": "Emirati",
  "emirati": "Emirati",
  "egypt": "Egyptian",
  "egyptian": "Egyptian",
  "saudi arabia": "Saudi",
  "saudi": "Saudi",
  "jordan": "Jordanian",
  "jordanian": "Jordanian",
  "india": "Indian",
  "indian": "Indian",
  "pakistan": "Pakistani",
  "pakistani": "Pakistani",
  "bangladesh": "Bangladeshi",
  "bangladeshi": "Bangladeshi",
  "philippines": "Filipino",
  "filipino": "Filipino",
  "syria": "Syrian",
  "syrian": "Syrian",
  "lebanon": "Lebanese",
  "lebanese": "Lebanese",
  "palestine": "Palestinian",
  "palestinian": "Palestinian",
  "sudan": "Sudanese",
  "sudanese": "Sudanese",
  "iraq": "Iraqi",
  "iraqi": "Iraqi",
  "yemen": "Yemeni",
  "yemeni": "Yemeni",
  "kuwait": "Kuwaiti",
  "kuwaiti": "Kuwaiti",
  "qatar": "Qatari",
  "qatari": "Qatari",
  "bahrain": "Bahraini",
  "bahraini": "Bahraini",
  "oman": "Omani",
  "omani": "Omani",
  "morocco": "Moroccan",
  "moroccan": "Moroccan",
  "tunisia": "Tunisian",
  "tunisian": "Tunisian",
  "algeria": "Algerian",
  "algerian": "Algerian",
  "turkey": "Turkish",
  "turkish": "Turkish",
  "china": "Chinese",
  "chinese": "Chinese",
  "germany": "German",
  "german": "German",
  "france": "French",
  "french": "French",
  "uk": "British",
  "british": "British",
  "united kingdom": "British",
  "usa": "American",
  "american": "American",
  "united states": "American",
};

/**
 * Normalizes raw nationality text (from AI/OCR) to a valid NATIONALITIES value.
 * Falls back to the raw string if no mapping found.
 */
const VALID_NATIONALITY_VALUES = new Set(NATIONALITIES.map((n) => n.value));

export function normalizeNationality(raw) {
  if (!raw) return "";
  const key = raw.trim().toLowerCase();
  const mapped = NATIONALITY_NORMALIZE[key];
  if (mapped) return mapped;
  if (VALID_NATIONALITY_VALUES.has(raw.trim())) return raw.trim();
  const titled = raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase();
  if (VALID_NATIONALITY_VALUES.has(titled)) return titled;
  return raw.trim();
}

