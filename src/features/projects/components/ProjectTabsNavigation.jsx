import { memo } from "react";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";

/* ── Inline SVG icons (16×16, stroke-based) ── */
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const FinanceIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const OpsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ProjectTabsNavigation = memo(function ProjectTabsNavigation({
  activeTab,
  onTabChange,
  hasStartOrder,
  isHousingLoan,
}) {
  const { t } = useTranslation();

  const groups = [
    {
      key: "info",
      label: t("tab_group_project_info"),
      icon: <InfoIcon />,
      className: "prj-tabs-group--info",
      tabs: [
        { id: "overview", label: t("project_information") },
        { id: "siteplan", label: t("site_plan") },
        { id: "license", label: t("building_license") },
        { id: "contract", label: t("contract_information") },
      ],
    },
    {
      key: "financial",
      label: t("tab_group_financial"),
      icon: <FinanceIcon />,
      className: "prj-tabs-group--financial",
      tabs: [
        { id: "variations", label: t("variations_title") },
        { id: "payments", label: t("payments_title") },
        { id: "progress", label: t("progress_tab_title") },
        { id: "invoices", label: t("invoices_title") },
        { id: "receipt_vouchers", label: t("receipt_vouchers_tab") },
        { id: "tax_invoices", label: t("tax_invoices_tab") },
        { id: "prolongation_fees", label: t("prolongation_fees_tab") },
        { id: "financial", label: t("financial_dashboard"), accent: true },
      ],
    },
    {
      key: "ops",
      label: t("tab_group_operations"),
      icon: <OpsIcon />,
      className: "prj-tabs-group--ops",
      tabs: [
        { id: "awarding", label: t("awarding_information") },
        { id: "start_order", label: t("start_order") },
        { id: "project_schedule", label: t("project_schedule") },
        { id: "excavation_notice", label: t("excavation_notice") },
        { id: "extensions", label: t("extensions"), show: hasStartOrder },
        { id: "payment_claims", label: t("payment_claims") },
      ],
    },
  ];

  // Check which group contains the active tab
  const activeGroup = groups.find((g) =>
    g.tabs.some((tab) => tab.id === activeTab && (tab.show !== false))
  );

  return (
    <div className="prj-tabs-container">
      {groups.map((group) => {
        const visibleTabs = group.tabs.filter(
          (tab) => tab.show !== false
        );
        const isActiveGroup = activeGroup?.key === group.key;

        return (
          <div
            key={group.key}
            className={`prj-tabs-group ${group.className}${isActiveGroup ? " prj-tabs-group--active" : ""}`}
          >
            {/* Group header label */}
            <div className="prj-tabs-group__label">
              <span className="prj-tabs-group__icon">{group.icon}</span>
              <span>{group.label}</span>
            </div>

            {/* Tab buttons */}
            <div className="prj-tabs-group__tabs">
              {visibleTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  className={`prj-tab${activeTab === tab.id ? " active" : ""}${tab.accent ? " prj-tab--accent" : ""}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default ProjectTabsNavigation;
