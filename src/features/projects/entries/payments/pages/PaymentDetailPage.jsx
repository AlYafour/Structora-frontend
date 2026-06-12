import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { paymentApi, projectApi } from '../../../../../services';
import { logger } from '../../../../../utils/logger';
import { handleError } from '../../../../../utils/errorHandler';
import { formatDate } from '../../../../../utils/formatters';
import { extractFileNameFromUrl } from '../../../../../utils/helpers/file';
import PageLayout from '../../../../../components/layout/PageLayout';
import PageHeader from '../../../../../components/layout/PageHeader';
import ProjectEntryInfo from '../../../../../components/common/ProjectEntryInfo';
import Button from '../../../../../components/common/Button';
import FileAttachmentView from '../../../../../components/file-upload/FileAttachmentView';
import InvoiceAllocationTable from './components/InvoiceAllocationTable';
import PaymentSummaryPanel from './components/PaymentSummaryPanel';
import { shouldShowDepositSlip, getPaymentMethodOptions } from './utils/paymentFormatters';
import { FaEdit, FaFileAlt } from 'react-icons/fa';
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';
import './PaymentDetailPage.css';

function DetailRow({ label, value, children, empty }) {
  const hasContent = children != null || (value != null && value !== '' && value !== '—');
  return (
    <div className="pmt-detail-row">
      <span className="pmt-detail-row__label">{label}</span>
      <span className={`pmt-detail-row__value${!hasContent ? ' pmt-detail-row__value--empty' : ''}`}>
        {children ?? (hasContent ? value : '—')}
      </span>
    </div>
  );
}

