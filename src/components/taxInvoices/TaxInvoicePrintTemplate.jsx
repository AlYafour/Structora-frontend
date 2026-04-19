import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "../../utils/formatters";
import BilField from "../common/BilField";
import { buildFileUrl } from "../../utils/helpers/file";
import { QRCodeSVG } from "qrcode.react";
import useBilingual from "../../hooks/useBilingual";
import "./TaxInvoicePrintTemplate.css";

export default function TaxInvoicePrintTemplate({
  taxInvoice,
  project,
  company,
}) {
  const { i18n } = useTranslation();
  const bil = useBilingual();

  const qrData = useMemo(() => JSON.stringify({
    type: "TAX_INVOICE",
    invoice_number: taxInvoice.tax_invoice_number,
    net_amount: taxInvoice.net_amount,
    vat_amount: taxInvoice.vat_amount,
    gross_amount: taxInvoice.gross_amount,
    vat_rate: taxInvoice.vat_rate,
    date: taxInvoice.date,
    project: project?.display_name || project?.name || project?.id,
    company: company?.name,
  }), [taxInvoice, project, company]);

  const logoUrl = useMemo(() => {
    let url = company?.logo;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [company?.logo]);

  return (
    <div className="ti-print-container">
      <div className="bil-doc" dir="rtl">

        {/* HEADER */}
        <div className="bil-header">
          <div className="bil-header__company">
            {logoUrl && (
              <img src={logoUrl} alt={company?.name || "Company logo"} className="bil-header__logo"
                onError={(e) => { e.target.style.display = "none"; }} />
            )}
            <div className="bil-header__company-text">
              <h1 className="bil-header__name">{company?.name || ""}</h1>
              {company?.name_en && <p className="bil-header__name-en">{company.name_en}</p>}
              {company?.address && <p className="bil-header__detail">{company.address}</p>}
              {company?.phone && <p className="bil-header__detail">{company.phone}</p>}
              {company?.email && <p className="bil-header__detail">{company.email}</p>}
              {company?.vat_number && (
                <p className="bil-header__detail">
                  {bil("vat_registration").ar} / {bil("vat_registration").en}: {company.vat_number}
                </p>
              )}
            </div>
          </div>
          <div className="bil-header__title-block">
            <h2 className="bil-header__title-ar">{bil("ti_print_title").ar}</h2>
            <h3 className="bil-header__title-en">{bil("ti_print_title").en}</h3>
          </div>
        </div>

        {/* META BAR */}
        <div className="bil-meta-bar">
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("ti_print_invoice_number").ar}</span>
              <span>{bil("ti_print_invoice_number").en}</span>
            </span>
            <span className="bil-meta-item__value">{taxInvoice.tax_invoice_number}</span>
          </div>
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("ti_print_date").ar}</span>
              <span>{bil("ti_print_date").en}</span>
            </span>
            <span className="bil-meta-item__value">{formatDate(taxInvoice.date, "en")}</span>
          </div>
        </div>

        {/* AMOUNT BREAKDOWN TABLE */}
        <div className="ti-amount-section">
          <div className="bil-section__header">
            <span>{bil("ti_print_amount_breakdown").ar}</span>
            <span>{bil("ti_print_amount_breakdown").en}</span>
          </div>
          <table className="ti-amount-table">
            <thead>
              <tr>
                <th style={{ textAlign: "right" }}>
                  <span className="bil-field__ar">البيان</span>
                  <span className="bil-field__en" style={{ marginInlineStart: "8px" }}>Description</span>
                </th>
                <th style={{ textAlign: "left", width: "200px" }}>
                  <span className="bil-field__ar">المبلغ</span>
                  <span className="bil-field__en" style={{ marginInlineStart: "8px" }}>Amount</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="bil-field__ar">{bil("ti_print_net_amount").ar}</span>
                  <span className="bil-field__en" style={{ marginInlineStart: "8px" }}>{bil("ti_print_net_amount").en}</span>
                </td>
                <td className="ti-amount-cell">{formatMoney(taxInvoice.net_amount)}</td>
              </tr>
              <tr>
                <td>
                  <span className="bil-field__ar">{bil("ti_print_vat_rate").ar}</span>
                  <span className="bil-field__en" style={{ marginInlineStart: "8px" }}>{bil("ti_print_vat_rate").en}</span>
                </td>
                <td className="ti-amount-cell">{parseFloat(taxInvoice.vat_rate) || 5}%</td>
              </tr>
              <tr>
                <td>
                  <span className="bil-field__ar">{bil("ti_print_vat_amount").ar}</span>
                  <span className="bil-field__en" style={{ marginInlineStart: "8px" }}>{bil("ti_print_vat_amount").en}</span>
                </td>
                <td className="ti-amount-cell">{formatMoney(taxInvoice.vat_amount)}</td>
              </tr>
              <tr className="ti-total-row">
                <td>
                  <strong>
                    <span className="bil-field__ar">{bil("ti_print_gross_amount").ar}</span>
                    <span className="bil-field__en" style={{ marginInlineStart: "8px" }}>{bil("ti_print_gross_amount").en}</span>
                  </strong>
                </td>
                <td className="ti-amount-cell ti-amount-cell--total">
                  <strong>{formatMoney(taxInvoice.gross_amount)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TWO COLUMNS */}
        <div className="bil-columns">
          {/* LEFT COLUMN */}
          <div className="bil-col">
            {/* Project Info */}
            {project && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("ti_print_project_info").ar}</span>
                  <span>{bil("ti_print_project_info").en}</span>
                </div>
                <div className="bil-section__body">
                  <BilField label={bil("ti_print_project_name")} value={project.display_name || project.name || `#${project.id}`} />
                  {project.internal_code && (
                    <BilField label={bil("ti_print_project_code")} value={project.internal_code} />
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {taxInvoice.description && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("ti_print_description").ar}</span>
                  <span>{bil("ti_print_description").en}</span>
                </div>
                <div className="bil-section__body">
                  <div className="bil-field">
                    <span className="bil-field__value">{taxInvoice.description}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="bil-col">
            {/* Linked Invoice */}
            {taxInvoice.invoice_number && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("ti_print_invoice_info").ar}</span>
                  <span>{bil("ti_print_invoice_info").en}</span>
                </div>
                <div className="bil-section__body">
                  <BilField label={bil("ti_print_linked_invoice_number")} value={taxInvoice.invoice_number} />
                </div>
              </div>
            )}

            {/* Notes */}
            {taxInvoice.notes && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("ti_print_notes").ar}</span>
                  <span>{bil("ti_print_notes").en}</span>
                </div>
                <div className="bil-section__body">
                  <div className="bil-field">
                    <span className="bil-field__value">{taxInvoice.notes}</span>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code */}
            <div className="bil-qr">
              <QRCodeSVG value={qrData} size={100} level="M" includeMargin={false} />
              <p className="bil-qr__text">Scan to verify</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bil-footer">
          <div className="bil-footer__sig">
            <div className="bil-footer__sig-line"></div>
            <p>{bil("ti_print_signature").ar}</p>
            <p className="bil-footer__en">{bil("ti_print_signature").en}</p>
          </div>
          <div className="bil-footer__stamp">
            <p>{bil("invoice_print_company_stamp").ar || "Company Stamp"}</p>
            <p className="bil-footer__en">{bil("invoice_print_company_stamp").en || "Company Stamp"}</p>
          </div>
          <div className="bil-footer__date">
            <p>{bil("ti_print_print_date").ar}: {formatDate(new Date(), "en")}</p>
            <p className="bil-footer__en">{bil("ti_print_print_date").en}: {formatDate(new Date(), "en")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
