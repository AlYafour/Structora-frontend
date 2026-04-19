import { lazy } from "react";

// Tab Registry Pattern - all tabs with lazy loading
export const TAB_REGISTRY = {
  overview: lazy(() => import("./OverviewTab")),
  siteplan: lazy(() => import("./SitePlanTab")),
  license: lazy(() => import("./LicenseTab")),
  contract: lazy(() => import("./ContractTab")),
  awarding: lazy(() => import("./AwardingTab")),
  start_order: lazy(() => import("./StartOrderTab")),
  project_schedule: lazy(() => import("./ProjectScheduleTab")),
  excavation_notice: lazy(() => import("./ExcavationNoticeTab")),
  extensions: lazy(() => import("./ExtensionsTab")),
  // Unified financial tab (Dashboard) instead of 3 separate tabs
  financial: lazy(() => import("../financial-pages/entitlement/FinancialDashboardTab")),
  // Legacy tabs (kept for backward compatibility, redirect to financial dashboard)
  project_contract_financial_summary: lazy(() => import("../financial-pages/entitlement/FinancialDashboardTab")),
  project_financial_entitlements: lazy(() => import("../financial-pages/entitlement/FinancialDashboardTab")),
  variations: lazy(() => import("./VariationsTab")),
  payments: lazy(() => import("./PaymentsTab")),
  payment_claims: lazy(() => import("./PaymentClaimsTab")),
  invoices: lazy(() => import("./InvoicesTab")),
  receipt_vouchers: lazy(() => import("./ReceiptVouchersTab")),
  tax_invoices: lazy(() => import("./TaxInvoicesTab")),
  progress: lazy(() => import("./ProgressTab")),
};

// Helper function to get a Tab Component
export function getTabComponent(tabName) {
  return TAB_REGISTRY[tabName] || null;
}

// Helper function to check if a tab exists
export function hasTab(tabName) {
  return tabName in TAB_REGISTRY;
}
