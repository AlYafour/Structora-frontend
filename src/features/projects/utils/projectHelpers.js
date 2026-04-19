/**
 * Project Helper Functions
 * Extracted from ProjectsPage for reusability and better performance
 */

/**
 * Extract owner label from project data
 */
export const getOwnerLabel = (project, t) => {
  const ownersData = project?.__owners_data || [];
  if (ownersData.length > 0) {
    const owner = ownersData.find((o) => o.is_authorized) || ownersData[0];
    const ownerNameAr = owner?.owner_name_ar || "";
    const ownerNameEn = owner?.owner_name_en || "";
    if (ownerNameAr || ownerNameEn) {
      return {
        ar: ownerNameAr,
        en: ownerNameEn,
        full: ownerNameAr || ownerNameEn
      };
    }
  }

  // Fallback
  const fallback = project?.__owner_label ||
    (project?.display_name ? `${t("villa_mr_ms")} ${project.display_name}` : t("villa_mr_ms_empty"));
  return {
    ar: typeof fallback === 'string' ? fallback : "",
    en: "",
    full: typeof fallback === 'string' ? fallback : ""
  };
};

/**
 * Extract first and last name only from a full name
 * Preserves Arabic "and his partners" or "and partners" suffix if present
 */
const extractFirstLast = (fullName) => {
  if (!fullName || typeof fullName !== 'string') return '';

  // Check if "and his partners" or "and partners" (Arabic) exists in the name
  const partnersText = /\s+وشركاؤه\s*$/i.test(fullName) ? ' وشركاؤه' :
                       /\s+وشركاء\s*$/i.test(fullName) ? ' وشركاء' : '';

  // Remove "and his partners" or "and partners" (Arabic) from the end temporarily
  let cleanedName = fullName.trim();
  cleanedName = cleanedName.replace(/\s+وشركاؤه\s*$/i, '').trim();
  cleanedName = cleanedName.replace(/\s+وشركاء\s*$/i, '').trim();

  const parts = cleanedName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0] + partnersText;
  // Return first + last name + partners text if it existed
  return `${parts[0]} ${parts[parts.length - 1]}${partnersText}`;
};

/**
 * Get villa prefix based on owner gender
 * Returns "فيلا السيد" for male, "فيلا السيدة" for female
 */
const getVillaPrefix = (owner, t) => {
  const gender = owner?.gender || 'male';
  return gender === 'female' ? t("villa_mrs") : t("villa_mr");
};

/**
 * Get project name (AR + EN) with first/last extraction
 * Adds "فيلا السيد/السيدة" prefix based on authorized owner's gender
 * Works for both siteplan projects and no-siteplan (contract owners) projects
 */
export const getProjectName = (project, t) => {
  const ownersData = project?.__owners_data || [];

  if (ownersData.length > 0) {
    const owner = ownersData.find((o) => o.is_authorized) || ownersData[0];
    const ownerNameAr = owner?.owner_name_ar || "";
    const ownerNameEn = owner?.owner_name_en || "";

    // ✅ If we have owner data, always use it (no strict displayName match required)
    if (ownerNameAr || ownerNameEn) {
      const prefix = getVillaPrefix(owner, t);
      const partners = ownersData.length > 1 ? t("villa_mr_ms_partners") : "";
      const shortAr = extractFirstLast(ownerNameAr);
      const shortEn = extractFirstLast(ownerNameEn);
      return {
        ar: shortAr ? `${prefix} ${shortAr}${partners}` : "",
        en: shortEn ? `${prefix} ${shortEn}${partners}` : "",
        full: shortAr ? `${prefix} ${shortAr}${partners}` : (shortEn ? `${prefix} ${shortEn}${partners}` : "")
      };
    }
  }

  // Fallback: Try to get from project fields
  const displayName = project?.display_name || project?.name || "";
  const nameAr = project?.name_ar || displayName;
  const nameEn = project?.display_name_en || project?.name_en || "";

  return {
    ar: extractFirstLast(nameAr),
    en: extractFirstLast(nameEn),
    full: extractFirstLast(displayName)
  };
};

