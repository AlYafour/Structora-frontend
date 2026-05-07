/**
 * PaymentAttachmentsSection Component
 *
 * File attachment uploads for payments
 */

import { memo } from 'react';
import FileUpload from '../../../../../../components/file-upload/FileUpload';
import { shouldShowDepositSlip } from '../utils/paymentFormatters';
import './PaymentAttachmentsSection.css';

const PaymentAttachmentsSection = memo(({
 formData,
 files,
 onFileChange,
 onRemoveExisting,
 t
}) => {
 const showDepositSlip = shouldShowDepositSlip(formData.payer, formData.payment_method);

 return (
 <div className="card payment-attachments">
  <div className="card__header">
   {t('file_attachments')}
  </div>

  <div className="card__body">
   <div className="payment-attachments__grid">
    {/* Invoice File */}
    <div className="payment-attachments__item">
     <label className="payment-attachments__label">
      {t('invoice_file')}
     </label>
     <FileUpload
      value={files.invoiceFile}
      onChange={file => onFileChange('invoiceFile', file)}
      accept=".pdf,.jpg,.jpeg,.png"
      maxSizeMB={30}
      showPreview={true}
      existingFileUrl={files.existingInvoiceFile}
      existingFileName={
       files.existingInvoiceFile
        ? files.existingInvoiceFile.split('/').pop()
        : ''
      }
      onRemoveExisting={() => onRemoveExisting('existingInvoiceFile')}
     />
    </div>

    {/* Receipt Voucher */}
    <div className="payment-attachments__item">
     <label className="payment-attachments__label">
      {t('receipt_voucher')}
     </label>
     <FileUpload
      value={files.receiptVoucher}
      onChange={file => onFileChange('receiptVoucher', file)}
      accept=".pdf,.jpg,.jpeg,.png"
      maxSizeMB={30}
      showPreview={true}
      existingFileUrl={files.existingReceiptVoucher}
      existingFileName={
       files.existingReceiptVoucher
        ? files.existingReceiptVoucher.split('/').pop()
        : ''
      }
      onRemoveExisting={() => onRemoveExisting('existingReceiptVoucher')}
     />
    </div>

    {/* Deposit Slip (conditional) */}
    {showDepositSlip && (
     <div className="payment-attachments__item">
      <label className="payment-attachments__label">
       {t('deposit_slip')}
      </label>
      <FileUpload
       value={files.depositSlip}
       onChange={file => onFileChange('depositSlip', file)}
       accept=".pdf,.jpg,.jpeg,.png"
       maxSizeMB={30}
       showPreview={true}
       existingFileUrl={files.existingDepositSlip}
       existingFileName={
        files.existingDepositSlip
         ? files.existingDepositSlip.split('/').pop()
         : ''
       }
       onRemoveExisting={() => onRemoveExisting('existingDepositSlip')}
      />
     </div>
    )}

    {/* Bank Payment Attachments */}
    <div className="payment-attachments__item">
     <label className="payment-attachments__label">
      {t('bank_payment_attachments')}
     </label>
     <FileUpload
      value={files.bankPaymentAttachments}
      onChange={file => onFileChange('bankPaymentAttachments', file)}
      accept=".pdf,.jpg,.jpeg,.png"
      maxSizeMB={30}
      showPreview={true}
      existingFileUrl={files.existingBankPaymentAttachments}
      existingFileName={
       files.existingBankPaymentAttachments
        ? files.existingBankPaymentAttachments.split('/').pop()
        : ''
      }
      onRemoveExisting={() => onRemoveExisting('existingBankPaymentAttachments')}
     />
    </div>
   </div>
  </div>
 </div>
 );
});

PaymentAttachmentsSection.displayName = 'PaymentAttachmentsSection';

export default PaymentAttachmentsSection;
