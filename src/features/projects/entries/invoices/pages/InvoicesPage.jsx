import { useMemo, useState, useCallback } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import PageLayout from "../../../../../components/layout/PageLayout";
import PageHeader from "../../../../../components/layout/PageHeader";
import Button from "../../../../../components/common/Button";
import ActionMenu from "../../../../../components/common/ActionMenu";
import Dialog from "../../../../../components/common/Dialog";
import UnifiedSelect from "../../../../../components/common/Select";
import DateInput from "../../../../../components/forms/DateInput";
import { formatMoney, formatDate } from "../../../../../utils/formatters";
import { useInvoices } from "../hooks/useInvoices";
import { useLanguage } from "../../../../../hooks";
import { getProjectName } from "../../../utils/projectHelpers";
import { useNotifications } from "../../../../../contexts/NotificationContext";
import "./InvoicesPage.css";
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

export default function InvoicesPage() {
 const { t } = useTranslation();
 const { isArabic: isAR } = useLanguage();
 const navigate = useTenantNavigate();
 const { success, error: showError } = useNotifications();

 // ✅ React Query hook for invoices data (replaces manual state management)
 const {
 invoices: allInvoices,
 isLoading: loading,
 deleteInvoice,
 bulkDelete,
 isDeleting,
 isBulkDeleting,
 } = useInvoices();

 // Single delete
 const [confirmOpen, setConfirmOpen] = useState(false);
 const [targetInvoice, setTargetInvoice] = useState(null);

 // Multi-select + bulk delete
 const [selectedIds, setSelectedIds] = useState(new Set());
 const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
 

 // ===== Organized filters =====
 const [filters, setFilters] = useState({
 q: "",
 project: "",
 date_from: "",
 date_to: "",
 });


 // Extract unique projects from invoices for filter dropdown
 const projects = useMemo(() => {
 const projectsMap = new Map();
 allInvoices.forEach(inv => {
 if (inv.__project && !projectsMap.has(inv.__project.id)) {
 projectsMap.set(inv.__project.id, inv.__project);
 }
 });
 return Array.from(projectsMap.values());
 }, [allInvoices]);

 // Filtered invoices - Ensure only invoices, no payments
 const filteredInvoices = useMemo(() => {
 // First, filter out any items that might be payments
 let filtered = allInvoices.filter(inv => {
 // Must have invoice_number or invoice_date to be considered an invoice
 if (!inv.invoice_number && !inv.invoice_date) return false;
 // Exclude items that look like payments
 if (inv.payment_date && !inv.invoice_date) return false;
 if (inv.payer && !inv.invoice_number && !inv.invoice_date) return false;
 // Exclude invoices that are already linked to payments
 if (inv.payment_id || inv.payment) return false;
 // Must be an actual invoice
 return true;
 });
 
 if (filters.q) {
 const q = filters.q.toLowerCase();
 filtered = filtered.filter(inv => 
 (inv.invoice_number || '').toLowerCase().includes(q) ||
 (inv.description || '').toLowerCase().includes(q) ||
 (inv.__project?.display_name || inv.__project?.name || '').toLowerCase().includes(q)
 );
 }
 
 if (filters.project) {
 filtered = filtered.filter(inv => inv.project?.toString() === filters.project || inv.__project?.id?.toString() === filters.project);
 }
 
 if (filters.date_from) {
 filtered = filtered.filter(inv => {
 if (!inv.invoice_date) return false;
 return new Date(inv.invoice_date) >= new Date(filters.date_from);
 });
 }
 
 if (filters.date_to) {
 filtered = filtered.filter(inv => {
 if (!inv.invoice_date) return false;
 const invDate = new Date(inv.invoice_date);
 const toDate = new Date(filters.date_to);
 toDate.setHours(23, 59, 59, 999);
 return invDate <= toDate;
 });
 }
 
 return filtered.sort((a, b) => {
 const dateA = new Date(a.invoice_date || a.created_at || 0);
 const dateB = new Date(b.invoice_date || b.created_at || 0);
 return dateB - dateA;
 });
 }, [allInvoices, filters]);

 // Memoized handlers to prevent re-creating functions on every render
 const toggleSelect = useCallback((id) => {
 setSelectedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 }, []);

 // ✅ Check if all filtered invoices are selected
 const isAllSelected = filteredInvoices.length > 0 &&
 filteredInvoices.every(inv => selectedIds.has(inv.id));

 const toggleSelectAll = useCallback(() => {
 setSelectedIds(() => {
 if (isAllSelected) return new Set();
 return new Set(filteredInvoices.map(inv => inv.id));
 });
 }, [isAllSelected, filteredInvoices]);

 const askDelete = useCallback((inv) => {
 const title = inv.invoice_number || `#${inv.id}`;
 setTargetInvoice({ id: inv.id, name: title, project: inv.project || inv.__project?.id });
 setConfirmOpen(true);
 }, []);

 const handleDelete = () => {
 if (!targetInvoice?.id) return;
 const { id, project } = targetInvoice;

 deleteInvoice(
 { invoiceId: id, projectId: project },
 {
 onSuccess: () => {
 setSelectedIds((prev) => {
 const n = new Set(prev);
 n.delete(id);
 return n;
 });
 success(t("delete_success"));
 setConfirmOpen(false);
 setTargetInvoice(null);
 },
 onError: (error) => {
 showError(error?.message || t("delete_error"));
 },
 }
 );
 };

 const askBulkDelete = () => {
 if (selectedIds.size === 0) return;
 setBulkConfirmOpen(true);
 };

 const handleBulkDelete = () => {
 if (selectedIds.size === 0) return;
 const ids = Array.from(selectedIds);

 // Map selected ids to invoice objects with projectId
 const invoicesToDelete = ids.map(id => {
 const invoice = allInvoices.find(inv => inv.id === id);
 return {
 invoiceId: id,
 projectId: invoice?.project || invoice?.__project?.id
 };
 }).filter(inv => inv.projectId); // Filter out any without projectId

 bulkDelete(invoicesToDelete, {
 onSuccess: (result) => {
 const { succeeded, failed } = result;
 setSelectedIds(new Set());
 setBulkConfirmOpen(false);

 if (failed === 0) {
 success(t("bulk_delete_success")?.replace("{{count}}", succeeded) || t("bulk_delete_success", { count: succeeded }));
 } else if (succeeded === 0) {
 showError(t("bulk_delete_error"));
 } else {
 showError(t("bulk_delete_partial")?.replace("{{ok}}", succeeded).replace("{{fail}}", failed) || t("bulk_delete_partial", { ok: succeeded, fail: failed }));
 }
 },
 onError: () => {
 showError(t("bulk_delete_error"));
 },
 });
 };

 const selectedCount = selectedIds.size;

 const clearFilters = () =>
 setFilters({
 q: "",
 project: "",
 date_from: "",
 date_to: "",
 });

 const openAddInvoiceDialog = () => {
 navigate("/invoices/create");
 };

 const handlePrint = (invoice) => {
 navigate(`/invoices/${invoice.id}/view`);
 };

 return (
 <PageLayout loading={loading} loadingText={t("loading")}>
 <div className="list-page">
 <PageHeader
  onBack={() => navigate(-1)}
  title={t("invoices_title")}
  subtitle={t("invoices_subtitle")}
  actions={
   <Button onClick={openAddInvoiceDialog} variant="primary">
    {t("add_invoice")}
   </Button>
  }
 />

 {/* Filters bar */}
 <div className="prj-filters">
 <div className="prj-filters__grid">
 <input
 type="text"
 className="prj-input"
 placeholder={t("search_invoices")}
 value={filters.q}
 onChange={(e) => setFilters({ ...filters, q: e.target.value })}
 />
 
 <UnifiedSelect
 options={projects}
 value={filters.project}
 onChange={(val) => setFilters({ ...filters, project: val })}
 placeholder={t("all_projects")}
 getOptionLabel={(opt) => {
   const owners = Array.isArray(opt.owners) ? opt.owners : [];
   const name = getProjectName({ ...opt, __owners_data: owners }, t);
   return name.ar || name.full || opt.display_name || opt.name || `${t("project")} #${opt.id}`;
 }}
 getOptionValue={(opt) => opt.id?.toString()}
 isClearable
 />
 
 <DateInput
 className="prj-input"
 placeholder={t("date_from")}
 value={filters.date_from}
 onChange={(value) => setFilters({ ...filters, date_from: value })}
 />
 
 <DateInput
 className="prj-input"
 placeholder={t("date_to")}
 value={filters.date_to}
 onChange={(value) => setFilters({ ...filters, date_to: value })}
 />
 </div>

 <div className="prj-filters__actions">
 <Button variant="ghost" onClick={clearFilters}>
 {t("clear_filters")}
 </Button>
 </div>
 </div>

 {/* Actions bar when items are selected */}
 {selectedCount > 0 && (
 <div className="prj-bulkbar">
 <div className="prj-bulkbar__info">
 {t("selected")} <strong>{selectedCount}</strong>
 </div>
 <div className="prj-bulkbar__actions">
 <Button variant="danger" onClick={askBulkDelete} disabled={isBulkDeleting}>
 {t("delete_selected")}
 </Button>
 <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
 {t("clear_selection")}
 </Button>
 </div>
 </div>
 )}

 {filteredInvoices.length === 0 ? (
 <div className="prj-alert">
 <div className="prj-alert__title">
 {t("no_invoices_match")}
 </div>
 </div>
 ) : (
 <div className="prj-table__wrapper">
 <table className="prj-table">
 <thead>
 <tr>
 <th className="ds-w-50 ds-text-center">
 <input 
 type="checkbox" 
 aria-label={t("select_all")} 
 checked={isAllSelected} 
 onChange={toggleSelectAll} 
 />
 </th>
 <th>#</th>
 <th>{t("invoice_number")}</th>
 <th>{t("project_name")}</th>
 <th className="text-right">{t("amount")}</th>
 <th>{t("invoice_date")}</th>
 <th>{t("linked_payment")}</th>
 <th className="ds-w-60 ds-text-center">{t("action")}</th>
 </tr>
 </thead>
 <tbody>
 {filteredInvoices.map((invoice, i) => {
 const checked = selectedIds.has(invoice.id);

 return (
 <tr key={invoice.id}>
 <td className="text-center">
 <input
 type="checkbox"
 checked={checked}
 onChange={() => toggleSelect(invoice.id)}
 onClick={(e) => e.stopPropagation()}
 />
 </td>
 <td className="prj-muted">{i + 1}</td>
 <td>
 <strong>{invoice.invoice_number || `#${invoice.id}`}</strong>
 </td>
 <td>
 {(() => {
   const proj = invoice.__project;
   if (!proj) return `${t("project")} #${invoice.project}`;
   // Build a minimal project-shaped object that getProjectName understands
   const owners = Array.isArray(proj.owners) ? proj.owners : [];
   const projForName = {
     ...proj,
     __owners_data: owners,
   };
   const name = getProjectName(projForName, t);
   return name.ar || name.full || proj.display_name || proj.name || `${t("project")} #${proj.id}`;
 })()}
 </td>
 <td className="text-right prj-nowrap prj-info-value--money">
 <strong>{formatMoney(invoice.amount)}</strong>
 </td>
 <td className="prj-nowrap">{formatDate(invoice.invoice_date)}</td>
 <td>
 {invoice.payment_id || invoice.payment ? (
 <Link to={`/payments/${invoice.payment_id || invoice.payment}/view`} className="prj-link">
 {t("view_payment")}
 </Link>
 ) : (
 <span className="prj-muted">{t("no_payment")}</span>
 )}
 </td>
 <td className="col-actions">
 <ActionMenu items={[
 { label: t("view"), type: "button", onClick: () => handlePrint(invoice) },
 { label: t("edit"), type: "button", onClick: () => navigate(`/invoices/${invoice.id}/edit`) },
 { label: t("delete"), type: "button", variant: "danger", onClick: () => askDelete(invoice), disabled: isDeleting },
 ]} />
 </td>
 </tr>
 );
 })}
 </tbody>
 <tfoot>
 <tr>
 <td colSpan={8} className="prj-foot prj-muted">
 {t("total")}: {filteredInvoices.length} / {allInvoices.length} {t("invoices_count")}
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 )}

 {/* Delete Confirm Dialog */}
 <Dialog
 open={confirmOpen}
 title={t("confirm_delete")}
 desc={
 <>
 {t("confirm_delete_invoice")} <strong className="ds-mx-1">{targetInvoice?.name}</strong>?<br/>
 {t("delete_cannot_undo")}
 </>
 }
 confirmLabel={isDeleting ? t("deleting") : t("delete")}
 cancelLabel={t("cancel")}
 onClose={() => !isDeleting && setConfirmOpen(false)}
 onConfirm={handleDelete}
 danger
 busy={isDeleting}
 />

 {/* Bulk Delete Confirm Dialog */}
 <Dialog
 open={bulkConfirmOpen}
 title={t("bulk_delete")}
 desc={
 <>
 {t("bulk_delete_desc")} <strong>{selectedCount}</strong> {t("invoices_count")}. {t("bulk_delete_continue")}
 </>
 }
 confirmLabel={isBulkDeleting ? t("deleting") : t("delete_selected")}
 cancelLabel={t("cancel")}
 onClose={() => !isBulkDeleting && setBulkConfirmOpen(false)}
 onConfirm={handleBulkDelete}
 danger
 busy={isBulkDeleting}
 />
 </div>
 </PageLayout>
 );
}
