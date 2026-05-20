/**
 * CreatePaymentPage Component (Refactored)
 *
 * Main page for creating and editing payments
 * Reduced from ~1199 lines to ~400 lines by extracting components, hooks, and utilities
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateProjectQueries } from '../../../hooks/useProjectData';
import { useNotifications } from '../../../../../contexts/NotificationContext';
import { paymentApi, projectApi } from '../../../../../services';
import { advancePaymentApi } from '../../../../../services/advancePayments';
import { creditApi } from '../../../../../services/credits';
import PageLayout from '../../../../../components/layout/PageLayout';
import FinancialActionBar from '../../../../../components/common/FinancialActionBar';
import { removeCommas, formatNumberWithCommas } from '../../../../../utils/formatters/number';
import { logger } from '../../../../../utils/logger';
import { handleError } from '../../../../../utils/errorHandler';

// Custom hooks
import { usePaymentForm } from './hooks/usePaymentForm';
import { usePaymentAllocations } from './hooks/usePaymentAllocations';
import { usePaymentFiles } from './hooks/usePaymentFiles';

// Components
import PaymentFormFields from './components/PaymentFormFields';
import InvoiceAllocationTable from './components/InvoiceAllocationTable';
import PaymentSummaryPanel from './components/PaymentSummaryPanel';
import PaymentAttachmentsSection from './components/PaymentAttachmentsSection';
import ProjectEntryInfo from '../../../../../components/common/ProjectEntryInfo';

// Utilities
import {
  filterAvailableInvoices
} from './utils/paymentCalculations';
import { validatePaymentSubmission } from './utils/paymentValidation';
import {
  formatPaymentDataForForm,
  buildPaymentFormData
} from './utils/paymentFormatters';
import './CreatePaymentPage.css';
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

export default function CreatePaymentPage() {
  const { paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!paymentId;
  const projectFromQuery = searchParams.get('project');

  // State
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [actualInvoices, setActualInvoices] = useState([]);
  const [project, setProject] = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState({});
  const [latestProgress, setLatestProgress] = useState(null);
  const [hasExistingAdvance, setHasExistingAdvance] = useState(false);
  const [availableCredit, setAvailableCredit] = useState(0);
  const { success, error: showError } = useNotifications();
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(navTimerRef.current);
  }, []);

  // Custom hooks
  const { formData, updateField, loadFormData } = usePaymentForm(projectFromQuery || '');
  const {
    allocations,
    totalAllocated,
    getCreditBalance,
    updateAllocationAmount,
    removeAllocation,
    addInvoiceToAllocations,
    setAllocations
  } = usePaymentAllocations();
  const {
    depositSlip,
    setDepositSlip,
    invoiceFile,
    setInvoiceFile,
    receiptVoucher,
    setReceiptVoucher,
    bankPaymentAttachments,
    setBankPaymentAttachments,
    existingDepositSlip,
    setExistingDepositSlip,
    existingInvoiceFile,
    setExistingInvoiceFile,
    existingReceiptVoucher,
    setExistingReceiptVoucher,
    existingBankPaymentAttachments,
    setExistingBankPaymentAttachments,
    loadExistingFiles,
    getFilesForSubmission
  } = usePaymentFiles();

  // Calculate payment amount and credit balance
  // When using credit, the effective payment amount includes the credit being applied
  const rawPaymentAmount = parseFloat(removeCommas(formData.amount || '0')) || 0;
  const creditAmountUsed = (formData.use_credit && formData.credit_amount)
    ? (parseFloat(removeCommas(formData.credit_amount || '0')) || 0)
    : 0;
  const paymentAmount = rawPaymentAmount + creditAmountUsed;
  const creditBalance = getCreditBalance(paymentAmount);

  // Bank invoices are split: bank pays NET, owner pays VAT independently.
  // Bank sees the net portion; owner sees the VAT portion at any time.
  const filteredInvoices = actualInvoices
    .map(inv => {
      if (inv.payer === 'bank') {
        const remaining = parseFloat(inv.remaining_amount || 0);
        // Only use stored vat field — no fallback. Old invoices (vat=0) have no owner-payable VAT.
        const vatTotal = parseFloat(inv.vat || 0);
        const netTotal = parseFloat(inv.net_amount || 0) || parseFloat(inv.amount || 0);

        if (formData.payer === 'bank') {
          // Bank pays NET portion.
          // When remaining <= vatTotal, bank has fully paid their net share.
          // Use min(netTotal, remaining) so that if owner paid VAT early (reducing remaining),
          // the bank still sees the correct net amount outstanding.
          const bankRemaining = remaining <= vatTotal
            ? 0
            : Math.min(netTotal, remaining);
          if (bankRemaining <= 0.001) return null;
          return { ...inv, amount: netTotal, remaining_amount: bankRemaining };
        }

        if (formData.payer === 'owner') {
          // Owner pays VAT on bank's invoice — only for new invoices that store vat
          if (vatTotal <= 0) return null;
          const ownerRemaining = Math.min(vatTotal, remaining);
          if (ownerRemaining <= 0.001) return null;
          return { ...inv, amount: vatTotal, remaining_amount: ownerRemaining };
        }

        return null;
      }

      // Non-bank invoices: only visible to the matching payer
      if (inv.payer !== formData.payer) return null;
      // Use net_cash_exposure so amounts already committed to a pending promissory note
      // are not offered again as available capacity for a new cash payment.
      // Falls back to remaining_amount for invoices that don't carry the field (old data).
      const netExposure = parseFloat(
        inv.net_cash_exposure != null ? inv.net_cash_exposure : (inv.remaining_amount ?? 0)
      );
      return { ...inv, remaining_amount: netExposure };
    })
    .filter(inv => inv !== null && parseFloat(inv.remaining_amount || 0) > 0.001);

  /**
   * Load actual invoices for the project
   */
  const loadActualInvoices = async projectId => {
    try {
      const data = await projectApi.getInvoices(projectId);
      const items = Array.isArray(data)
        ? data
        : data?.results || data?.items || data?.data || [];

      const availableInvoices = filterAvailableInvoices(items);
      setActualInvoices(availableInvoices || []);
    } catch (error) {
      const handledError = handleError(error, 'CreatePaymentPage.loadActualInvoices');
      logger.error('Error loading actual invoices', handledError);
      setActualInvoices([]);
    }
  };

  /**
   * Load payment data for edit mode
   */
  const loadPayment = async () => {
    setLoading(true);
    try {
      const data = await paymentApi.getById(paymentId);
      const formattedData = formatPaymentDataForForm(data);
      loadFormData(formattedData);
      loadExistingFiles(data);

      if (data.project) {
        loadActualInvoices(data.project);
      }
    } catch (error) {
      const handledError = handleError(error, 'CreatePaymentPage.loadPayment');
      logger.error('Error loading payment', handledError);
      showToast('error', handledError.message || t('load_error'));
      navTimerRef.current = setTimeout(() => navigate('/projects'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => type === 'success' ? success(msg) : showError(msg);

  /**
   * Handle form submission
   */
  const handleSubmit = async e => {
    e.preventDefault();

    // Validate
    const validation = validatePaymentSubmission(
      formData,
      allocations,
      actualInvoices,
      paymentAmount,
      creditBalance,
      isEditMode,
      t
    );

    if (!validation.isValid) {
      showToast('error', validation.errors[0] || validation.error);
      return;
    }

    setSaving(true);
    try {
      const formDataToSend = buildPaymentFormData(
        formData,
        allocations,
        'manual',
        getFilesForSubmission(),
        t
      );

      if (isEditMode) {
        await paymentApi.update(paymentId, formDataToSend);
        showToast('success', t('save_success'));
      } else {
        await paymentApi.create(formDataToSend);
        showToast('success', t('save_success'));
      }

      if (formData.project) {
        invalidateProjectQueries(queryClient, formData.project);
      }

      navTimerRef.current = setTimeout(() => {
        if (formData.project) {
          navigate(`/projects/${formData.project}?tab=payments`);
        } else {
          navigate('/projects');
        }
      }, 1500);
    } catch (error) {
      const handledError = handleError(error, 'CreatePaymentPage.handleSubmit');
      logger.error('Error saving payment', handledError);
      showToast('error', handledError.message || t('save_error'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (formData.project) {
      navigate(`/projects/${formData.project}?tab=payments`);
    } else {
      navigate('/projects');
    }
  };

  /**
   * Handle file changes
   */
  const handleFileChange = (field, file) => {
    const setters = {
      depositSlip: setDepositSlip,
      invoiceFile: setInvoiceFile,
      receiptVoucher: setReceiptVoucher,
      bankPaymentAttachments: setBankPaymentAttachments
    };
    setters[field]?.(file);
  };

  /**
   * Handle removing existing files
   */
  const handleRemoveExisting = field => {
    const setters = {
      existingDepositSlip: setExistingDepositSlip,
      existingInvoiceFile: setExistingInvoiceFile,
      existingReceiptVoucher: setExistingReceiptVoucher,
      existingBankPaymentAttachments: setExistingBankPaymentAttachments
    };
    setters[field]?.(null);

    // Also clear the new file if any
    const fileSetters = {
      existingDepositSlip: setDepositSlip,
      existingInvoiceFile: setInvoiceFile,
      existingReceiptVoucher: setReceiptVoucher,
      existingBankPaymentAttachments: setBankPaymentAttachments
    };
    fileSetters[field]?.(null);
  };

  /**
   * Handle invoice addition to allocations
   */
  const handleAddInvoice = invoiceId => {
    const invoice = filteredInvoices.find(inv => inv.id === parseInt(invoiceId));
    if (invoice) {
      addInvoiceToAllocations(invoice);
    }
  };

  /**
   * Handle clicking remaining amount — fills allocated_amount and updates payment amount
   */
  const handleClickRemaining = (invoiceId, remainingAmount) => {
    // Set this invoice's allocated_amount to its remaining_amount
    setAllocations(prev => {
      const updated = prev.map(alloc =>
        alloc.invoice_id === invoiceId
          ? { ...alloc, allocated_amount: formatNumberWithCommas(String(remainingAmount)) }
          : alloc
      );
      // Sum all allocated amounts and set as payment amount
      const newTotal = updated.reduce((sum, alloc) => {
        return sum + (parseFloat(removeCommas(alloc.allocated_amount || '0')) || 0);
      }, 0);
      updateField('amount', formatNumberWithCommas(newTotal.toFixed(2)));
      return updated;
    });
  };

  // Load payment on mount (edit mode)
  useEffect(() => {
    if (isEditMode) {
      loadPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, isEditMode]);

  // Load invoices, project info, and auto-fill fields when project changes
  useEffect(() => {
    if (formData.project) {
      loadActualInvoices(formData.project);
      projectApi.getWithIncludes(formData.project, ['contract']).then(setProject).catch((err) => {
        logger.debug("Failed to load project with contract", err);
      });

      // Load latest progress entry for completion percentage display
      projectApi.getLatestProjectProgress(formData.project).then(progress => {
        setLatestProgress(progress || null);
        if (progress && !isEditMode) {
          // Auto-fill completion_percentage based on payer
          const pct = formData.payer === 'bank'
            ? (progress.bank_technical_current ?? progress.overall_technical_approved)
            : (progress.owner_technical_current ?? progress.overall_technical_approved);
          if (pct !== null && pct !== undefined) {
            updateField('completion_percentage', String(Number(pct).toFixed(2)));
            setAutoFilledFields(prev => ({ ...prev, completion_percentage: true }));
          }
        }
      }).catch(() => setLatestProgress(null));

      // Check if project already has an active advance payment
      advancePaymentApi.getSummary(formData.project)
        .then(data => setHasExistingAdvance(!!data?.has_advance))
        .catch(() => setHasExistingAdvance(false));

      // Fetch available credit (overpayment balance)
      creditApi.getSummary(formData.project)
        .then(data => setAvailableCredit(parseFloat(data?.total_credit) || 0))
        .catch(() => setAvailableCredit(0));

      // Auto-fill project_financial_account from latest payment
      if (!isEditMode) {
        projectApi.getPayments(formData.project).then(payments => {
          if (Array.isArray(payments) && payments.length > 0) {
            const lastWithAccount = [...payments]
              .reverse()
              .find(p => p.project_financial_account);
            if (lastWithAccount && !formData.project_financial_account) {
              updateField('project_financial_account', lastWithAccount.project_financial_account);
              setAutoFilledFields(prev => ({ ...prev, project_financial_account: true }));
            }
          }
        }).catch((err) => {
          logger.debug("Failed to load payments for auto-fill", err);
        });
      }
    } else {
      setActualInvoices([]);
      setProject(null);
      setLatestProgress(null);
      setAutoFilledFields({});
      setHasExistingAdvance(false);
      setAvailableCredit(0);
      updateField('actual_invoice', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.project]);

  // Clear allocations and update completion percentage when payer changes
  useEffect(() => {
    setAllocations([]);
    // Update completion_percentage based on payer from latest progress
    if (latestProgress) {
      const pct = formData.payer === 'bank'
        ? (latestProgress.bank_technical_current ?? latestProgress.overall_technical_approved)
        : (latestProgress.owner_technical_current ?? latestProgress.overall_technical_approved);
      if (pct !== null && pct !== undefined) {
        updateField('completion_percentage', String(Number(pct).toFixed(2)));
        setAutoFilledFields(prev => ({ ...prev, completion_percentage: true }));
      } else {
        updateField('completion_percentage', '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.payer]);

  return (
    <PageLayout loading={loading} loadingText={t('loading')}>
      <div className="entry-form entry-form--wide payment-page">
        <FinancialActionBar onBack={handleBack} saving={saving} formId="create-payment-form">
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>
        <form id="create-payment-form" onSubmit={handleSubmit}>
          {/* Payment Information Card */}
          <div className="card">
            <div className="card__header">
              {isEditMode ? t('edit_payment') : t('add_payment')}
            </div>

            <div className="card__body">
              <PaymentFormFields
                formData={formData}
                onUpdateField={(field, value) => {
                  updateField(field, value);
                  // Clear auto-filled indicator when user manually edits
                  if (autoFilledFields[field]) {
                    setAutoFilledFields(prev => ({ ...prev, [field]: false }));
                  }
                }}
                autoFilledFields={autoFilledFields}
                ownerShare={project?.contract_data?.total_owner_value || 0}
                hasExistingAdvance={hasExistingAdvance}
                availableCredit={availableCredit}
                t={t}
              />
            </div>
          </div>

          {/* No-invoice warning (hidden for advance payments and edit mode) */}
          {formData.project && filteredInvoices.length === 0 && !formData.is_advance_payment && !isEditMode && (
            <div className="card">
              <div className="card__body">
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  fontWeight: 500,
                  fontSize: '14px',
                }}>
                  ⚠️ {t('no_invoices_for_payer')}
                </div>
              </div>
            </div>
          )}

          {/* Invoice Allocation Card (hidden for advance payments) */}
          {formData.project && filteredInvoices.length > 0 && !formData.is_advance_payment && (
            <div className="card">
              <div className="card__header">
                {t('invoice_allocation')}
              </div>

              <div className="card__body">
                <InvoiceAllocationTable
                  allocations={allocations}
                  allocationMode="manual"
                  actualInvoices={filteredInvoices}
                  onUpdateAmount={(invoiceId, value) =>
                    updateAllocationAmount(invoiceId, value, paymentAmount)
                  }
                  onRemoveAllocation={removeAllocation}
                  onAddInvoice={handleAddInvoice}
                  onClickRemaining={handleClickRemaining}
                  t={t}
                />

                <PaymentSummaryPanel
                  paymentAmount={paymentAmount}
                  totalAllocated={totalAllocated}
                  creditBalance={creditBalance}
                  allocations={allocations}
                  creditAmountUsed={creditAmountUsed}
                  isPromissoryNote={formData.payment_method === 'promissory_note'}
                  invoiceRemainingAmount={
                    allocations.length === 1
                      ? parseFloat(
                          filteredInvoices.find(inv => inv.id === allocations[0]?.invoice_id)?.remaining_amount || 0
                        )
                      : 0
                  }
                  invoicePromissoryNoteAmount={
                    allocations.length === 1
                      ? parseFloat(
                          filteredInvoices.find(inv => inv.id === allocations[0]?.invoice_id)?.promissory_note_amount || 0
                        )
                      : 0
                  }
                  t={t}
                />
              </div>
            </div>
          )}

          {/* File Attachments */}
          <PaymentAttachmentsSection
            formData={formData}
            files={{
              depositSlip,
              invoiceFile,
              receiptVoucher,
              bankPaymentAttachments,
              existingDepositSlip,
              existingInvoiceFile,
              existingReceiptVoucher,
              existingBankPaymentAttachments
            }}
            onFileChange={handleFileChange}
            onRemoveExisting={handleRemoveExisting}
            t={t}
          />
        </form>
      </div>
    </PageLayout>
  );
}
