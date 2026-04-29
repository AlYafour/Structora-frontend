/**
 * NoticeOfVariationPage Component (Refactored)
 *
 * Main page for creating and editing variation notices
 * Reduced from ~1734 lines to ~450 lines by extracting components and utilities
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateProjectQueries } from '../../../hooks/useProjectData';
import { projectApi } from '../../../../../services';
import { logger } from '../../../../../utils/logger';
import PageLayout from '../../../../../components/layout/PageLayout';
import Button from '../../../../../components/common/Button';
import FinancialActionBar from '../../../../../components/common/FinancialActionBar';
import Dialog from '../../../../../components/common/Dialog';
import { formatMoney } from '../../../../../utils/formatters';
import DirhamsIcon from '../../../../../components/common/DirhamsIcon';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNotifications } from '../../../../../contexts/NotificationContext';

// Custom hooks
import { useVariationForm } from './hooks/useVariationForm';
import { useVariationItems } from './hooks/useVariationItems';
import { useVariationCalculations } from './hooks/useVariationCalculations';

// Components
import VariationHeaderInfo from './components/VariationHeaderInfo';
import VariationItemsTable from './components/VariationItemsTable';
import FinancialSummary from './components/FinancialSummary';
import DiscountSection from './components/DiscountSection';
import RemarksAttachmentsSection from './components/RemarksAttachmentsSection';

// Utilities
import { validateVariationSubmit } from './utils/variationValidation';
import { round2 } from './utils/variationCalculations';

import { getProjectName } from '../../../utils/projectNameUtils.jsx';
import './NoticeOfVariationPage.css';
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

const computeNextVariationNumber = async (projectId) => {
  try {
    const variations = await projectApi.getVariations(projectId);
    const nums = (variations || [])
      .map(v => parseInt(v.variation_number, 10))
      .filter(n => !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  } catch {
    return 1;
  }
};

export default function NoticeOfVariationPage({ variation: variationProp, project: projectProp, viewMode: viewModeProp }) {
  const { variationId, projectId } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const queryClient = useQueryClient();
  useAuth(); // For authentication context
  const projectFromQuery = searchParams.get('project') || projectId;
  const isEmbeddedMode = !!variationProp && !!projectProp;

  // State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [variation, setVariation] = useState(null);
  const { success, error: showError } = useNotifications();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState({ id: null, isOmitted: false });
  const [variationAttachment, setVariationAttachment] = useState(null);
  const [existingVariationAttachment, setExistingVariationAttachment] = useState(null);
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(navTimerRef.current);
  }, []);

  // Custom hooks
  const { formData, setFormData, updateFormData } = useVariationForm();
  const {
    omittedItems,
    addedItems,
    expandedOmittedItems,
    expandedAddedItems,
    setOmittedItems,
    setAddedItems,
    setExpandedOmittedItems,
    setExpandedAddedItems,
    updateOmittedItem,
    updateAddedItem,
    addOmittedItem,
    addAddedItem,
    toggleOmittedItemExpand,
    toggleAddedItemExpand
  } = useVariationItems();

  // Calculate financials
  const calculations = useVariationCalculations(formData, omittedItems, addedItems);

  // Determine edit mode
  const effectiveVariation = variationProp || variation;
  const isFinalApproved =
    !!effectiveVariation?.general_manager_final_approved_by ||
    effectiveVariation?.status === 'approved' ||
    effectiveVariation?.workflow_status === 'approved';
  const isEditMode = viewModeProp !== true && !isFinalApproved;


  const { i18n } = useTranslation();
  const lang = i18n?.language === 'en' ? 'en' : 'ar';

  const renderAmount = (value) => {
    const str = formatMoney(value, { lang });
    if (lang === 'en') {
      const numPart = str.replace(/AED\s?/, '').trim();
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{numPart} <DirhamsIcon size={10} color="#374151" /></span>;
    }
    return str;
  };

  /**
   * Load variation data into form
   */
  const loadVariationData = (variationData) => {
    try {
      let noticeData = {};
      if (variationData.description) {
        try {
          noticeData = JSON.parse(variationData.description);
        } catch (_e) {
          logger.warn('Failed to parse variation description');
        }
      }

      setFormData({
        document_date: noticeData.document_date || variationData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        variation_number: variationData.variation_number ?? '',
        reference_no: noticeData.reference_no ?? '',
        first_variation_date: noticeData.first_variation_date ?? '',
        variation_description: noticeData.variation_description ?? '',
        variation_cause: noticeData.variation_cause ?? '',
        additional_time: noticeData.additional_time ?? '',
        trade_discipline: noticeData.trade_discipline ?? '',
        item_description: noticeData.item_description ?? '',
        project_description: noticeData.project_description ?? '',
        remarks: noticeData.remarks ?? '',
        vat_percentage: noticeData.vat_percentage ?? '15',
        consultant_fees_type: noticeData.consultant_fees_type ?? 'percentage',
        consultant_fees_percentage: noticeData.consultant_fees_percentage ?? '4',
        consultant_fees_amount: noticeData.consultant_fees_amount ?? '',
        consultant_fee_on_total_added: noticeData.consultant_fee_on_total_added !== undefined ? noticeData.consultant_fee_on_total_added : false,
        contractor_ohp_type: noticeData.contractor_ohp_type ?? 'percentage',
        contractor_ohp_percentage: noticeData.contractor_ohp_percentage ?? '15',
        contractor_ohp_amount: noticeData.contractor_ohp_amount ?? '',
        discount_type: noticeData.discount_type ?? 'none',
        discount_percentage: noticeData.discount_percentage_input ?? '',
        discount_amount: noticeData.discount_amount_input ?? '',
        final_amount_after_discount: noticeData.final_amount_after_discount ?? '',
        discount_applies_to_variation: noticeData.discount_applies_to_variation !== undefined ? noticeData.discount_applies_to_variation : true,
        discount_applies_to_contractor_ohp: noticeData.discount_applies_to_contractor_ohp !== undefined ? noticeData.discount_applies_to_contractor_ohp : true,
        discount_applies_to_consultant_fees: noticeData.discount_applies_to_consultant_fees !== undefined ? noticeData.discount_applies_to_consultant_fees : true
      });

      if (noticeData.omitted_items?.length > 0) {
        const items = noticeData.omitted_items.map(item => ({
          ...item,
          description: item.description || '',
          remarks: item.remarks || '',
          includesOverheadProfit: item.includesOverheadProfit ?? false
        }));
        setOmittedItems(items);
        const itemsWithRemarks = items.filter(item => item.remarks && item.remarks.trim());
        if (itemsWithRemarks.length > 0) {
          setExpandedOmittedItems(new Set(itemsWithRemarks.map(item => item.id)));
        }
      }

      if (noticeData.added_items?.length > 0) {
        const items = noticeData.added_items.map(item => ({
          ...item,
          description: item.description || '',
          remarks: item.remarks || ''
        }));
        setAddedItems(items);
        const itemsWithRemarks = items.filter(item => item.remarks && item.remarks.trim());
        if (itemsWithRemarks.length > 0) {
          setExpandedAddedItems(new Set(itemsWithRemarks.map(item => item.id)));
        }
      }
    } catch (_e) {
      logger.error('Error loading variation data');
    }
  };

  /**
   * Load project
   */
  const loadProject = async (projectId) => {
    try {
      setLoading(true);
      const data = await projectApi.getWithIncludes(projectId, ['siteplan', 'contract']);
      setProject(data);
      return data;
    } catch (e) {
      logger.error('Error loading project', e);
      showError(t('load_error'));
      throw e;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load variation — single API call to find by ID
   */
  const loadVariation = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Find variation directly by ID (1 call instead of looping all projects)
      const result = await projectApi.findVariationById(variationId);
      const foundVariation = result?.variation;
      const foundProjectId = result?.project_id;

      if (!foundVariation || !foundProjectId) {
        setLoadError("variation_not_found");
        return;
      }

      setVariation(foundVariation);
      await loadProject(foundProjectId);

      if (foundVariation?.variation_invoice_file) {
        setExistingVariationAttachment(foundVariation.variation_invoice_file);
      }

      loadVariationData(foundVariation);
    } catch (e) {
      logger.error('Error loading variation', e);
      setLoadError("load_error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initial data load
   */
  useEffect(() => {
    if (isEmbeddedMode) {
      setProject(projectProp);
      if (variationProp) {
        setVariation(variationProp);
        loadVariationData(variationProp);
        if (variationProp.variation_invoice_file) {
          setExistingVariationAttachment(variationProp.variation_invoice_file);
        }
      } else {
        computeNextVariationNumber(projectProp.id).then(nextNum => {
          const padded = String(nextNum).padStart(4, '0');
          updateFormData({
            variation_number: padded,
            reference_no: `VAR${padded}`
          });
        });
      }
      setLoading(false);
      return;
    }

    if (variationId) {
      loadVariation();
    } else if (projectFromQuery) {
      loadProject(projectFromQuery)
        .then(async projectData => {
          const contractDescription = projectData?.contract_data?.project_description || '';
          const nextNum = await computeNextVariationNumber(projectFromQuery);
          const padded = String(nextNum).padStart(4, '0');
          const updates = {
            variation_number: padded,
            reference_no: `VAR${padded}`
          };
          if (contractDescription) {
            updates.project_description = contractDescription;
            updates.variation_description = contractDescription;
          }
          updateFormData(updates);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFromQuery, variationId, isEmbeddedMode, variationProp, projectProp]);

  /**
   * Handle item removal
   */
  const removeOmittedItem = id => {
    setItemToRemove({ id, isOmitted: true });
    setConfirmDialogOpen(true);
  };

  const removeAddedItem = id => {
    setItemToRemove({ id, isOmitted: false });
    setConfirmDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (itemToRemove.isOmitted) {
      setOmittedItems(omittedItems.filter(item => item.id !== itemToRemove.id));
    } else {
      setAddedItems(addedItems.filter(item => item.id !== itemToRemove.id));
    }
    setConfirmDialogOpen(false);
    setItemToRemove({ id: null, isOmitted: false });
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!project) {
      showError(t('project_required'));
      return;
    }

    // Validation
    const validationError = validateVariationSubmit(
      formData,
      calculations,
      omittedItems,
      addedItems,
      t,
      formatMoney
    );
    if (validationError) {
      showError(validationError);
      return;
    }

    setSaving(true);
    try {
      const noticeData = {
        document_date: formData.document_date,
        reference_no: formData.reference_no || '',
        first_variation_date: formData.first_variation_date,
        variation_description: formData.variation_description,
        variation_cause: formData.variation_cause,
        additional_time: formData.additional_time,
        trade_discipline: formData.trade_discipline,
        item_description: formData.item_description,
        project_description: formData.project_description,
        remarks: formData.remarks,
        omitted_items: omittedItems,
        added_items: addedItems,
        total_omitted: calculations.totalOmitted,
        total_added: calculations.totalAdded,
        total_variation_amount: calculations.totalVariationAmount,
        contractor_engineering_oh_p: calculations.contractorOHP,
        consultant_fees: calculations.consultantFees,
        vat_percentage: formData.vat_percentage,
        total_amount_before_discount: calculations.totalAmountBeforeDiscount,
        discount_amount: calculations.discountAmount,
        discount_percentage: calculations.discountPercentage,
        total_amount: calculations.totalAmount,
        discount_on_variation: calculations.discountOnVariation,
        discount_on_contractor_ohp: calculations.discountOnContractorOHP,
        discount_on_consultant_fees: calculations.discountOnConsultantFees,
        variation_amount_after_discount: calculations.variationAmountAfterDiscount,
        contractor_ohp_after_discount: calculations.contractorOHPAfterDiscount,
        consultant_fees_after_discount: calculations.consultantFeesAfterDiscount,
        consultant_fees_type: formData.consultant_fees_type,
        consultant_fees_percentage: formData.consultant_fees_percentage,
        consultant_fees_amount: formData.consultant_fees_amount,
        consultant_fee_on_total_added: formData.consultant_fee_on_total_added,
        contractor_ohp_type: formData.contractor_ohp_type,
        contractor_ohp_percentage: formData.contractor_ohp_percentage,
        contractor_ohp_amount: formData.contractor_ohp_amount,
        discount_type: formData.discount_type,
        discount_percentage_input: formData.discount_percentage,
        discount_amount_input: formData.discount_amount,
        final_amount_after_discount: formData.final_amount_after_discount,
        discount_applies_to_variation: formData.discount_applies_to_variation,
        discount_applies_to_contractor_ohp: formData.discount_applies_to_contractor_ohp,
        discount_applies_to_consultant_fees: formData.discount_applies_to_consultant_fees
      };

      const MAX_VALUE = 999999999999.99;
      const cappedVariationAmount = Math.min(Math.abs(calculations.totalVariationAmount), MAX_VALUE);
      const roundedVariationAmount = parseFloat(cappedVariationAmount.toFixed(2));
      const finalVariationAmount = calculations.totalVariationAmount < 0 ? -roundedVariationAmount : roundedVariationAmount;

      const consultantFeesValue = calculations.consultantFees;
      const consultantFeesPercentage = formData.consultant_fees_type === 'percentage' ? parseFloat(formData.consultant_fees_percentage || 4) : 0;
      const contractorEngineeringOHPValue = calculations.contractorOHP;
      const netAmountValue = round2(calculations.totalAmount);
      const vatValue = (netAmountValue * parseFloat(formData.vat_percentage || 15)) / 100;
      const netAmountWithVatValue = netAmountValue + vatValue;

      const variationData = {
        project: project.id,
        // Empty on create so backend atomically assigns the next available number (avoids concurrent-submit conflicts)
        variation_number: variationId ? (formData.variation_number || '') : '',
        description: JSON.stringify(noticeData),
        amount: finalVariationAmount.toString(),
        final_amount: finalVariationAmount.toString(),
        consultant_fees_percentage: consultantFeesPercentage.toString(),
        consultant_fees: consultantFeesValue.toFixed(2),
        contractor_engineer_fees: contractorEngineeringOHPValue.toFixed(2),
        total_amount: netAmountValue.toFixed(2),
        discount: calculations.discountAmount.toFixed(2),
        net_amount: netAmountValue.toFixed(2),
        vat: vatValue.toFixed(2),
        net_amount_with_vat: netAmountWithVatValue.toFixed(2)
      };

      const hasNewFile = variationAttachment instanceof File;

      if (hasNewFile) {
        // Only use FormData when there's a new file to upload
        const formDataToSend = new FormData();
        // Sanitize: JSON.stringify converts NaN→null (backend accepts), but FormData converts NaN→"NaN" (backend rejects DecimalField)
        const safeVal = (v) => {
          const s = String(v ?? '0');
          return (s === 'NaN' || s === 'Infinity' || s === '-Infinity') ? '0' : s;
        };
        Object.keys(variationData).forEach(key => formDataToSend.append(key, safeVal(variationData[key])));
        formDataToSend.append('variation_invoice_file', variationAttachment);

        if (variationId) {
          await projectApi.updateVariation(project.id, variationId, formDataToSend);
        } else {
          const data = await projectApi.createVariation(project.id, formDataToSend);
          if (data.variation_number) {
            const generatedReferenceNo = `VAR${data.variation_number}`;
            const updatedNoticeData = { ...noticeData, reference_no: generatedReferenceNo };
            const updateFD = new FormData();
            updateFD.append('description', JSON.stringify(updatedNoticeData));
            updateFD.append('variation_invoice_file', variationAttachment);
            await projectApi.updateVariation(project.id, data.id, updateFD);
          }
        }
      } else {
        // No new file — send JSON (existing file stays untouched on server)
        if (variationId) {
          await projectApi.updateVariation(project.id, variationId, variationData);
        } else {
          const data = await projectApi.createVariation(project.id, variationData);
          if (data?.variation_number) {
            const generatedReferenceNo = `VAR${data.variation_number}`;
            const updatedNoticeData = { ...noticeData, reference_no: generatedReferenceNo };
            await projectApi.updateVariation(project.id, data.id, { description: JSON.stringify(updatedNoticeData) });
          }
        }
      }

      success(t('notice_variation_saved'));
      invalidateProjectQueries(queryClient, project.id);
      navTimerRef.current = setTimeout(() => navigate(`/projects/${project.id}?tab=variations`), 1000);
    } catch (e) {
      // handleError() wraps the Axios error — check both shapes
      const errData = e?.data ?? e?.response?.data ?? e?.originalError?.response?.data;
      let msg = t('save_error');
      if (errData) {
        if (typeof errData === 'string') {
          msg = errData;
        } else if (errData.detail) {
          msg = errData.detail;
        } else if (errData.message) {
          msg = errData.message;
        } else if (errData.error) {
          msg = errData.error;
        } else {
          const fieldErrors = Object.entries(errData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
            .join(' | ');
          if (fieldErrors) msg = fieldErrors;
        }
      } else if (e?.message) {
        msg = e.message;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Get project location
   */
  const getProjectLocation = () => {
    if (!project) return '';
    const siteplan = project.siteplan || project.siteplan_data;
    if (!siteplan) return '';
    const parts = [];
    if (siteplan.municipality) parts.push(siteplan.municipality);
    if (siteplan.zone) parts.push(siteplan.zone);
    if (siteplan.sector) parts.push(siteplan.sector);
    if (siteplan.land_no) parts.push(siteplan.land_no);
    return parts.join(' - ');
  };

  /**
   * Get project number
   */
  const getProjectNumber = () => {
    if (!project) return '';
    return project.contract_data?.tender_no || project.awarding_data?.project_number || project.siteplan?.project_no || project.internal_code || `PRJ-${project.id}`;
  };

  const getProjectTitle = () => {
    if (!project) return '';
    const nameData = getProjectName(project);
    if (!nameData) return '';
    const ar = nameData.ar || nameData.full || '';
    const en = nameData.en || '';
    return lang === 'en' ? (en || ar) : (ar || en);
  };

  const getProjectSubtitle = () => {
    if (!project) return '';
    const nameData = getProjectName(project);
    if (!nameData) return '';
    const ar = nameData.ar || nameData.full || '';
    const en = nameData.en || '';
    if (!ar || !en || ar === en) return '';
    return lang === 'en' ? ar : en;
  };

  /**
   * Render error state
   */
  if (!isEmbeddedMode && !loading && loadError) {
    return (
      <PageLayout>
        <div className="prj-error-state">
          <div className="prj-error-state__icon">⚠️</div>
          <h2 className="prj-error-state__title">
            {loadError === "variation_not_found" ? t("variation_not_found") : t("load_error")}
          </h2>
          <p className="prj-error-state__desc">
            {t("error_description")}
          </p>
          <div className="prj-error-state__actions">
            <Button variant="primary" onClick={() => loadVariation()}>
              {t("error_try_again")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("/projects")}>
              {t("error_go_to_projects")}
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  /**
   * Render blocked content for final approved variations
   */
  if (!isEmbeddedMode && !loading && isFinalApproved && viewModeProp !== true) {
    const message = t('cannot_edit_final_approved_variation');

    const blockedContent = (
      <div className="nvc-page">
        <div className="nvc-section">
          <div className="nvc-section-header">
            <h3>{t('variation_order')}</h3>
          </div>
          <div className="nvc-alert nvc-alert--warning">
            <p className="ds-mb-2">{message}</p>
            <Button
              variant="secondary"
              onClick={() => navigate(project ? `/projects/${project.id}?tab=variations` : '/projects')}
            >
              {t('back_to_project')}
            </Button>
          </div>
        </div>
      </div>
    );

    if (isEmbeddedMode) {
      return blockedContent;
    }

    return (
      <PageLayout loading={loading} loadingText={t('loading')}>
        {blockedContent}
      </PageLayout>
    );
  }

  /**
   * Main content
   */
  const content = (
    <div className="nvc-page">
      {/* Action Bar - Standalone mode */}
      {!isEmbeddedMode && (
        <FinancialActionBar
          onBack={() => navigate(project ? `/projects/${project.id}?tab=variations` : '/variations')}
          onSave={undefined}
          saving={saving}
          formId="notice-variation-form"
          title={getProjectTitle()}
          subtitle={getProjectSubtitle()}
        >
          <div className="nvc-actionbar-info">
            <div className="nvc-actionbar-item">
              <span className="nvc-actionbar-label">{t('variation_no')}</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.variation_number ?? ''}
                  onChange={e => updateFormData({ variation_number: e.target.value })}
                  className="nvc-actionbar-input"
                  placeholder="0001"
                />
              ) : (
                <span className="nvc-actionbar-value">
                  {variation?.variation_number || formData.variation_number || '—'}
                </span>
              )}
            </div>

            <div className="nvc-actionbar-item">
              <span className="nvc-actionbar-label">{t('total_amount')}</span>
              <span className="nvc-actionbar-value nvc-actionbar-value--lg">
                {renderAmount(calculations.totalAmount)}
              </span>
            </div>
          </div>
        </FinancialActionBar>
      )}

      {/* Embedded Save Button */}
      {/* {isEmbeddedMode && isEditMode && (
        <div className="nvc-embedded-save-bar no-print">
          <Button type="submit" form="notice-variation-form" variant="primary" disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      )} */}

      {/* Main Document */}
      <form id="notice-variation-form" onSubmit={handleSubmit}>
        <div className="nvc-document">
          {/* Header Info */}
          <VariationHeaderInfo
            formData={formData}
            isEditMode={isEditMode}
            onFormDataChange={setFormData}
            getProjectNumber={getProjectNumber}
            getProjectLocation={getProjectLocation}
            t={t}
          />

          {/* Unified Items Table (omitted + added with toggle) */}
          <VariationItemsTable
            omittedItems={omittedItems}
            expandedOmittedItems={expandedOmittedItems}
            onUpdateOmittedItem={updateOmittedItem}
            onRemoveOmittedItem={removeOmittedItem}
            onAddOmittedItem={addOmittedItem}
            onToggleOmittedExpand={toggleOmittedItemExpand}
            addedItems={addedItems}
            expandedAddedItems={expandedAddedItems}
            onUpdateAddedItem={updateAddedItem}
            onRemoveAddedItem={removeAddedItem}
            onAddAddedItem={addAddedItem}
            onToggleAddedExpand={toggleAddedItemExpand}
            isEditMode={isEditMode}
            t={t}
          />

          {/* Financial Summary */}
          <FinancialSummary
            totalOmitted={calculations.totalOmitted}
            totalAdded={calculations.totalAdded}
            totalVariationAmount={calculations.totalVariationAmount}
            contractorEngineeringOHP={calculations.contractorOHP}
            consultantFees={calculations.consultantFees}
            totalAmountBeforeDiscount={calculations.totalAmountBeforeDiscount}
            discountAmount={calculations.discountAmount}
            discountPercentage={calculations.discountPercentage}
            totalAmount={calculations.totalAmount}
            variationAmountAfterDiscount={calculations.variationAmountAfterDiscount}
            contractorOHPAfterDiscount={calculations.contractorOHPAfterDiscount}
            consultantFeesAfterDiscount={calculations.consultantFeesAfterDiscount}
            formData={formData}
            isEditMode={isEditMode}
            onFormDataChange={setFormData}
            t={t}
          />

          {/* Discount Input Section (Edit Mode Only) */}
          {isEditMode && (
            <div className="nvc-combined-left nvc-combined-left--tight">
              <DiscountSection
                formData={formData}
                onFormDataChange={setFormData}
                discountAppliesToVariation={calculations.discountAppliesToVariation}
                discountAppliesToContractorOHP={calculations.discountAppliesToContractorOHP}
                discountAppliesToConsultantFees={calculations.discountAppliesToConsultantFees}
                hasSelectedComponents={calculations.hasSelectedComponents}
                t={t}
              />
            </div>
          )}

          {/* Remarks & Attachments */}
          <RemarksAttachmentsSection
            formData={formData}
            isEditMode={isEditMode}
            onFormDataChange={setFormData}
            variationAttachment={variationAttachment}
            setVariationAttachment={setVariationAttachment}
            existingVariationAttachment={existingVariationAttachment}
            setExistingVariationAttachment={setExistingVariationAttachment}
            project={project}
            variationId={variationId}
            variation={variation}
            t={t}
          />
        </div>
      </form>

      {/* Confirm Remove Item Dialog */}
      <Dialog
        open={confirmDialogOpen}
        title={t('confirm_remove_item')}
        desc={t('confirm_remove_item')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onClose={() => {
          setConfirmDialogOpen(false);
          setItemToRemove({ id: null, isOmitted: false });
        }}
        onConfirm={handleConfirmRemove}
        danger
      />
    </div>
  );

  if (isEmbeddedMode) return content;

  return (
    <PageLayout loading={loading} loadingText={t('loading')}>
      {content}
    </PageLayout>
  );
}
