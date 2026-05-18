import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import { api } from "../../../services/api";
import { handleError } from "../../../utils/errorHandler";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import Dialog from "../../../components/common/Dialog";
import { formatMoney } from "../../../utils/formatters";
import DirhamsIcon from "../../../components/common/DirhamsIcon";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import { useReactToPrint } from "react-to-print";
import TabPrintWrapper from "../../../components/print/TabPrintWrapper";
import "./PaymentsTab.css";

const VAT_RATE = 5;

function computeAmounts(amount, vatMode) {
  const a = parseFloat(amount) || 0;
  if (vatMode === "no_vat") {
    return { net_amount: a, vat_amount: 0, gross_amount: a };
  }
  if (vatMode === "included") {
    const net = +(a / 1.05).toFixed(2);
    const vat = +(a - net).toFixed(2);
    return { net_amount: net, vat_amount: vat, gross_amount: a };
  }
  const vat = +(a * 0.05).toFixed(2);
  const gross = +(a + vat).toFixed(2);
  return { net_amount: a, vat_amount: vat, gross_amount: gross };
}

const DEFAULT_FORM = { description: "", amount: "", vat_mode: "excluded" };

const ProlongationFeesTab = memo(function ProlongationFeesTab({ projectId, onReload }) {
  const { t, i18n } = useTranslation();
  const { success, error: showError } = useNotifications();
  const isAR = i18n.language === "ar";

  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingFee, setDeletingFee] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFees = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.get(`projects/${projectId}/prolongation-fees/`);
      setFees(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (err) {
      handleError(err, "ProlongationFeesTab.fetchFees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, [projectId]);

  const renderMoney = (value) => {
    const str = formatMoney(value, { lang: i18n.language });
    if (i18n.language === "en") {
      const numPart = str.replace(/AED\s?/, "").trim();
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {numPart} <DirhamsIcon size={10} color="#374151" />
        </span>
      );
    }
    return str;
  };

  const preview = useMemo(() => computeAmounts(form.amount, form.vat_mode), [form.amount, form.vat_mode]);

  const stats = useMemo(() => {
    const totalGross = fees.reduce((s, f) => s + parseFloat(f.gross_amount || 0), 0);
    const totalNet = fees.reduce((s, f) => s + parseFloat(f.net_amount || 0), 0);
    const totalVat = fees.reduce((s, f) => s + parseFloat(f.vat_amount || 0), 0);
    return { count: fees.length, totalGross, totalNet, totalVat };
  }, [fees]);

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: t("prolongation_fees", "Prolongation Fees"),
    pageStyle: `@page { size: A4 landscape; margin: 8mm; } html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }`,
  });

  const openAdd = () => {
    setEditingFee(null);
    setForm(DEFAULT_FORM);
    setFormOpen(true);
  };

  const openEdit = (fee) => {
    setEditingFee(fee);
    setForm({
      description: fee.description || "",
      amount: fee.amount,
      vat_mode: parseFloat(fee.vat_rate || 0) === 0
        ? "no_vat"
        : fee.vat_included
          ? "included"
          : "excluded",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      showError(t("pf_amount_required", "Please enter a valid amount"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        amount: parseFloat(form.amount),
        vat_included: form.vat_mode === "included",
        vat_rate: form.vat_mode === "no_vat" ? 0 : VAT_RATE,
      };
      if (editingFee) {
        await api.patch(`projects/${projectId}/prolongation-fees/${editingFee.id}/`, payload);
        success(t("pf_updated", "Prolongation fee updated"));
      } else {
        await api.post(`projects/${projectId}/prolongation-fees/`, payload);
        success(t("pf_added", "Prolongation fee added"));
      }
      setFormOpen(false);
      fetchFees();
      if (onReload) onReload();
    } catch (err) {
      const e = handleError(err, "ProlongationFeesTab.handleSave");
      showError(e.message || t("error_generic", "An error occurred"));
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (fee) => {
    setDeletingFee(fee);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingFee) return;
    setDeleting(true);
    try {
      await api.delete(`projects/${projectId}/prolongation-fees/${deletingFee.id}/`);
      success(t("pf_deleted", "Prolongation fee deleted"));
      setDeleteConfirmOpen(false);
      setDeletingFee(null);
      fetchFees();
      if (onReload) onReload();
    } catch (err) {
      const e = handleError(err, "ProlongationFeesTab.handleDelete");
      showError(e.message || t("error_generic", "An error occurred"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          <Button variant="primary" size="md" onClick={openAdd}>
            {t("pf_add_fee", "Add Prolongation Fee")}
          </Button>
          {fees.length > 0 && (
            <button onClick={handlePrint} className="payments-tab__btn-outline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 17V3M6 11l6 6 6-6" />
                <path d="M4 21h16" />
              </svg>
              {t("download_pdf", "Download PDF")}
            </button>
          )}
        </div>
      </div>

      {fees.length > 0 && (
        <MetricGrid columns={4}>
          <MetricCard variant="blue" icon="hash" label={t("pf_total_count", "Total Fees")} value={stats.count} />
          <MetricCard variant="emerald" icon="dollar" label={t("pf_total_gross", "Total (incl. VAT)")} value={renderMoney(stats.totalGross)} />
          <MetricCard variant="amber" icon="file" label={t("pf_total_net", "Total (excl. VAT)")} value={renderMoney(stats.totalNet)} />
          <MetricCard variant="violet" icon="percent" label={t("pf_total_vat", "Total VAT")} value={renderMoney(stats.totalVat)} />
        </MetricGrid>
      )}

      {loading ? (
        <div className="prj-empty-state">{t("loading", "Loading...")}</div>
      ) : fees.length === 0 ? (
        <div className="prj-empty-state">{t("pf_no_fees", "No prolongation fees added yet")}</div>
      ) : (
        <TabPrintWrapper ref={printRef} title={t("prolongation_fees", "Prolongation Fees")}>
        <div className="prj-table__wrapper">
          <table className="prj-table">
            <thead>
              <tr>
                <th className="ds-text-center ds-w-60">#</th>
                <th>{t("pf_description", "Description")}</th>
                <th className="ds-text-center">{t("pf_vat_type", "Amount Type")}</th>
                <th className="ds-text-right">{t("pf_net_amount", "Net Amount")}</th>
                <th className="ds-text-right">{t("pf_vat_amount", "VAT (5%)")}</th>
                <th className="ds-text-right">{t("pf_gross_amount", "Total (incl. VAT)")}</th>
                <th className="ds-w-60 ds-text-center">{t("action", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee, i) => (
                <tr key={fee.id}>
                  <td className="ds-text-center ds-font-medium prj-table__index">{i + 1}</td>
                  <td>
                    <span title={fee.description}>{fee.description || "-"}</span>
                  </td>
                  <td className="ds-text-center">
                    <span className={`prj-badge ${fee.vat_included ? "prj-badge--info" : "prj-badge--secondary"}`}>
                      {parseFloat(fee.vat_rate || 0) === 0
                        ? t("pf_no_vat", "No VAT")
                        : fee.vat_included
                          ? t("pf_with_vat", "Incl. VAT")
                          : t("pf_without_vat", "Excl. VAT")}
                    </span>
                  </td>
                  <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
                    {renderMoney(fee.net_amount)}
                  </td>
                  <td className="prj-nowrap ds-text-right">
                    {renderMoney(fee.vat_amount)}
                  </td>
                  <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
                    {renderMoney(fee.gross_amount)}
                  </td>
                  <td className="col-actions">
                    <ActionMenu
                      items={[
                        { label: t("edit", "Edit"), type: "button", onClick: () => openEdit(fee) },
                        { label: t("delete", "Delete"), type: "button", variant: "danger", onClick: () => askDelete(fee) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.88rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t("total")}
                </td>
                <td className="prj-nowrap prj-info-value--money ds-text-right" style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.92rem' }}>
                  {renderMoney(stats.totalNet)}
                </td>
                <td className="prj-nowrap ds-text-right" style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.92rem' }}>
                  {renderMoney(stats.totalVat)}
                </td>
                <td className="prj-nowrap prj-info-value--money ds-text-right" style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.92rem' }}>
                  {renderMoney(stats.totalGross)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* Print-only summary */}
        <div className="tpw-print-only" style={{ marginTop: '16px' }}>
          <div style={{ border: '1.5px solid #d8c9b3', borderRadius: '10px', padding: '16px 20px', background: '#fff' }}>
            <div style={{ fontWeight: 800, fontSize: '11pt', color: '#17202f', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t("summary", "Summary")}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ padding: '10px 14px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '7.5pt', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("pf_total_count", "Total Fees")}</div>
                <div style={{ fontSize: '14pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{stats.count}</div>
              </div>
              <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '7.5pt', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("pf_total_net", "Total (excl. VAT)")}</div>
                <div style={{ fontSize: '12pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{renderMoney(stats.totalNet)}</div>
              </div>
              <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '7.5pt', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("pf_total_vat", "Total VAT")}</div>
                <div style={{ fontSize: '12pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{renderMoney(stats.totalVat)}</div>
              </div>
              <div style={{ padding: '10px 14px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                <div style={{ fontSize: '7.5pt', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("pf_total_gross", "Total (incl. VAT)")}</div>
                <div style={{ fontSize: '12pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{renderMoney(stats.totalGross)}</div>
              </div>
            </div>
          </div>
        </div>
        </TabPrintWrapper>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={formOpen}
        title={editingFee ? t("pf_edit_fee", "Edit Prolongation Fee") : t("pf_add_fee", "Add Prolongation Fee")}
        confirmLabel={saving ? t("saving", "Saving...") : t("save", "Save")}
        cancelLabel={t("cancel", "Cancel")}
        onClose={() => !saving && setFormOpen(false)}
        onConfirm={handleSave}
        busy={saving}
        desc={
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Description */}
            <div>
              <label className="prj-label">{t("pf_description", "Description")}</label>
              <textarea
                className="prj-input ds-w-full"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("pf_description_placeholder", "Enter a description for the prolongation fee...")}
              />
            </div>

            {/* VAT toggle */}
            <div style={{ display: "flex", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1 }}>
                <input
                  type="radio"
                  name="pf_vat_type"
                  checked={form.vat_mode === "excluded"}
                  onChange={() => setForm((f) => ({ ...f, vat_mode: "excluded" }))}
                />
                <span>{t("pf_enter_without_vat", "Amount excluding VAT")}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1 }}>
                <input
                  type="radio"
                  name="pf_vat_type"
                  checked={form.vat_mode === "included"}
                  onChange={() => setForm((f) => ({ ...f, vat_mode: "included" }))}
                />
                <span>{t("pf_enter_with_vat", "Amount including VAT")}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1 }}>
                <input
                  type="radio"
                  name="pf_vat_type"
                  checked={form.vat_mode === "no_vat"}
                  onChange={() => setForm((f) => ({ ...f, vat_mode: "no_vat" }))}
                />
                <span>{t("pf_enter_no_vat", "No VAT")}</span>
              </label>
            </div>

            {/* Amount */}
            <div>
              <label className="prj-label">
                {form.vat_mode === "included"
                  ? t("pf_amount_with_vat_label", "Amount (includes 5% VAT)")
                  : form.vat_mode === "no_vat"
                    ? t("pf_amount_no_vat_label", "Amount (no VAT)")
                    : t("pf_amount_without_vat_label", "Amount (before VAT)")}
              </label>
              <input
                type="number"
                className="prj-input ds-w-full"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Live preview */}
            {parseFloat(form.amount) > 0 && (
              <div style={{ background: "var(--surface-secondary, #f9fafb)", borderRadius: "8px", padding: "12px", fontSize: "13px" }}>
                <div style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary, #6b7280)" }}>
                  {t("pf_breakdown_preview", "Breakdown")}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>{t("pf_net_amount", "Net Amount")}</span>
                  <span>{isAR ? formatMoney(preview.net_amount) : `${preview.net_amount.toFixed(2)}`}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>{t("pf_vat_amount", "VAT (5%)")}</span>
                  <span>{isAR ? formatMoney(preview.vat_amount) : `${preview.vat_amount.toFixed(2)}`}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, borderTop: "1px solid var(--border-color, #e5e7eb)", paddingTop: "6px", marginTop: "4px" }}>
                  <span>{t("pf_gross_amount", "Total (incl. VAT)")}</span>
                  <span>{isAR ? formatMoney(preview.gross_amount) : `${preview.gross_amount.toFixed(2)}`}</span>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        title={t("pf_delete_title", "Delete Prolongation Fee")}
        desc={t("pf_delete_confirm", "Are you sure you want to delete this prolongation fee? This action cannot be undone.")}
        confirmLabel={deleting ? t("deleting", "Deleting...") : t("delete", "Delete")}
        cancelLabel={t("cancel", "Cancel")}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        busy={deleting}
        danger
      />
    </div>
  );
});

export default ProlongationFeesTab;
