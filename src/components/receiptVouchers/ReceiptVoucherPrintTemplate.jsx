import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "../../utils/formatters";
import BilField from "../common/BilField";
import { buildFileUrl } from "../../utils/helpers/file";
import { QRCodeSVG } from "qrcode.react";
import useBilingual from "../../hooks/useBilingual";
import "./ReceiptVoucherPrintTemplate.css";

/**
 * Professional Bilingual A4 Receipt Voucher Template (Arabic + English)
 * Enterprise-grade accounting document with QR code
 */
export default function ReceiptVoucherPrintTemplate({
  voucher,
  project,
  company,
  hideControls = false,
}) {
  const { i18n } = useTranslation();
  const bil = useBilingual();

  // QR data
  const qrData = useMemo(() => JSON.stringify({
    type: "RECEIPT_VOUCHER",
    voucher_number: voucher.voucher_number,
    amount: voucher.amount,
    date: voucher.date,
    project: project?.display_name || project?.name || project?.id,
    company: company?.name,
    received_from: voucher.received_from,
  }), [voucher, project, company]);

  // Logo
  const logoUrl = useMemo(() => {
    let url = company?.logo;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [company?.logo]);

  const creditRemaining = parseFloat(voucher.credit_remaining) || 0;
  const creditDeducted = parseFloat(voucher.credit_deducted) || 0;

  return (
    <div className={`rv-print-container${hideControls ? " rv-print-container--embedded" : ""}`}>

      {/* BILINGUAL A4 DOCUMENT */}
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
            <h2 className="bil-header__title-ar">{bil("rv_print_title").ar}</h2>
            <h3 className="bil-header__title-en">{bil("rv_print_title").en}</h3>
          </div>
        </div>

        {/* META BAR */}
        <div className="bil-meta-bar">
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("rv_print_voucher_number").ar}</span>
              <span>{bil("rv_print_voucher_number").en}</span>
            </span>
            <span className="bil-meta-item__value">{voucher.voucher_number}</span>
          </div>
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("rv_print_date").ar}</span>
              <span>{bil("rv_print_date").en}</span>
            </span>
            <span className="bil-meta-item__value">{formatDate(voucher.date, "en")}</span>
          </div>
        </div>

        {/* AMOUNT BAR */}
        <div className="bil-amount-bar">
          <div className="bil-amount-bar__label">
            <span>{bil("rv_print_amount").ar}</span>
            <span>{bil("rv_print_amount").en}</span>
          </div>
          <div className="bil-amount-bar__value">{formatMoney(voucher.amount)}</div>
        </div>

        {/* TWO COLUMNS */}
        <div className="bil-columns">
          {/* LEFT COLUMN */}
          <div className="bil-col">
            {/* Received From */}
            <div className="bil-section">
              <div className="bil-section__header">
                <span>{bil("rv_print_received_from_title").ar}</span>
                <span>{bil("rv_print_received_from_title").en}</span>
              </div>
              <div className="bil-section__body">
                <BilField label={bil("rv_print_received_from")} value={voucher.received_from || "-"} />
              </div>
            </div>

            {/* Purpose */}
            {voucher.purpose && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("rv_print_purpose_title").ar}</span>
                  <span>{bil("rv_print_purpose_title").en}</span>
                </div>
                <div className="bil-section__body">
                  <div className="bil-field">
                    <span className="bil-field__value rv-purpose-text">{voucher.purpose}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Project Info */}
            {project && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("rv_print_project_info").ar}</span>
                  <span>{bil("rv_print_project_info").en}</span>
                </div>
                <div className="bil-section__body">
                  <BilField label={bil("rv_print_project_name")} value={project.display_name || project.name || `#${project.id}`} />
                  {project.internal_code && (
                    <BilField label={bil("rv_print_project_code")} value={project.internal_code} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="bil-col">
            {/* Invoice Info */}
            {voucher.invoice_number && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("rv_print_invoice_info").ar}</span>
                  <span>{bil("rv_print_invoice_info").en}</span>
                </div>
                <div className="bil-section__body">
                  <BilField label={bil("rv_print_invoice_number")} value={voucher.invoice_number} />
                  <BilField label={bil("rv_print_invoice_covered")} value={formatMoney(voucher.invoice_amount_covered)} />
                </div>
              </div>
            )}

            {/* Credit Balance */}
            {creditRemaining > 0 && (
              <div className="bil-section rv-section--credit">
                <div className="bil-section__header rv-section-header--credit">
                  <span>{bil("rv_print_credit_balance").ar}</span>
                  <span>{bil("rv_print_credit_balance").en}</span>
                </div>
                <div className="bil-section__body">
                  <BilField
                    label={bil("rv_print_credit_remaining")}
                    value={formatMoney(creditRemaining)}
                    highlight
                  />
                </div>
              </div>
            )}

            {/* Credit Deduction Reference */}
            {creditDeducted > 0 && voucher.credit_source_voucher_number && (
              <div className="bil-section rv-section--deduction">
                <div className="bil-section__header rv-section-header--deduction">
                  <span>{bil("rv_print_credit_deduction").ar}</span>
                  <span>{bil("rv_print_credit_deduction").en}</span>
                </div>
                <div className="bil-section__body">
                  <BilField
                    label={bil("rv_print_deducted_amount")}
                    value={formatMoney(creditDeducted)}
                  />
                  <BilField
                    label={bil("rv_print_source_voucher")}
                    value={voucher.credit_source_voucher_number}
                    highlight
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            {voucher.notes && (
              <div className="bil-section">
                <div className="bil-section__header">
                  <span>{bil("rv_print_notes").ar}</span>
                  <span>{bil("rv_print_notes").en}</span>
                </div>
                <div className="bil-section__body">
                  <div className="bil-field">
                    <span className="bil-field__value rv-purpose-text">{voucher.notes}</span>
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
            <p>{bil("rv_print_signature").ar}</p>
            <p className="bil-footer__en">{bil("rv_print_signature").en}</p>
          </div>
          <div className="bil-footer__stamp">
            <p>{bil("invoice_print_company_stamp").ar || "Company Stamp"}</p>
            <p className="bil-footer__en">{bil("invoice_print_company_stamp").en || "Company Stamp"}</p>
          </div>
          <div className="bil-footer__date">
            <p>{bil("rv_print_print_date").ar}: {formatDate(new Date(), "en")}</p>
            <p className="bil-footer__en">{bil("rv_print_print_date").en}: {formatDate(new Date(), "en")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
