import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import useTenantNavigate from "../../hooks/useTenantNavigate";
import { useLanguage } from "../../hooks";
import {
  FaPlus,
  FaSyncAlt,
  FaCheck,
  FaTimesCircle,
} from "react-icons/fa";

const ACTION_CONFIG = {
  created: { icon: FaPlus, color: "#3b82f6", key: "dash_project_created" },
  updated: { icon: FaSyncAlt, color: "#f59e0b", key: "dash_project_updated" },
  approved: { icon: FaCheck, color: "#22c55e", key: "dash_project_approved" },
  rejected: { icon: FaTimesCircle, color: "#ef4444", key: "dash_project_rejected" },
};

export default function DashboardActivity({ stats }) {
  const { t, i18n } = useTranslation();
  const { isArabic: isAR } = useLanguage();
  const navigate = useTenantNavigate();
  const activity = stats.recent_activity || [];
  const isAr = i18n.language === "ar";

  if (activity.length === 0) {
    return (
      <div className="dash-card dash-card--full">
        <div className="dash-card__header">
          <h3 className="dash-card__title">{t("dash_recent_activity")}</h3>
        </div>
        <p className="dash-card__empty">{t("dash_no_recent_activity")}</p>
      </div>
    );
  }

  return (
    <div className="dash-card dash-card--full">
      <div className="dash-card__header">
        <h3 className="dash-card__title">{t("dash_recent_activity")}</h3>
      </div>

      <div className="dash-activity">
        {activity.map((item, i) => {
          const config = ACTION_CONFIG[item.action] || ACTION_CONFIG.updated;
          const Icon = config.icon;

          const timeAgo = item.date
            ? formatDistanceToNow(new Date(item.date), {
                addSuffix: true,
                locale: isAr ? ar : enUS,
              })
            : "";

          const projectName = isAR
            ? (item.project_name || item.project_name_en || "-")
            : (item.project_name_en || item.project_name || "-");

          return (
            <div
              key={item.id || `activity-${i}`}
              className="dash-activity__item"
              onClick={() => item.project_id && navigate(`/projects/${item.project_id}`)}
            >
              <div className="dash-activity__line">
                <div
                  className="dash-activity__dot"
                  style={{ background: config.color }}
                >
                  <Icon />
                </div>
                {i < activity.length - 1 && <div className="dash-activity__connector" />}
              </div>

              <div className="dash-activity__content">
                <span className="dash-activity__text">
                  <strong>{projectName}</strong>
                  <span className="dash-activity__action">{t(config.key)}</span>
                </span>
                <span className="dash-activity__time">{timeAgo}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}