/**
 * Create Payment Claim Page - Optimized Version
 * Refactored for better performance with:
 * - Memoized sub-components
 * - Custom hooks for logic separation
 * - Virtualization for large lists (500+ items)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa';

// Services
import { paymentClaimApi } from '../../../../../services/paymentClaim';
import { projectApi } from '../../../../../services/projects';
import { handleError } from '../../../../../utils/errorHandler';
import { logger } from '../../../../../utils/logger';

// Layout Components
import PageLayout from '../../../../../components/layout/PageLayout';
import Button from '../../../../../components/common/Button';
import FinancialActionBar from '../../../../../components/common/FinancialActionBar';
import ProjectEntryInfo from '../../../../../components/common/ProjectEntryInfo';
import DateInput from '../../../../../components/forms/DateInput';

// Custom Hooks
import { usePaymentClaimItems } from '../hooks/usePaymentClaimItems';
import { usePaymentClaimDragDrop } from '../hooks/usePaymentClaimDragDrop';
import { useProjectDataLoading } from '../hooks/useProjectDataLoading';

// Sub-Components
import PaymentClaimSection from '../components/PaymentClaimSection';
import PaymentClaimBulkActions from '../components/PaymentClaimBulkActions';
import PaymentClaimGrandTotals from '../components/PaymentClaimGrandTotals';
import PaymentClaimFinancialSummary from '../components/PaymentClaimFinancialSummary';
import InterimPaymentInfoCard from '../components/InterimPaymentInfoCard';

// Styles
import './CreatePaymentClaimPage.css';
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

export default function CreatePaymentClaimPage() {
 const { claimId } = useParams();
 const [searchParams] = useSearchParams();
 const { t } = useTranslation();
 const navigate = useTenantNavigate();

 const isEditMode = !!claimId;
 const projectFromQuery = searchParams.get('project');

 // Form state
 const [formData, setFormData] = useState({
 project: projectFromQuery || '',
 claim_number: '',
 claim_date: new Date().toISOString().split('T')[0],
 description: '',
 status: 'draft',
 });

 // Projects list
 const [projects, setProjects] = useState([]);
 const [loadingProjects, setLoadingProjects] = useState(true);

 // Project data loading (shared hook)
 const {
 project,
 interimPaymentData,
 setInterimPaymentData,
 loadingProjectData,
 } = useProjectDataLoading(formData.project, { fetchNextNumber: true });

 // Payment claim
 const [paymentClaim, setPaymentClaim] = useState(null);

 // Financial Summary state
 const [financialSummary, setFinancialSummary] = useState({
 materials_on_site_value: null,
 materials_on_site_included: null,
 variations_claims_amount: 0,
 advance_payment_amount: null,
 advance_recovery_percent: null,
 other_deductions: 0,
 });

 // Saving state
 const [saving, setSaving] = useState(false);
 const [errorMsg, setErrorMsg] = useState('');

 // Selection state
 const [selectedItems, setSelectedItems] = useState(new Set());
 const [expandedSections, setExpandedSections] = useState(new Set());

 // Custom hooks for items management
 const {
 boqItems,
 setBoqItems,
 boqSections,
 loading: loadingItems,
 error: itemsError,
 totals,
 savingStatus,
 loadProjectBOQItems,
 loadClaimBOQItems,
 updateItemField,
 addItem,
 deleteItem,
 bulkDeleteItems,
 addSection,
 updateSectionName,
 } = usePaymentClaimItems(formData.project, paymentClaim?.id);

 // Drag and drop handlers
 const dragHandlers = usePaymentClaimDragDrop(
 formData.project,
 boqSections,
 setBoqItems,
 loadProjectBOQItems
 );

 // Load projects on mount (lightweight list for dropdown)
 useEffect(() => {
 const loadProjects = async () => {
 try {
 const data = await projectApi.getSimpleList();
 setProjects(Array.isArray(data) ? data : []);
 } catch (error) {
 handleError(error, 'CreatePaymentClaimPage.loadProjects');
 } finally {
 setLoadingProjects(false);
 }
 };
 loadProjects();
 }, []);

 // Load payment claim in edit mode
 useEffect(() => {
 if (isEditMode && claimId && formData.project) {
 const loadPaymentClaim = async () => {
 try {
 const data = await paymentClaimApi.getPaymentClaim(formData.project, claimId);
 setPaymentClaim(data);
 setFormData({
 project: data.project?.toString() || formData.project,
 claim_number: data.claim_number || '',
 claim_date: data.claim_date || new Date().toISOString().split('T')[0],
 description: data.description || '',
 status: data.status || 'draft',
 });
 } catch (error) {
 handleError(error, 'CreatePaymentClaimPage.loadPaymentClaim');
 setErrorMsg(error?.response?.data?.detail || 'Error loading payment claim');
 }
 };
 loadPaymentClaim();
 }
 }, [claimId, isEditMode, formData.project]);

 // Auto-fill claim_number when interim data loads
 useEffect(() => {
 if (!formData.claim_number && interimPaymentData.interim_payment_number) {
 setFormData(prev => ({ ...prev, claim_number: interimPaymentData.interim_payment_number }));
 }
 }, [interimPaymentData.interim_payment_number]);

 // Load BOQ items when project changes
 useEffect(() => {
 if (formData.project) {
 if (paymentClaim?.id) {
 loadClaimBOQItems();
 } else {
 loadProjectBOQItems();
 }
 }
 }, [formData.project, paymentClaim?.id, loadProjectBOQItems, loadClaimBOQItems]);

 // Expand all sections when items load
 useEffect(() => {
 if (boqSections.length > 0) {
 setExpandedSections(new Set(boqSections.map(s => s.id)));
 }
 }, [boqSections]);

 // Load Financial Summary data when payment claim is loaded
 useEffect(() => {
 if (paymentClaim) {
 setFinancialSummary({
 materials_on_site_value: paymentClaim.materials_on_site_value || null,
 materials_on_site_included: paymentClaim.materials_on_site_included !== undefined 
 ? paymentClaim.materials_on_site_included 
 : null,
 variations_claims_amount: paymentClaim.variations_claims_amount || 0,
 advance_payment_amount: paymentClaim.advance_payment_amount || null,
 advance_recovery_percent: paymentClaim.advance_recovery_percent || null,
 other_deductions: paymentClaim.other_deductions || 0,
 });
 } else {
 // Reset to defaults when creating new claim
 setFinancialSummary({
 materials_on_site_value: null,
 materials_on_site_included: null,
 variations_claims_amount: 0,
 advance_payment_amount: null,
 advance_recovery_percent: null,
 other_deductions: 0,
 });
 }
 }, [paymentClaim]);

 // Update error message from items hook
 // Note: BOQ errors are displayed in empty-state, so we only set errorMsg for other errors
 useEffect(() => {
 if (itemsError) {
 // Only set errorMsg if there are items (BOQ errors are shown in empty-state)
 if (boqItems.length > 0) {
 setErrorMsg(itemsError);
 } else {
 // Clear errorMsg when BOQ error is shown in empty-state to avoid duplication
 setErrorMsg('');
 }
 }
 }, [itemsError, boqItems.length]);

 // Memoized callbacks
 const handleFieldChange = useCallback((itemId, field, value) => {
 updateItemField(itemId, field, value);
 }, [updateItemField]);

 const handleItemDelete = useCallback(async (sectionId, itemId) => {
 if (!window.confirm(t('confirm_delete_item') || 'هل تريد حذف هذا البند؟')) {
 return;
 }

 // Ensure itemId is a string/number for comparison
 const itemIdToDelete = String(itemId);
 const success = await deleteItem(itemIdToDelete);
 if (success) {
 setSelectedItems(prev => {
 const newSet = new Set(prev);
 newSet.delete(`${sectionId}-${itemIdToDelete}`);
 return newSet;
 });
 }
 }, [deleteItem, t]);

 const handleItemSelect = useCallback((sectionId, itemId) => {
 setSelectedItems(prev => {
 const newSet = new Set(prev);
 const key = `${sectionId}-${itemId}`;
 if (newSet.has(key)) {
 newSet.delete(key);
 } else {
 newSet.add(key);
 }
 return newSet;
 });
 }, []);

 const handleSelectAllInSection = useCallback((sectionId, sectionItems) => {
 setSelectedItems(prev => {
 const newSet = new Set(prev);
 const allSelected = sectionItems.every(item =>
 prev.has(`${sectionId}-${item.boq_item_id || item.id}`)
 );

 if (allSelected) {
 sectionItems.forEach(item => {
 newSet.delete(`${sectionId}-${item.boq_item_id || item.id}`);
 });
 } else {
 sectionItems.forEach(item => {
 newSet.add(`${sectionId}-${item.boq_item_id || item.id}`);
 });
 }
 return newSet;
 });
 }, []);

 const handleBulkDelete = useCallback(async () => {
 if (selectedItems.size === 0) return;

 if (!window.confirm(
 t('confirm_delete_multiple_items', { count: selectedItems.size }) ||
 t('confirm_delete_multiple_items_fallback', { count: selectedItems.size })
 )) {
 return;
 }

 // Extract item IDs from selectedItems keys (format: "sectionId-itemId")
 const itemIds = Array.from(selectedItems)
 .map(key => {
 const parts = key.split('-');
 // Get all parts after the first one (in case itemId contains dashes)
 return parts.slice(1).join('-');
 })
 .filter(id => id); // Remove empty IDs
 
 if (itemIds.length === 0) return;
 
 const success = await bulkDeleteItems(itemIds);
 if (success) {
 setSelectedItems(new Set());
 }
 }, [selectedItems, bulkDeleteItems, t]);

 const handleSelectAll = useCallback(() => {
 const allKeys = [];
 boqSections.forEach(section => {
 section.items.forEach(item => {
 allKeys.push(`${section.id}-${item.boq_item_id || item.id}`);
 });
 });
 setSelectedItems(new Set(allKeys));
 }, [boqSections]);

 const handleDeselectAll = useCallback(() => {
 setSelectedItems(new Set());
 }, []);

 const handleToggleExpand = useCallback((sectionId) => {
 setExpandedSections(prev => {
 const newSet = new Set(prev);
 if (newSet.has(sectionId)) {
 newSet.delete(sectionId);
 } else {
 newSet.add(sectionId);
 }
 return newSet;
 });
 }, []);

 const handleAddItem = useCallback(async (sectionId) => {
 await addItem(sectionId);
 }, [addItem]);

 const handleAddSection = useCallback(async () => {
 if (!formData.project) {
 setErrorMsg(t('please_select_project') || 'يرجى اختيار المشروع أولاً');
 return;
 }

 const newSection = await addSection();
 if (newSection) {
 setExpandedSections(prev => new Set([...prev, newSection.id]));
 await loadProjectBOQItems();
 }
 }, [formData.project, addSection, loadProjectBOQItems, t]);

 const handleSectionNameChange = useCallback(async (sectionId, newName) => {
 await updateSectionName(sectionId, newName);
 }, [updateSectionName]);

 const handleReloadSection = useCallback(async (sectionId) => {
 if (!formData.project) {
 setErrorMsg(t('please_select_project') || 'يرجى اختيار المشروع أولاً');
 return;
 }
 
 try {
 // Reload all items from the database
 await loadProjectBOQItems();
 setErrorMsg('');
 } catch (error) {
 handleError(error, 'CreatePaymentClaimPage.handleReloadSection');
 setErrorMsg(error?.response?.data?.detail || t('error_restoring_items'));
 }
 }, [formData.project, loadProjectBOQItems, t]);

 const handleSave = useCallback(async () => {
 if (!formData.project) {
 setErrorMsg(t('project_required') || 'المشروع مطلوب');
 return;
 }

 // Validate required fields
 if (!formData.claim_date) {
 setErrorMsg(t('claim_date_required') || 'تاريخ الطلب مطلوب');
 return;
 }

 // Validate date format (should be YYYY-MM-DD)
 const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
 if (!dateRegex.test(formData.claim_date)) {
 setErrorMsg(t('invalid_date_format') || 'صيغة التاريخ غير صحيحة. يجب أن تكون YYYY-MM-DD');
 return;
 }

 try {
 setSaving(true);
 setErrorMsg('');

 let savedClaim;
 const claimPayload = {
 claim_number: formData.claim_number || '',
 claim_date: formData.claim_date,
 description: formData.description || '',
 status: formData.status || 'draft',
 materials_on_site_value: financialSummary.materials_on_site_value || null,
 materials_on_site_included: financialSummary.materials_on_site_included,
 variations_claims_amount: financialSummary.variations_claims_amount || 0,
 advance_payment_amount: financialSummary.advance_payment_amount || null,
 advance_recovery_percent: financialSummary.advance_recovery_percent || null,
 other_deductions: financialSummary.other_deductions || 0,
 };

 if (isEditMode && claimId) {
 savedClaim = await paymentClaimApi.updatePaymentClaim(formData.project, claimId, claimPayload);
 } else {
 savedClaim = await paymentClaimApi.createPaymentClaim(formData.project, claimPayload);
 }

 if (boqItems.length > 0 && savedClaim.id) {
 // Validate all items before saving
 const validationErrors = [];
 const itemsToUpdate = boqItems.map(item => {
 // Empty string or 0 is treated as 0 for backend
 const totalPercent = item.total_percent;
 const parsedPercent = (totalPercent === '' || totalPercent === null || totalPercent === undefined || totalPercent === 0 || totalPercent === '0' || totalPercent === '0.00' || totalPercent === '0.0')
 ? (parseInt(item.previous_percent, 10) || 0)
 : (parseInt(totalPercent, 10) || parseInt(item.previous_percent, 10) || 0);
 
 const previousPercent = parseInt(item.previous_percent || 0, 10);
 
 // Validate: cannot exceed 100%
 if (parsedPercent > 100) {
 validationErrors.push({
 item: item.description || item.item_code || 'Unknown',
 error: t('cannot_exceed_100_percent') || 'لا يمكن أن تتجاوز نسبة الإنجاز 100%'
 });
 }
 
 // Validate: cannot be less than previous_percent
 if (parsedPercent < previousPercent) {
 validationErrors.push({
 item: item.description || item.item_code || 'Unknown',
 error: t('cannot_be_less_than_previous') || `لا يمكن أن تكون النسبة أقل من ${previousPercent}%`
 });
 }
 
 return {
 boq_item_id: item.boq_item_id || item.id,
 total_percent: parsedPercent,
 };
 });
 
 // If there are validation errors, show them and stop saving
 if (validationErrors.length > 0) {
 const errorMessages = validationErrors.map(err => `${err.item}: ${err.error}`).join('\n');
 setErrorMsg(errorMessages);
 setSaving(false);
 return;
 }
 
 await paymentClaimApi.updatePercentages(formData.project, savedClaim.id, itemsToUpdate);
 }

 navigate(`/projects/${formData.project}?tab=payment-claims`);
 } catch (error) {
 const handledError = handleError(error, 'CreatePaymentClaimPage.handleSave');
 
 // Log full error details for debugging
 logger.error('Save error - Full details:', {
 error: handledError,
 originalError: error,
 response: error?.response,
 responseData: error?.response?.data,
 formData: formData,
 });
 
 // Extract more detailed error information
 let errorMessage = handledError?.message || 'Error saving payment claim';
 
 // If there's debug information, try to extract field errors
 if (handledError?.data?.debug?.data) {
 const debugData = handledError.data.debug.data;
 const fieldErrors = [];
 
 for (const [key, value] of Object.entries(debugData)) {
 if (key !== 'detail' && key !== 'non_field_errors' && key !== 'message') {
 const errorMsg = Array.isArray(value) ? value[0] : value;
 if (errorMsg) {
 const fieldLabel = {
 claim_date: t('claim_date') || 'تاريخ الطلب',
 claim_number: t('claim_number') || 'رقم الطلب',
 description: t('description') || 'الوصف',
 status: t('status') || 'الحالة',
 project: t('project') || 'المشروع',
 }[key] || key;
 fieldErrors.push(`${fieldLabel}: ${errorMsg}`);
 }
 }
 }
 
 if (fieldErrors.length > 0) {
 errorMessage = `${errorMessage}\n\n${fieldErrors.join('\n')}`;
 }
 }
 
 setErrorMsg(errorMessage);
 } finally {
 setSaving(false);
 }
 }, [formData, isEditMode, claimId, boqItems, navigate, t]);

 const handleBack = useCallback(() => {
 if (formData.project) {
 navigate(`/projects/${formData.project}?tab=payment-claims`);
 } else {
 navigate('/payment-claims');
 }
 }, [formData.project, navigate]);

 // Total items count
 const totalItemsCount = useMemo(() => {
 return boqSections.reduce((sum, section) => sum + section.items.length, 0);
 }, [boqSections]);

 const isLoading = loadingProjects || loadingItems;

 return (
 <PageLayout loading={isLoading} loadingText={t('loading')}>
 <div className="entry-form entry-form--wide">
 <FinancialActionBar
 onBack={handleBack}
 saving={saving}
 formId="create-payment-claim-form"
 >
 <ProjectEntryInfo project={project} />
 </FinancialActionBar>
 {/* Header with Save Status */}
 <div className="create-payment-claim-header">
 <div className="page-header-with-status">
 <h1 className="create-payment-claim-title">
 {isEditMode
 ? (t('edit_payment_claim') || 'تعديل طلب دفعة')
 : (t('create_payment_claim') || 'إنشاء طلب دفعة')
 }
 </h1>
 {savingStatus && (
 <div className={`saving-status saving-status--${savingStatus}`}>
 {savingStatus === 'saving' && (t('saving') || 'جاري الحفظ...')}
 {savingStatus === 'saved' && (t('saved') || 'تم الحفظ')}
 {savingStatus === 'error' && (t('save_error') || 'خطأ في الحفظ')}
 </div>
 )}
 </div>
 </div>

 <form
 id="create-payment-claim-form"
 className="create-payment-claim-form"
 onSubmit={(e) => {
 e.preventDefault();
 handleSave();
 }}
 >
 {/* Interim Payment Claim Information Card */}
 {formData.project && (
 <InterimPaymentInfoCard
 data={interimPaymentData}
 onChange={(field, value) => setInterimPaymentData(prev => ({ ...prev, [field]: value }))}
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
 <label>{t('project') || 'المشروع'} *</label>
 <select
 value={formData.project}
 onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
 disabled={isEditMode || !!projectFromQuery}
 required
 >
 <option value="">{t('select_project') || 'اختر المشروع'}</option>
 {projects.map(p => (
 <option key={p.id} value={p.id}>{p.name || `Project ${p.id}`}</option>
 ))}
 </select>
 </div>

 <div className="form-group">
 <label>{t('claim_number') || 'رقم الطلب'}</label>
 <input
 type="text"
 value={formData.claim_number}
 onChange={(e) => setFormData(prev => ({ ...prev, claim_number: e.target.value }))}
 placeholder={t('auto_generated') || 'سيتم توليده تلقائياً'}
 />
 </div>

 <div className="form-group">
 <label>{t('claim_date') || 'تاريخ الطلب'} *</label>
 <DateInput
 value={formData.claim_date}
 onChange={(date) => setFormData(prev => ({ ...prev, claim_date: date }))}
 required
 />
 </div>
 </div>

 <div className="form-row">
 <div className="form-group full-width">
 <label>{t('description') || 'الوصف'}</label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
 rows={3}
 />
 </div>
 </div>
 </div>
 </div>

 {/* Financial Summary - Before Items Table */}
 {formData.project && boqItems.length > 0 && (
 <PaymentClaimFinancialSummary
 totals={totals}
 materialsOnSiteValue={financialSummary.materials_on_site_value}
 materialsOnSiteIncluded={financialSummary.materials_on_site_included}
 variationsClaimsAmount={financialSummary.variations_claims_amount}
 advancePaymentAmount={financialSummary.advance_payment_amount}
 advanceRecoveryPercent={financialSummary.advance_recovery_percent}
 otherDeductions={financialSummary.other_deductions}
 onMaterialsValueChange={(value) => setFinancialSummary(prev => ({
 ...prev,
 materials_on_site_value: value === '' ? null : parseFloat(value) || 0,
 }))}
 onMaterialsIncludedChange={(value) => setFinancialSummary(prev => ({
 ...prev,
 materials_on_site_included: value,
 // Clear value when using included/not included flag
 materials_on_site_value: value !== null ? null : prev.materials_on_site_value,
 }))}
 onVariationsAmountChange={(value) => setFinancialSummary(prev => ({
 ...prev,
 variations_claims_amount: value === '' ? 0 : parseFloat(value) || 0,
 }))}
 onAdvancePaymentChange={(value) => setFinancialSummary(prev => ({
 ...prev,
 advance_payment_amount: value === '' ? null : parseFloat(value) || 0,
 }))}
 onAdvanceRecoveryPercentChange={(value) => setFinancialSummary(prev => ({
 ...prev,
 advance_recovery_percent: value === '' ? null : parseFloat(value) || 0,
 }))}
 onOtherDeductionsChange={(value) => setFinancialSummary(prev => ({
 ...prev,
 other_deductions: value === '' ? 0 : parseFloat(value) || 0,
 }))}
 readOnly={false}
 />
 )}

 {/* Payment Claim Items */}
 {formData.project && (
 <div className="payment-claim-form-card">
 <div className="payment-claim-form-card-header">
 {t('payment_claim_items') || 'بنود طلب الدفعة'}
 </div>
 <div className="payment-claim-form-card-body">
 {boqItems.length === 0 ? (
 <div className="empty-state">
 <p className="empty-state-title">
 {t('no_boq_items_found') || 'لم يتم العثور على بنود'}
 </p>
 <p className="empty-state-description">
 {itemsError || (t('boq_should_be_auto_copied') || 'يجب أن يتم نسخ BOQ Template تلقائياً عند إنشاء المشروع. إذا لم تكن البنود موجودة، يرجى التحقق من إعدادات المشروع.')}
 </p>
 </div>
 ) : (
 <>
 {/* Bulk Actions Bar */}
 <PaymentClaimBulkActions
 selectedCount={selectedItems.size}
 totalCount={totalItemsCount}
 onSelectAll={handleSelectAll}
 onDeselectAll={handleDeselectAll}
 onDelete={handleBulkDelete}
 />

 {/* Sections */}
 <div className="payment-claim-sections-wrapper">
 {boqSections.map(section => (
 <PaymentClaimSection
 key={section.id} 
 section={section}
 isExpanded={expandedSections.has(section.id)}
 selectedItems={selectedItems}
 draggedItemId={dragHandlers.draggedItem?.itemId}
 onToggleExpand={handleToggleExpand}
 onFieldChange={handleFieldChange}
 onDelete={handleItemDelete}
 onSelect={handleItemSelect}
 onSelectAll={handleSelectAllInSection}
 onAddItem={handleAddItem}
 onSectionNameChange={handleSectionNameChange}
 onReloadSection={handleReloadSection}
 dragHandlers={dragHandlers}
 />
 ))}

 {/* Add Section Button */}
 <div className="add-section-container">
 <Button
 type="button"
 variant="primary"
 onClick={handleAddSection}
 >
 <FaPlus className="ds-ms-2" />
 {t('add_section') || 'إضافة قسم جديد'}
 </Button>
 </div>
 </div>

 {/* Grand Totals */}
 <PaymentClaimGrandTotals totals={totals} />
 </>
 )}
 </div>
 </div>
 )}

 {/* Error Message (only show if there are items, BOQ errors are shown in empty-state) */}
 {errorMsg && boqItems.length > 0 && (
 <div className="error-message">
 {errorMsg}
 </div>
 )}
 </form>
 </div>
 </PageLayout>
 );
}
