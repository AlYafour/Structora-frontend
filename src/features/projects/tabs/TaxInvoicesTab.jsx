import { useState, useEffect, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { logger } from "../../../utils/logger";
import { formatMoney, formatDate } from "../../../utils/formatters";
import Button from "../../../components/common/Button";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import { VatAmount } from "../../../components/common/VatBreakdownPopover";
import DirhamsIcon from "../../../components/common/DirhamsIcon";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

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
     console.log("tax invoice data",data)
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
      </table>
     </div>
    </>
   ) : (
    <div className="prj-empty-state">{t("ti_tab_no_invoices")}</div>
   )}
  </div>
 );
});

export default TaxInvoicesTab;