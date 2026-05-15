import UnifiedFinancialPrintTemplate from "../print/UnifiedFinancialPrintTemplate";

export default function PaymentPrintTemplate(props) {
  return (
    <UnifiedFinancialPrintTemplate
      documentType="payment"
      data={props.payment}
      project={props.project}
      company={props.company}
      onClose={props.onClose}
      hideControls={props.hideControls}
    />
  );
}
