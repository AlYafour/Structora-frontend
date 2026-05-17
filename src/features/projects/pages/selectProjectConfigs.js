/**
 * Configuration map for all SelectProject pages.
 * Each key matches the URL param: /projects/select/:type
 */
const selectProjectConfigs = {
  "start-order": {
    navigationTarget: "/projects/:id?tab=start_order",
    titleKey: "select_project_for_start_order",
    subtitleKey: "select_project_for_start_order_desc",
    buttonLabelKey: "add_start_order",
    permission: "projects.add_start_order",
  },
  "project-schedule": {
    navigationTarget: "/projects/:id?tab=project_schedule",
    titleKey: "select_project_for_schedule",
    subtitleKey: "select_project_for_schedule_desc",
    buttonLabelKey: "add_project_schedule",
    permission: "projects.add_project_schedule",
  },
  "excavation-notice": {
    navigationTarget: "/projects/:id?tab=excavation_notice",
    titleKey: "select_project_for_excavation_notice",
    subtitleKey: "select_project_for_excavation_notice_desc",
    buttonLabelKey: "add_excavation_notice",
    permission: "projects.add_excavation_notice",
  },
  variation: {
    navigationTarget: "/projects/:id?tab=variations",
    titleKey: "select_project_for_variation",
    subtitleKey: "select_project_for_variation_desc",
    buttonLabelKey: "add_variation",
  },
  awarding: {
    navigationTarget: "/projects/:id/awarding/view",
    titleKey: "select_project_for_awarding",
    subtitleKey: "select_project_for_awarding_desc",
    buttonLabelKey: "add_awarding",
    permission: "projects.add_awarding",
    emptyStateKey: "no_housing_loan_projects",
    // apiFilters: {},
    // customFilter: (p) => {
    //   const cc = p?.contract_data?.contract_classification || p?.contract_classification;
    //   return cc === "housing_loan_program";
    // },
  },
  extensions: {
    navigationTarget: "/projects/:id?tab=start_order",
    titleKey: "select_project_for_extensions",
    subtitleKey: "select_project_for_extensions_desc",
    buttonLabelKey: "add_extensions",
    emptyStateKey: "no_projects_with_start_order",
    // apiFilters: {},
    // customFilter: (p) => p?.start_order_data && Object.keys(p.start_order_data).length > 0,
  },
  payment: {
    navigationTarget: "/projects/:id?tab=payments",
    titleKey: "select_project_for_payment",
    subtitleKey: "select_project_for_payment_desc",
    buttonLabelKey: "add_payment",
  },
  invoice: {
    navigationTarget: "/projects/:id?tab=invoices",
    titleKey: "select_project_for_invoice",
    subtitleKey: "select_project_for_invoice_desc",
    buttonLabelKey: "add_invoice",
  },
  "payment-claim": {
    navigationTarget: "/payment-claims/create?project=:id",
    titleKey: "payment_claim",
    subtitleKey: "select_project_for_payment_claim",
    buttonLabelKey: "create_payment_claim",
    permission: "projects.add_payment_claim",
  },
  progress: {
    navigationTarget: "/projects/:id?tab=progress",
    titleKey: "select_project_for_progress",
    subtitleKey: "select_project_for_progress_desc",
    buttonLabelKey: "add_progress",
  },
};

export default selectProjectConfigs;