export default function PaymentDetailPage() {
  const { paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const projectIdFromQuery = searchParams.get('project');
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useTenantNavigate();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [project, setProject] = useState(null);

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  const loadPayment = async () => {
    setLoading(true);
    try {
      const data = await paymentApi.getById(paymentId);
      setPayment(data);
      if (data.project) {
        projectApi.getWithIncludes(data.project, ['siteplan', 'license'])
          .then(setProject)
          .catch(err => logger.warn('Could not load project', err));
      }
    } catch (error) {
      const handledError = handleError(error, 'PaymentDetailPage.loadPayment');
      logger.error('Error loading payment', handledError);
      const pid = projectIdFromQuery;
      navigate(pid ? `/projects/${pid}?tab=payments` : '/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const pid = projectIdFromQuery || payment?.project;
    navigate(pid ? `/projects/${pid}?tab=payments` : '/projects');
  };

  const handleEdit = () => {
    const pid = projectIdFromQuery || payment?.project || '';
    navigate(`/payments/${paymentId}/edit?project=${pid}`);
  };

  const handleViewVoucher = () => {
    const pid = projectIdFromQuery || payment?.project || '';
    navigate(`/payments/${paymentId}/view?project=${pid}`);
  };

  if (loading || !payment) {
    return (
      <PageLayout loading={loading} loadingText={t('loading')}>
        <div />
      </PageLayout>
    );
  }

  const methodOptions = getPaymentMethodOptions(payment.payer, t);
  const methodLabel = methodOptions.find(o => o.value === payment.payment_method)?.label || payment.payment_method || '—';
  const payerLabel = payment.payer === 'bank' ? t('payer_bank') : t('payer_owner');
  const showDepositSlip = shouldShowDepositSlip(payment.payer, payment.payment_method);

  const isBankTransfer = payment.payment_method === 'bank_transfer' || payment.payer === 'bank';
  const isCashDeposit = payment.payment_method === 'cash_deposit';
  const isCheque = payment.payment_method === 'bank_cheque';
  const isPromissoryNote = payment.payment_method === 'promissory_note';

  const allocations = (payment.allocations || []).map(alloc => ({
    invoice_id: alloc.invoice_id ?? alloc.invoice,
    invoice_number: alloc.invoice_number || `#${alloc.invoice_id ?? alloc.invoice}`,
    total_amount: parseFloat(alloc.total_amount || 0),
    remaining_amount: parseFloat(alloc.remaining_amount || 0),
    allocated_amount: String(alloc.amount ?? alloc.allocated_amount ?? 0),
  }));

  const totalAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.allocated_amount) || 0), 0);
  const paymentAmount = parseFloat(payment.amount || 0);

  const formattedAmount = new Intl.NumberFormat(isRTL ? 'ar-AE' : 'en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
  }).format(paymentAmount);

  const formattedDate = payment.date
    ? new Intl.DateTimeFormat(isRTL ? 'ar-AE' : 'en-AE', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(payment.date))
    : '—';

  const isVoided = payment.status === 'voided';
  const statusBadgeClass = isVoided
    ? 'pmt-status-badge pmt-status-badge--voided'
    : payment.is_advance_payment
    ? 'pmt-status-badge pmt-status-badge--advance'
    : 'pmt-status-badge pmt-status-badge--active';

  const statusLabel = isVoided
    ? t('voided')
    : payment.is_advance_payment
    ? t('advance_payment', 'Advance Payment')
    : t('confirmed', 'Confirmed');

  const noteStatusClass =
    payment.promissory_note_status === 'honored' ? 'pmt-note-status pmt-note-status--honored'
    : payment.promissory_note_status === 'dishonored' ? 'pmt-note-status pmt-note-status--dishonored'
    : 'pmt-note-status pmt-note-status--pending';

  return (
    <PageLayout>
      <div className="entry-form entry-form--wide payment-page">
        <PageHeader
          onBack={handleBack}
          actions={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                startIcon={<FaFileAlt />}
                onClick={handleViewVoucher}
              >
                {t('view_voucher', 'View Voucher')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                startIcon={<FaEdit />}
                onClick={handleEdit}
              >
                {t('edit')}
              </Button>
            </div>
          }
        >
          <ProjectEntryInfo project={project} />
        </PageHeader>

        {/* Hero KPI Bar */}
        <div className="pmt-hero">
          <div className="pmt-hero__cell">
            <span className="pmt-hero__label">{t('amount')}</span>
            <span className="pmt-hero__value pmt-hero__value--amount">{formattedAmount}</span>
          </div>
          <div className="pmt-hero__cell">
            <span className="pmt-hero__label">{t('payment_date')}</span>
            <span className="pmt-hero__value pmt-hero__value--date">{formattedDate}</span>
          </div>
          <div className="pmt-hero__cell">
            <span className="pmt-hero__label">{t('status')}</span>
            <span className={statusBadgeClass}>{statusLabel}</span>
          </div>
        </div>

        {/* Payment Details Card */}
        <div className="card">
          <div className="card__header">{t('payment_details')}</div>
          <div className="card__body">

            {/* Core info */}
            <div className="pmt-detail-section">
              <div className="pmt-section-title">{t('payer_and_method')}</div>
              <div className="pmt-detail-rows">
                <DetailRow label={t('payer')} value={payerLabel} />
                <DetailRow label={t('payment_method')}>
                  <span className="pmt-method-badge">{methodLabel}</span>
                </DetailRow>
                {payment.description && (
                  <DetailRow label={t('description')} value={payment.description} />
                )}
              </div>
            </div>

            {/* Bank Transfer details */}
            {isBankTransfer && (
              <div className="pmt-detail-section">
                <div className="pmt-sub-details">
                  <div className="pmt-sub-details__title">{t('bank_transfer_details')}</div>
                  <div className="pmt-detail-rows">
                    <DetailRow label={t('sender_account_number')} value={payment.sender_account_number} />
                    <DetailRow label={t('recipient_account_number')} value={payment.recipient_account_number} />
                    <DetailRow label={t('transferor_name')} value={payment.transferor_name} />
                  </div>
                </div>
              </div>
            )}

            {/* Cash Deposit details */}
            {isCashDeposit && (
              <div className="pmt-detail-section">
                <div className="pmt-sub-details">
                  <div className="pmt-sub-details__title">{t('cash_deposit_details')}</div>
                  <div className="pmt-detail-rows">
                    <DetailRow label={t('sender_name')} value={payment.sender_account_number} />
                    <DetailRow label={t('recipient_account_number')} value={payment.recipient_account_number} />
                  </div>
                </div>
              </div>
            )}

            {/* Cheque details */}
            {isCheque && (
              <div className="pmt-detail-section">
                <div className="pmt-sub-details">
                  <div className="pmt-sub-details__title">{t('bank_cheque_details')}</div>
                  <div className="pmt-detail-rows">
                    <DetailRow label={t('cheque_holder_name')} value={payment.cheque_holder_name} />
                    <DetailRow label={t('cheque_account_number')} value={payment.cheque_account_number} />
                    <DetailRow label={t('cheque_date')} value={payment.cheque_date ? formatDate(payment.cheque_date) : null} />
                  </div>
                </div>
              </div>
            )}

            {/* Promissory Note details */}
            {isPromissoryNote && (
              <div className="pmt-detail-section">
                <div className="pmt-sub-details">
                  <div className="pmt-sub-details__title">
                    {t('promissory_note_details', 'Promissory Note Details')}
                  </div>
                  <div className="pmt-detail-rows">
                    <DetailRow
                      label={t('promissory_note_number', 'Note Number')}
                      value={payment.promissory_note_number}
                    />
                    <DetailRow
                      label={t('promissory_note_due_date', 'Maturity Date')}
                      value={payment.promissory_note_due_date ? formatDate(payment.promissory_note_due_date) : null}
                    />
                    {payment.promissory_note_status && (
                      <DetailRow label={t('status')}>
                        <span className={noteStatusClass}>
                          {payment.promissory_note_status === 'pending' && '⏳ '}
                          {payment.promissory_note_status === 'honored' && '✓ '}
                          {payment.promissory_note_status === 'dishonored' && '✗ '}
                          {payment.promissory_note_status === 'pending'
                            ? t('promissory_note_status_pending', 'Pending')
                            : payment.promissory_note_status === 'honored'
                            ? t('promissory_note_status_honored', 'Honored')
                            : t('promissory_note_status_dishonored', 'Dishonored')}
                        </span>
                        {payment.promissory_note_honored_date && (
                          <span style={{ marginInlineStart: '10px', fontSize: '12px', color: '#6b7280' }}>
                            {t('honored_on', 'Honored on')}: {formatDate(payment.promissory_note_honored_date)}
                          </span>
                        )}
                      </DetailRow>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Advance payment */}
            {payment.is_advance_payment && (
              <div className="pmt-detail-section">
                <div className="pmt-sub-details">
                  <div className="pmt-sub-details__title">{t('advance_payment', 'Advance Payment')}</div>
                  <div className="pmt-detail-rows">
                    {payment.advance_percentage && (
                      <DetailRow
                        label={t('advance_payment_percentage', 'Percentage')}
                        value={`${payment.advance_percentage}%`}
                      />
                    )}
                    <DetailRow
                      label={t('advance_payment_amount', 'Amount')}
                      value={formattedAmount}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Credit used */}
            {payment.use_credit && payment.credit_amount && (
              <div className="pmt-detail-section">
                <div className="pmt-sub-details">
                  <div className="pmt-sub-details__title">{t('use_credit')}</div>
                  <div className="pmt-detail-rows">
                    <DetailRow
                      label={t('credit_amount_to_use')}
                      value={new Intl.NumberFormat(isRTL ? 'ar-AE' : 'en-AE', {
                        style: 'currency', currency: 'AED', minimumFractionDigits: 2,
                      }).format(parseFloat(payment.credit_amount))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional info */}
            {(payment.completion_percentage || payment.project_financial_account) && (
              <div className="pmt-detail-section">
                <div className="pmt-section-title">{t('additional_info')}</div>
                <div className="pmt-detail-rows">
                  {payment.project_financial_account && (
                    <DetailRow label={t('project_financial_account')} value={payment.project_financial_account} />
                  )}
                  {payment.completion_percentage && (
                    <DetailRow label={t('completion_percentage')} value={`${payment.completion_percentage}%`} />
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Invoice Allocations Card */}
        {allocations.length > 0 && !payment.is_advance_payment && (
          <div className="card">
            <div className="card__header">{t('invoice_allocation')}</div>
            <div className="card__body">
              <InvoiceAllocationTable
                allocations={allocations}
                allocationMode="auto"
                actualInvoices={[]}
                t={t}
              />
              <PaymentSummaryPanel
                paymentAmount={paymentAmount}
                totalAllocated={totalAllocated}
                creditBalance={0}
                allocations={allocations}
                creditAmountUsed={0}
                isPromissoryNote={isPromissoryNote}
                t={t}
              />
            </div>
          </div>
        )}

        {/* File Attachments Card */}
        <div className="card">
          <div className="card__header">{t('file_attachments')}</div>
          <div className="card__body">
            <div className="pmt-attachments-grid">
              <div className="pmt-attachment-item">
                <span className="pmt-attachment-label">{t('invoice_file')}</span>
                {payment.invoice_file ? (
                  <FileAttachmentView
                    fileUrl={payment.invoice_file}
                    fileName={extractFileNameFromUrl(payment.invoice_file)}
                  />
                ) : (
                  <div className="pmt-empty-attachment">{t('no_attachment')}</div>
                )}
              </div>

              <div className="pmt-attachment-item">
                <span className="pmt-attachment-label">{t('receipt_voucher')}</span>
                {payment.receipt_voucher ? (
                  <FileAttachmentView
                    fileUrl={payment.receipt_voucher}
                    fileName={extractFileNameFromUrl(payment.receipt_voucher)}
                  />
                ) : (
                  <div className="pmt-empty-attachment">{t('no_attachment')}</div>
                )}
              </div>

              {showDepositSlip && (
                <div className="pmt-attachment-item">
                  <span className="pmt-attachment-label">{t('deposit_slip')}</span>
                  {payment.deposit_slip ? (
                    <FileAttachmentView
                      fileUrl={payment.deposit_slip}
                      fileName={extractFileNameFromUrl(payment.deposit_slip)}
                    />
                  ) : (
                    <div className="pmt-empty-attachment">{t('no_attachment')}</div>
                  )}
                </div>
              )}

              <div className="pmt-attachment-item">
                <span className="pmt-attachment-label">{t('bank_payment_attachments')}</span>
                {payment.bank_payment_attachments ? (
                  <FileAttachmentView
                    fileUrl={payment.bank_payment_attachments}
                    fileName={extractFileNameFromUrl(payment.bank_payment_attachments)}
                  />
                ) : (
                  <div className="pmt-empty-attachment">{t('no_attachment')}</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
