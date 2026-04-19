// Helper functions for getting project labels
import i18n from "../config/i18n";

/**
 * Get the project type label
 */
export const getProjectTypeLabel = (type) => {
  if (!type) return "—";
  const key = `project_type_${type}`;
  const translated = i18n.t(key);
  // If the key is not found, i18n.t returns the key itself
  return translated !== key ? translated : type;
};

/**
 * Get the villa category label
 */
export const getVillaCategoryLabel = (category) => {
  if (!category) return "—";
  const key = `villa_category_${category}`;
  const translated = i18n.t(key);
  return translated !== key ? translated : category;
};

/**
 * Get the contract type label
 * Supports both CONTRACT_TYPES (new, continue) and contract.types (lump_sum, percentage, etc.)
 */
export const getContractTypeLabel = (type) => {
  if (!type) return "—";
  // Try flat key first (e.g. contract_type_new)
  const flatKey = `contract_type_${type}`;
  const flat = i18n.t(flatKey);
  if (flat !== flatKey) return flat;
  // Try nested contract.types key (e.g. contract.types.lump_sum)
  const nestedKey = `contract.types.${type}`;
  const nested = i18n.t(nestedKey);
  if (nested !== nestedKey) return nested;
  return type;
};

