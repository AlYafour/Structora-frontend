import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardTrendChart({ stats }) {
  const { t, i18n } = useTranslation();
  const trend = stats.monthly_trend || [];

  if (trend.length === 0) {
    return (
      <div className="dash-card">
        <div className="dash-card__header">
          <h3 className="dash-card__title">{t("dash_monthly_trend")}</h3>
        </div>
        <p className="dash-card__empty">{t("no_data")}</p>
      </div>
    );
  }

  const isAr = i18n.language === "ar";

  const data = trend.map((item) => {
    const [year, month] = item.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const label = date.toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      month: "short",
    });
    return { ...item, label };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="dash-tooltip">
          <span className="dash-tooltip__label">{label}</span>
          <span className="dash-tooltip__value">{payload[0].value}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dash-card">
      <div className="dash-card__header">
        <h3 className="dash-card__title">{t("dash_monthly_trend")}</h3>
      </div>
      <div className="dash-chart-area">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary, #14213D)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary, #14213D)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--muted, #6b7280)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--muted, #6b7280)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-primary, #14213D)"
              strokeWidth={2.5}
              fill="url(#colorTrend)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
