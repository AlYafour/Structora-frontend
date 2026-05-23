/**
 * AdvancePaymentMonitor Component
 *
 * Displays advance payment tracking information:
 * - Summary cards (total, recovered, remaining)
 * - Progress bar per advance payment
 * - Per-advance breakdown with deductions table
 * - Void button for each advance payment
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../../../../contexts/NotificationContext";
import { advancePaymentApi } from "../../../../../../services/advancePayments";
import { handleError } from "../../../../../../utils/errorHandler";
import { formatMoney, formatDate } from "../../../../../../utils/formatters";
import { MetricCard, MetricGrid } from "../../../../../../components/common/MetricCard";
import Dialog from "../../../../../../components/common/Dialog";
import ActionMenu from "../../../../../../components/common/ActionMenu";
import "./AdvancePaymentMonitor.css";
import DirhamsIcon from "../../../../../../components/common/DirhamsIcon";

export default function AdvancePaymentMonitor({ projectId, onReload }) {
  const { t, i18n } = useTranslation();
  const { error: showError, success } = useNotifications();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [voidingAdvance, setVoidingAdvance] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  const loadSummary = () => {
    if (!projectId) return;
    setLoading(true);
    advancePaymentApi
      .getSummary(projectId)
      .then((data) => {
        setSummary(data?.has_advance ? data : null);
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  const handleVoidAdvance = async () => {
    if (!voidingAdvance) return;
    setVoidLoading(true);
    try {
      await advancePaymentApi.void(projectId, voidingAdvance.id, voidReason);
      success(t("void_success"));
      setSummary(null);
      if (onReload) onReload();
    } catch (error) {
      const apiDetail = error?.response?.data?.detail;
      if (apiDetail) {
        const msg = Array.isArray(apiDetail) ? apiDetail.join('\n') : apiDetail;
        showError(msg);
      } else {
        const handledError = handleError(error, 'AdvancePaymentMonitor.handleVoid');
        showError(handledError.message || t("void_error"));
      }
    } finally {
      setVoidConfirmOpen(false);
      setVoidingAdvance(null);
      setVoidReason("");
      setVoidLoading(false);
    }
  };

  if (loading || !summary) return null;

  const { advances, totals } = summary;
  const totalAmount = parseFloat(totals.total_amount) || 0;
  const totalRecovered = parseFloat(totals.total_recovered) || 0;
  const totalRemaining = parseFloat(totals.total_remaining) || 0;
  const overallProgress = totalAmount > 0 ? (totalRecovered / totalAmount) * 100 : 0;

  const renderAmount = (value) => {
    const str = formatMoney(value, { lang: i18n.language });

    if (i18n.language === "en") {
      const numPart = str.replace(/AED\s?/, "").trim();

      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {numPart}
          <DirhamsIcon size={10} color="#374151" />
        </span>
      );
    }

    return str;
  };

  return (
    <div className="advance-monitor">
      <div className="advance-monitor__header">
        <h3 className="advance-monitor__title">{t("advance_payment_tracker")}</h3>
        {advances.length > 0 && advances[0].status !== 'cancelled' && (
          <ActionMenu items={[
            { label: t("void"), type: "button", variant: "danger", onClick: () => { setVoidingAdvance(advances[0]); setVoidConfirmOpen(true); } },
          ]} />
        )}
        {advances.length > 0 && advances[0].status === 'cancelled' && (
          <span className="prj-badge prj-badge--muted">{t("voided")}</span>
        )}
      </div>

      {/* Summary Cards — unified MetricCard design */}
      <MetricGrid>
        <MetricCard
          variant="amber"
          icon="wallet"
          label={t("total_advance")}
          value={renderAmount(totalAmount)}
        />

        <MetricCard
          variant="emerald"
          icon="check"
          label={t("recovered")}
          value={renderAmount(totalRecovered)}
        />

        <MetricCard
          variant={totalRemaining > 0 ? "danger" : "success"}
          icon="alert"
          label={t("remaining")}
          value={renderAmount(totalRemaining)}
        />
      </MetricGrid>

      {/* Overall Progress Bar */}
      <div className="advance-monitor__progress-wrapper">
        <div className="advance-monitor__progress-bar">
          <div
            className="advance-monitor__progress-fill"
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>
        <span className="advance-monitor__progress-text">
          {overallProgress.toFixed(1)}%
        </span>
      </div>

      {/* Deductions Table */}
      {advances.length > 0 && advances[0].deductions && advances[0].deductions.length > 0 && (
        <div className="advance-monitor__deductions">
          <table className="advance-monitor__deductions-table">
            <thead>
              <tr>
                <th>{t("invoice_number")}</th>
                <th>{t("invoice_date")}</th>
                <th className="ds-text-right">{t("gross_amount")}</th>
                <th className="ds-text-right">{t("advance_deduction")}</th>
                <th className="ds-text-right">{t("net_amount")}</th>
                <th className="ds-text-right">{t("cumulative_recovered")}</th>
              </tr>
            </thead>
            <tbody>
              {advances[0].deductions.map((d) => (
                <tr key={d.id}>
                  <td>{d.invoice_number || "-"}</td>
                  <td>{formatDate(d.invoice_date, i18n.language)}</td>
                  <td className="ds-text-right">{formatMoney(d.invoice_gross_amount)}</td>
                  <td className="ds-text-right advance-monitor__deduction-amount">
                    - {formatMoney(d.deduction_amount)}
                  </td>
                  <td className="ds-text-right">{formatMoney(d.invoice_net_amount)}</td>
                  <td className="ds-text-right">{formatMoney(d.cumulative_recovered)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Void Confirm Dialog */}
      <Dialog
        open={voidConfirmOpen}
        title={t("void_advance")}
        desc={
          <div>
            <p>{t("confirm_void_advance")}</p>
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t("void_reason")}
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder={t("void_reason_placeholder")}
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '14px', resize: 'vertical' }}
              />
            </div>
          </div>
        }
        confirmLabel={voidLoading ? t("voiding") : t("void")}
        cancelLabel={t("cancel")}
        onClose={() => { if (!voidLoading) { setVoidConfirmOpen(false); setVoidingAdvance(null); setVoidReason(""); } }}
        onConfirm={handleVoidAdvance}
        danger
        busy={voidLoading}
      />
    </div>
  );
}
