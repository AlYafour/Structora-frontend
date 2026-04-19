import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
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

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { user, tenantTheme } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchStats = useCallback(() => {
    api
      .get("dashboard/stats/")
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchStats]);

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
  const today = new Date().toLocaleDateString(
    i18n.language === "ar" ? "ar-SA" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const lang = i18n.language;
  const companyNameAr = tenantTheme?.company_name || "";
  const companyNameEn = tenantTheme?.contractor_name_en || "";
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

        {stats && (
          <>
            {/* ── KPI Cards ── */}
            <DashboardKPIs stats={stats} fmt={fmt} />

            {/* ── Charts Row ── */}
            <div className="dash__charts">
              <DashboardStatusChart stats={stats} fmt={fmt} />
              <DashboardTrendChart stats={stats} />
            </div>

            {/* ── Financial Analytics ── */}
            <DashboardFinancials stats={stats} fmtCurrency={fmtCurrency} currencyLabel={currencyLabel} />

            {/* ── Bottom Row ── */}
            <div className="dash__bottom">
              <DashboardTopProjects stats={stats} fmtCurrency={fmtCurrency} currencyLabel={currencyLabel} />
              <DashboardActivity stats={stats} />
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
