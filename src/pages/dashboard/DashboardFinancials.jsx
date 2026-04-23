import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaCheckDouble,
  FaReceipt,
} from "react-icons/fa";
import DirhamsIcon from "../../components/common/DirhamsIcon";

export default function DashboardFinancials({ stats, fmtCurrency, currencyLabel = "AED" }) {
  const { t, i18n } = useTranslation();
  const currency = i18n.language === "ar" ? currencyLabel : <DirhamsIcon size={10} color="#374151" />;
  const budget = stats.budget_utilization || {};
  const financials = stats.financials || {};
  const totalBudget = budget.total_budget || 0;
  const totalPaid = budget.total_paid || 0;
  const remaining = totalBudget - totalPaid;
  const rate = budget.utilization_rate || 0;

  const getBarColor = (r) => {
    if (r >= 90) return "var(--error-500, #ef4444)";
    if (r >= 70) return "var(--warning-500, #f59e0b)";
    return "var(--success-500, #10b981)";
  };

  return (
    <div className="dash-card dash-card--full">
      <div className="dash-card__header">
        <h3 className="dash-card__title">{t("financial_summary")}</h3>
        <span className="dash-card__badge">{rate}%</span>
      </div>

      {/* Financial cards */}
      <div className="dash-fin-grid">
        <div className="dash-fin-item">
          <div className="dash-fin-item__icon dash-fin-item__icon--blue">
            <FaMoneyBillWave />
          </div>
          <div className="dash-fin-item__body">
            <span className="dash-fin-item__label">{t("dash_total_budget")}</span>
            <span className="dash-fin-item__value">{fmtCurrency(totalBudget)} <small className="dash-fin-item__currency">{currency}</small></span>
          </div>
        </div>

        <div className="dash-fin-item">
          <div className="dash-fin-item__icon dash-fin-item__icon--green">
            <FaCheckDouble />
          </div>
          <div className="dash-fin-item__body">
            <span className="dash-fin-item__label">{t("dash_total_paid")}</span>
            <span className="dash-fin-item__value">{fmtCurrency(totalPaid)} <small className="dash-fin-item__currency">{currency}</small></span>
          </div>
        </div>

        <div className="dash-fin-item">
          <div className="dash-fin-item__icon dash-fin-item__icon--amber">
            <FaReceipt />
          </div>
          <div className="dash-fin-item__body">
            <span className="dash-fin-item__label">{t("dash_remaining")}</span>
            <span className="dash-fin-item__value">{fmtCurrency(remaining > 0 ? remaining : 0)} <small className="dash-fin-item__currency">{currency}</small></span>
          </div>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="dash-fin-bar">
        <div className="dash-fin-bar__header">
          <span className="dash-fin-bar__label">{t("dash_utilization_rate")}</span>
          <span className="dash-fin-bar__pct" style={{ color: getBarColor(rate) }}>
            {rate}%
          </span>
        </div>
        <div className="dash-fin-bar__track">
          <div
            className="dash-fin-bar__fill"
            style={{
              width: `${Math.min(rate, 100)}%`,
              background: getBarColor(rate),
            }}
          />
        </div>
      </div>

      {/* Bank / Owner split */}
      <div className="dash-fin-split">
        <div className="dash-fin-split__item">
          <span className="dash-fin-split__label">{t("total_bank_value")}</span>
          <span className="dash-fin-split__value">{fmtCurrency(financials.total_bank_value || 0)} {currency}</span>
        </div>
        <div className="dash-fin-split__divider" />
        <div className="dash-fin-split__item">
          <span className="dash-fin-split__label">{t("total_owner_value")}</span>
          <span className="dash-fin-split__value">{fmtCurrency(financials.total_owner_value || 0)} {currency}</span>
        </div>
      </div>
    </div>
  );
}
