import UnifiedFinancialPrintTemplate from "../print/UnifiedFinancialPrintTemplate";

export default function InvoicePrintTemplate(props) {
  return (
    <UnifiedFinancialPrintTemplate
      documentType="invoice"
      data={props.invoice}
      project={props.project}
      company={props.company}
      onClose={props.onClose}
      hideControls={props.hideControls}
    />
  );
}
