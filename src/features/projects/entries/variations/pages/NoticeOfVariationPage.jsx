/**
 * NoticeOfVariationPage Component (Refactored)
 *
 * Main page for creating and editing variation notices
 * Reduced from ~1734 lines to ~450 lines by extracting components and utilities
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateProjectQueries } from '../../../hooks/useProjectData';
import { projectApi } from '../../../../../services';
import { api } from '../../../../../services/api';
import { logger } from '../../../../../utils/logger';
import PageLayout from '../../../../../components/layout/PageLayout';
import Button from '../../../../../components/common/Button';
import FinancialActionBar from '../../../../../components/common/FinancialActionBar';
import Dialog from '../../../../../components/common/Dialog';
import { formatMoney } from '../../../../../utils/formatters';
import DirhamsIcon from '../../../../../components/common/DirhamsIcon';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNotifications } from '../../../../../contexts/NotificationContext';
import useCompanySettings from '../../../../../hooks/useCompanySettings';

// Custom hooks
import { useVariationForm } from './hooks/useVariationForm';
import { useVariationItems } from './hooks/useVariationItems';
import { useVariationCalculations } from './hooks/useVariationCalculations';

// Components
import VariationHeaderInfo from './components/VariationHeaderInfo';
import VariationIndexSection from './components/VariationIndexSection';
import VariationItemsTable from './components/VariationItemsTable';
import FinancialSummary from './components/FinancialSummary';
import DiscountSection from './components/DiscountSection';
import RemarksAttachmentsSection from './components/RemarksAttachmentsSection';
import VariationPrintDocument from '../components/VariationPrintDocument';

// Utilities
import { validateVariationSubmit } from './utils/variationValidation';
import { round2 } from './utils/variationCalculations';
import { applyPrintPagePartBreaks, applyPrintTablePagination, pinPrintBottomGroup, forceElementToPageStart } from '../utils/printPagination';
import {
  DEFAULT_INDEX_DISCREPANCY_NOTE_AR,
  DEFAULT_INDEX_DISCREPANCY_NOTE_EN,
} from '../utils/discrepancyNoteDefaults';
import { getOrderedAttachmentSections, getAttachmentDisplayOrder, relinkAttachmentsToIndexItems } from '../utils/attachmentOrder';
import { isDraftOwnedByUser } from '../utils/variationStatusHelpers';

import { getProjectName } from '../../../utils/projectNameUtils.jsx';
import './NoticeOfVariationPage.css';
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

const PRINT_A4_WIDTH_PX = 794;
const PRINT_A4_HEIGHT_PX = Math.round(PRINT_A4_WIDTH_PX * Math.SQRT2);

const waitForRenderFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const hasArabic = (text = '') => /[\u0600-\u06FF]/.test(String(text));

const normalizeIndexItems = (indexItems = []) => (
  Array.isArray(indexItems)
    ? indexItems
        .map(item => ({
          serial_no: String(item?.serial_no ?? '').trim(),
          attachment: String(item?.attachment ?? item?.content ?? item?.content_type ?? '').trim(),
          ref_no: String(item?.ref_no ?? item?.quotation_reference_number ?? item?.drawing_reference ?? '').trim(),
          date: String(item?.date ?? '').trim(),
          page_numbers: String(item?.page_numbers ?? '').trim(),
          purpose: String(item?.purpose ?? item?.remark ?? item?.supplier_name ?? '').trim(),
          linked_attachment_id: item?.linked_attachment_id ?? null,
          page_count: item?.page_count ?? null,
        }))
        .filter(item =>
          item.serial_no ||
          item.attachment ||
          item.ref_no ||
          item.date ||
          item.page_numbers ||
          item.purpose
        )
    : []
);

const buildNoticeData = (formData, omittedItems, addedItems, calculations, { includeIndex = true } = {}) => {
  const customFeesForSave = (formData.custom_fees ?? []).map(fee => ({
    ...fee,
    percentage: fee.type === 'percentage' ? fee.percentage : '',
    amount: fee.type === 'amount' ? fee.amount : '',
  }));

  return {
    document_date: formData.document_date,
    reference_no: formData.reference_no || '',
    first_variation_date: formData.first_variation_date,
    variation_description: formData.variation_description,
    variation_description_ar: formData.variation_description_ar,
    variation_cause: formData.variation_cause,
    additional_time: formData.additional_time,
    trade_discipline: formData.trade_discipline,
    item_description: formData.item_description,
    project_description: formData.project_description,
    index_items: includeIndex ? normalizeIndexItems(formData.index_items) : [],
    index_discrepancy_note: formData.index_discrepancy_note ?? DEFAULT_INDEX_DISCREPANCY_NOTE_EN,
    index_discrepancy_note_ar: formData.index_discrepancy_note_ar ?? DEFAULT_INDEX_DISCREPANCY_NOTE_AR,
    attachment_section_order: Array.isArray(formData.attachment_section_order) ? formData.attachment_section_order : [],
    remarks: formData.remarks,
    remarks_ar: formData.remarks_ar,
    hidden_consultant_fee_description: formData.hidden_consultant_fee_description,
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
    consultant_fees_percentage: formData.consultant_fees_type === 'percentage' ? formData.consultant_fees_percentage : '',
    consultant_fees_amount: formData.consultant_fees_type === 'amount' ? formData.consultant_fees_amount : '',
    consultant_fee_on_total_added: formData.consultant_fee_on_total_added,
    contractor_ohp_type: formData.contractor_ohp_type,
    contractor_ohp_percentage: formData.contractor_ohp_type === 'percentage' ? formData.contractor_ohp_percentage : '',
    contractor_ohp_amount: formData.contractor_ohp_type === 'amount' ? formData.contractor_ohp_amount : '',
    discount_type: formData.discount_type,
    discount_percentage_input: formData.discount_percentage,
    discount_amount_input: formData.discount_amount,
    final_amount_after_discount: formData.final_amount_after_discount,
    discount_applies_to_variation: formData.discount_applies_to_variation,
    discount_applies_to_contractor_ohp: formData.discount_applies_to_contractor_ohp,
    discount_applies_to_consultant_fees: formData.discount_applies_to_consultant_fees,
    custom_fees: customFeesForSave,
  };
};

const translateItemDescription = async (item) => {
  const description = String(item?.description ?? '').trim();
  if (!description || item?.description_ar || hasArabic(description)) return item;

  try {
    const { data } = await api.post('translate/', {
      text: description,
      source: 'en',
      target: 'ar',
    });
    return data?.translated ? { ...item, description_ar: data.translated } : item;
  } catch {
    return item;
  }
};

const ensureItemDescriptionTranslations = async (items = []) => (
  Promise.all(items.map(translateItemDescription))
);

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

const formatVariationSaveError = (errData, fallback) => {
  if (!errData) return fallback;
  if (typeof errData === 'string') return errData;

  const nonFieldErrors = errData.non_field_errors
    ? (Array.isArray(errData.non_field_errors) ? errData.non_field_errors : [errData.non_field_errors])
    : [];

  const duplicateVariationNumber = nonFieldErrors.some(errorText =>
    String(errorText || '').toLowerCase().includes('project, variation_number')
  );

  if (duplicateVariationNumber) {
    return 'This variation number is already used in this project. Please choose another number.';
  }

  if (errData.detail) return errData.detail;
  if (errData.message) return errData.message;
  if (errData.error) return errData.error;
  if (nonFieldErrors.length > 0) return nonFieldErrors.join(' | ');

  const fieldErrors = Object.entries(errData)
    .map(([key, value]) => {
      const message = Array.isArray(value) ? value[0] : value;
      if (!message) return null;
      if (key === 'variation_number') return `Variation number: ${message}`;
      return `${key}: ${message}`;
    })
    .filter(Boolean)
    .join(' | ');

  return fieldErrors || fallback;
};

export default function NoticeOfVariationPage({ variation: variationProp, project: projectProp, viewMode: viewModeProp, allowRevisionEdit = false }) {
  const { variationId, projectId } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const queryClient = useQueryClient();
  const { user, hasPermission, isAdmin } = useAuth();
  const projectFromQuery = searchParams.get('project') || projectId;
  const isEmbeddedMode = !!variationProp && !!projectProp;
  const [project, setProject] = useState(null);
  const contractData = project?.contract_data || project?.contract || {};
  const contractIncludesOwnerConsultant = (
    contractData.owner_includes_consultant === true
    || contractData.owner_includes_consultant === 'yes'
  );
  const contractIncludesBankConsultant = (
    contractData.bank_includes_consultant === true
    || contractData.bank_includes_consultant === 'yes'
  );
  const sumContractConsultantPercentage = (prefix) => {
    const includes = prefix === 'owner'
      ? contractIncludesOwnerConsultant
      : contractIncludesBankConsultant;
    if (!includes) return 0;
    const design = parseFloat(contractData[`${prefix}_fee_design_percent`] || 0) || 0;
    const supervision = parseFloat(contractData[`${prefix}_fee_supervision_percent`] || 0) || 0;
    const extra = contractData[`${prefix}_fee_extra_mode`] === 'percent'
      ? (parseFloat(contractData[`${prefix}_fee_extra_value`] || 0) || 0)
      : 0;
    return design + supervision + extra;
  };
  // Variation orders belong to the owner's share; fall back to the bank rate
  // only when the contract has no owner consultant-fee percentage.
  const contractConsultantFeePercentage = (
    sumContractConsultantPercentage('owner')
    || sumContractConsultantPercentage('bank')
  );

  // State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [variation, setVariation] = useState(null);
  const { success, error: showError } = useNotifications();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState({ id: null, isOmitted: false });
  const [variationAttachment, setVariationAttachment] = useState(null);
  const [existingVariationAttachment, setExistingVariationAttachment] = useState(null);
  const [existingVariationAttachmentName, setExistingVariationAttachmentName] = useState(null);
  const [variationFileCleared, setVariationFileCleared] = useState(false);
  const [variationAttachments, setVariationAttachments] = useState([]);
  const [hiddenFeeAttachment, setHiddenFeeAttachment] = useState(null);
  const [existingHiddenFeeAttachment, setExistingHiddenFeeAttachment] = useState(null);
  const [existingHiddenFeeAttachmentName, setExistingHiddenFeeAttachmentName] = useState(null);
  const [hiddenFeeAttachmentCleared, setHiddenFeeAttachmentCleared] = useState(false);
  const [estimatedNoticePages, setEstimatedNoticePages] = useState(1);
  const noticePageMeasureRef = useRef(null);
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

  // Company-wide General Remarks — needed here so the off-screen page-count
  // measurement below reflects the forced General Remarks page too.
  const { data: companySettingsForPrint } = useCompanySettings();
  const generalRemarksEn = companySettingsForPrint?.general_remarks_en || '';
  const generalRemarksAr = companySettingsForPrint?.general_remarks_ar || '';

  // Calculate financials
  const calculations = useVariationCalculations(formData, omittedItems, addedItems);
  const liveNoticeData = useMemo(
    () => buildNoticeData(formData, omittedItems, addedItems, calculations, { includeIndex: true }),
    [formData, omittedItems, addedItems, calculations]
  );

  // Determine edit mode
  const effectiveVariation = variationProp || variation;
  const hasPostApprovalDiscount = parseFloat(effectiveVariation?.post_approval_discount || 0) > 0;
  const persistedTotal = parseFloat(effectiveVariation?.total_amount || 0);
  const persistedDiscount = parseFloat(effectiveVariation?.discount || 0);
  const persistedBeforeDiscount = persistedTotal + persistedDiscount;
  const persistedDiscountPercentage = persistedBeforeDiscount > 0
    ? (persistedDiscount / persistedBeforeDiscount) * 100
    : 0;
  const isFinalApproved =
    !!effectiveVariation?.general_manager_final_approved_by ||
    effectiveVariation?.status === 'approved' ||
    effectiveVariation?.workflow_status === 'approved';
  const isStaffUser = !user?.is_superuser &&
    user?.role?.name !== 'Manager' &&
    user?.role?.name !== 'Supervisor' &&
    user?.role?.name !== 'company_super_admin';
  const canManageReturnedVariation = !!(
    user?.is_superuser ||
    user?.role?.name === 'Manager' ||
    user?.role?.name === 'Supervisor' ||
    user?.role?.name === 'company_super_admin'
  );
  const canManageHiddenFees = !!(
    user?.is_superuser ||
    user?.role?.name === 'Manager' ||
    user?.role?.name === 'Supervisor' ||
    user?.role?.name === 'company_super_admin'
  );
  const isCompanyGeneralManager = !!(user?.is_superuser || user?.role?.name === 'company_super_admin');
  const isPMInitialApproved = effectiveVariation?.status === 'pending_gm_initial' || effectiveVariation?.status === 'pending_supervisor';
  const draftWorkflowStatuses = ['draft', 'returned_for_edit', 'rejected_by_owner_consultant'];
  const canEditVariationContent = isAdmin ||
    isCompanyGeneralManager ||
    hasPermission("variations.create") ||
    allowRevisionEdit ||
    (effectiveVariation?.status === 'returned_for_edit' && canManageReturnedVariation);
  // A draft belongs to its creator — no role (including PM/admin) may edit
  // someone else's draft directly; non-draft statuses are unaffected. A draft
  // with no recorded creator (creator account deleted) has no one to
  // restrict to, so it falls back to the normal permission check.
  const isOwnDraft = effectiveVariation?.status !== 'draft' ||
    !effectiveVariation?.created_by ||
    isDraftOwnedByUser(effectiveVariation, user);
  const isEditMode = viewModeProp !== true &&
    (!isFinalApproved || isCompanyGeneralManager) &&
    canEditVariationContent &&
    isOwnDraft &&
    (!(isStaffUser && isPMInitialApproved) || allowRevisionEdit);


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

  useEffect(() => {
    let cancelled = false;

    const measureNoticePages = async () => {
      const el = noticePageMeasureRef.current;
      if (!el || !project) {
        if (!cancelled) setEstimatedNoticePages(1);
        return;
      }

      let cleanupForcedGeneralRemarks = null;
      let cleanupTablePagination = null;
      let cleanupPageBreaks = null;
      let cleanupPinnedBottom = null;

      try {
        el.classList.add('vpd-print-mode');
        el.style.width = `${PRINT_A4_WIDTH_PX}px`;

        await waitForRenderFrame();

        cleanupTablePagination = applyPrintTablePagination(el, PRINT_A4_HEIGHT_PX);
        await waitForRenderFrame();

        cleanupPageBreaks = applyPrintPagePartBreaks(el, PRINT_A4_HEIGHT_PX);
        await waitForRenderFrame();

        cleanupPinnedBottom = pinPrintBottomGroup(el, {
          pageHeight: PRINT_A4_HEIGHT_PX,
          continuationPageHeight: PRINT_A4_HEIGHT_PX,
        });
        await waitForRenderFrame();

        // Measure the normal notice first, then append General Remarks as its
        // own final sheet so attachment page numbering matches the PDF.
        cleanupForcedGeneralRemarks = forceElementToPageStart(el, '[data-vpd-general-remarks-page]', 1, PRINT_A4_HEIGHT_PX);
        await waitForRenderFrame();

        const height = Math.max(el.scrollHeight || 0, el.getBoundingClientRect().height || 0);
        const pages = Math.max(1, Math.ceil(height / PRINT_A4_HEIGHT_PX));
        if (!cancelled) setEstimatedNoticePages(pages);
      } finally {
        cleanupForcedGeneralRemarks?.();
        cleanupPinnedBottom?.();
        cleanupPageBreaks?.();
        cleanupTablePagination?.();
        el.classList.remove('vpd-print-mode');
        el.style.width = '';
      }
    };

    measureNoticePages();

    return () => {
      cancelled = true;
    };
  }, [liveNoticeData, project, generalRemarksEn, generalRemarksAr]);

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

      const consultantFeesType = noticeData.consultant_fees_type ?? 'percentage';
      const contractorOHPType = noticeData.contractor_ohp_type ?? 'percentage';
      const hiddenFeeVatMode = parseFloat(variationData.hidden_consultant_fee_vat_rate || 0) === 0
        ? 'no_vat'
        : variationData.hidden_consultant_fee_vat_included
          ? 'included'
          : 'excluded';
      const customFeesForForm = (noticeData.custom_fees ?? []).map(fee => ({
        ...fee,
        description: fee.description ?? '',
        percentage: fee.type === 'percentage' ? fee.percentage : '',
        amount: fee.type === 'amount' ? fee.amount : '',
      }));
      const hasSavedContractorFee = contractorOHPType === 'percentage'
        ? parseFloat(noticeData.contractor_ohp_percentage || 0) > 0
        : parseFloat(noticeData.contractor_ohp_amount || 0) > 0;
      const hasSavedConsultantFee = consultantFeesType === 'percentage'
        ? parseFloat(noticeData.consultant_fees_percentage || 0) > 0
        : parseFloat(noticeData.consultant_fees_amount || 0) > 0;

      // The attachment<->Index-row link (`linked_attachment_id`) uses a
      // client-generated id that only survives a reload via the backend's
      // `client_ref` field; attachments saved before that field existed fall
      // back to a positional repair here — see relinkAttachmentsToIndexItems.
      const { attachments: relinkedAttachments, indexItems: relinkedIndexItems } = relinkAttachmentsToIndexItems(
        variationData.variation_attachments,
        Array.isArray(noticeData.index_items) ? noticeData.index_items : []
      );

      setFormData({
        document_date: noticeData.document_date || variationData.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        variation_number: variationData.variation_number ?? '',
        reference_no: variationData.reference_number || noticeData.reference_no || '',
        first_variation_date: noticeData.first_variation_date ?? '',
        variation_description: noticeData.variation_description ?? '',
        variation_description_ar: noticeData.variation_description_ar ?? '',
        variation_cause: Array.isArray(noticeData.variation_cause)
          ? noticeData.variation_cause
          : (noticeData.variation_cause ? [noticeData.variation_cause] : []),
        additional_time: noticeData.additional_time ?? '',
        trade_discipline: Array.isArray(noticeData.trade_discipline)
          ? noticeData.trade_discipline
          : (noticeData.trade_discipline ? [noticeData.trade_discipline] : []),
        item_description: noticeData.item_description ?? '',
        project_description: noticeData.project_description ?? '',
        index_items: relinkedIndexItems,
        index_discrepancy_note: noticeData.index_discrepancy_note ?? DEFAULT_INDEX_DISCREPANCY_NOTE_EN,
        index_discrepancy_note_ar: noticeData.index_discrepancy_note_ar ?? DEFAULT_INDEX_DISCREPANCY_NOTE_AR,
        attachment_section_order: Array.isArray(noticeData.attachment_section_order) ? noticeData.attachment_section_order : [],
        remarks: noticeData.remarks ?? '',
        remarks_ar: noticeData.remarks_ar ?? '',
        vat_percentage: noticeData.vat_percentage ?? '15',
        includes_contractor_ohp: hasSavedContractorFee ? 'yes' : 'no',
        consultant_fees_type: consultantFeesType,
        consultant_fees_percentage: consultantFeesType === 'percentage' ? (noticeData.consultant_fees_percentage ?? '') : '',
        consultant_fees_amount: consultantFeesType === 'amount' ? (noticeData.consultant_fees_amount ?? '') : '',
        consultant_fee_on_total_added: noticeData.consultant_fee_on_total_added !== undefined ? noticeData.consultant_fee_on_total_added : false,
        includes_consultant_fees: hasSavedConsultantFee ? 'yes' : 'no',
        contractor_ohp_type: contractorOHPType,
        contractor_ohp_percentage: contractorOHPType === 'percentage' ? (noticeData.contractor_ohp_percentage ?? '') : '',
        contractor_ohp_amount: contractorOHPType === 'amount' ? (noticeData.contractor_ohp_amount ?? '') : '',
        discount_type: noticeData.discount_type ?? 'none',
        discount_percentage: noticeData.discount_percentage_input ?? '',
        discount_amount: noticeData.discount_amount_input ?? '',
        final_amount_after_discount: noticeData.final_amount_after_discount ?? '',
        discount_applies_to_variation: noticeData.discount_applies_to_variation !== undefined ? noticeData.discount_applies_to_variation : true,
        discount_applies_to_contractor_ohp: noticeData.discount_applies_to_contractor_ohp !== undefined ? noticeData.discount_applies_to_contractor_ohp : true,
        discount_applies_to_consultant_fees: noticeData.discount_applies_to_consultant_fees !== undefined ? noticeData.discount_applies_to_consultant_fees : true,
        hidden_consultant_fee: variationData.hidden_consultant_fee ?? '',
        hidden_consultant_fee_description: noticeData.hidden_consultant_fee_description ?? '',
        hidden_consultant_fee_vat_mode: hiddenFeeVatMode,
        hidden_consultant_fee_vat_included: !!variationData.hidden_consultant_fee_vat_included,
        hidden_consultant_fee_vat_rate: variationData.hidden_consultant_fee_vat_rate ?? '5',
        hidden_consultant_fee_net_amount: variationData.hidden_consultant_fee_net_amount ?? 0,
        hidden_consultant_fee_vat_amount: variationData.hidden_consultant_fee_vat_amount ?? 0,
        hidden_consultant_fee_gross_amount: variationData.hidden_consultant_fee_gross_amount ?? 0,
        includes_custom_fees: customFeesForForm.length > 0 ? 'yes' : 'no',
        custom_fees: customFeesForForm
      });

      if (relinkedAttachments.length) {
        setVariationAttachments(relinkedAttachments.map(a => ({
          id: a.id, url: a.file, file: a.file, file_name: a.file_name, name: a.file_name, newFile: null,
          section: a.section ?? '', heading: a.heading ?? '', localId: a.localId,
        })));
      }

      if (noticeData.omitted_items?.length > 0) {
        const items = noticeData.omitted_items.map(item => ({
          ...item,
          description: item.description || '',
          description_ar: item.description_ar || '',
          remarks: item.remarks || '',
          remarks_ar: item.remarks_ar || '',
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
          description_ar: item.description_ar || '',
          remarks: item.remarks || '',
          remarks_ar: item.remarks_ar || '',
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
  const loadProject = async (projectId, { manageLoading = true } = {}) => {
    try {
      if (manageLoading) setLoading(true);
      const data = await projectApi.getWithIncludes(projectId, ['siteplan', 'contract']);
      setProject(data);
      return data;
    } catch (e) {
      logger.error('Error loading project', e);
      showError(t('load_error'));
      throw e;
    } finally {
      if (manageLoading) setLoading(false);
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
      await loadProject(foundProjectId, { manageLoading: false });

      if (foundVariation?.variation_invoice_file) {
        setExistingVariationAttachment(foundVariation.variation_invoice_file);
        setExistingVariationAttachmentName(foundVariation.variation_invoice_file_name || null);
      }
      if (foundVariation?.hidden_consultant_fee_attachment) {
        setExistingHiddenFeeAttachment(foundVariation.hidden_consultant_fee_attachment);
        setExistingHiddenFeeAttachmentName(foundVariation.hidden_consultant_fee_attachment_name || null);
      }
      // loadVariationData hydrates variationAttachments too — it needs
      // index_items and variation_attachments together to repair the
      // attachment<->Index-row link (see relinkAttachmentsToIndexItems).
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
          setExistingVariationAttachmentName(variationProp.variation_invoice_file_name || null);
        }
        if (variationProp.hidden_consultant_fee_attachment) {
          setExistingHiddenFeeAttachment(variationProp.hidden_consultant_fee_attachment);
          setExistingHiddenFeeAttachmentName(variationProp.hidden_consultant_fee_attachment_name || null);
        }
        // loadVariationData (above) hydrates variationAttachments too — see
        // relinkAttachmentsToIndexItems.
      } else {
        computeNextVariationNumber(projectProp.id).then(nextNum => {
          const padded = String(nextNum).padStart(4, '0');
          updateFormData({
            variation_number: padded,
            reference_no: ''
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
            reference_no: ''
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
   * @param {Event} e
   * @param {boolean} isDraft - when true, skips validation and saves as draft
   */
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    if (!isEditMode) {
      showError(t('access_denied'));
      return;
    }

    if (!project) {
      showError(t('project_required'));
      return;
    }

    // Skip validation when saving as draft
    if (!isDraft) {
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
    }

    setSaving(true);
    try {
      const [translatedOmittedItems, translatedAddedItems] = await Promise.all([
        ensureItemDescriptionTranslations(omittedItems),
        ensureItemDescriptionTranslations(addedItems),
      ]);
      setOmittedItems(translatedOmittedItems);
      setAddedItems(translatedAddedItems);

      const noticeData = buildNoticeData(formData, translatedOmittedItems, translatedAddedItems, calculations);

      const MAX_VALUE = 999999999999.99;
      const cappedVariationAmount = Math.min(Math.abs(calculations.totalVariationAmount), MAX_VALUE);
      const roundedVariationAmount = parseFloat(cappedVariationAmount.toFixed(2));
      const finalVariationAmount = calculations.totalVariationAmount < 0 ? -roundedVariationAmount : roundedVariationAmount;

      const consultantFeesValue = calculations.consultantFees;
      const consultantFeesPercentage = formData.consultant_fees_type === 'percentage'
        ? (parseFloat(formData.consultant_fees_percentage || 0) || 0)
        : 0;
      const contractorEngineeringOHPValue = calculations.contractorOHP;
      const netAmountValue = round2(calculations.totalAmount);
      const vatValue = (netAmountValue * parseFloat(formData.vat_percentage || 15)) / 100;
      const netAmountWithVatValue = netAmountValue + vatValue;
      const hiddenConsultantFeeValue = Math.max(0, parseFloat(formData.hidden_consultant_fee || 0) || 0);
      const hiddenConsultantFeeVatRate = formData.hidden_consultant_fee_vat_mode === 'no_vat'
        ? 0
        : Math.max(0, parseFloat(formData.hidden_consultant_fee_vat_rate || 5) || 0);

      const variationData = {
        project: project.id,
        // Empty on create so backend atomically assigns the next available number (avoids concurrent-submit conflicts)
        // variation_number: variationId ? (formData.variation_number || '') : '',
        variation_number: formData.variation_number || '',
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
        net_amount_with_vat: netAmountWithVatValue.toFixed(2),
        ...(canManageHiddenFees ? {
          hidden_consultant_fee: hiddenConsultantFeeValue.toFixed(2),
          hidden_consultant_fee_vat_included: formData.hidden_consultant_fee_vat_mode === 'included',
          hidden_consultant_fee_vat_rate: hiddenConsultantFeeVatRate.toFixed(2)
        } : {})
      };

      const saveData = { ...variationData };
      if (isDraft) saveData.save_as_draft = 'true';
      const originalVariationNumber = String(effectiveVariation?.variation_number ?? '');
      const submittedVariationNumber = String(saveData.variation_number ?? '');
      if (variationId) {
        delete saveData.project;
        if (submittedVariationNumber === originalVariationNumber) {
          delete saveData.variation_number;
        }
      }

      const hasNewFile = variationAttachment instanceof File;
      const hasNewHiddenFeeAttachment = hiddenFeeAttachment instanceof File;
      const newAttachmentFiles = variationAttachments.filter(a => a.newFile instanceof File);
      const replacementAttachmentFiles = variationAttachments.filter(a => a.id && a.replacementFile instanceof File);
      const currentSavedIds = variationAttachments.filter(a => a.id).map(a => a.id);
      // Section/heading for already-saved attachments — sent on every edit-save so
      // edits to an existing attachment's grouping/label persist even without a new file.
      const attachmentsMeta = JSON.stringify(
        variationAttachments
          .filter(a => a.id)
          .map(a => ({ id: a.id, section: a.section || '', heading: a.heading || '' }))
      );
      // Final on-screen order (section-box drag order, then in-box drag order)
      // as backend-resolvable tokens — "id:<id>" for a kept attachment, or
      // "new:<i>" matching its index among newAttachmentFiles below — so a
      // drag-and-drop reorder actually persists to VariationAttachment.order.
      const orderedSections = getOrderedAttachmentSections(formData.attachment_section_order);
      const newFileIndexByLocalId = new Map(newAttachmentFiles.map((a, i) => [a.localId, i]));
      const attachmentsOrder = JSON.stringify(
        getAttachmentDisplayOrder(variationAttachments, orderedSections).map(a => (
          a.id ? `id:${a.id}` : `new:${newFileIndexByLocalId.get(a.localId)}`
        ))
      );
      const needsFormData = hasNewFile || hasNewHiddenFeeAttachment || hiddenFeeAttachmentCleared || newAttachmentFiles.length > 0 || replacementAttachmentFiles.length > 0;

      const safeVal = (v) => {
        const s = String(v ?? '0');
        return (s === 'NaN' || s === 'Infinity' || s === '-Infinity') ? '0' : s;
      };

      const buildFormData = (base) => {
        const fd = new FormData();
        Object.keys(base).forEach(key => fd.append(key, safeVal(base[key])));
        if (variationAttachment instanceof File) fd.append('variation_invoice_file', variationAttachment);
        if (hiddenFeeAttachment instanceof File) fd.append('hidden_consultant_fee_attachment', hiddenFeeAttachment);
        if (variationFileCleared) fd.append('clear_variation_invoice_file', 'true');
        if (hiddenFeeAttachmentCleared) fd.append('clear_hidden_consultant_fee_attachment', 'true');
        // Upload new attachment files (only once — never re-call buildFormData for these)
        newAttachmentFiles.forEach((a, i) => {
          fd.append(`variation_attachments[${i}]`, a.newFile);
          fd.append(`variation_attachments_section[${i}]`, a.section || '');
          fd.append(`variation_attachments_heading[${i}]`, a.heading || '');
          fd.append(`variation_attachments_client_ref[${i}]`, a.localId || '');
        });
        replacementAttachmentFiles.forEach((a) => {
          fd.append(`variation_attachments_replace[${a.id}]`, a.replacementFile);
        });
        // Tell backend which saved IDs to keep; it will delete the rest
        fd.append('keep_attachment_ids', currentSavedIds.join(','));
        // Section/heading edits on already-saved attachments
        fd.append('variation_attachments_meta', attachmentsMeta);
        // Final drag-and-drop order (section-box order + in-box order)
        fd.append('variation_attachments_order', attachmentsOrder);
        return fd;
      };

      if (needsFormData) {
        const formDataToSend = buildFormData(saveData);

        if (variationId) {
          await projectApi.updateVariation(project.id, variationId, formDataToSend);
        } else {
          const data = await projectApi.createVariation(project.id, formDataToSend);
          if (data.variation_number) {
            // Second call: only update description (no files — already saved above)
            const generatedReferenceNo = data.reference_number;
            const updatedNoticeData = { ...noticeData, reference_no: generatedReferenceNo };
            await projectApi.updateVariation(project.id, data.id, { description: JSON.stringify(updatedNoticeData) });
          }
        }
      } else {
        // No new files — send JSON; still need to tell backend which IDs to keep for deletions
        if (variationId) {
          const fd = new FormData();
          Object.keys(saveData).forEach(key => fd.append(key, safeVal(saveData[key])));
          fd.append('keep_attachment_ids', currentSavedIds.join(','));
          fd.append('variation_attachments_meta', attachmentsMeta);
          fd.append('variation_attachments_order', attachmentsOrder);
          if (variationFileCleared) fd.append('clear_variation_invoice_file', 'true');
          if (hiddenFeeAttachmentCleared) fd.append('clear_hidden_consultant_fee_attachment', 'true');
          await projectApi.updateVariation(project.id, variationId, fd);
        } else {
          const data = await projectApi.createVariation(project.id, saveData);
          if (data?.variation_number) {
            const generatedReferenceNo = data.reference_number;
            const updatedNoticeData = { ...noticeData, reference_no: generatedReferenceNo };
            await projectApi.updateVariation(project.id, data.id, { description: JSON.stringify(updatedNoticeData) });
          }
        }
      }

      // If saving (not draft) an existing draft variation, submit it into the approval workflow
      if (!isDraft && variationId && ['draft', 'returned_for_edit'].includes(effectiveVariation?.status)) {
        await projectApi.submitVariationDraft(project.id, variationId);
      }

      success(isDraft ? t('draft_saved', 'Draft saved successfully') : t('notice_variation_saved'));
      invalidateProjectQueries(queryClient, project.id);
      navTimerRef.current = setTimeout(() => navigate(`/projects/${project.id}?tab=variations`), 1000);
    } catch (e) {
      // handleError() wraps the Axios error — check both shapes
      const errData = e?.data ?? e?.response?.data ?? e?.originalError?.response?.data;
      let msg = formatVariationSaveError(errData, t('save_error'));
      if (!errData && e?.message) msg = e.message;
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
    return project.contract_data?.tender_no || project.awarding_data?.project_number || project.siteplan?.project_no || project.siteplan_data?.project_no || project.internal_code || `PRJ-${project.id}`;
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
   * Block variation creation if the project has not received final approval
   */
  const isCreatingNew = !variationId;
  if (!isEmbeddedMode && !loading && isCreatingNew && project && project.approval_status !== 'final_approved') {
    return (
      <PageLayout loading={loading} loadingText={t('loading')}>
        <div className="nvc-page">
          <div className="nvc-section">
            <div className="nvc-section-header">
              <h3>{t('variation_order')}</h3>
            </div>
            <div className="nvc-alert nvc-alert--warning">
              <p className="ds-mb-2">
                {t('variation_requires_final_approval')}
              </p>
              <Button
                variant="secondary"
                onClick={() => navigate(project ? `/projects/${project.id}?tab=variations` : '/projects')}
              >
                {t('back_to_project')}
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  /**
   * Render blocked content for final approved variations
   */
  if (!isEmbeddedMode && !loading && isFinalApproved && !isCompanyGeneralManager && viewModeProp !== true) {
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
          showSave={isEditMode}
          saveLabel={(!variationId || draftWorkflowStatuses.includes(effectiveVariation?.status)) ? t('submit', 'Submit') : undefined}
          title={getProjectTitle()}
          subtitle={getProjectSubtitle()}
          extraActions={
            isEditMode && (!variationId || draftWorkflowStatuses.includes(effectiveVariation?.status)) ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving}
                loading={saving}
                onClick={(e) => handleSubmit(e, true)}
              >
                {t('save_as_draft', 'Save as Draft')}
              </Button>
            ) : null
          }
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
                {renderAmount(!isEditMode && hasPostApprovalDiscount ? persistedTotal : calculations.totalAmount)}
              </span>
            </div>
          </div>
        </FinancialActionBar>
      )}

      {/* Main Document */}
      <form id="notice-variation-form" onSubmit={handleSubmit}>
        <div className="nvc-document">
          {/* Header Info */}
          <VariationHeaderInfo
            formData={formData}
            isEditMode={isEditMode}
            onFormDataChange={setFormData}
            projectId={project?.id || projectFromQuery}
            variationId={variation?.id || variationId}
            referenceIsAutomatic={!variationId || Boolean(effectiveVariation?.reference_number)}
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
            customFeesWithAmounts={calculations.customFeesWithAmounts}
            customFeesTotal={calculations.customFeesTotal}
            totalAmountBeforeDiscount={!isEditMode && hasPostApprovalDiscount ? persistedBeforeDiscount : calculations.totalAmountBeforeDiscount}
            discountAmount={!isEditMode && hasPostApprovalDiscount ? persistedDiscount : calculations.discountAmount}
            discountPercentage={!isEditMode && hasPostApprovalDiscount ? persistedDiscountPercentage : calculations.discountPercentage}
            totalAmount={!isEditMode && hasPostApprovalDiscount ? persistedTotal : calculations.totalAmount}
            variationAmountAfterDiscount={calculations.variationAmountAfterDiscount}
            contractorOHPAfterDiscount={calculations.contractorOHPAfterDiscount}
            consultantFeesAfterDiscount={calculations.consultantFeesAfterDiscount}
            formData={formData}
            isEditMode={isEditMode}
            canManageHiddenFees={canManageHiddenFees}
            hiddenFeeAttachment={hiddenFeeAttachment}
            setHiddenFeeAttachment={setHiddenFeeAttachment}
            existingHiddenFeeAttachment={existingHiddenFeeAttachment}
            existingHiddenFeeAttachmentName={existingHiddenFeeAttachmentName}
            setExistingHiddenFeeAttachment={setExistingHiddenFeeAttachment}
            setHiddenFeeAttachmentCleared={setHiddenFeeAttachmentCleared}
            project={project}
            contractConsultantFeePercentage={contractConsultantFeePercentage}
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

          {/* Hidden draft-save trigger for embedded mode (called from VariationViewPage toolbar) */}
          {isEmbeddedMode && (
            <button
              type="button"
              id="nvc-save-draft-trigger"
              style={{ display: 'none' }}
              onClick={(e) => handleSubmit(e, true)}
            />
          )}

          {/* Remarks & Attachments */}
          <RemarksAttachmentsSection
            formData={formData}
            omittedItems={omittedItems}
            addedItems={addedItems}
            calculations={calculations}
            isEditMode={isEditMode}
            onFormDataChange={setFormData}
            variationAttachment={variationAttachment}
            setVariationAttachment={setVariationAttachment}
            existingVariationAttachment={existingVariationAttachment}
            existingVariationAttachmentName={existingVariationAttachmentName}
            setExistingVariationAttachment={setExistingVariationAttachment}
            setVariationFileCleared={setVariationFileCleared}
            variationAttachments={variationAttachments}
            setVariationAttachments={setVariationAttachments}
            estimatedNoticePages={estimatedNoticePages}
            project={project}
            variationId={variationId}
            variation={variation}
            t={t}
          />

          <VariationIndexSection
            formData={formData}
            isEditMode={isEditMode}
            onFormDataChange={setFormData}
            estimatedNoticePages={estimatedNoticePages}
            t={t}
          />

        </div>
      </form>

      {project && (
        <div className="nvc-notice-page-measure" aria-hidden="true">
          <VariationPrintDocument
            ref={noticePageMeasureRef}
            variation={effectiveVariation}
            project={project}
            companyInfo={null}
            noticeData={liveNoticeData}
            consultantStampUrl={null}
            gmSignatureUrl={null}
            hideSignatures={true}
            generalRemarksEn={generalRemarksEn}
            generalRemarksAr={generalRemarksAr}
          />
        </div>
      )}

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
  if (isEmbeddedMode) return loading ? null : content;

  return (
    <PageLayout loading={loading} loadingText={t('loading')}>
      {content}
    </PageLayout>
  );
}
