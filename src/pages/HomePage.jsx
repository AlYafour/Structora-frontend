import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaClipboardList, FaExternalLinkAlt, FaFileAlt, FaRandom } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import PageLayout from "../components/layout/PageLayout";
import DashboardKPIs from "./dashboard/DashboardKPIs";
import DashboardStatusChart from "./dashboard/DashboardStatusChart";
import DashboardTrendChart from "./dashboard/DashboardTrendChart";
import DashboardFinancials from "./dashboard/DashboardFinancials";
import DashboardTopProjects from "./dashboard/DashboardTopProjects";
import DashboardActivity from "./dashboard/DashboardActivity";
import BrandLogo from "../components/common/BrandLogo";
import "./HomePage.css";

const REFRESH_INTERVAL = 30_000;

const TASK_GROUPS = [
  { id: "all", labelKey: "task_group_all", types: [], canReceive: () => true },
  {
    id: "project_approvals",
    labelKey: "task_group_project_approvals",
    types: ["project_manager_approval", "project_final_approval"],
    canReceive: ({ isProjectManager, isGeneralManager }) => isProjectManager || isGeneralManager,
  },
  {
    id: "variation_approvals",
    labelKey: "task_group_variation_approvals",
    types: [
      "variation_project_manager_approval",
      "variation_supervisor_initial_approval",
      "variation_gm_initial_approval",
      "variation_final_approval",
    ],
    canReceive: ({ isProjectManager, isSupervisor, isGeneralManager }) => (
      isProjectManager || isSupervisor || isGeneralManager
    ),
  },
  {
    id: "confirmations",
    labelKey: "task_group_confirmations",
    types: ["variation_external_confirmation"],
    canReceive: ({ isProjectManager }) => isProjectManager,
  },
  {
    id: "alterations",
    labelKey: "task_group_alterations",
    types: ["variation_alteration_request", "variation_supervisor_unapprove_request"],
    canReceive: ({ isProjectManager, isSupervisor }) => isProjectManager || isSupervisor,
  },
  {
    id: "edits_rejections",
    labelKey: "task_group_edits_rejections",
    types: [
      "variation_returned_for_edit",
      "variation_rejection_edit",
      "variation_edit_allowed",
    ],
    canReceive: () => true,
  },
  {
    id: "documents",
    labelKey: "task_group_documents",
    types: ["variation_official_document_upload"],
    canReceive: () => true,
  },
  {
    id: "hidden_fees",
    labelKey: "task_group_hidden_fees",
    types: ["variation_hidden_fee_approval"],
    canReceive: ({ isGeneralManager }) => isGeneralManager,
  },
];

