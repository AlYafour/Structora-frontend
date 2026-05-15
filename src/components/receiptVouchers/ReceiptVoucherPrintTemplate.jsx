import UnifiedFinancialPrintTemplate from "../print/UnifiedFinancialPrintTemplate";

export default function ReceiptVoucherPrintTemplate(props) {
  return (
    <UnifiedFinancialPrintTemplate
      documentType="receiptVoucher"
      data={props.voucher}
      project={props.project}
      company={props.company}
      hideControls={props.hideControls}
    />
  );
}
