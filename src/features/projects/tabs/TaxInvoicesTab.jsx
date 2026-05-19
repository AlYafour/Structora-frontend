import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDownloadFinancialPDFs } from "../../../hooks/useDownloadFinancialPDFs";
import { api } from "../../../services/api";
import { logger } from "../../../utils/logger";
import { formatMoney, formatDate } from "../../../utils/formatters";
import Button from "../../../components/common/Button";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import { VatAmount } from "../../../components/common/VatBreakdownPopover";
import DirhamsIcon from "../../../components/common/DirhamsIcon";
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import { useReactToPrint } from "react-to-print";
import TabPrintWrapper from "../../../components/print/TabPrintWrapper";
import "./PaymentsTab.css";

const TaxInvoicesTab = memo(function TaxInvoicesTab({ projectId }) {
 const { t, i18n } = useTranslation();
 const navigate = useTenantNavigate();

 const renderAmount = (value) => {
  const str = formatMoney(value, { lang: i18n.language });
  if (i18n.language === 'en') {
   const numPart = str.replace(/AED\s?/, '').trim();
   return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
     {numPart} <DirhamsIcon size={10} color="#374151" />
    </span>
   );
  }
  return str;
 };

 const [invoices, setInvoices] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showVoided, setShowVoided] = useState(false);

 const loadInvoices = (includeVoided = false) => {
  if (projectId) {
   setLoading(true);
   const url = includeVoided
    ? `projects/${projectId}/tax-invoices/?include_voided=true`
    : `projects/${projectId}/tax-invoices/`;
   api.get(url)
    .then(res => {
     const data = res.data;
     setInvoices(Array.isArray(data) ? data : []);
    })
    .catch((err) => {
     logger.error("Error loading tax invoices", err);
     setInvoices([]);
    })
    .finally(() => setLoading(false));
  }
 };

 useEffect(() => {
  loadInvoices(showVoided);
 }, [projectId, showVoided]);

 // Active invoices only (for statistics)
 const activeInvoices = useMemo(() =>
  invoices.filter(v => v.status !== 'voided'),
  [invoices]
 );

 // Displayed invoices
 const displayedInvoices = useMemo(() =>
  showVoided ? invoices : activeInvoices,
  [invoices, activeInvoices, showVoided]
 );

 // Sort by date descending
 const sortedInvoices = useMemo(() =>
  [...displayedInvoices].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  [displayedInvoices]
 );

 // Stats (active only)
 const stats = useMemo(() => {
  const totalNet = activeInvoices.reduce((sum, v) => sum + (parseFloat(v.net_amount) || 0), 0);
  const totalVat = activeInvoices.reduce((sum, v) => sum + (parseFloat(v.vat_amount) || 0), 0);
  const totalGross = activeInvoices.reduce((sum, v) => sum + (parseFloat(v.gross_amount) || 0), 0);
  return { count: activeInvoices.length, totalNet, totalVat, totalGross };
 }, [activeInvoices]);

 const { downloadZip, zipLoading } = useDownloadFinancialPDFs(projectId);
 const handleDownloadZip = () =>
  downloadZip({
   items:        sortedInvoices,
   documentType: "taxInvoice",
   getFileName:  (ti) => ti.tax_invoice_number || `TI-${ti.id}`,
   zipName:      "TaxInvoices.zip",
  });

 const printRef = useRef(null);
 const handlePrint = useReactToPrint({
  contentRef: printRef,
  documentTitle: t("tax_invoices", "Tax Invoices"),
  pageStyle: `@page { size: A4 landscape; margin: 8mm; } html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }`,
 });

 if (loading) {
  return (
   <div className="prj-tab-panel">
    <div className="prj-empty-state">{t("loading")}</div>
   </div>
  );
 }

 return (
  <div className="prj-tab-panel">
   <div className="prj-tab-header">
    <div className="prj-tab-actions">
     <Button
      variant="outline"
      size="md"
      onClick={() => setShowVoided(!showVoided)}
     >
      {showVoided ? t("hide_voided") : t("show_voided")}
     </Button>
     {sortedInvoices.length > 0 && (
      <button onClick={handlePrint} className="payments-tab__btn-outline">
       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 17V3M6 11l6 6 6-6" />
        <path d="M4 21h16" />
       </svg>
       {t("download_pdf", "Download PDF")}
      </button>
     )}
     {sortedInvoices.length > 0 && (
      <button
       onClick={handleDownloadZip}
       disabled={zipLoading}
       style={{
        padding: '6px 14px', borderRadius: '6px',
        border: zipLoading ? '1.5px solid #d1d5db' : '1.5px solid #6366f1',
        background: zipLoading ? 'transparent' : '#f5f3ff',
        color: zipLoading ? '#9ca3af' : '#4f46e5',
        fontWeight: 600, fontSize: '0.82rem',
        cursor: zipLoading ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s',
       }}
      >
       {zipLoading ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
         <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
       ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
         <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
        </svg>
       )}
       {zipLoading ? t("generating_zip", "Generating…") : t("download_ti_zip", "Download All PDFs")}
      </button>
     )}
    </div>
   </div>

   {sortedInvoices.length > 0 ? (
    <>
     {/* Summary */}
     <div className="prj-tab-section">
      <div className="prj-tab-section__title">{t("ti_tab_summary")}</div>
      <MetricGrid columns={4}>
       <MetricCard variant="blue" icon="hash" label={t("ti_tab_total_invoices")} value={stats.count} />
       <MetricCard variant="emerald" icon="dollar" label={t("ti_tab_total_net")} value={renderAmount(stats.totalNet)} />
       <MetricCard variant="amber" icon="percent" label={t("ti_tab_total_vat")} value={renderAmount(stats.totalVat)} />
       <MetricCard
        variant="emerald"
        icon="check"
        label={t("ti_tab_total_gross")}
        value={renderAmount(stats.totalGross)}
        vatBreakdown={{ net: stats.totalNet, withVat: stats.totalGross, format: renderAmount }}
       />
      </MetricGrid>
     </div>

     {/* Table */}
     <TabPrintWrapper ref={printRef} title={t("tax_invoices", "Tax Invoices")}>
     <div className="prj-table__wrapper">
      <table className="prj-table">
       <thead>
        <tr>
         <th className="ds-text-center ds-w-60">#</th>
         <th>{t("ti_tab_invoice_number")}</th>
         <th>{t("ti_tab_date")}</th>
         <th>{t("ti_tab_linked_invoice")}</th>
         <th className="ds-text-right">{t("ti_tab_net_amount")}</th>
         <th className="ds-text-center">{t("ti_tab_vat_rate")}</th>
         <th className="ds-text-right">{t("ti_tab_vat_amount")}</th>
         <th className="ds-text-right">{t("ti_tab_gross_amount")}</th>
         <th className="ds-text-center">{t("status")}</th>
        </tr>
       </thead>
       <tbody>
        {sortedInvoices.map((inv, i) => {
         const isVoided = inv.status === 'voided';

         return (
          <tr
           key={inv.id}
           className={isVoided ? "prj-table__row--voided" : "ds-cursor-pointer"}
           style={isVoided ? { opacity: 0.5 } : undefined}
           onClick={() => navigate(`/tax-invoices/${inv.id}/view?project=${projectId}`)}
          >
           <td className="ds-text-center ds-font-medium prj-table__index">{i + 1}</td>
           <td>
            <span className="prj-link" style={{ fontWeight: 600 }}>
             {inv.tax_invoice_number}
            </span>
           </td>
           <td className="prj-nowrap">{formatDate(inv.date, i18n.language)}</td>
           <td>{inv.invoice_number || '-'}</td>
           <td className="prj-nowrap ds-text-right ds-font-semibold">
            {renderAmount(inv.net_amount)}
           </td>
           <td className="ds-text-center">
            {parseFloat(inv.vat_rate) || 5}%
           </td>
           <td className="prj-nowrap ds-text-right">
            {renderAmount(inv.vat_amount)}
           </td>
           <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
            <VatAmount
             net={parseFloat(inv.net_amount) || 0}
             withVat={parseFloat(inv.gross_amount) || 0}
             format={renderAmount}
             showBtn={false}
            />
           </td>
           <td className="ds-text-center">
            {isVoided ? (
             <span className="prj-badge prj-badge--muted">{t("voided")}</span>
            ) : (
             <span className="prj-badge prj-badge--success">{t("active")}</span>
            )}
           </td>
          </tr>
         );
        })}
       </tbody>
       <tfoot>
        <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
         <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.88rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {t("total")}
         </td>
         <td className="prj-nowrap ds-text-right" style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.92rem' }}>
          {renderAmount(stats.totalNet)}
         </td>
         <td></td>
         <td className="prj-nowrap ds-text-right" style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.92rem' }}>
          {renderAmount(stats.totalVat)}
         </td>
         <td className="prj-nowrap ds-text-right" style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.92rem' }}>
          {renderAmount(stats.totalGross)}
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
         <div style={{ fontSize: '7.5pt', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("ti_tab_total_invoices")}</div>
         <div style={{ fontSize: '14pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{stats.count}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
         <div style={{ fontSize: '7.5pt', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("ti_tab_total_net")}</div>
         <div style={{ fontSize: '12pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{renderAmount(stats.totalNet)}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
         <div style={{ fontSize: '7.5pt', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("ti_tab_total_vat")}</div>
         <div style={{ fontSize: '12pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{renderAmount(stats.totalVat)}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
         <div style={{ fontSize: '7.5pt', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("ti_tab_total_gross")}</div>
         <div style={{ fontSize: '12pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{renderAmount(stats.totalGross)}</div>
        </div>
       </div>
      </div>
     </div>
     </TabPrintWrapper>
    </>
   ) : (
    <div className="prj-empty-state">{t("ti_tab_no_invoices")}</div>
   )}
  </div>
 );
});

export default TaxInvoicesTab;