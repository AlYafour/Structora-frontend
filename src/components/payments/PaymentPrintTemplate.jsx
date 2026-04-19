import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "../../utils/formatters";
import Button from "../common/Button";
import BilField from "../common/BilField";
import { buildFileUrl, extractFileNameFromUrl } from "../../utils/helpers/file";
import { handleFileClick } from "../../utils/helpers/file";
import { QRCodeSVG } from "qrcode.react";
import useBilingual from "../../hooks/useBilingual";
import "./PaymentPrintTemplate.css";

/**
 * Professional Bilingual A4 Payment Template (Arabic + English)
 * Enterprise-grade with QR code — always shows both languages
 */
export default function PaymentPrintTemplate({
  payment,
  project,
  company,
  onClose,
  hideControls = false,
}) {
  const { t, i18n } = useTranslation();
  const bil = useBilingual();

  const getPayerBil = (payer) => ({
    ar: payer === "bank" ? bil("payment_print_bank").ar : bil("payment_print_owner").ar,
    en: payer === "bank" ? bil("payment_print_bank").en : bil("payment_print_owner").en,
  });

  const getMethodBil = (method) => ({
    ar: bil(`payment_print_${method}`).ar || method,
    en: bil(`payment_print_${method}`).en || method,
  });

  // QR data
  const qrData = useMemo(() => JSON.stringify({
    type: "PAYMENT_RECEIPT",
    id: payment.id,
    amount: payment.amount,
    date: payment.date,
    method: payment.payment_method,
    payer: payment.payer,
    project: project?.display_name || project?.name || project?.id,
    company: company?.name,
  }), [payment, project, company]);

  // Attachments
  const attachments = useMemo(() => {
    const hasFile = (url) => url && typeof url === "string" && url.trim() !== "" && url !== "null" && url !== "undefined";
    const list = [];
    if (hasFile(payment.deposit_slip)) list.push({ label: bil("payment_print_deposit_slip"), url: payment.deposit_slip, name: payment.deposit_slip_name || extractFileNameFromUrl(payment.deposit_slip) });
    if (hasFile(payment.invoice_file)) list.push({ label: bil("payment_print_invoice_file"), url: payment.invoice_file, name: payment.invoice_file_name || extractFileNameFromUrl(payment.invoice_file) });
    if (hasFile(payment.receipt_voucher)) list.push({ label: bil("payment_print_receipt_voucher"), url: payment.receipt_voucher, name: payment.receipt_voucher_name || extractFileNameFromUrl(payment.receipt_voucher) });
    if (hasFile(payment.bank_payment_attachments)) list.push({ label: bil("payment_print_bank_payment_attachments"), url: payment.bank_payment_attachments, name: payment.bank_payment_attachments_name || extractFileNameFromUrl(payment.bank_payment_attachments) });
    return list;
  }, [payment, bil]);

  // Logo
  const logoUrl = useMemo(() => {
    let url = company?.logo;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [company?.logo]);

  return (
    <div className={`payment-print-container${hideControls ? " payment-print-container--embedded" : ""}`}>
      {/* Controls */}
      {!hideControls && (
        <div className="payment-print-controls no-print">
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
            <h2 className="bil-header__title-ar">{bil("payment_print_title").ar}</h2>
            <h3 className="bil-header__title-en">{bil("payment_print_title").en}</h3>
          </div>
        </div>

        {/* META BAR */}
        <div className="bil-meta-bar">
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("payment_print_payment_number").ar}</span>
              <span>{bil("payment_print_payment_number").en}</span>
            </span>
            <span className="bil-meta-item__value">#{payment.id}</span>
          </div>
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("payment_print_date").ar}</span>
              <span>{bil("payment_print_date").en}</span>
            </span>
            <span className="bil-meta-item__value">{formatDate(payment.date, "en")}</span>
          </div>
        </div>

        {/* AMOUNT BAR */}
        <div className="bil-amount-bar">
          <div className="bil-amount-bar__label">
            <span>{bil("payment_print_amount").ar}</span>
            <span>{bil("payment_print_amount").en}</span>
          </div>
          <div className="bil-amount-bar__value">{formatMoney(payment.amount)}</div>
        </div>

        {/* TWO COLUMNS */}
        <div className="bil-columns">
          {/* LEFT COLUMN */}
          <div className="bil-col">
            {/* Project Info */}
            {project && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("payment_print_project_information").ar}</span>
                  <span>{bil("payment_print_project_information").en}</span>
                </div>
                <div className="bil-section__body">
                  <BilField label={bil("payment_print_project_name")} value={project.display_name || project.name || `#${project.id}`} />
                  {project.internal_code && (
                    <BilField label={bil("payment_print_internal_code")} value={project.internal_code} />
                  )}
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="bil-section">
              <div className="bil-section__header">
                <span>{bil("payment_print_details").ar}</span>
                <span>{bil("payment_print_details").en}</span>
              </div>
              <div className="bil-section__body">
                <BilField label={bil("payment_print_payer")} value={`${getPayerBil(payment.payer).ar} / ${getPayerBil(payment.payer).en}`} />
                <BilField label={bil("payment_print_payment_method")} value={`${getMethodBil(payment.payment_method).ar} / ${getMethodBil(payment.payment_method).en}`} />
                {payment.description && (
                  <BilField label={bil("payment_print_description")} value={payment.description} />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="bil-col">
            {/* Bank Details */}
            {payment.payer === "bank" && (payment.project_financial_account || payment.completion_percentage) && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("payment_print_bank_payment_details").ar}</span>
                  <span>{bil("payment_print_bank_payment_details").en}</span>
                </div>
                <div className="bil-section__body">
                  {payment.project_financial_account && (
                    <BilField label={bil("payment_print_project_financial_account")} value={payment.project_financial_account} />
                  )}
                  {payment.completion_percentage && (
                    <BilField label={bil("payment_print_completion_percentage")} value={`${payment.completion_percentage}%`} />
                  )}
                </div>
              </div>
            )}

            {/* Transfer / Deposit / Cheque */}
            {(payment.payment_method === "bank_transfer" || payment.payment_method === "cash_deposit" || payment.payment_method === "bank_cheque") && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil(payment.payment_method === "bank_transfer" ? "payment_print_bank_transfer_details" : payment.payment_method === "cash_deposit" ? "payment_print_cash_deposit_details" : "payment_print_bank_cheque_details").ar}</span>
                  <span>{bil(payment.payment_method === "bank_transfer" ? "payment_print_bank_transfer_details" : payment.payment_method === "cash_deposit" ? "payment_print_cash_deposit_details" : "payment_print_bank_cheque_details").en}</span>
                </div>
                <div className="bil-section__body">
                  {payment.payment_method === "bank_transfer" && (
                    <>
                      {payment.recipient_account_number && <BilField label={bil("payment_print_recipient_account_number")} value={payment.recipient_account_number} />}
                      {payment.sender_account_number && <BilField label={bil("payment_print_sender_account_number")} value={payment.sender_account_number} />}
                    </>
                  )}
                  {payment.payment_method === "cash_deposit" && payment.payer === "owner" && (
                    <>
                      {payment.recipient_account_number && <BilField label={bil("payment_print_recipient_account_number")} value={payment.recipient_account_number} />}
                      {payment.sender_account_number && <BilField label={bil("payment_print_sender_account_number")} value={payment.sender_account_number} />}
                    </>
                  )}
                  {payment.payment_method === "bank_cheque" && (
                    <>
                      {payment.cheque_holder_name && <BilField label={bil("payment_print_cheque_holder_name")} value={payment.cheque_holder_name} />}
                      {payment.cheque_account_number && <BilField label={bil("payment_print_cheque_account_number")} value={payment.cheque_account_number} />}
                      {payment.cheque_date && <BilField label={bil("payment_print_cheque_date")} value={formatDate(payment.cheque_date, "en")} />}
                    </>
                  )}
                  {payment.transferor_name && <BilField label={bil("payment_print_transferor_name")} value={payment.transferor_name} />}
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

        {/* ATTACHMENTS */}
        {attachments.length > 0 && (
          <div className="bil-section bil-section--full">
            <div className="bil-section__header">
              <span>{bil("payment_print_attachments").ar}</span>
              <span>{bil("payment_print_attachments").en}</span>
            </div>
            <div className="bil-attachments">
              {attachments.map((att) => (
                <a key={att.url || att.name} href={buildFileUrl(att.url)}
                  onClick={handleFileClick(att.url, att.name)}
                  className="bil-attachment" target="_blank" rel="noopener noreferrer"
                >
                  <span className="bil-attachment__label">{att.label.ar}</span>
                  {att.name || bil("payment_print_view_file").ar}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="bil-footer">
          <div className="bil-footer__sig">
            <div className="bil-footer__sig-line"></div>
            <p>{bil("payment_print_signature").ar}</p>
            <p className="bil-footer__en">{bil("payment_print_signature").en}</p>
          </div>
          <div className="bil-footer__stamp">
            <p>{bil("invoice_print_company_stamp").ar || t("invoice_print_company_stamp")}</p>
            <p className="bil-footer__en">{bil("invoice_print_company_stamp").en || "Company Stamp"}</p>
          </div>
          <div className="bil-footer__date">
            <p>{bil("payment_print_print_date").ar}: {formatDate(new Date(), "en")}</p>
            <p className="bil-footer__en">{bil("payment_print_print_date").en}: {formatDate(new Date(), "en")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