/**
 * Get consultant name (Arabic + English)
 */
export const getConsultantName = (project, t) => {
  const nameAr = project?.__consultant_name_ar || project?.consultant?.name || project?.consultant_name || "";
  const nameEn = project?.__consultant_name_en || project?.consultant?.name_en || project?.consultant_name_en || "";
  return {
    ar: nameAr,
    en: nameEn,
    full: nameAr || nameEn || t("empty_value")
  };
};

/**
 * Get consultant name short (first 2 words only)
 */
export const getConsultantNameShort = (project, t) => {
  const consultantInfo = getConsultantName(project, t);
  const extractFirstTwoWords = (name) => {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    // Return first 2 words only
    return `${parts[0]} ${parts[1]}`;
  };

  const nameAr = consultantInfo.ar || '';
  const nameEn = consultantInfo.en || '';
  const nameFull = consultantInfo.full || '';

  return {
    ar: extractFirstTwoWords(nameAr),
    en: extractFirstTwoWords(nameEn),
    full: extractFirstTwoWords(nameFull)
  };
};

/**
 * Format location from project data
 */
export const formatLocation = (project) => {
  try {
    if (project.siteplan_data) {
      const municipality = project.siteplan_data.municipality || '';
      const zone = project.siteplan_data.zone || '';
      return {
        municipality: municipality || null,
        zone: zone || null,
        hasBoth: !!(municipality && zone),
        hasAny: !!(municipality || zone)
      };
    }
  } catch {
    /* JSON parse may fail on malformed location data */
  }
  return { municipality: null, zone: null, hasBoth: false, hasAny: false };
};

/**
 * Format duration to return object with days and months
 */
export const formatDuration = (duration) => {
  if (!duration || typeof duration !== 'object') {
    return { days: null, months: null, hasAny: false };
  }
  const days = duration.days || 0;
  const months = duration.months || 0;
  if (days === 0 && months === 0) {
    return { days: null, months: null, hasAny: false };
  }
  return {
    days: days > 0 ? days : null,
    months: months > 0 ? months : null,
    hasAny: true
  };
};

/**
 * Get payment status display
 */
export const getPaymentStatusDisplay = (status, isRTL) => {
  const statusMap = {
    balanced: { ar: 'متوازن', en: 'Balanced', color: 'success' },
    due: { ar: 'مستحق', en: 'Due', color: 'warning' },
    overdue: { ar: 'متأخر', en: 'Overdue', color: 'error' },
    unknown: { ar: 'غير معروف', en: 'Unknown', color: 'default' },
  };
  const mapped = statusMap[status] || statusMap.unknown;
  return {
    text: isRTL ? mapped.ar : mapped.en,
    color: mapped.color,
  };
};

/**
 * Get financial execution status icon
 */
export const getFinancialExecutionStatusIcon = (status) => {
  const icons = {
    good: '🟢',
    medium: '🟡',
    critical: '🔴',
  };
  return icons[status] || '⚪';
};

/**
 * Sort projects by financial risk (most critical first)
 */
export const sortProjectsByFinancialRisk = (projects) => {
  if (!projects || !Array.isArray(projects)) return projects;

  const statusPriority = {
    critical: 1,
    medium: 2,
    good: 3,
  };

  return [...projects].sort((a, b) => {
    const statusA = a.financial_execution_status || 'unknown';
    const statusB = b.financial_execution_status || 'unknown';

    const priorityA = statusPriority[statusA] || 999;
    const priorityB = statusPriority[statusB] || 999;

    // First: sort by status priority (critical first)
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Second: within same status, sort by current_due_amount (descending)
    const dueAmountA = Number(a.current_due_amount) || 0;
    const dueAmountB = Number(b.current_due_amount) || 0;
    if (dueAmountA !== dueAmountB) {
      return dueAmountB - dueAmountA; // Descending
    }

    // Third: tie-break by payment_delay_days (descending)
    const delayA = Number(a.payment_delay_days) || 0;
    const delayB = Number(b.payment_delay_days) || 0;
    return delayB - delayA; // Descending
  });
};

