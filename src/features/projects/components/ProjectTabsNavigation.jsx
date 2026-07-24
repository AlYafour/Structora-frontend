import { memo } from "react";
import { useTranslation } from "react-i18next";
import { getVisibleProjectTabs } from "../tabs/tabConfig";

const ProjectTabsNavigation = memo(function ProjectTabsNavigation({
  activeTab,
  onTabChange,
  auth,
}) {
  const { t } = useTranslation();

  const groups = getVisibleProjectTabs(auth).map((group) => ({
    ...group,
    label: t(group.labelKey),
    tabs: group.tabs.map((tab) => ({
      ...tab,
      label: t(tab.labelKey),
    })),
  }));

  const activeGroup = groups.find((group) =>
    group.tabs.some((tab) => tab.id === activeTab && tab.show !== false)
  );

  return (
    <nav className="prj-tabs-container" aria-label={t("project_tabs")}>
      <div className="prj-tabs-groups">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            className={`prj-tabs-group ${group.className}${activeGroup?.key === group.key ? " prj-tabs-group--active" : ""}`}
            onClick={() => onTabChange(group.tabs[0].id)}
          >
            {group.label}
          </button>
        ))}
      </div>

      {activeGroup && <span className="prj-tabs-divider" aria-hidden="true" />}

      {activeGroup && (
        <div className="prj-tabs-group__tabs" role="tablist" aria-label={activeGroup.label}>
          {activeGroup.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`prj-tab${activeTab === tab.id ? " active" : ""}${tab.accent ? " prj-tab--accent" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
});

export default ProjectTabsNavigation;
