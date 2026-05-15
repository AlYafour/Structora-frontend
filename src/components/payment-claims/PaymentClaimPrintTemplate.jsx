import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "../../utils/formatters";
import Button from "../common/Button";
import DirhamsIcon from "../common/DirhamsIcon";
import { buildFileUrl } from "../../utils/helpers/file";
import { QRCodeSVG } from "qrcode.react";
import "../invoices/InvoicePrintTemplate.css";

export default function PaymentClaimPrintTemplate({
  claim,
  project,
  company,
  totals,
  onClose,
  hideControls = false,
}) {
  const { t, i18n } = useTranslation();

  const renderAmount = (value) => {
    const str = formatMoney(value, { lang: i18n.language });
    if (i18n.language === "en") {
      const numPart = str.replace(/AED\s?/, "").trim();
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25em", color: "inherit", fontSize: "inherit" }}>
          {numPart} <DirhamsIcon size="1em" />
        </span>
      );
    }
    return str;
  };

  const qrData = useMemo(
    () =>
      JSON.stringify({
        type: "PAYMENT_CLAIM",
        id: claim?.id,
        number: claim?.claim_number,
        amount: totals?.net_amount_due || 0,
        date: claim?.claim_date,
        project: project?.name,
        company: company?.name,
      }),
    [claim, totals, project, company]
  );

  const logoUrl = useMemo(() => {
    let url = company?.logo;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [company?.logo]);

  const cumulativeWorkDone = parseFloat(totals?.total_amount || 0);
  const materialsOnSite    = parseFloat(claim?.materials_on_site_value || 0);
  const variationsClaims   = parseFloat(claim?.variations_claims_amount || 0);
  const subtotal           = cumulativeWorkDone + materialsOnSite + variationsClaims;
  const advanceRecovery    = parseFloat(totals?.advance_recovery_amount || 0);
  const previousPayments   = parseFloat(totals?.previous_received_payments || 0);
  const otherDeductions    = parseFloat(totals?.other_deductions || 0);
  const netAmountDue       = parseFloat(totals?.net_amount_due || 0);

  const owners = project?.siteplan_data?.owners || [];
  const authorizedOwner = owners.find((o) => o.is_authorized) || owners[0];
  const ownerName = authorizedOwner
    ? i18n.language === "ar"
      ? (authorizedOwner.owner_name_ar || authorizedOwner.owner_name_en || "")
      : (authorizedOwner.owner_name_en || authorizedOwner.owner_name_ar || "")
    : "";
  const contractorName = project?.contract_data?.contractor_name || "";
  const projectNo =
    project?.license_data?.license_project_no || project?.license_data?.license_no || "";

  const projectName = i18n.language === "ar"
    ? (project?.display_name || project?.name)
    : (project?.display_name_en || project?.display_name || project?.name);

  return (
    <div className={`invoice-print-container${hideControls ? " invoice-print-container--embedded" : ""}`}>
      {!hideControls && (
        <div className="invoice-print-controls no-print">
          <Button variant="secondary" onClick={onClose}>{t("back")}</Button>
          <Button variant="primary" onClick={() => window.print()}>{t("print")}</Button>
        </div>
      )}

      <div className="bil-doc" dir={i18n.language === "ar" ? "rtl" : "ltr"}>

        <div className="bil-top">
          <div className="bil-top__company">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={company?.name || "Company logo"}
                className="bil-top__logo"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <div>
              <h1 className="bil-top__name">{company?.name || ""}</h1>
              {company?.name_en && <p className="bil-top__name-en">{company.name_en}</p>}
              <div className="bil-top__details">
                {company?.address && <span>{company.address}</span>}
                {company?.phone && <span dir="ltr">{company.phone}</span>}
                {company?.email && <span dir="ltr">{company.email}</span>}
                {company?.vat_number && (
                  <span>{t("vat_registration")}: {company.vat_number}</span>
                )}
              </div>
            </div>
          </div>

          <div className="bil-top__invoice">
            <h2>{t("pc_print_title")}</h2>
            <div className="bil-top__meta">
              <div>
                <span>{t("pc_print_claim_number")}</span>
                <strong>{claim?.claim_number || `#${claim?.id}`}</strong>
              </div>
              <div>
                <span>{t("pc_print_date")}</span>
                <strong>{formatDate(claim?.claim_date, i18n.language)}</strong>
              </div>
              {projectNo && (
                <div>
                  <span>{t("pc_print_project_no")}</span>
                  <strong>{projectNo}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bil-cards bil-cards--three">
          {project && (
            <div className="bil-info-card">
              <div className="bil-info-card__head">
                <span>{t("pc_print_project_name")}</span>
              </div>
              <strong>{projectName || "—"}</strong>
            </div>
          )}
          {contractorName && (
            <div className="bil-info-card">
              <div className="bil-info-card__head">
                <span>{t("pc_print_contractor")}</span>
              </div>
              <strong>{contractorName}</strong>
            </div>
          )}
          {ownerName && (
            <div className="bil-info-card">
              <div className="bil-info-card__head">
                <span>{t("pc_print_owner")}</span>
              </div>
              <strong>{ownerName}</strong>
            </div>
          )}
        </div>

        <div className="bil-section bil-section--details">
          <div className="bil-section__header">
            <div>
              <span>{t("pc_print_financial_summary")}</span>
            </div>
            <span>07 lines</span>
          </div>
          <table className="bil-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th className="col-desc">{t("pc_print_description")}</th>
                <th className="col-total">{t("pc_print_amount")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-num">A</td>
                <td className="col-desc">{t("pc_print_cumulative_work_done")}</td>
                <td className="col-total">{renderAmount(cumulativeWorkDone)}</td>
              </tr>
              <tr>
                <td className="col-num">B</td>
                <td className="col-desc">{t("pc_print_materials_on_site")}</td>
                <td className="col-total">
                  {claim?.materials_on_site_included === true
                    ? t("included", { defaultValue: "Included" })
                    : claim?.materials_on_site_included === false
                    ? t("not_included", { defaultValue: "Not Included" })
                    : renderAmount(materialsOnSite)}
                </td>
              </tr>
              <tr>
                <td className="col-num">C</td>
                <td className="col-desc">{t("pc_print_variations_claims")}</td>
                <td className="col-total">{renderAmount(variationsClaims)}</td>
              </tr>
              <tr style={{ background: "#f0eadf" }}>
                <td className="col-num" style={{ fontWeight: 700 }}>D</td>
                <td className="col-desc" style={{ fontWeight: 700 }}>{t("pc_print_subtotal")}</td>
                <td className="col-total" style={{ fontWeight: 700 }}>{renderAmount(subtotal)}</td>
              </tr>
              <tr>
                <td className="col-num">—</td>
                <td className="col-desc">{t("pc_print_advance_recovery")}</td>
                <td className="col-total" style={{ color: "#c0392b" }}>({renderAmount(advanceRecovery)})</td>
              </tr>
              <tr>
                <td className="col-num">—</td>
                <td className="col-desc">{t("pc_print_previous_payments")}</td>
                <td className="col-total" style={{ color: "#c0392b" }}>({renderAmount(previousPayments)})</td>
              </tr>
              <tr>
                <td className="col-num">—</td>
                <td className="col-desc">{t("pc_print_other_deductions")}</td>
                <td className="col-total" style={{ color: "#c0392b" }}>({renderAmount(otherDeductions)})</td>
              </tr>
            </tbody>
          </table>
        </div>

        {claim?.description && (
          <div className="bil-notes">
            <p>
              <strong>{t("pc_print_notes")}:</strong> {claim.description}
            </p>
          </div>
        )}

        <div className="bil-bottom">
          <div className="bil-verify">
            <QRCodeSVG value={qrData} size={92} level="M" includeMargin={false} />
            <div>
              <h4>SCAN TO VERIFY</h4>
              <p>{t("invoice_print_electronic_notice")}</p>
            </div>
          </div>
          <div className="bil-totals-box">
            <table className="bil-totals">
              <tbody>
                <tr>
                  <td><strong>{t("pc_print_subtotal")}</strong></td>
                  <td>{renderAmount(subtotal)}</td>
                </tr>
                {advanceRecovery > 0 && (
                  <tr>
                    <td><strong>{t("pc_print_advance_recovery")}</strong></td>
                    <td>({renderAmount(advanceRecovery)})</td>
                  </tr>
                )}
                {previousPayments > 0 && (
                  <tr>
                    <td><strong>{t("pc_print_previous_payments")}</strong></td>
                    <td>({renderAmount(previousPayments)})</td>
                  </tr>
                )}
                {otherDeductions > 0 && (
                  <tr>
                    <td><strong>{t("pc_print_other_deductions")}</strong></td>
                    <td>({renderAmount(otherDeductions)})</td>
                  </tr>
                )}
                <tr className="bil-totals__grand">
                  <td><strong>{t("pc_print_net_amount_due")}</strong></td>
                  <td>{renderAmount(netAmountDue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bil-signatures">
          <div className="bil-sign-card">
            <span></span>
            <strong>{t("pc_print_received_by")}</strong>
          </div>
          <div className="bil-sign-card bil-sign-card--stamp">
            <div>{t("invoice_print_company_stamp")}</div>
          </div>
          <div className="bil-sign-card">
            <span></span>
            <strong>{t("pc_print_authorized_signature")}</strong>
          </div>
        </div>

        <p className="bil-final-notice">{t("invoice_print_electronic_notice")}</p>
      </div>
    </div>
  );
}
