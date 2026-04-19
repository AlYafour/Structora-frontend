import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "../../utils/formatters";
import Button from "../common/Button";
import BilField from "../common/BilField";
import { buildFileUrl } from "../../utils/helpers/file";
import { QRCodeSVG } from "qrcode.react";
import useBilingual from "../../hooks/useBilingual";
import "./PaymentClaimPrintTemplate.css";

/**
 * Professional Bilingual A4 Payment Claim Print Template (Arabic + English)
 * Matches the design pattern of PaymentPrintTemplate and InvoicePrintTemplate
 */
export default function PaymentClaimPrintTemplate({
  claim,
  project,
  company,
  totals,
  onClose,
  hideControls = false,
}) {
  const { t, i18n } = useTranslation();
  const bil = useBilingual();

  // QR payload
  const qrData = useMemo(() => JSON.stringify({
    type: "PAYMENT_CLAIM",
    id: claim?.id,
    number: claim?.claim_number,
    amount: totals?.net_amount_due || 0,
    date: claim?.claim_date,
    project: project?.name,
    company: company?.name,
  }), [claim, totals, project, company]);

  // Logo URL resolution — identical to PaymentPrintTemplate pattern
  const logoUrl = useMemo(() => {
    let url = company?.logo;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [company?.logo]);

  // Financial values from totals + claim
  const cumulativeWorkDone = parseFloat(totals?.total_amount || 0);
  const materialsOnSite    = parseFloat(claim?.materials_on_site_value || 0);
  const variationsClaims   = parseFloat(claim?.variations_claims_amount || 0);
  const subtotal           = cumulativeWorkDone + materialsOnSite + variationsClaims;
  const advanceRecovery    = parseFloat(totals?.advance_recovery_amount || 0);
  const previousPayments   = parseFloat(totals?.previous_received_payments || 0);
  const otherDeductions    = parseFloat(totals?.other_deductions || 0);
  const netAmountDue       = parseFloat(totals?.net_amount_due || 0);

  // Owner name from siteplan
  const owners = project?.siteplan_data?.owners || [];
  const authorizedOwner = owners.find(o => o.is_authorized) || owners[0];
  const ownerName = authorizedOwner
    ? (authorizedOwner.owner_name_ar || authorizedOwner.owner_name_en || "")
    : "";

  // Contractor from contract_data
  const contractorName = project?.contract_data?.contractor_name || "";

  // Project number from license
  const projectNo = project?.license_data?.license_project_no
    || project?.license_data?.license_no
    || "";


  return (
    <div className={`pc-print-container${hideControls ? " pc-print-container--embedded" : ""}`}>
      {/* Controls — hidden when printing via @media print */}
      {!hideControls && (
        <div className="pc-print-controls no-print">
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
              <img
                src={logoUrl}
                alt={company?.name || "Company logo"}
                className="bil-header__logo"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <div className="bil-header__company-text">
              <h1 className="bil-header__name">{company?.name || ""}</h1>
              {company?.name_en && (
                <p className="bil-header__name-en">{company.name_en}</p>
              )}
              {company?.address && (
                <p className="bil-header__detail">{company.address}</p>
              )}
              {company?.phone && (
                <p className="bil-header__detail">{company.phone}</p>
              )}
              {company?.email && (
                <p className="bil-header__detail">{company.email}</p>
              )}
              {company?.vat_number && (
                <p className="bil-header__detail">
                  {bil("vat_registration").ar} / {bil("vat_registration").en}: {company.vat_number}
                </p>
              )}
            </div>
          </div>
          <div className="bil-header__title-block">
            <h2 className="bil-header__title-ar">{bil("pc_print_title").ar}</h2>
            <h3 className="bil-header__title-en">{bil("pc_print_title").en}</h3>
          </div>
        </div>

        {/* META BAR */}
        <div className="bil-meta-bar">
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("pc_print_claim_number").ar}</span>
              <span>{bil("pc_print_claim_number").en}</span>
            </span>
            <span className="bil-meta-item__value">
              {claim?.claim_number || `#${claim?.id}`}
            </span>
          </div>
          <div className="bil-meta-item">
            <span className="bil-meta-item__labels">
              <span>{bil("pc_print_date").ar}</span>
              <span>{bil("pc_print_date").en}</span>
            </span>
            <span className="bil-meta-item__value">
              {formatDate(claim?.claim_date, "en")}
            </span>
          </div>
          {projectNo && (
            <div className="bil-meta-item">
              <span className="bil-meta-item__labels">
                <span>{bil("pc_print_project_no").ar}</span>
                <span>{bil("pc_print_project_no").en}</span>
              </span>
              <span className="bil-meta-item__value">{projectNo}</span>
            </div>
          )}
        </div>

        {/* AMOUNT BAR */}
        <div className="bil-amount-bar">
          <div className="bil-amount-bar__label">
            <span>{bil("pc_print_net_amount_due").ar}</span>
            <span>{bil("pc_print_net_amount_due").en}</span>
          </div>
          <div className="bil-amount-bar__value">{formatMoney(netAmountDue)}</div>
        </div>

        {/* PROJECT INFORMATION */}
        {project && (
          <div className="bil-section">
            <div className="bil-section__header">
              <span>{bil("pc_print_project_information").ar}</span>
              <span>{bil("pc_print_project_information").en}</span>
            </div>
            <div className="bil-section__body">
              <BilField label={bil("pc_print_project_name")} value={project.name || "—"} />
              {contractorName && (
                <BilField label={bil("pc_print_contractor")} value={contractorName} />
              )}
              {ownerName && (
                <BilField label={bil("pc_print_owner")} value={ownerName} />
              )}
            </div>
          </div>
        )}

        {/* FINANCIAL SUMMARY TABLE */}
        <div className="bil-section pc-financial-section">
          <div className="bil-section__header">
            <span>{bil("pc_print_financial_summary").ar}</span>
            <span>{bil("pc_print_financial_summary").en}</span>
          </div>
          <table className="pc-financial-table">
            <thead>
              <tr>
                <th className="pc-col-ref">#</th>
                <th className="pc-col-desc">
                  <span className="pc-th-ar">{bil("pc_print_description").ar}</span>
                  <span className="pc-th-en">{bil("pc_print_description").en}</span>
                </th>
                <th className="pc-col-amount">
                  <span className="pc-th-ar">{bil("pc_print_amount").ar}</span>
                  <span className="pc-th-en">{bil("pc_print_amount").en}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pc-col-ref">A</td>
                <td className="pc-col-desc">
                  {bil("pc_print_cumulative_work_done").ar}
                  <span className="pc-row-en"> / {bil("pc_print_cumulative_work_done").en}</span>
                </td>
                <td className="pc-col-amount">{formatMoney(cumulativeWorkDone)}</td>
              </tr>
              <tr>
                <td className="pc-col-ref">B</td>
                <td className="pc-col-desc">
                  {bil("pc_print_materials_on_site").ar}
                  <span className="pc-row-en"> / {bil("pc_print_materials_on_site").en}</span>
                </td>
                <td className="pc-col-amount">
                  {claim?.materials_on_site_included === true
                    ? "مشمول / Included"
                    : claim?.materials_on_site_included === false
                    ? "غير مشمول / Not Included"
                    : formatMoney(materialsOnSite)}
                </td>
              </tr>
              <tr>
                <td className="pc-col-ref">C</td>
                <td className="pc-col-desc">
                  {bil("pc_print_variations_claims").ar}
                  <span className="pc-row-en"> / {bil("pc_print_variations_claims").en}</span>
                </td>
                <td className="pc-col-amount">{formatMoney(variationsClaims)}</td>
              </tr>
              <tr className="pc-subtotal-row">
                <td className="pc-col-ref">D</td>
                <td className="pc-col-desc">
                  {bil("pc_print_subtotal").ar}
                  <span className="pc-row-en"> / {bil("pc_print_subtotal").en}</span>
                </td>
                <td className="pc-col-amount">{formatMoney(subtotal)}</td>
              </tr>
              <tr>
                <td className="pc-col-ref">—</td>
                <td className="pc-col-desc">
                  {bil("pc_print_advance_recovery").ar}
                  <span className="pc-row-en"> / {bil("pc_print_advance_recovery").en}</span>
                </td>
                <td className="pc-col-amount pc-deduction">({formatMoney(advanceRecovery)})</td>
              </tr>
              <tr>
                <td className="pc-col-ref">—</td>
                <td className="pc-col-desc">
                  {bil("pc_print_previous_payments").ar}
                  <span className="pc-row-en"> / {bil("pc_print_previous_payments").en}</span>
                </td>
                <td className="pc-col-amount pc-deduction">({formatMoney(previousPayments)})</td>
              </tr>
              <tr>
                <td className="pc-col-ref">—</td>
                <td className="pc-col-desc">
                  {bil("pc_print_other_deductions").ar}
                  <span className="pc-row-en"> / {bil("pc_print_other_deductions").en}</span>
                </td>
                <td className="pc-col-amount pc-deduction">({formatMoney(otherDeductions)})</td>
              </tr>
              <tr className="pc-net-amount-row">
                <td className="pc-col-ref"></td>
                <td className="pc-col-desc">
                  {bil("pc_print_net_amount_due").ar}
                  <span className="pc-row-en"> / {bil("pc_print_net_amount_due").en}</span>
                </td>
                <td className="pc-col-amount">{formatMoney(netAmountDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* NOTES */}
        {claim?.description && (
          <div className="pc-notes">
            <strong>
              {bil("pc_print_notes").ar} / {bil("pc_print_notes").en}:
            </strong>{" "}
            {claim.description}
          </div>
        )}

        {/* SUMMARY ROW: QR */}
        <div className="bil-summary pc-summary">
          <div className="bil-qr">
            <QRCodeSVG value={qrData} size={100} level="M" includeMargin={false} />
            <p className="bil-qr__text">Scan to verify</p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bil-footer">
          <div className="bil-footer__sig">
            <div className="bil-footer__sig-line"></div>
            <p>{bil("pc_print_authorized_signature").ar}</p>
            <p className="bil-footer__en">{bil("pc_print_authorized_signature").en}</p>
          </div>
          <div className="bil-footer__stamp">
            <p>{bil("invoice_print_company_stamp").ar}</p>
            <p className="bil-footer__en">{bil("invoice_print_company_stamp").en}</p>
          </div>
          <div className="bil-footer__sig">
            <div className="bil-footer__sig-line"></div>
            <p>{bil("pc_print_received_by").ar}</p>
            <p className="bil-footer__en">{bil("pc_print_received_by").en}</p>
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
