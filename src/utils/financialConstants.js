/**
 * Financial Constants
 *
 * Shared constants for financial calculations across the application.
 * Extracted from hardcoded values in ContractFinancialSummary, FinancialDashboardTab,
 * ProjectFinancialEntitlementPage, and payment claim components.
 */

export const VAT_RATE = 0.05;
export const VAT_MULTIPLIER = 1 + VAT_RATE; // 1.05
export const MAX_PERCENTAGE = 100;
