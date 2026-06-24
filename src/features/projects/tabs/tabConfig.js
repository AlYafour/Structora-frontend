export const PROJECT_TAB_GROUPS = [
  {
    key: "info",
    labelKey: "tab_group_project_info",
    className: "prj-tabs-group--info",
    tabIds: ["overview", "siteplan", "license", "contract"],
  },
  {
    key: "financial",
    labelKey: "tab_group_financial",
    className: "prj-tabs-group--financial",
    tabIds: [
      "variations",
      "payments",
      "progress",
      "invoices",
      "receipt_vouchers",
      "tax_invoices",
      "prolongation_fees",
      "financial",
    ],
  },
  {
    key: "ops",
    labelKey: "tab_group_operations",
    className: "prj-tabs-group--ops",
    tabIds: [
      "awarding",
      "start_order",
      "project_schedule",
      "excavation_notice",
      "extensions",
      "payment_claims",
    ],
  },
];

export const PROJECT_TABS = {
  overview: {
    id: "overview",
    labelKey: "project_information",
    permissions: ["projects.view"],
  },
  siteplan: {
    id: "siteplan",
    labelKey: "site_plan",
    permissions: ["projects.view", "projects.edit", "projects.create"],
  },
  license: {
    id: "license",
    labelKey: "building_license",
    permissions: ["projects.view", "projects.edit", "projects.create"],
  },
  contract: {
    id: "contract",
    labelKey: "contract_information",
    permissions: ["contracts.view", "contracts.create", "contracts.edit"],
  },
  awarding: {
    id: "awarding",
    labelKey: "awarding_information",
    permissions: ["projects.add_awarding"],
  },
  start_order: {
    id: "start_order",
    labelKey: "start_order",
    permissions: ["projects.add_start_order"],
  },
  project_schedule: {
    id: "project_schedule",
    labelKey: "project_schedule",
    permissions: ["projects.add_project_schedule"],
  },
  excavation_notice: {
    id: "excavation_notice",
    labelKey: "excavation_notice",
    permissions: ["projects.add_excavation_notice"],
  },
  extensions: {
    id: "extensions",
    labelKey: "extensions",
    permissions: ["projects.edit"],
  },
  financial: {
    id: "financial",
    labelKey: "financial_dashboard",
    permissions: ["financial.view"],
    accent: true,
  },
  project_contract_financial_summary: {
    id: "project_contract_financial_summary",
    labelKey: "financial_dashboard",
    permissions: ["financial.view"],
    legacy: true,
  },
  project_financial_entitlements: {
    id: "project_financial_entitlements",
    labelKey: "financial_dashboard",
    permissions: ["financial.view"],
    legacy: true,
  },
  variations: {
    id: "variations",
    labelKey: "variations_title",
    permissions: ["variations.view", "variations.create", "variations.approve"],
  },
  payments: {
    id: "payments",
    labelKey: "payments_title",
    permissions: ["payments.view", "payments.create", "payments.edit", "payments.approve"],
  },
  payment_claims: {
    id: "payment_claims",
    labelKey: "payment_claims",
    permissions: ["projects.add_payment_claim", "financial.view", "financial.create"],
  },
  invoices: {
    id: "invoices",
    labelKey: "invoices_title",
    permissions: ["invoices.view", "invoices.create", "invoices.edit", "invoices.approve"],
  },
  receipt_vouchers: {
    id: "receipt_vouchers",
    labelKey: "receipt_vouchers_tab",
    permissions: ["payments.view", "payments.create", "payments.edit", "payments.approve"],
  },
  tax_invoices: {
    id: "tax_invoices",
    labelKey: "tax_invoices_tab",
    permissions: ["invoices.view", "invoices.create", "invoices.edit", "invoices.approve"],
  },
  progress: {
    id: "progress",
    labelKey: "progress_tab_title",
    permissions: ["progress.view", "progress.create", "progress.delete"],
  },
  prolongation_fees: {
    id: "prolongation_fees",
    labelKey: "prolongation_fees_tab",
    permissions: ["financial.view", "financial.create", "financial.edit"],
  },
};

export function canAccessProjectTab(tab, auth) {
  if (!tab) return false;
  if (auth?.isAdmin || auth?.user?.is_superuser) return true;
  if (!tab.permissions?.length) return true;
  return auth?.hasAnyPermission?.(tab.permissions) === true;
}

export function getVisibleProjectTabs(auth) {
  return PROJECT_TAB_GROUPS.map((group) => ({
    ...group,
    tabs: group.tabIds
      .map((tabId) => PROJECT_TABS[tabId])
      .filter((tab) => canAccessProjectTab(tab, auth)),
  })).filter((group) => group.tabs.length > 0);
}

export function getFirstVisibleProjectTab(auth) {
  const firstGroup = getVisibleProjectTabs(auth)[0];
  return firstGroup?.tabs?.[0]?.id || null;
}
