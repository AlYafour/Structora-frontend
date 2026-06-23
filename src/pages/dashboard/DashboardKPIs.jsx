import { useTranslation } from "react-i18next";
import useTenantNavigate from '../../hooks/useTenantNavigate';
import {
  FaFolderOpen,
  FaHardHat,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartPie,
  FaTachometerAlt,
} from "react-icons/fa";

const KPIS = [
  { key: "total", icon: FaFolderOpen, color: "primary", getValue: (s) => s.total_projects, label: "total_projects" },
  { key: "active", icon: FaHardHat, color: "blue", getValue: (s) => (s.by_status?.under_execution || 0) + (s.by_status?.execution_started || 0), label: "dash_active_projects" },
  { key: "completed", icon: FaCheckCircle, color: "green", getValue: (s) => s.by_status?.completed || 0, label: "dash_completed_projects" },
  { key: "delayed", icon: FaExclamationTriangle, color: "red", getValue: (s) => s.timeline_health?.delayed || 0, label: "dash_delayed_projects" },
  { key: "budget", icon: FaChartPie, color: "purple", getValue: (s) => s.budget_utilization?.utilization_rate || 0, label: "dash_budget_utilization", suffix: "%" },
  { key: "progress", icon: FaTachometerAlt, color: "teal", getValue: (s) => s.avg_progress?.technical || 0, label: "dash_avg_progress", suffix: "%" },
];

export default function DashboardKPIs({ stats, fmt, canViewFinancials = false }) {
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const visibleKpis = canViewFinancials
    ? KPIS
    : KPIS.filter((kpi) => kpi.key !== "budget");

  return (
    <div className="dash-kpis">
      {visibleKpis.map((kpi) => {
        const Icon = kpi.icon;
        const value = kpi.getValue(stats);
        const isClickable = kpi.key === "total";
        const Tag = isClickable ? "button" : "div";

        return (
          <Tag
            key={kpi.key}
            className="dash-kpi"
            onClick={isClickable ? () => navigate("/projects") : undefined}
          >
            <div className={`dash-kpi__icon dash-kpi__icon--${kpi.color}`}>
              <Icon />
            </div>
            <div className="dash-kpi__body">
              <span className="dash-kpi__value">
                {kpi.suffix ? `${fmt(value)}${kpi.suffix}` : fmt(value)}
              </span>
              <span className="dash-kpi__label">{t(kpi.label)}</span>
            </div>
          </Tag>
        );
      })}
    </div>
  );
}
