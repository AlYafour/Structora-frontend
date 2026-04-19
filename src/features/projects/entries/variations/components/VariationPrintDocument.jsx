import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "../../../../../utils/formatters";
import "./VariationPrintDocument.css";

/**
 * Professional Print Document Component for Variation Order
 * Optimized for A4 printing with clear Arabic fonts and professional layout
 */
const VariationPrintDocument = forwardRef(({ variation, project, companyInfo, noticeData }, ref) => {
  const { t, i18n } = useTranslation();
  const isAR = i18n.language === "ar";

  // Parse notice data
  const getNoticeData = () => {
    if (noticeData) return noticeData;
    if (!variation?.description) return {};
    try {
      return JSON.parse(variation.description);
    } catch (e) {
      return {};
    }
  };

  const data = getNoticeData();

  // Financial calculations
  const totalOmitted = data.total_omitted || 0;
  const totalAdded = data.total_added || 0;
  const totalVariationAmount = data.total_variation_amount || (totalAdded - totalOmitted);
  const contractorOHP = data.contractor_engineering_oh_p || 0;
  const consultantFees = data.consultant_fees || 0;
  const totalAmountBeforeDiscount = data.total_amount_before_discount || (totalVariationAmount + contractorOHP + consultantFees);
  const discountAmount = data.discount_amount || 0;
  const discountPercentage = data.discount_percentage || 0;
  const finalAmount = data.total_amount || variation?.total_amount || 0;

  const omittedItems = data.omitted_items || [];
  const addedItems = data.added_items || [];

  const getProjectNumber = () => {
    if (!project) return "";
    return project.contract_data?.tender_no || project.awarding_data?.project_number || project.siteplan?.project_no || project.internal_code || `PRJ-${project?.id}`;
  };

  const getProjectLocation = () => {
    if (!project) return "";
    const siteplan = project.siteplan || project.siteplan_data;
    if (!siteplan) return "";
    const parts = [];
    if (siteplan.municipality) parts.push(siteplan.municipality);
    if (siteplan.zone) parts.push(siteplan.zone);
    if (siteplan.sector) parts.push(siteplan.sector);
    if (siteplan.land_no) parts.push(siteplan.land_no);
    return parts.join(" - ");
  };

  return (
    <div ref={ref} className="vpd-document" dir={isAR ? "rtl" : "ltr"}>
      {/* Print Header */}
      <div className="vpd-header">
        <div className="vpd-header__left">
          {companyInfo?.logo && (
            <img src={companyInfo.logo} alt="Company Logo" className="vpd-header__logo" />
          )}
        </div>
        <div className="vpd-header__center">
          <h1 className="vpd-header__company-name">{companyInfo?.name || ""}</h1>
          {companyInfo?.name_en && (
            <h2 className="vpd-header__company-name-en">{companyInfo.name_en}</h2>
          )}
        </div>
        <div className="vpd-header__right">
          <div className="vpd-header__doc-title">{t("variation_order")}</div>
          <div className="vpd-header__doc-date">
            {formatDate(data.document_date || variation?.created_at)}
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="vpd-content">
        {/* Section 1: Project & Variation Information */}
        <div className="vpd-section">
          <div className="vpd-section-header">
            <h3>{t("project_information")} / {t("variation_details")}</h3>
          </div>
          <div className="vpd-info-grid">
            <div className="vpd-info-item">
              <label>{t("project_name")}</label>
              <div className="vpd-info-value">{project?.display_name || project?.name || "—"}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("project_no")}</label>
              <div className="vpd-info-value">{getProjectNumber() || "—"}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("variation_no")}</label>
              <div className="vpd-info-value">{variation?.variation_number || data.reference_no || "—"}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("reference_no")}</label>
              <div className="vpd-info-value">{data.reference_no || variation?.variation_number || "—"}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("document_date")}</label>
              <div className="vpd-info-value">{formatDate(data.document_date || variation?.created_at)}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("first_variation_date")}</label>
              <div className="vpd-info-value">{data.first_variation_date ? formatDate(data.first_variation_date) : "—"}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("trade_discipline")}</label>
              <div className="vpd-info-value">{data.trade_discipline || "—"}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("item_description")}</label>
              <div className="vpd-info-value">{data.item_description || "—"}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("additional_time")}</label>
              <div className="vpd-info-value">{data.additional_time || "—"}</div>
            </div>
            <div className="vpd-info-item">
              <label>{t("project_address")}</label>
              <div className="vpd-info-value">{getProjectLocation() || "—"}</div>
            </div>
          </div>
          {data.variation_description && (
            <div className="vpd-description">
              <label>{t("variation_description")}</label>
              <div className="vpd-description-text">{data.variation_description}</div>
            </div>
          )}
        </div>

        {/* Section 2: Omitted Items */}
        {omittedItems.length > 0 && (
          <div className="vpd-section">
            <div className="vpd-section-header">
              <h3>{t("omitted_items")}</h3>
            </div>
            <table className="vpd-table">
              <thead>
                <tr>
                  <th className="vpd-th vpd-th--desc">{t("item_description")}</th>
                  <th className="vpd-th vpd-th--num">{t("quantity")}</th>
                  <th className="vpd-th vpd-th--unit">{t("unit")}</th>
                  <th className="vpd-th vpd-th--num">{t("rate")}</th>
                  <th className="vpd-th vpd-th--amount">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {omittedItems.map((item, index) => (
                  <tr key={`omitted-${index}`}>
                    <td className="vpd-td vpd-td--desc">{item.description || "—"}</td>
                    <td className="vpd-td vpd-td--num">{item.qty || "—"}</td>
                    <td className="vpd-td vpd-td--unit">{item.unit || "—"}</td>
                    <td className="vpd-td vpd-td--num">{formatMoney(item.rate || 0)}</td>
                    <td className="vpd-td vpd-td--amount">{formatMoney(item.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="vpd-tfoot-row">
                  <td colSpan={4} className="vpd-td vpd-td--label">{t("total_omitted")}</td>
                  <td className="vpd-td vpd-td--total">{formatMoney(totalOmitted)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Section 3: Added Items */}
        {addedItems.length > 0 && (
          <div className="vpd-section">
            <div className="vpd-section-header">
              <h3>{t("added_items")}</h3>
            </div>
            <table className="vpd-table">
              <thead>
                <tr>
                  <th className="vpd-th vpd-th--desc">{t("item_description")}</th>
                  <th className="vpd-th vpd-th--num">{t("quantity")}</th>
                  <th className="vpd-th vpd-th--unit">{t("unit")}</th>
                  <th className="vpd-th vpd-th--num">{t("rate")}</th>
                  <th className="vpd-th vpd-th--amount">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {addedItems.map((item, index) => (
                  <tr key={`added-${index}`}>
                    <td className="vpd-td vpd-td--desc">{item.description || "—"}</td>
                    <td className="vpd-td vpd-td--num">{item.qty || "—"}</td>
                    <td className="vpd-td vpd-td--unit">{item.unit || "—"}</td>
                    <td className="vpd-td vpd-td--num">{formatMoney(item.rate || 0)}</td>
                    <td className="vpd-td vpd-td--amount">{formatMoney(item.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="vpd-tfoot-row">
                  <td colSpan={4} className="vpd-td vpd-td--label">{t("total_added")}</td>
                  <td className="vpd-td vpd-td--total">{formatMoney(totalAdded)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Section 4: Financial Summary */}
        <div className="vpd-section">
          <div className="vpd-section-header">
            <h3>{t("variation_summary")} & {t("fees")}</h3>
          </div>
          <div className="vpd-summary-container">
            <table className="vpd-summary-table">
              <tbody>
                <tr>
                  <td className="vpd-summary-label">{t("total_omitted")}</td>
                  <td className="vpd-summary-value vpd-summary-value--neg">- {formatMoney(totalOmitted)}</td>
                </tr>
                <tr>
                  <td className="vpd-summary-label">{t("total_added")}</td>
                  <td className="vpd-summary-value vpd-summary-value--pos">+ {formatMoney(totalAdded)}</td>
                </tr>
                <tr className="vpd-summary-highlight">
                  <td className="vpd-summary-label">{t("total_variation_amount")}</td>
                  <td className="vpd-summary-value">{formatMoney(totalVariationAmount)}</td>
                </tr>
                <tr>
                  <td className="vpd-summary-label">
                    {t("contractor_ohp")}
                    {data.contractor_ohp_type === "percentage" && data.contractor_ohp_percentage && (
                      <span className="vpd-pct"> ({data.contractor_ohp_percentage}%)</span>
                    )}
                  </td>
                  <td className="vpd-summary-value">{formatMoney(contractorOHP)}</td>
                </tr>
                <tr>
                  <td className="vpd-summary-label">
                    {t("consultant_fees")}
                    {data.consultant_fees_type === "percentage" && data.consultant_fees_percentage && (
                      <span className="vpd-pct"> ({data.consultant_fees_percentage}%)</span>
                    )}
                  </td>
                  <td className="vpd-summary-value">{formatMoney(consultantFees)}</td>
                </tr>
                <tr className="vpd-summary-subtotal">
                  <td className="vpd-summary-label">{t("total_before_discount")}</td>
                  <td className="vpd-summary-value">{formatMoney(totalAmountBeforeDiscount)}</td>
                </tr>
                {discountAmount > 0 && (
                  <tr>
                    <td className="vpd-summary-label vpd-summary-label--discount">
                      {t("discount")}
                      {discountPercentage > 0 && <span className="vpd-pct"> ({discountPercentage.toFixed(1)}%)</span>}
                    </td>
                    <td className="vpd-summary-value vpd-summary-value--neg">- {formatMoney(discountAmount)}</td>
                  </tr>
                )}
                <tr className="vpd-summary-final">
                  <td className="vpd-summary-label">{t("final_amount")}</td>
                  <td className="vpd-summary-value vpd-summary-value--final">{formatMoney(finalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Remarks */}
        {data.remarks && (
          <div className="vpd-section">
            <div className="vpd-section-header">
              <h3>{t("remarks")}</h3>
            </div>
            <div className="vpd-remarks">{data.remarks}</div>
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="vpd-footer">
        <div className="vpd-footer__content">
          {companyInfo?.phone && <span>📞 {companyInfo.phone}</span>}
          {companyInfo?.email && <span>✉️ {companyInfo.email}</span>}
          {companyInfo?.website && <span>🌐 {companyInfo.website}</span>}
        </div>
      </div>
    </div>
  );
});

VariationPrintDocument.displayName = "VariationPrintDocument";

export default VariationPrintDocument;
