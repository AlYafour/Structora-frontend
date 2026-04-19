import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STATUS_COLORS = {
  not_started: "#6b7280",
  execution_started: "#3b82f6",
  under_execution: "#14213D",
  temporarily_suspended: "#f59e0b",
  handover_stage: "#8b5cf6",
  pending_financial_closure: "#f97316",
  completed: "#22c55e",
  draft: "#9ca3af",
  in_progress: "#60a5fa",
};

export default function DashboardStatusChart({ stats, fmt }) {
  const { t } = useTranslation();
  const byStatus = stats.by_status || {};
  const data = Object.entries(byStatus).map(([key, value]) => ({
    name: t(`status_${key}`) || key.replace(/_/g, " "),
    value,
    color: STATUS_COLORS[key] || "#6b7280",
  }));

  if (data.length === 0) {
    return (
      <div className="dash-card">
        <div className="dash-card__header">
          <h3 className="dash-card__title">{t("projects_by_status")}</h3>
        </div>
        <p className="dash-card__empty">{t("no_data")}</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="dash-tooltip">
          <span className="dash-tooltip__dot" style={{ background: item.payload.color }} />
          <span className="dash-tooltip__label">{item.name}</span>
          <span className="dash-tooltip__value">{item.value}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dash-card">
      <div className="dash-card__header">
        <h3 className="dash-card__title">{t("projects_by_status")}</h3>
        <span className="dash-card__badge">{fmt(stats.total_projects)}</span>
      </div>
      <div className="dash-chart-donut">
        <div className="dash-chart-donut__chart">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.name || entry.color} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="dash-chart-donut__center">
            <span className="dash-chart-donut__center-value">{fmt(stats.total_projects)}</span>
            <span className="dash-chart-donut__center-label">{t("total_projects")}</span>
          </div>
        </div>
        <div className="dash-chart-donut__legend">
          {data.map((item) => (
            <div key={item.name} className="dash-legend-item">
              <span className="dash-legend-item__dot" style={{ background: item.color }} />
              <span className="dash-legend-item__label">{item.name}</span>
              <span className="dash-legend-item__value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
