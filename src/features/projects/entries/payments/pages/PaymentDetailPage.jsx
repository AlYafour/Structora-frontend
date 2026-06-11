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
import FormViewField from '../../../../../components/forms/FormViewField';
import FileAttachmentView from '../../../../../components/file-upload/FileAttachmentView';
import InvoiceAllocationTable from './components/InvoiceAllocationTable';
import PaymentSummaryPanel from './components/PaymentSummaryPanel';
import { shouldShowDepositSlip, getPaymentMethodOptions } from './utils/paymentFormatters';
import { FaEdit, FaFileAlt } from 'react-icons/fa';
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';
import './components/PaymentFormFields.css';
import './components/PaymentAttachmentsSection.css';

export default function PaymentDetailPage() {
  const { paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const projectIdFromQuery = searchParams.get('project');
  const { t } = useTranslation();
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

        {/* Payment Details Card */}
        <div className="card">
          <div className="card__header">
            {t('payment_details')}
            {payment.status === 'voided' && (
              <span style={{
                marginInlineStart: '12px',
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 10px', borderRadius: '9999px',
                fontSize: '12px', fontWeight: 600,
                background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5',
              }}>
                {t('voided')}
              </span>
            )}
          </div>
          <div className="card__body">

            {/* Amount & Date */}
            <div className="payment-form-fields__section">
              <div className="payment-form-fields__section-title">{t('payment_details')}</div>
              <div className="ds-grid ds-grid-cols-2 ds-gap-4">
                <FormViewField label={t('amount')} value={paymentAmount} type="currency" />
                <FormViewField label={t('payment_date')} value={payment.date} type="date" />
              </div>
            </div>

            {/* Payer & Method */}
            <div className="payment-form-fields__section">
              <div className="payment-form-fields__section-title">{t('payer_and_method')}</div>
              <div className="ds-grid ds-grid-cols-2 ds-gap-4">
                <FormViewField label={t('payer')} value={payerLabel} />
                <FormViewField label={t('payment_method')} value={methodLabel} />
              </div>

              {isBankTransfer && (
                <div className="payment-form-fields__sub-section">
                  <div className="payment-form-fields__sub-title">{t('bank_transfer_details')}</div>
                  <div className="ds-grid ds-grid-cols-3 ds-gap-4">
                    <FormViewField label={t('sender_account_number')} value={payment.sender_account_number} />
                    <FormViewField label={t('recipient_account_number')} value={payment.recipient_account_number} />
                    <FormViewField label={t('transferor_name')} value={payment.transferor_name} />
                  </div>
                </div>
              )}

              {isCashDeposit && (
                <div className="payment-form-fields__sub-section">
                  <div className="payment-form-fields__sub-title">{t('cash_deposit_details')}</div>
                  <div className="ds-grid ds-grid-cols-2 ds-gap-4">
                    <FormViewField label={t('sender_name')} value={payment.sender_account_number} />
                    <FormViewField label={t('recipient_account_number')} value={payment.recipient_account_number} />
                  </div>
                </div>
              )}

              {isCheque && (
                <div className="payment-form-fields__sub-section">
                  <div className="payment-form-fields__sub-title">{t('bank_cheque_details')}</div>
                  <div className="ds-grid ds-grid-cols-3 ds-gap-4">
                    <FormViewField label={t('cheque_holder_name')} value={payment.cheque_holder_name} />
                    <FormViewField label={t('cheque_account_number')} value={payment.cheque_account_number} />
                    <FormViewField label={t('cheque_date')} value={payment.cheque_date} type="date" />
                  </div>
                </div>
              )}

              {isPromissoryNote && (
                <div className="payment-form-fields__sub-section">
                  <div className="payment-form-fields__sub-title">
                    {t('promissory_note_details', 'Promissory Note Details — تفاصيل السند الأذني')}
                  </div>
                  <div className="ds-grid ds-grid-cols-2 ds-gap-4">
                    <FormViewField
                      label={t('promissory_note_number', 'Note Number / رقم السند')}
                      value={payment.promissory_note_number}
                    />
                    <FormViewField
                      label={t('promissory_note_due_date', 'Maturity Date / تاريخ الاستحقاق')}
                      value={payment.promissory_note_due_date}
                      type="date"
                    />
                  </div>
                  {payment.promissory_note_status && (
                    <div style={{ marginTop: '10px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                        ...(payment.promissory_note_status === 'pending'
                          ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }
                          : payment.promissory_note_status === 'honored'
                          ? { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }
                          : { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' })
                      }}>
                        {payment.promissory_note_status === 'pending' && '⏳ '}
                        {payment.promissory_note_status === 'honored' && '✓ '}
                        {payment.promissory_note_status === 'dishonored' && '✗ '}
                        {payment.promissory_note_status === 'pending'
                          ? t('promissory_note_status_pending', 'Pending — Awaiting Honor')
                          : payment.promissory_note_status === 'honored'
                          ? t('promissory_note_status_honored', 'Honored ✓')
                          : t('promissory_note_status_dishonored', 'Dishonored ✗')
                        }
                      </span>
                      {payment.promissory_note_honored_date && (
                        <span style={{ marginInlineStart: '8px', fontSize: '12px', color: '#6b7280' }}>
                          {t('honored_on', 'Honored on')}: {formatDate(payment.promissory_note_honored_date)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {payment.is_advance_payment && (
                <div className="payment-form-fields__sub-section">
                  <div className="payment-form-fields__sub-title">{t('advance_payment', 'دفعة مقدمة')}</div>
                  <div className="ds-grid ds-grid-cols-2 ds-gap-4">
                    <FormViewField
                      label={t('advance_payment_percentage', 'نسبة الدفعة المقدمة (%)')}
                      value={payment.advance_percentage ? `${payment.advance_percentage}%` : null}
                    />
                    <FormViewField
                      label={t('advance_payment_amount', 'مبلغ الدفعة المقدمة')}
                      value={paymentAmount}
                      type="currency"
                    />
                  </div>
                </div>
              )}

              {payment.use_credit && payment.credit_amount && (
                <div className="payment-form-fields__sub-section">
                  <div className="payment-form-fields__sub-title">{t('use_credit')}</div>
                  <div className="ds-grid ds-grid-cols-2 ds-gap-4">
                    <FormViewField
                      label={t('credit_amount_to_use')}
                      value={parseFloat(payment.credit_amount)}
                      type="currency"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="payment-form-fields__section">
              <FormViewField label={t('description')} value={payment.description} />
            </div>

            {/* Additional Info */}
            {(payment.completion_percentage || payment.project_financial_account) && (
              <div className="payment-form-fields__section payment-form-fields__section--last">
                <div className="payment-form-fields__section-title">{t('additional_info')}</div>
                <div className="ds-grid ds-grid-cols-2 ds-gap-4">
                  {payment.project_financial_account && (
                    <FormViewField
                      label={t('project_financial_account')}
                      value={payment.project_financial_account}
                    />
                  )}
                  {payment.completion_percentage && (
                    <FormViewField
                      label={t('completion_percentage')}
                      value={`${payment.completion_percentage}%`}
                    />
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
        <div className="card payment-attachments">
          <div className="card__header">{t('file_attachments')}</div>
          <div className="card__body">
            <div className="payment-attachments__grid">
              <div className="payment-attachments__item">
                <label className="payment-attachments__label">{t('invoice_file')}</label>
                {payment.invoice_file ? (
                  <FileAttachmentView
                    fileUrl={payment.invoice_file}
                    fileName={extractFileNameFromUrl(payment.invoice_file)}
                  />
                ) : (
                  <div className="prj-empty-inline">{t('no_attachment')}</div>
                )}
              </div>

              <div className="payment-attachments__item">
                <label className="payment-attachments__label">{t('receipt_voucher')}</label>
                {payment.receipt_voucher ? (
                  <FileAttachmentView
                    fileUrl={payment.receipt_voucher}
                    fileName={extractFileNameFromUrl(payment.receipt_voucher)}
                  />
                ) : (
                  <div className="prj-empty-inline">{t('no_attachment')}</div>
                )}
              </div>

              {showDepositSlip && (
                <div className="payment-attachments__item">
                  <label className="payment-attachments__label">{t('deposit_slip')}</label>
                  {payment.deposit_slip ? (
                    <FileAttachmentView
                      fileUrl={payment.deposit_slip}
                      fileName={extractFileNameFromUrl(payment.deposit_slip)}
                    />
                  ) : (
                    <div className="prj-empty-inline">{t('no_attachment')}</div>
                  )}
                </div>
              )}

              <div className="payment-attachments__item">
                <label className="payment-attachments__label">{t('bank_payment_attachments')}</label>
                {payment.bank_payment_attachments ? (
                  <FileAttachmentView
                    fileUrl={payment.bank_payment_attachments}
                    fileName={extractFileNameFromUrl(payment.bank_payment_attachments)}
                  />
                ) : (
                  <div className="prj-empty-inline">{t('no_attachment')}</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
