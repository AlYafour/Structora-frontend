import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "../../utils/formatters";
import Button from "../common/Button";
import BilField from "../common/BilField";
import { buildFileUrl } from "../../utils/helpers/file";
import { handleFileClick } from "../../utils/helpers/file";
import { projectApi } from "../../services";
import { QRCodeSVG } from "qrcode.react";
import useBilingual from "../../hooks/useBilingual";
import "./InvoicePrintTemplate.css";

/**
 * Professional Bilingual A4 Invoice Template (Arabic + English)
 * Enterprise-grade with QR code — always shows both languages
 */
export default function InvoicePrintTemplate({
  invoice,
  project,
  company,
  onClose,
  hideControls = false,
}) {
  const { t, i18n } = useTranslation();
  const bil = useBilingual();
  const [attachments, setAttachments] = useState([]);
  const [variations, setVariations] = useState([]);

  // Load attachments
  useEffect(() => {
    if (!invoice?.id || !invoice?.project) return;
    (async () => {
      try {
        const response = await projectApi.getAttachments({
          model: "actualinvoice",
          object_id: invoice.id.toString(),
        });
        setAttachments(Array.isArray(response) ? response : (response?.results || response?.items || []));
      } catch {
        /* attachments are optional for print view; fall back to empty */
        setAttachments([]);
      }
    })();
  }, [invoice?.id, invoice?.project]);

  // Load variations
  useEffect(() => {
    if (!invoice?.project) return;
    (async () => {
      try {
        const data = await projectApi.getVariations(invoice.project);
        setVariations(Array.isArray(data) ? data : (data?.results || data?.items || []));
      } catch {
        /* variations are optional for print view; fall back to empty */
        setVariations([]);
      }
    })();
  }, [invoice?.project]);

  // Amounts
  const netAmount = parseFloat(invoice.net_amount || 0);
  const vatAmount = parseFloat(invoice.vat || 0);
  const grandTotal = parseFloat(invoice.amount || 0);
  const subtotal = netAmount > 0 ? netAmount : grandTotal / 1.05;
  const vat = vatAmount > 0 ? vatAmount : subtotal * 0.05;
  const total = grandTotal > 0 ? grandTotal : subtotal + vat;
  const advanceDeduction = parseFloat(invoice.advance_deduction_amount || 0);
  const netPayable = total - advanceDeduction;

  // QR data
  const qrData = useMemo(() => JSON.stringify({
    type: "INVOICE",
    id: invoice.id,
    number: invoice.invoice_number || invoice.id,
    amount: total,
    vat,
    date: invoice.invoice_date,
    company: company?.name,
    vat_number: company?.vat_number,
  }), [invoice, total, vat, company]);

  // Logo
  const logoUrl = useMemo(() => {
    let url = company?.logo;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [company?.logo]);

  return (
    <div className={`invoice-print-container${hideControls ? " invoice-print-container--embedded" : ""}`}>
      {/* Print Controls */}
      {!hideControls && (
        <div className="invoice-print-controls no-print">
          <Button variant="secondary" onClick={onClose}>{t("back")}</Button>
          <Button variant="primary" onClick={() => window.print()}>{t("print")}</Button>
        </div>
      )}

      {/* ═══ BILINGUAL A4 DOCUMENT ═══ */}
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
              {company?.phone && <p className="bil-header__detail">{"\u200E"}{company.phone}</p>}
              {company?.email && <p className="bil-header__detail">{company.email}</p>}
              {company?.vat_number && (
                <p className="bil-header__detail">
                  {bil("vat_registration").ar} / {bil("vat_registration").en}: {company.vat_number}
                </p>
              )}
            </div>
          </div>
          <div className="bil-header__title-block">
            <h2 className="bil-header__title-ar">{bil("invoice_print_title").ar}</h2>
            <h3 className="bil-header__title-en">{bil("invoice_print_title").en}</h3>
          </div>
        </div>

        {/* META BAR */}
        <div className="bil-meta-bar">
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("invoice_print_invoice_number").ar}</span>
              <span>{bil("invoice_print_invoice_number").en}</span>
            </span>
            <span className="bil-meta-item__value">{invoice.invoice_number || `#${invoice.id}`}</span>
          </div>
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("invoice_print_date").ar}</span>
              <span>{bil("invoice_print_date").en}</span>
            </span>
            <span className="bil-meta-item__value">{formatDate(invoice.invoice_date, "en")}</span>
          </div>
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("invoice_print_payer").ar}</span>
              <span>{bil("invoice_print_payer").en}</span>
            </span>
            <span className="bil-meta-item__value">
              {invoice.payer === "bank"
                ? `${bil("invoice_print_bank").ar} / ${bil("invoice_print_bank").en}`
                : `${bil("invoice_print_owner").ar} / ${bil("invoice_print_owner").en}`}
            </span>
          </div>
          {invoice.stage && (
            <div className="bil-meta-item">
              <span className="bil-meta-item__labels">
                <span>{bil("invoice_print_stage").ar}</span>
                <span>{bil("invoice_print_stage").en}</span>
              </span>
              <span className="bil-meta-item__value">{invoice.stage}</span>
            </div>
          )}
        </div>

        {/* AMOUNT BAR */}
        <div className="bil-amount-bar">
          <div className="bil-amount-bar__label">
            <span>{bil("invoice_print_grand_total").ar}</span>
            <span>{bil("invoice_print_grand_total").en}</span>
          </div>
          <div className="bil-amount-bar__value">{formatMoney(total)}</div>
        </div>

        {/* CLIENT / PROJECT INFO */}
        <div className="bil-section">
          <div className="bil-section__header">
            <span>{bil("invoice_print_client_information").ar}</span>
            <span>{bil("invoice_print_client_information").en}</span>
          </div>
          <div className="bil-section__grid">
            <BilField
              label={bil("invoice_print_project_name")}
              value={project?.display_name || project?.name || `#${project?.id}`}
            />
            {project?.plot_number && (
              <BilField label={bil("invoice_print_plot_number")} value={project.plot_number} />
            )}
            {project?.owners?.filter((o) => o.is_authorized).length > 0 && (
              <BilField
                label={bil("invoice_print_owner_name")}
                value={
                  project.owners.filter((o) => o.is_authorized).map((o) => {
                    const ar = o.owner_name_ar || o.name || "";
                    const en = o.owner_name_en || "";
                    return en ? (
                      <span key={o.id || ar}>
                        <span>{ar}</span>
                        <br />
                        <span style={{ fontSize: '8pt', color: '#64748b' }}>{en}</span>
                      </span>
                    ) : ar;
                  })
                }
              />
            )}
            {project?.consultant && (
              <BilField label={bil("invoice_print_consultant")} value={project.consultant} />
            )}
            {project?.contract?.gross_total && (
              <BilField
                label={bil("invoice_print_contract_value")}
                value={formatMoney(project.contract.gross_total)}
              />
            )}
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="bil-section">
          <div className="bil-section__header">
            <span>{bil("invoice_print_details").ar}</span>
            <span>{bil("invoice_print_details").en}</span>
          </div>
          <table className="bil-table">
            <thead>
              <tr>
                <th className="col-num">
                  <span>#</span>
                </th>
                <th className="col-desc">
                  <span className="bil-th">{bil("invoice_print_description").ar}</span>
                  <span className="bil-th bil-th--en">{bil("invoice_print_description").en}</span>
                </th>
                {invoice.payer === "owner" && (
                  <th className="col-var">
                    <span className="bil-th">{bil("invoice_print_variation").ar}</span>
                    <span className="bil-th bil-th--en">{bil("invoice_print_variation").en}</span>
                  </th>
                )}
                <th className="col-qty">
                  <span className="bil-th">{bil("invoice_print_quantity").ar}</span>
                  <span className="bil-th bil-th--en">{bil("invoice_print_quantity").en}</span>
                </th>
                <th className="col-price">
                  <span className="bil-th">{bil("invoice_print_unit_price").ar}</span>
                  <span className="bil-th bil-th--en">{bil("invoice_print_unit_price").en}</span>
                </th>
                <th className="col-total">
                  <span className="bil-th">{bil("invoice_print_total").ar}</span>
                  <span className="bil-th bil-th--en">{bil("invoice_print_total").en}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => {
                  const variation = item.variation_id ? variations.find((v) => v.id === item.variation_id) : null;
                  const varLabel = variation
                    ? (variation.variation_number || `#${variation.id}`)
                    : `${bil("invoice_print_base_contract").ar}`;
                  return (
                    <tr key={item.id || `item-${idx}`}>
                      <td className="col-num">{idx + 1}</td>
                      <td className="col-desc">{item.description || ""}</td>
                      {invoice.payer === "owner" && <td className="col-var">{varLabel}</td>}
                      <td className="col-qty">{item.quantity || 0}</td>
                      <td className="col-price">{formatMoney(item.unit_price || 0)}</td>
                      <td className="col-total">{formatMoney(item.total || (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)) || 0)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="col-num">1</td>
                  <td className="col-desc">{invoice.description || bil("invoice_print_invoice_amount").ar}</td>
                  <td className="col-qty">1</td>
                  <td className="col-price">{formatMoney(subtotal)}</td>
                  <td className="col-total">{formatMoney(subtotal)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SUMMARY ROW */}
        <div className="bil-summary">
          <div className="bil-summary__left">
            {invoice.payment_id && (
              <div className="bil-summary__note">
                <strong>{bil("invoice_print_payment_reference").ar} / {bil("invoice_print_payment_reference").en}:</strong> #{invoice.payment_id}
              </div>
            )}
            {invoice.description && (
              <div className="bil-summary__note">
                <strong>{bil("invoice_print_notes").ar} / {bil("invoice_print_notes").en}:</strong> {invoice.description}
              </div>
            )}
            <div className="bil-qr">
              <QRCodeSVG value={qrData} size={100} level="M" includeMargin={false} />
              <p className="bil-qr__text">Scan to verify</p>
            </div>
          </div>
          <div className="bil-summary__right">
            <table className="bil-totals">
              <tbody>
                <tr>
                  <td className="bil-totals__label">
                    {bil("invoice_print_subtotal").ar}<br />
                    <span className="bil-totals__en">{bil("invoice_print_subtotal").en}</span>
                  </td>
                  <td className="bil-totals__value">{formatMoney(subtotal)}</td>
                </tr>
                <tr>
                  <td className="bil-totals__label">
                    {bil("invoice_print_vat").ar}<br />
                    <span className="bil-totals__en">{bil("invoice_print_vat").en}</span>
                  </td>
                  <td className="bil-totals__value">{formatMoney(vat)}</td>
                </tr>
                <tr className="bil-totals__grand">
                  <td className="bil-totals__label">
                    {bil("invoice_print_grand_total").ar}<br />
                    <span className="bil-totals__en">{bil("invoice_print_grand_total").en}</span>
                  </td>
                  <td className="bil-totals__value">{formatMoney(total)}</td>
                </tr>
                {advanceDeduction > 0 && (
                  <>
                    <tr className="bil-totals__deduction">
                      <td className="bil-totals__label">
                        {bil("invoice_print_advance_deduction").ar}<br />
                        <span className="bil-totals__en">{bil("invoice_print_advance_deduction").en}</span>
                      </td>
                      <td className="bil-totals__value" style={{ color: '#dc2626' }}>
                        ({formatMoney(advanceDeduction)})
                      </td>
                    </tr>
                    <tr className="bil-totals__net-payable">
                      <td className="bil-totals__label">
                        {bil("invoice_print_net_payable").ar}<br />
                        <span className="bil-totals__en">{bil("invoice_print_net_payable").en}</span>
                      </td>
                      <td className="bil-totals__value">{formatMoney(netPayable)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ATTACHMENTS */}
        {attachments.length > 0 && (
          <div className="bil-section bil-section--compact">
            <div className="bil-section__header">
              <span>{bil("invoice_print_attachments").ar}</span>
              <span>{bil("invoice_print_attachments").en}</span>
            </div>
            <div className="bil-attachments">
              {attachments.map((att, i) => (
                <a key={att.id || i}
                  href={buildFileUrl(att.file_url || att.file_path)}
                  onClick={handleFileClick(att.file_url || att.file_path, att.file_name)}
                  className="bil-attachment" target="_blank" rel="noopener noreferrer"
                >
                  {att.file_name || bil("invoice_print_view_file").ar}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="bil-footer">
          <div className="bil-footer__sig">
            <div className="bil-footer__sig-line"></div>
            <p>{bil("invoice_print_authorized_signature").ar}</p>
            <p className="bil-footer__en">{bil("invoice_print_authorized_signature").en}</p>
          </div>
          <div className="bil-footer__stamp">
            <p>{bil("invoice_print_company_stamp").ar}</p>
            <p className="bil-footer__en">{bil("invoice_print_company_stamp").en}</p>
          </div>
          <div className="bil-footer__sig">
            <div className="bil-footer__sig-line"></div>
            <p>{bil("invoice_print_received_by").ar}</p>
            <p className="bil-footer__en">{bil("invoice_print_received_by").en}</p>
          </div>
        </div>

        <p className="bil-notice">
          {bil("invoice_print_electronic_notice").ar}
          <br />
          {bil("invoice_print_electronic_notice").en}
        </p>
      </div>
    </div>
  );
}
