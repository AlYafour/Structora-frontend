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
         <th className="ds-text-center">{t("ti_tab_quarter", "Quarter")}</th>
         <th className="ds-text-center">{t("ti_tab_payer", "Payer")}</th>
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
           <td className="ds-text-center">
            {inv.quarter ? `Q${inv.quarter} ${inv.year}` : '-'}
           </td>
           <td className="ds-text-center">
            {inv.payer_display ? (
             <span className={`prj-badge ${inv.payer === 'bank' ? 'prj-badge--info' : 'prj-badge--purple'}`}>
              {inv.payer_display}
             </span>
            ) : '-'}
           </td>
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
         <td colSpan={6} style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.88rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
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
     <div className="tpw-print-only" style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', border: '1.5px solid #d8c9b3', borderRadius: '12px', overflow: 'hidden', minHeight: '130px' }}>
       {/* Left — dark panel */}
       <div style={{ flex: '0 0 42%', background: '#17202f', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '7pt', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
         {t("ti_tab_total_gross")}
        </div>
        <div>
         <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px' }}>
          <span style={{ fontSize: '26pt', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
           {parseFloat(stats.totalGross || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: '12pt', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>AED</span>
         </div>
         <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '2px 9px', fontSize: '6.5pt', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
           {t("including_vat")}
          </span>
          <span style={{ fontSize: '7.5pt', color: 'rgba(255,255,255,0.4)' }}>
           {stats.count} {t("ti_tab_total_invoices", "invoices").toLowerCase()}
          </span>
         </div>
        </div>
       </div>
       {/* Right — light panel */}
       <div style={{ flex: 1, background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
         <span style={{ fontSize: '8pt', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {t("tax_invoices", "Tax Invoices")}
         </span>
         <span style={{ fontSize: '24pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>
          {stats.count}
         </span>
        </div>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
         {[
          { dot: '#10b981', label: t("ti_tab_total_net"), value: renderAmount(stats.totalNet), sub: null },
          { dot: '#f59e0b', label: t("ti_tab_total_vat"), value: renderAmount(stats.totalVat), sub: null },
          { dot: '#6366f1', label: t("ti_tab_total_gross"), value: renderAmount(stats.totalGross), sub: null },
         ].map(({ dot, label, value, sub }) => (
          <div key={label}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '6.5pt', fontWeight: 700, color: dot, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
            {label}
           </div>
           <div style={{ fontSize: '11pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>{value}</div>
           {sub && <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '3px' }}>{sub}</div>}
          </div>
         ))}
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