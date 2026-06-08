import { Fragment, forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { formatMoney, formatDate } from "../../../../../utils/formatters";
import DirhamsIcon from "../../../../../components/common/DirhamsIcon";
import { buildFileUrl } from "../../../../../utils/helpers/file";
import "./VariationPrintDocument.css";

const EMPTY = "—";

function BilingualText({ ar, en, className = "" }) {
  const arVal = ar || en || EMPTY;
  const enVal = en || ar || EMPTY;
  if (arVal === enVal) {
    return <span className={className}>{arVal}</span>;
  }
  return (
    <span className={`vpd-bilingual ${className}`}>
      <span className="vpd-bilingual__ar" dir="rtl">{arVal}</span>
      <span className="vpd-bilingual__en" dir="ltr">{enVal}</span>
    </span>
  );
}

function Amount({ value }) {
  const num = formatMoney(value || 0, { lang: "en" }).replace(/AED\s?/, "").trim();
  return (
    <span className="vpd-amount" dir="ltr">
      {num} <DirhamsIcon size="1em" />
    </span>
  );
}

const VariationPrintDocument = forwardRef(({ variation, project, companyInfo, noticeData }, ref) => {
  const { i18n } = useTranslation();

  const data = useMemo(() => {
    if (noticeData) return noticeData;
    if (!variation?.description) return {};
    try { return JSON.parse(variation.description); }
    catch { return {}; }
  }, [noticeData, variation?.description]);

  // Financial values
  const totalOmitted   = parseFloat(data.total_omitted || 0);
  const totalAdded     = parseFloat(data.total_added || 0);
  const totalVar       = parseFloat(data.total_variation_amount || (totalAdded - totalOmitted));
  const contractorOHP  = parseFloat(data.contractor_engineering_oh_p || 0);
  const consultantFees = parseFloat(data.consultant_fees || 0);
  const beforeDiscount = parseFloat(data.total_amount_before_discount || (totalVar + contractorOHP + consultantFees));
  const discountAmt    = parseFloat(data.discount_amount || 0);
  const discountPct    = parseFloat(data.discount_percentage || 0);
  const finalAmount    = parseFloat(data.total_amount || variation?.total_amount || 0);

  const omittedItems = data.omitted_items || [];
  const addedItems   = data.added_items   || [];

  const getProjectNumber = () => {
    if (!project) return "";
    return project.contract_data?.tender_no || project.awarding_data?.project_number ||
           project.siteplan?.project_no || project.internal_code || `PRJ-${project.id}`;
  };

  const getProjectLocation = () => {
    if (!project) return "";
    const sp = project.siteplan || project.siteplan_data;
    if (!sp) return "";
    return [sp.municipality, sp.zone, sp.sector, sp.land_no].filter(Boolean).join(" - ");
  };

  const logoUrl = useMemo(() => {
    let url = companyInfo?.logo;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [companyInfo?.logo]);

  const projectNameAr = project?.display_name || project?.name || "";
  const projectNameEn = project?.display_name_en || project?.display_name || project?.name || "";

  const qrData = JSON.stringify({
    type: "VARIATION_ORDER",
    id: variation?.id,
    number: variation?.variation_number,
    amount: finalAmount,
    date: data.document_date,
    company: companyInfo?.name,
  });

  // Build totals rows
  const totalsRows = [
    { ar: "إجمالي البنود المحذوفة", en: "Total Omitted", value: totalOmitted, sign: "neg" },
    { ar: "إجمالي البنود المضافة",  en: "Total Added",   value: totalAdded,   sign: "pos" },
    { ar: "صافي أمر التغيير",       en: "Net Variation", value: totalVar,     variant: "highlight" },
    ...(contractorOHP !== 0 ? [{
      ar: `مصاريف المقاول والهندسة${data.contractor_ohp_percentage ? ` (${data.contractor_ohp_percentage}%)` : ""}`,
      en: `Contractor O&P${data.contractor_ohp_percentage ? ` (${data.contractor_ohp_percentage}%)` : ""}`,
      value: contractorOHP,
    }] : []),
    ...(consultantFees !== 0 ? [{
      ar: `رسوم الاستشاري${data.consultant_fees_percentage ? ` (${data.consultant_fees_percentage}%)` : ""}`,
      en: `Consultant Fees${data.consultant_fees_percentage ? ` (${data.consultant_fees_percentage}%)` : ""}`,
      value: consultantFees,
    }] : []),
    ...(data.custom_fees || [])
      .map(f => {
        const amt = f.type === 'percentage'
          ? (totalVar * parseFloat(f.percentage || 0)) / 100
          : parseFloat(f.amount) || 0;
        const pctLabel = f.type === 'percentage' && f.percentage ? ` (${f.percentage}%)` : '';
        return { ar: (f.name || 'رسوم إضافية') + pctLabel, en: (f.name || 'Additional Fee') + pctLabel, value: amt };
      })
      .filter(f => f.value !== 0),
    ...(discountAmt > 0 ? [
      { ar: "المجموع قبل الخصم", en: "Total Before Discount", value: beforeDiscount, variant: "subtotal", startsSummaryRow: true },
      {
        ar: `خصم${discountPct > 0 ? ` (${discountPct.toFixed(1)}%)` : ""}`,
        en: `Discount${discountPct > 0 ? ` (${discountPct.toFixed(1)}%)` : ""}`,
        value: discountAmt, sign: "neg",
      },
    ] : []),
    {
      ar: "المبلغ الإجمالي",
      en: "Total Amount",
      noteAr: "بدون ضريبة القيمة المضافة",
      noteEn: "Excluding VAT",
      value: finalAmount,
      variant: "grand",
      startsSummaryRow: discountAmt <= 0,
    },
  ];

  const totalsRowGroups = totalsRows.reduce((groups, row) => {
    if (row.startsSummaryRow || groups.length === 0) groups.push([]);
    groups[groups.length - 1].push(row);
    return groups;
  }, []);

  return (
    <div ref={ref} className="vpd-wrap">
      <article className="vpd-doc" dir="ltr">

        <div className="vpd-page-header">
        {/* ── HEADER ── */}
        <header className="vpd-top">
          <div className="vpd-company">
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                className="vpd-company__logo"
                onError={e => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div className="vpd-company__body">
              <BilingualText
                ar={companyInfo?.name}
                en={companyInfo?.name_en || companyInfo?.name}
                className="vpd-company__name"
              />
              <div className="vpd-company__details">
                {companyInfo?.address && <span>{companyInfo.address}</span>}
                {companyInfo?.phone   && <span dir="ltr">{companyInfo.phone}</span>}
                {companyInfo?.email   && <span dir="ltr">{companyInfo.email}</span>}
              </div>
            </div>
            <BilingualText ar="أمر التغيير" en="VARIATION ORDER" className="vpd-title" />
          </div>

          <div className="vpd-title-panel">
            <div className="vpd-meta">
              <div>
                <BilingualText ar="رقم التغيير" en="VAR. NO." className="vpd-meta__label" />
                <strong>{variation?.variation_number || data.reference_no || EMPTY}</strong>
              </div>
              <div>
                <BilingualText ar="التاريخ" en="DATE" className="vpd-meta__label" />
                <strong>{formatDate(data.document_date || variation?.created_at)}</strong>
              </div>
            </div>
          </div>

          <div className="vpd-qr-panel">
            <QRCodeSVG value={qrData} size={72} level="M" includeMargin={false} />
            <span>SCAN TO VERIFY</span>
          </div>
        </header>

        {/* ── INFO CARDS ── */}
        <section className="vpd-cards">
          {/* Row 1: Project Name | Project No | Description */}
          <div className="vpd-info-card vpd-info-card--sm">
            <BilingualText ar="اسم المشروع" en="PROJECT NAME" className="vpd-info-card__label" />
            <BilingualText ar={projectNameAr} en={projectNameEn} className="vpd-info-card__value" />
            {getProjectLocation() && (
              <div className="vpd-info-card__lines">
                <span className="vpd-info-card__line">{getProjectLocation()}</span>
              </div>
            )}
          </div>

          <div className="vpd-info-card vpd-info-card--sm">
            <BilingualText ar="رقم المشروع" en="PROJECT NO." className="vpd-info-card__label" />
            <span className="vpd-info-card__value vpd-info-card__value--plain">
              {getProjectNumber() || EMPTY}
            </span>
          </div>

          <div className="vpd-info-card vpd-info-card--sm vpd-info-card--desc">
            <BilingualText ar="وصف التغيير" en="VARIATION DESCRIPTION" className="vpd-info-card__label" />
            {data.variation_description && (
              <p className="vpd-info-card__desc-text">{data.variation_description}</p>
            )}
            {data.variation_cause && data.variation_cause !== data.variation_description && (
              <p className="vpd-info-card__desc-cause">
                <strong><BilingualText ar="السبب:" en="Cause:" /></strong> {data.variation_cause}
              </p>
            )}
            {!data.variation_description && !data.variation_cause && (
              <span className="vpd-info-card__value vpd-info-card__value--plain">{EMPTY}</span>
            )}
          </div>

          {/* Row 2+: Ref No, optional fields */}
          <div className="vpd-info-card vpd-info-card--sm">
            <BilingualText ar="رقم المرجع" en="REFERENCE NO." className="vpd-info-card__label" />
            <span className="vpd-info-card__value vpd-info-card__value--plain">
              {data.reference_no || variation?.variation_number || EMPTY}
            </span>
          </div>

          {data.first_variation_date && (
            <div className="vpd-info-card vpd-info-card--sm">
              <BilingualText ar="تاريخ أول تغيير" en="FIRST VAR. DATE" className="vpd-info-card__label" />
              <span className="vpd-info-card__value vpd-info-card__value--plain">
                {formatDate(data.first_variation_date)}
              </span>
            </div>
          )}

          {data.trade_discipline && (
            <div className="vpd-info-card vpd-info-card--sm">
              <BilingualText ar="التخصص" en="TRADE / DISCIPLINE" className="vpd-info-card__label" />
              <span className="vpd-info-card__value vpd-info-card__value--plain">
                {data.trade_discipline}
              </span>
            </div>
          )}

          {data.additional_time && (
            <div className="vpd-info-card vpd-info-card--sm">
              <BilingualText ar="وقت إضافي" en="ADDITIONAL TIME" className="vpd-info-card__label" />
              <span className="vpd-info-card__value vpd-info-card__value--plain">
                {data.additional_time}
              </span>
            </div>
          )}
        </section>
        </div>

        <div className="vpd-doc__body">

        {/* ── ADDED ITEMS ── */}
        {addedItems.length > 0 && (
          <section className="vpd-section" data-vpd-print-table-section>
            <div className="vpd-section__header" data-vpd-table-section-header>
              <BilingualText ar="البنود المضافة" en="ADDED ITEMS" />
              <span>{String(addedItems.length).padStart(2, "0")} lines</span>
            </div>
            <table className="vpd-table" data-vpd-print-table>
              <thead>
                <tr>
                  <th>#</th>
                  <th><BilingualText ar="الوصف" en="Description" /></th>
                  <th><BilingualText ar="الكمية" en="Qty" /></th>
                  <th><BilingualText ar="الوحدة" en="Unit" /></th>
                  <th><BilingualText ar="السعر" en="Rate" /></th>
                  <th><BilingualText ar="المبلغ" en="Amount" /></th>
                  <th><BilingualText ar="المرجع" en="Reference" /></th>
                </tr>
              </thead>
              <tbody>
                {addedItems.map((item, i) => (
                  <Fragment key={`added-${item.id || i}`}>
                    <tr data-vpd-item-row>
                      <td>{String(i + 1).padStart(2, "0")}</td>
                      <td className="vpd-td--desc">{item.description || EMPTY}</td>
                      <td>{item.qty || EMPTY}</td>
                      <td>{item.unit || EMPTY}</td>
                      <td><Amount value={item.rate || 0} /></td>
                      <td><Amount value={item.amount || 0} /></td>
                      <td>{item.reference || EMPTY}</td>
                    </tr>
                    {item.remarks?.trim() && (
                      <tr className="vpd-item-remark-row" data-vpd-item-remark-row>
                        <td />
                        <td colSpan={6} className="vpd-td--remark">
                          <div className="vpd-remark-inner">
                            <BilingualText ar="ملاحظة:" en="Remark:" className="vpd-remark-label" />
                            <span>{item.remarks}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ── OMITTED ITEMS ── */}
        {omittedItems.length > 0 && (
          <section className="vpd-section" data-vpd-print-table-section>
            <div className="vpd-section__header" data-vpd-table-section-header>
              <BilingualText ar="البنود المحذوفة" en="OMITTED ITEMS" />
              <span>{String(omittedItems.length).padStart(2, "0")} lines</span>
            </div>
            <table className="vpd-table" data-vpd-print-table>
              <thead>
                <tr>
                  <th>#</th>
                  <th><BilingualText ar="الوصف" en="Description" /></th>
                  <th><BilingualText ar="الكمية" en="Qty" /></th>
                  <th><BilingualText ar="الوحدة" en="Unit" /></th>
                  <th><BilingualText ar="السعر" en="Rate" /></th>
                  <th><BilingualText ar="المبلغ" en="Amount" /></th>
                  <th><BilingualText ar="المرجع" en="Reference" /></th>
                </tr>
              </thead>
              <tbody>
                {omittedItems.map((item, i) => (
                  <Fragment key={`omitted-${item.id || i}`}>
                    <tr data-vpd-item-row>
                      <td>{String(i + 1).padStart(2, "0")}</td>
                      <td className="vpd-td--desc">{item.description || EMPTY}</td>
                      <td>{item.qty || EMPTY}</td>
                      <td>{item.unit || EMPTY}</td>
                      <td><Amount value={item.rate || 0} /></td>
                      <td><Amount value={item.amount || 0} /></td>
                      <td>{item.reference || EMPTY}</td>
                    </tr>
                    {item.remarks?.trim() && (
                      <tr className="vpd-item-remark-row" data-vpd-item-remark-row>
                        <td />
                        <td colSpan={6} className="vpd-td--remark">
                          <div className="vpd-remark-inner">
                            <BilingualText ar="ملاحظة:" en="Remark:" className="vpd-remark-label" />
                            <span>{item.remarks}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ── FOOTER ── */}
        <div className="vpd-doc__footer">

          {/* Totals */}
          <section className="vpd-bottom">
            <div className="vpd-totals-box">
              {totalsRowGroups.map((group, groupIndex) => (
                <div className="vpd-totals-row" data-vpd-page-part key={`totals-row-${groupIndex}`}>
                  {group.map((row, i) => (
                    <div
                      key={`${groupIndex}-${i}`}
                      className={[
                        "vpd-totals-cell",
                        row.variant === "grand"     ? "vpd-totals-cell--grand"     : "",
                        row.variant === "highlight" ? "vpd-totals-cell--highlight" : "",
                        row.variant === "subtotal"  ? "vpd-totals-cell--subtotal"  : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <span className="vpd-totals-cell__label">
                        <BilingualText ar={row.ar} en={row.en} />
                        {row.noteAr || row.noteEn ? (
                          <span className="vpd-totals-cell__note">
                            <BilingualText ar={row.noteAr} en={row.noteEn} />
                          </span>
                        ) : null}
                      </span>
                      <span className={[
                        "vpd-totals-cell__value",
                        row.sign === "neg" ? "vpd-amt--neg" : "",
                        row.sign === "pos" ? "vpd-amt--pos" : "",
                      ].filter(Boolean).join(" ")}>
                        <Amount value={row.value} />
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Signatures + creds are pinned by preparePrintDocumentLayout */}
          <div className="vpd-bottom-group">
            {data.remarks && (
              <section className="vpd-notes">
                <strong className="vpd-notes__label">
                  <BilingualText ar="ملاحظات" en="Remarks" />
                </strong>
                <ul className="vpd-notes__bullets">
                  {data.remarks.split('\n').filter(l => l.trim()).map((line, i) => (
                    <li key={i}>{line.trim()}</li>
                  ))}
                </ul>
              </section>
            )}

            <div className="vpd-pinned-bottom">
              <section className="vpd-signatures">
                <div className="vpd-sign-card">
                  <span />
                  <strong><BilingualText ar="توقيع الاستشاري" en="CONSULTANT SIGNATURE" /></strong>
                </div>
                <div className="vpd-sign-card vpd-sign-card--stamp">
                  <div><BilingualText ar="ختم الشركة" en="COMPANY STAMP" /></div>
                </div>
                <div className="vpd-sign-card">
                  <span />
                  <strong><BilingualText ar="توقيع العميل" en="CLIENT SIGNATURE" /></strong>
                </div>
              </section>

              <p className="vpd-final-notice">
                <BilingualText
                  ar="هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع يدوي"
                  en="This is an electronically generated document"
                />
              </p>

              <img src="/credsnewfix.png" alt="Credentials" className="vpd-creds-banner" />
            </div>
          </div>
        </div>
        </div>

      </article>
    </div>
  );
});

VariationPrintDocument.displayName = "VariationPrintDocument";
export default VariationPrintDocument;