const taskGroupForType = (type) => (
  TASK_GROUPS.find((group) => group.id !== "all" && group.types.includes(type))?.id || "all"
);

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { user, tenantTheme, hasPermission } = useAuth();
  const [stats, setStats] = useState(null);
  const [projectFinancials, setProjectFinancials] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [activeTaskGroup, setActiveTaskGroup] = useState("all");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchStats = useCallback(() => {
    api
      .get("dashboard/stats/")
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const canViewFinancials = hasPermission("financial.view");

  const fetchProjectFinancials = useCallback(() => {
    if (!canViewFinancials) {
      setProjectFinancials([]);
      return;
    }

    api
      .get("dashboard/project-financials/")
      .then(({ data }) => setProjectFinancials(data))
      .catch(() => setProjectFinancials([]));
  }, [canViewFinancials]);

  const fetchPendingTasks = useCallback(() => {
    api
      .get("dashboard/pending-tasks/")
      .then(({ data }) => setPendingTasks(Array.isArray(data?.tasks) ? data.tasks : []))
      .catch(() => setPendingTasks([]));
  }, []);

  useEffect(() => {
    fetchStats();
    fetchProjectFinancials();
    fetchPendingTasks();
    intervalRef.current = setInterval(() => {
      fetchStats();
      fetchProjectFinancials();
      fetchPendingTasks();
    }, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchStats, fetchProjectFinancials, fetchPendingTasks]);

  useEffect(() => {
    setShowAllTasks(false);
  }, [activeTaskGroup]);

  const fmt = (n) =>
    typeof n === "number"
      ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : "0";

  const fmtCurrency = (n) =>
    typeof n === "number"
      ? n.toLocaleString("en-US", { maximumFractionDigits: 2 })
      : "0";

  const currencyLabel = i18n.language === "ar" ? "د.إ" : "AED";

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("greeting_morning");
    if (h < 17) return t("greeting_afternoon");
    return t("greeting_evening");
  };

  const firstName = user?.first_name || user?.email?.split("@")[0] || "";
  const roleName = user?.role?.name || "";
  const isProjectManager = roleName === "Manager";
  const isSupervisor = roleName === "Supervisor";
  const isGeneralManager = !!(user?.is_superuser || roleName === "company_super_admin");
  const taskRoleContext = useMemo(() => ({
    isProjectManager,
    isSupervisor,
    isGeneralManager,
  }), [isGeneralManager, isProjectManager, isSupervisor]);
  const today = new Date().toLocaleDateString(
    i18n.language === "ar" ? "ar-SA" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const lang = i18n.language;
  const companyNameAr = tenantTheme?.company_name || "";
  const companyNameEn = tenantTheme?.contractor_name_en || "";

  const formatTaskDate = (value) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString(
        i18n.language === "ar" ? "ar-SA" : "en-US",
        { month: "short", day: "numeric" }
      );
    } catch {
      return "";
    }
  };

  const getTaskIcon = (type) => {
    if (type?.includes("project")) return <FaFileAlt />;
    if (type?.includes("alteration")) return <FaRandom />;
    if (type?.includes("final")) return <FaCheckCircle />;
    return <FaClipboardList />;
  };

  const taskTypeLabel = (type) => {
    const labels = {
      project_manager_approval: t("task_project_manager_approval"),
      project_final_approval: t("task_project_final_approval"),
      variation_project_manager_approval: t("task_variation_project_manager_approval"),
      variation_supervisor_initial_approval: t("task_variation_supervisor_initial_approval"),
      variation_gm_initial_approval: t("task_variation_gm_initial_approval"),
      variation_external_confirmation: t("task_variation_external_confirmation"),
      variation_final_approval: t("task_variation_final_approval"),
      variation_alteration_request: t("task_variation_alteration_request"),
      variation_supervisor_unapprove_request: t("task_variation_supervisor_unapprove_request"),
      variation_edit_allowed: t("task_variation_edit_allowed"),
      variation_returned_for_edit: t("task_variation_returned_for_edit"),
      variation_official_document_upload: t("task_variation_official_document_upload"),
      variation_rejection_edit: t("task_variation_rejection_edit"),
      variation_hidden_fee_approval: t("task_variation_hidden_fee_approval"),
    };
    return labels[type] || t("pending_task");
  };

  const taskGroupCounts = useMemo(() => {
    const counts = TASK_GROUPS.reduce((acc, group) => ({ ...acc, [group.id]: 0 }), {});
    counts.all = pendingTasks.length;

    pendingTasks.forEach((task) => {
      const groupId = taskGroupForType(task.type);
      if (groupId !== "all") counts[groupId] += 1;
    });

    return counts;
  }, [pendingTasks]);

  const visibleTaskGroups = useMemo(() => (
    TASK_GROUPS.filter((group) => group.canReceive(taskRoleContext))
  ), [taskRoleContext]);

  const filteredTasks = useMemo(() => {
    if (activeTaskGroup === "all") return pendingTasks;
    const group = TASK_GROUPS.find((item) => item.id === activeTaskGroup);
    if (!group) return pendingTasks;
    return pendingTasks.filter((task) => group.types.includes(task.type));
  }, [activeTaskGroup, pendingTasks]);

  useEffect(() => {
    if (!visibleTaskGroups.some((group) => group.id === activeTaskGroup)) {
      setActiveTaskGroup("all");
    }
  }, [activeTaskGroup, visibleTaskGroups]);

  const visibleTasks = showAllTasks ? filteredTasks : filteredTasks.slice(0, 8);

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="dash">
        {/* ── Company Header ── */}
        <div className="dash__company-header">
          <div className="dash__company-logo-wrap">
            <BrandLogo type="auto" size={56} companyName={companyNameAr || companyNameEn} />
          </div>
          <div className="dash__company-info">
            <h2 className="dash__company-name">
              {lang === "ar" ? (companyNameAr || companyNameEn) : (companyNameEn || companyNameAr)}
            </h2>
            {companyNameAr && companyNameEn && (
              <p className="dash__company-name-secondary">
                {lang === "ar" ? companyNameEn : companyNameAr}
              </p>
            )}
          </div>
        </div>

        {/* ── Welcome ── */}
        <div className="dash__welcome">
          <div className="dash__welcome-text">
            <h1 className="dash__welcome-title">
              {getGreeting()}{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="dash__welcome-sub">{t("dashboard_subtitle")}</p>
          </div>
          <div className="dash__welcome-date">
            <span className="dash__welcome-today">{t("dash_today")}</span>
            <span className="dash__welcome-datestr">{today}</span>
          </div>
        </div>

        <section className="dash-card dash-tasks" aria-labelledby="pending-tasks-title">
          <div className="dash-card__header dash-tasks__header">
            <div>
              <h2 className="dash-card__title" id="pending-tasks-title">
                {t("pending_tasks")}
              </h2>
              <p className="dash-tasks__subtitle">
                {t("pending_tasks_subtitle")}
              </p>
            </div>
            <span className="dash-card__badge">
              {pendingTasks.length} {pendingTasks.length === 1 ? t("task") : t("tasks")}
            </span>
          </div>

          <div className="dash-tasks__tabs" role="tablist" aria-label={t("pending_tasks")}>
            {visibleTaskGroups.map((group) => {
              const isActive = activeTaskGroup === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`dash-tasks__tab${isActive ? " dash-tasks__tab--active" : ""}`}
                  onClick={() => setActiveTaskGroup(group.id)}
                >
                  <span>{t(group.labelKey)}</span>
                  <span className="dash-tasks__tab-count">{taskGroupCounts[group.id] || 0}</span>
                </button>
              );
            })}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="dash-tasks__empty">
              <span className="dash-tasks__empty-icon">
                <FaCheckCircle />
              </span>
              <div>
                <strong>{t("no_pending_tasks")}</strong>
                <p>
                  {activeTaskGroup === "all"
                    ? (roleName ? t("no_pending_tasks_for_role") : t("no_pending_tasks_desc"))
                    : t("no_pending_tasks_in_group")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="dash-tasks__list">
                {visibleTasks.map((task) => {
                  const projectName = lang === "ar"
                    ? (task.project_name || task.project_name_en)
                    : (task.project_name_en || task.project_name);
                  const title = task.type?.startsWith("project_")
                    ? (projectName || task.title)
                    : task.title;
                  const meta = !task.type?.startsWith("project_") ? projectName : "";

                  return (
                    <Link className="dash-task" to={task.action_url || "/dashboard"} key={task.id}>
                      <span className="dash-task__icon">{getTaskIcon(task.type)}</span>
                      <span className="dash-task__body">
                        <span className="dash-task__topline">
                          <span className="dash-task__type">{taskTypeLabel(task.type)}</span>
                          {task.created_at && (
                            <span className="dash-task__date">{formatTaskDate(task.created_at)}</span>
                          )}
                        </span>
                        <span className="dash-task__title">{title}</span>
                        <span className="dash-task__meta">{meta}</span>
                      </span>
                      <span className="dash-task__status">{t(task.status) || task.status}</span>
                      <span className="dash-task__open" aria-hidden="true">
                        <FaExternalLinkAlt />
                      </span>
                    </Link>
                  );
                })}
              </div>
              {filteredTasks.length > 8 && (
                <button
                  className="dash-tasks__show-more"
                  onClick={() => setShowAllTasks((prev) => !prev)}
                >
                  {showAllTasks
                    ? t("show_less")
                    : t("show_more_tasks", { count: filteredTasks.length - 8 })}
                </button>
              )}
            </>
          )}
        </section>

        {stats && (
          <>
            {/* ── KPI Cards ── */}
            <DashboardKPIs stats={stats} fmt={fmt} canViewFinancials={canViewFinancials} />

            {/* ── Charts Row ── */}
            <div className="dash__charts">
              <DashboardStatusChart stats={stats} fmt={fmt} />
              <DashboardTrendChart stats={stats} />
            </div>

            {/* ── Financial Analytics ── */}
            {canViewFinancials && (
              <DashboardFinancials stats={stats} fmtCurrency={fmtCurrency} currencyLabel={currencyLabel} projectFinancials={projectFinancials} />
            )}

            {/* ── Bottom Row ── */}
            <div className="dash__bottom">
              {canViewFinancials && (
                <DashboardTopProjects stats={stats} fmtCurrency={fmtCurrency} currencyLabel={currencyLabel} />
              )}
              <DashboardActivity stats={stats} />
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
