import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaCheckDouble,
  FaReceipt,
} from "react-icons/fa";
import DirhamsIcon from "../../components/common/DirhamsIcon";
import { formatDate } from "../../utils/formatters/date";
import { useLanguage } from "../../hooks";

const COL_COLORS = {
  owner:      "#16a34a",
  bank:       "#2563eb",
  nextOwner:  "#d97706",
  nextBank:   "#ea580c",
  vat:        "#7c3aed",
};

export default function DashboardFinancials({
  stats,
  fmtCurrency,
  currencyLabel = "AED",
  projectFinancials = [],
}) {
  const { t } = useTranslation();
  const { isArabic: isAR } = useLanguage();
  const currency = isAR ? currencyLabel : <DirhamsIcon size={10} color="#374151" />;

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

  const amountCell = (info, colClass) => {
    if (!info) {
      return (
        <td className={colClass}>
          <span className="dash-fin-table__nil">—</span>
        </td>
      );
    }
    return (
      <td className={colClass}>
        <div className="dash-fin-table__amount-wrap">
          <span className="dash-fin-table__dot" />
          <span className="dash-fin-table__amount">{fmtCurrency(info.amount)}</span>
          {isAR ? (
            <span className="dash-fin-table__currency">{currencyLabel}</span>
          ) : (
            <DirhamsIcon size={9} color="currentColor" style={{ opacity: 0.6 }} />
          )}
        </div>
        {info.date && (
          <span className="dash-fin-table__date-badge">{formatDate(info.date)}</span>
        )}
        {info.invoice_number && (
          <span className="dash-fin-table__inv-badge">#{info.invoice_number}</span>
        )}
      </td>
    );
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

      {/* Per-project payment summary table */}
      {projectFinancials.length > 0 && (
        <div className="dash-fin-table-section">
          <h4 className="dash-fin-table-section__title">{t("dash_project_financials")}</h4>
          <div className="dash-table-wrap">
            <table className="dash-table dash-fin-table">
              <thead>
                <tr>
                  <th>{t("dash_project_name")}</th>
                  <th>
                    <span className="dash-fin-th-dot" style={{ background: COL_COLORS.owner }} />
                    {t("dash_last_owner_payment")}
                  </th>
                  <th>
                    <span className="dash-fin-th-dot" style={{ background: COL_COLORS.bank }} />
                    {t("dash_last_bank_payment")}
                  </th>
                  <th>
                    <span className="dash-fin-th-dot" style={{ background: COL_COLORS.nextOwner }} />
                    {t("dash_next_owner_payment")}
                  </th>
                  <th>
                    <span className="dash-fin-th-dot" style={{ background: COL_COLORS.nextBank }} />
                    {t("dash_next_bank_payment")}
                  </th>
                  <th>
                    <span className="dash-fin-th-dot" style={{ background: COL_COLORS.vat }} />
                    {t("dash_vat_issued")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectFinancials.map((p) => (
                  <tr key={p.id} className="dash-table__row">
                    <td className="dash-table__name">
                      {isAR
                        ? (p.name || p.name_en || "—")
                        : (p.name_en || p.name || "—")}
                    </td>
                    {amountCell(p.last_owner_payment, "dash-fin-col--owner")}
                    {amountCell(p.last_bank_payment, "dash-fin-col--bank")}
                    {amountCell(p.next_expected_owner_payment, "dash-fin-col--next-owner")}
                    {amountCell(p.next_expected_bank_payment, "dash-fin-col--next-bank")}
                    <td className="dash-fin-col--vat">
                      {p.total_vat_issued > 0 ? (
                        <div className="dash-fin-table__amount-wrap">
                          <span className="dash-fin-table__dot" />
                          <span className="dash-fin-table__amount">
                            {fmtCurrency(p.total_vat_issued)}
                          </span>
                          {isAR ? (
                            <span className="dash-fin-table__currency">{currencyLabel}</span>
                          ) : (
                            <DirhamsIcon size={9} color="currentColor" style={{ opacity: 0.6 }} />
                          )}
                        </div>
                      ) : (
                        <span className="dash-fin-table__nil">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
