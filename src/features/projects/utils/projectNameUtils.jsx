/**
 * Utility functions for displaying project names (Arabic + English)
 */

/**
 * Get project name (Arabic + English) from project data
 * If project name = owner name, use owner data (Arabic + English)
 * @param {Object} project - Project object
 * @returns {Object} { ar: string, en: string, full: string }
 */
export function getProjectName(project) {
  // ✅ If project name = owner name, use owner data (Arabic + English)
  const siteplanData = project?.siteplan_data || null;
  const ownersData = siteplanData?.owners || [];
  
  if (ownersData.length > 0) {
    const owner = ownersData.find((o) => o.is_authorized) || ownersData[0];
    const ownerNameAr = owner?.owner_name_ar || "";
    const ownerNameEn = owner?.owner_name_en || "";
    const displayName = project?.display_name || project?.name || "";
    
    // ✅ Check if project name matches owner name (Arabic)
    if (ownerNameAr && displayName && displayName.trim() === ownerNameAr.trim()) {
      return {
        ar: ownerNameAr,
        en: ownerNameEn,
        full: ownerNameAr
      };
    }
  }
  
  // ✅ Fallback: Try to get from project fields
  const displayName = project?.display_name || project?.name || "";
  return {
    ar: project?.name_ar || displayName,
    en: project?.name_en || "",
    full: displayName
  };
}
