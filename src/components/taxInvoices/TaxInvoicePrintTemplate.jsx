import UnifiedFinancialPrintTemplate from "../print/UnifiedFinancialPrintTemplate";

export default function TaxInvoicePrintTemplate(props) {
  return (
    <UnifiedFinancialPrintTemplate
      documentType="taxInvoice"
      data={props.taxInvoice}
      project={props.project}
      company={props.company}
      hideControls={props.hideControls ?? true}
    />
  );
}
