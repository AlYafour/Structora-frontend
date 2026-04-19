/**
 * View Payment Claim Page - Read-only display
 * Displays all payment claim information without editing capabilities
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaEdit, FaFilePdf } from 'react-icons/fa';

// Services
import { paymentClaimApi } from '../../../../../services/paymentClaim';
import { companyApi } from '../../../../../services';
import { handleError } from '../../../../../utils/errorHandler';
import { logger } from '../../../../../utils/logger';

// Layout Components
import PageLayout from '../../../../../components/layout/PageLayout';
import Button from '../../../../../components/common/Button';
import { formatDate } from '../../../../../utils/formatters';

// Custom Hooks
import { usePaymentClaimItems } from '../hooks/usePaymentClaimItems';
import { useProjectDataLoading } from '../hooks/useProjectDataLoading';

// Sub-Components
import PaymentClaimSection from '../components/PaymentClaimSection';
import PaymentClaimGrandTotals from '../components/PaymentClaimGrandTotals';
import PaymentClaimPrintTemplate from '../../../../../components/payment-claims/PaymentClaimPrintTemplate';
import InterimPaymentInfoCard from '../components/InterimPaymentInfoCard';

// Styles
import './CreatePaymentClaimPage.css';
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

export default function ViewPaymentClaimPage() {
 const { claimId } = useParams();
 const [searchParams] = useSearchParams();
 const { t, i18n } = useTranslation();
 const navigate = useTenantNavigate();

 const projectFromQuery = searchParams.get('project');

 // Payment claim data
 const [paymentClaim, setPaymentClaim] = useState(null);
 const [company, setCompany] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

 // Claim date formatted for display
 const [claimDateFormatted, setClaimDateFormatted] = useState('');

 // Project data loading (shared hook)
 const {
 project,
 interimPaymentData,
 setInterimPaymentData,
 } = useProjectDataLoading(projectFromQuery, { dateOverride: claimDateFormatted });

 // Custom hooks for items management (read-only)
 const {
 boqItems,
 boqSections,
 loading: loadingItems,
 totals,
 loadClaimBOQItems,
 } = usePaymentClaimItems(projectFromQuery || paymentClaim?.project?.toString(), claimId);

 // Load payment claim and company data
 useEffect(() => {
 const loadPaymentClaim = async () => {
 if (!claimId || !projectFromQuery) return;

 try {
 setLoading(true);
 setError(null);

 // Load payment claim
 const claimData = await paymentClaimApi.getPaymentClaim(projectFromQuery, claimId);
 setPaymentClaim(claimData);

 // Set formatted date for the hook
 const formattedDate = claimData.claim_date
 ? new Date(claimData.claim_date).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 })
 : '';
 setClaimDateFormatted(formattedDate);

 // Update interim payment number from claim
 setInterimPaymentData(prev => ({
 ...prev,
 date: formattedDate,
 interim_payment_number: claimData.claim_number || '',
 }));

 // Load company settings for print template
 try {
   const settingsData = await companyApi.getCurrentSettings();
   setCompany({
     name: settingsData.contractor_name || settingsData.company_name || "Company Name",
     name_en: settingsData.contractor_name_en || "",
     address: settingsData.contractor_address || "",
     phone: settingsData.contractor_phone || "",
     email: settingsData.contractor_email || "",
     vat_number: settingsData.contractor_license_no || "",
     logo: settingsData.logo_url || null,
   });
 } catch (e) {
   logger.warn('Could not load company settings for print template', e);
   setCompany({ name: "Company Name", logo: null });
 }
 } catch (err) {
 const handledError = handleError(err, 'ViewPaymentClaimPage.loadPaymentClaim');
 setError(handledError.message);
 logger.error('Error loading payment claim', handledError);
 } finally {
 setLoading(false);
 }
 };

 loadPaymentClaim();
 }, [claimId, projectFromQuery]);

 // Load BOQ items when payment claim is loaded
 useEffect(() => {
 if (paymentClaim?.id && projectFromQuery) {
 loadClaimBOQItems();
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [paymentClaim?.id, projectFromQuery]);

 const handleBack = useCallback(() => {
 if (projectFromQuery) {
 navigate(`/projects/${projectFromQuery}?tab=payment-claims`);
 } else {
 navigate('/payment-claims');
 }
 }, [projectFromQuery, navigate]);

 const handleEdit = useCallback(() => {
 navigate(`/payment-claims/${claimId}/edit?project=${projectFromQuery}`);
 }, [claimId, projectFromQuery, navigate]);

 const handleExportPDF = useCallback(() => {
 window.print();
 }, []);

 const getStatusBadgeClass = (status) => {
 const statusMap = {
 draft: "prj-badge--secondary",
 submitted: "prj-badge--info",
 approved: "prj-badge--success",
 rejected: "prj-badge--danger",
 };
 return statusMap[status] || "prj-badge--secondary";
 };

 const getStatusLabel = (status) => {
 const statusMap = {
 draft: t("draft"),
 submitted: t("submitted"),
 approved: t("approved"),
 rejected: t("rejected"),
 };
 return statusMap[status] || status;
 };

 if (loading) {
 return (
 <PageLayout loading={true} loadingText={t('loading') || 'جاري التحميل...'}>
 <div></div>
 </PageLayout>
 );
 }

 if (error || !paymentClaim) {
 return (
 <PageLayout>
 <div className="create-payment-claim-page">
 <div className="error-message payment-claim-view__error">
 <p>{error || t('payment_claim_not_found') || 'طلب الدفعة غير موجود'}</p>
 <Button variant="primary" onClick={handleBack}>
 {t('back') || 'رجوع'}
 </Button>
 </div>
 </div>
 </PageLayout>
 );
 }

 return (
 <PageLayout>
 <div className="create-payment-claim-page">
 {/* Action Bar */}
 <div className="payment-claim-view-actions">
 <Button
 variant="ghost"
 onClick={handleBack}
 startIcon={<FaArrowLeft />}
 >
 {t('back') || 'رجوع'}
 </Button>
 <div className="payment-claim-view__action-buttons">
 <Button
 variant="primary"
 onClick={handleEdit}
 disabled={paymentClaim.status === 'approved'}
 startIcon={<FaEdit />}
 >
 {t('edit') || 'تعديل'}
 </Button>
 <Button
 variant="secondary"
 onClick={handleExportPDF}
 startIcon={<FaFilePdf />}
 >
 {t('export_pdf') || 'تصدير PDF'}
 </Button>
 </div>
 </div>

 {/* Header */}
 <div className="create-payment-claim-header">
 <div className="page-header-with-status">
 <h1 className="create-payment-claim-title">
 {t('view_payment_claim') || 'عرض طلب الدفعة'}
 </h1>
 <div className="payment-claim-view__status-row">
 <span className={`prj-badge ${getStatusBadgeClass(paymentClaim.status)}`}>
 {getStatusLabel(paymentClaim.status)}
 </span>
 </div>
 </div>
 </div>

 {/* Interim Payment Claim Information Card */}
 {project && (
 <InterimPaymentInfoCard
 data={interimPaymentData}
 readOnly
 t={t}
 />
 )}

 {/* Payment Claim Details Card */}
 <div className="payment-claim-form-card">
 <div className="payment-claim-form-card-header">
 {t('payment_claim_details') || 'تفاصيل طلب الدفعة'}
 </div>
 <div className="payment-claim-form-card-body">
 <div className="form-row">
 <div className="form-group">
 <label>{t('project') || 'المشروع'}</label>
 <input
 type="text"
 value={project?.name || ''}
 readOnly
 className="read-only-field"
 />
 </div>

 <div className="form-group">
 <label>{t('claim_number') || 'رقم الطلب'}</label>
 <input
 type="text"
 value={paymentClaim.claim_number || ''}
 readOnly
 className="read-only-field"
 />
 </div>

 <div className="form-group">
 <label>{t('claim_date') || 'تاريخ الطلب'}</label>
 <input
 type="text"
 value={formatDate(paymentClaim.claim_date, i18n.language)}
 readOnly
 className="read-only-field"
 />
 </div>
 </div>

 <div className="form-row">
 <div className="form-group">
 <label>{t('status') || 'الحالة'}</label>
 <input
 type="text"
 value={getStatusLabel(paymentClaim.status)}
 readOnly
 className="read-only-field"
 />
 </div>
 </div>

 <div className="form-row">
 <div className="form-group full-width">
 <label>{t('description') || 'الوصف'}</label>
 <textarea
 value={paymentClaim.description || ''}
 readOnly
 rows={3}
 className="read-only-field"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Payment Claim Items - Read Only */}
 {projectFromQuery && (
 <div className="payment-claim-form-card">
 <div className="payment-claim-form-card-header">
 {t('payment_claim_items') || 'بنود طلب الدفعة'}
 </div>
 <div className="payment-claim-form-card-body">
 {loadingItems ? (
 <div className="empty-state">
 <p>{t('loading') || 'جاري التحميل...'}</p>
 </div>
 ) : boqItems.length === 0 ? (
 <div className="empty-state">
 <p className="empty-state-title">
 {t('no_boq_items_found') || 'لم يتم العثور على بنود'}
 </p>
 </div>
 ) : (
 <>
 {/* Sections - Read Only */}
 <div className="payment-claim-sections-wrapper">
 {boqSections.map(section => (
 <PaymentClaimSection
 key={section.id}
 section={section}
 isExpanded={true}
 selectedItems={new Set()}
 draggedItemId={null}
 onToggleExpand={() => {}}
 onFieldChange={() => {}} // No-op for read-only
 onDelete={() => {}} // No-op for read-only
 onSelect={() => {}} // No-op for read-only
 onSelectAll={() => {}} // No-op for read-only
 onAddItem={() => {}} // No-op for read-only
 onSectionNameChange={() => {}} // No-op for read-only
 onReloadSection={() => {}} // No-op for read-only
 dragHandlers={null}
 readOnly={true}
 />
 ))}
 </div>

 {/* Grand Totals */}
 <PaymentClaimGrandTotals totals={totals} />
 </>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Print Template — hidden on screen, shown when printing */}
 {paymentClaim && (
   <PaymentClaimPrintTemplate
     claim={paymentClaim}
     project={project}
     company={company}
     totals={totals}
     onClose={handleBack}
     hideControls={true}
   />
 )}
 </PageLayout>
 );
}
