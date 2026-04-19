import { useTranslation } from "react-i18next";
import Button from "../../components/common/Button";
import useTenantNavigate from '../../hooks/useTenantNavigate';

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

export default function DashboardTopProjects({ stats, fmtCurrency, currencyLabel = "AED" }) {
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const projects = stats.top_projects || [];

  if (projects.length === 0) {
    return (
      <div className="dash-card dash-card--full">
        <div className="dash-card__header">
          <h3 className="dash-card__title">{t("dash_top_projects")}</h3>
        </div>
        <p className="dash-card__empty">{t("no_data")}</p>
      </div>
    );
  }

  return (
    <div className="dash-card dash-card--full">
      <div className="dash-card__header">
        <h3 className="dash-card__title">{t("dash_top_projects")}</h3>
        <Button variant="ghost" className="dash-card__link" onClick={() => navigate("/projects")}>
          {t("dash_view_all")}
        </Button>
      </div>
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>{t("dash_rank")}</th>
              <th>{t("dash_project_name")}</th>
              <th>{t("dash_project_value")}</th>
              <th>{t("dash_status")}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr
                key={p.id}
                className="dash-table__row"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <td className="dash-table__rank">{i + 1}</td>
                <td className="dash-table__name">{p.name}</td>
                <td className="dash-table__value">{fmtCurrency(p.value)} {currencyLabel}</td>
                <td>
                  <span
                    className="dash-table__status"
                    style={{
                      background: `${STATUS_COLORS[p.status] || "#6b7280"}18`,
                      color: STATUS_COLORS[p.status] || "#6b7280",
                    }}
                  >
                    {t(`status_${p.status}`) || p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