/**
 * Enrich projects with owner and consultant data (translation-dependent)
 * Separated from data loading to avoid re-fetching when language changes
 * @param {Array} projects - Raw projects from API
 * @param {Function} t - Translation function
 * @returns {Array} Enriched projects
 */
export const enrichProjectsWithTranslations = (projects, t) => {
  if (!projects || !Array.isArray(projects)) return [];

  return projects.map((p) => {
    const siteplanData = p.siteplan_data || null;
    const licenseData = p.license_data || null;
    const contractData = p.contract_data || null;
    const awardingData = p.awarding_data || null;

    // Extract owner data — prefer siteplan owners, fall back to contract owners
    let ownerLabel = null;
    let ownersData = [];
    if (siteplanData?.owners?.length) {
      ownersData = siteplanData.owners;
      const authorizedOwner = siteplanData.owners.find((o) => o.is_authorized) || siteplanData.owners[0];
      const ownerName = authorizedOwner?.owner_name_ar || authorizedOwner?.owner_name || authorizedOwner?.owner_name_en || "";
      if (ownerName) {
        const prefix = authorizedOwner?.gender === 'female' ? t("villa_mrs") : t("villa_mr");
        ownerLabel = `${prefix} ${ownerName}${siteplanData.owners.length > 1 ? t("villa_mr_ms_partners") : ""}`;
      }
    } else if (contractData?.owners?.length) {
      // ✅ Fallback for projects without a site plan: use contract owners
      ownersData = contractData.owners;
      const authorizedOwner = contractData.owners.find((o) => o.is_authorized) || contractData.owners[0];
      const ownerName = authorizedOwner?.owner_name_ar || authorizedOwner?.owner_name || authorizedOwner?.owner_name_en || "";
      if (ownerName) {
        const prefix = authorizedOwner?.gender === 'female' ? t("villa_mrs") : t("villa_mr");
        ownerLabel = `${prefix} ${ownerName}${contractData.owners.length > 1 ? t("villa_mr_ms_partners") : ""}`;
      }
    }

    // Extract consultant data (Arabic + English)
    let consultantNameAr = null;
    let consultantNameEn = null;
    let cityFromLicense = null;
    if (licenseData) {
      // Get consultant name (Arabic + English)
      if (licenseData.design_consultant_name || licenseData.design_consultant_name_en) {
        consultantNameAr = licenseData.design_consultant_name || null;
        consultantNameEn = licenseData.design_consultant_name_en || null;
      } else if (licenseData.supervision_consultant_name || licenseData.supervision_consultant_name_en) {
        consultantNameAr = licenseData.supervision_consultant_name || null;
        consultantNameEn = licenseData.supervision_consultant_name_en || null;
      }
      // Also check Consultant model if available
      if (licenseData.design_consultant) {
        consultantNameAr = licenseData.design_consultant?.name || consultantNameAr;
        consultantNameEn = licenseData.design_consultant?.name_en || consultantNameEn;
      } else if (licenseData.supervision_consultant) {
        consultantNameAr = licenseData.supervision_consultant?.name || consultantNameAr;
        consultantNameEn = licenseData.supervision_consultant?.name_en || consultantNameEn;
      }
      if (licenseData.city) {
        cityFromLicense = licenseData.city;
      }
    }

    return {
      ...p,
      city: p.city || cityFromLicense || null,
      __owner_label: ownerLabel,
      __consultant_name_ar: consultantNameAr,
      __consultant_name_en: consultantNameEn,
      __consultant_name: consultantNameAr || consultantNameEn || null,
      __has_awarding: !!awardingData,
      __awarding_data: awardingData,
      __contract_data: contractData,
      __owners_data: ownersData,
    };
  });
};
