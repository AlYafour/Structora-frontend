import { Fragment, forwardRef, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { formatMoney } from "../../../../../utils/formatters";
import DirhamsIcon from "../../../../../components/common/DirhamsIcon";
import { buildFileUrl } from "../../../../../utils/helpers/file";
import { getIndexDiscrepancyNote } from "../utils/discrepancyNoteDefaults";
import { formatIndexDate } from "../utils/formatIndexDate";
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

function getIndexItems(data) {
  if (!Array.isArray(data?.index_items)) return [];
  return data.index_items
    .map((item, index) => ({
      serial_no: String(item?.serial_no || index + 1).trim(),
      attachment: String(item?.attachment || item?.content || item?.content_type || "").trim(),
      ref_no: String(item?.ref_no || item?.quotation_reference_number || item?.drawing_reference || "").trim(),
      date: String(item?.date || "").trim(),
      page_numbers: String(item?.page_numbers || "").trim(),
      purpose: String(item?.purpose || item?.remark || item?.supplier_name || "").trim(),
    }))
    .filter(item =>
      item.serial_no ||
      item.attachment ||
      item.ref_no ||
      item.date ||
      item.page_numbers ||
      item.purpose
    );
}

const VariationPrintDocument = forwardRef(({ variation, project, companyInfo, noticeData, consultantStampUrl, gmSignatureUrl, hideSignatures = false }, ref) => {
  const data = useMemo(() => {
    if (noticeData) return noticeData;
    if (!variation?.description) return {};
    try { return JSON.parse(variation.description); }
    catch { return {}; }
  }, [noticeData, variation?.description]);

  // Financial values
  const totalOmitted = parseFloat(data.total_omitted || 0);
  const totalAdded = parseFloat(data.total_added || 0);
  const totalVar = parseFloat(data.total_variation_amount || (totalAdded - totalOmitted));
  const contractorOHP = parseFloat(data.contractor_engineering_oh_p || 0);
  const consultantFees = parseFloat(data.consultant_fees || 0);
  const contractorOHPValue = data.contractor_ohp_type === 'amount'
    ? parseFloat(data.contractor_ohp_amount || 0)
    : contractorOHP;
  const consultantFeesValue = data.consultant_fees_type === 'amount'
    ? parseFloat(data.consultant_fees_amount || 0)
    : consultantFees;
  const contractorOHPPercentLabel =
    data.contractor_ohp_type === 'percentage' && data.contractor_ohp_percentage
      ? ` (${data.contractor_ohp_percentage}%)`
      : "";
  const consultantFeesPercentLabel =
    data.consultant_fees_type === 'percentage' && data.consultant_fees_percentage
      ? ` (${data.consultant_fees_percentage}%)`
      : "";
  const beforeDiscount = parseFloat(data.total_amount_before_discount || (totalVar + contractorOHP + consultantFees));
  const discountAmt = parseFloat(data.discount_amount || 0);
  const discountPct = parseFloat(data.discount_percentage || 0);
  const finalAmount = parseFloat(data.total_amount || variation?.total_amount || 0);

  const omittedItems = data.omitted_items || [];
  const addedItems = data.added_items || [];
  const indexItems = getIndexItems(data);
  const hasIndexItems = indexItems.length > 0;
  const indexDiscrepancyNote = getIndexDiscrepancyNote(data);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getProjectNumber = () => {
    if (!project) return "";
    return project.contract_data?.tender_no || project.awarding_data?.project_number ||
      project.siteplan?.project_no || project.siteplan_data?.project_no ||
      project.internal_code || `PRJ-${project.id}`;
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

  const stampUrl = useMemo(() => {
    let url = companyInfo?.company_stamp_url;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [companyInfo?.company_stamp_url]);

  const consultantStampResolved = useMemo(() => {
    let url = consultantStampUrl;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [consultantStampUrl]);

  const gmFinallyApproved = !!variation?.general_manager_final_approved_by;
  const consultantApproved = !!variation?.consultant_approval_confirmed || gmFinallyApproved;
  const ownerApproved = !!variation?.owner_approval_confirmed || gmFinallyApproved;
  const pmInitialApproved = !!variation?.project_manager_initial_approved_by;

  const pmSignatureResolved = useMemo(() => {
    let url = variation?.project_manager_initial_approved_by?.signature_url || null;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [variation?.project_manager_initial_approved_by?.signature_url]);

  const gmSignatureResolved = useMemo(() => {
    let url = gmSignatureUrl;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [gmSignatureUrl]);

  const ownerSignatureResolved = useMemo(() => {
    const sp = project?.siteplan_data || project?.siteplan;
    const owners = sp?.owners || [];
    const authorized = owners.find(o => o.is_authorized) || owners[0];
    let url = authorized?.signature_url || null;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [project?.siteplan_data, project?.siteplan]);

  const isFinallyApproved = !!(
    variation?.general_manager_initial_approved_by ||
    variation?.general_manager_initial_approved_by_id
  );

  const projectNameAr = project?.display_name || project?.name || "";
  const projectNameEn = project?.display_name_en || project?.display_name || project?.name || "";

  const qrData = variation?.public_token
    ? `${window.location.origin}/public/variations/${variation.public_token}`
    : window.location.origin;

  // Build totals rows
  const totalsRows = [
    { ar: "إجمالي البنود المحذوفة", en: "Total Omitted", value: totalOmitted, sign: "neg" },
    { ar: "إجمالي البنود المضافة", en: "Total Added", value: totalAdded, sign: "pos" },
    { ar: "صافي أمر التغيير", en: "Net Variation", value: totalVar, variant: "highlight" },
    ...(contractorOHPValue !== 0 ? [{
      ar: `مصاريف المقاول والهندسة${contractorOHPPercentLabel}`,
      en: `Contractor OH&P${contractorOHPPercentLabel}`,
      value: contractorOHPValue,
    }] : []),
    ...(consultantFeesValue !== 0 ? [{
      ar: `رسوم الاستشاري${consultantFeesPercentLabel}`,
      en: `Consultant Fees${consultantFeesPercentLabel}`,
      value: consultantFeesValue,
    }] : []),
    ...(data.custom_fees || [])
      .map(f => {
        const amt = f.type === 'percentage'
          ? (totalVar * parseFloat(f.percentage || 0)) / 100
          : f.amount;
        const pctLabel = f.type === 'percentage' && f.percentage ? ` (${f.percentage}%)` : '';
        return { ar: (f.name || 'رسوم إضافية') + pctLabel, en: (f.name || 'Additional Fee') + pctLabel, value: amt };
      })
      .filter(f => (parseFloat(f.value) || 0) !== 0),
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


  return (
    <div ref={ref} className="vpd-wrap">
      <article className={`vpd-doc${hasIndexItems ? " vpd-doc--has-index" : ""}`} dir="ltr">

        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="vpd-watermark"
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        )}

        <div className="vpd-page-header">
          {/* ── HEADER ── */}
          <header className="vpd-top">
            <div className="vpd-company">
              <div className="vpd-company__body">
                <div className="vpd-company__name-row">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt=""
                      className="vpd-company__logo"
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <BilingualText
                    ar={companyInfo?.name}
                    en={companyInfo?.name_en || companyInfo?.name}
                    className="vpd-company__name"
                  />
                </div>
                <div className="vpd-company__details">
                  {companyInfo?.address && <span>{companyInfo.address}</span>}
                  {companyInfo?.phone && <span dir="ltr">{companyInfo.phone}</span>}
                  {companyInfo?.email && <span dir="ltr">{companyInfo.email}</span>}
                </div>
              </div>
              <BilingualText ar="أمر التغيير" en="VARIATION ORDER" className="vpd-title" />
            </div>

            <div className="vpd-title-panel">
              <div className="vpd-meta">
                <div className="vpd-meta__varno-group">
                  <div>
                    <BilingualText ar="رقم التغيير" en="VAR. NO." className="vpd-meta__label" />
                    <strong>{variation?.variation_number || data.reference_no || EMPTY}</strong>
                  </div>
                  <div>
                    <BilingualText ar="رقم المشروع" en="PROJECT NO." className="vpd-meta__label" />
                    <strong>{getProjectNumber() || EMPTY}</strong>
                  </div>
                </div>
                <div>
                  <BilingualText ar="التاريخ" en="DATE" className="vpd-meta__label" />
                  <strong>{formatDate(data.document_date || variation?.created_at)}</strong>
                </div>
              </div>
            </div>

            <div className="vpd-qr-panel">
              <QRCodeCanvas value={qrData} size={72} level="M" includeMargin={false} />
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

            <div className="vpd-info-card vpd-info-card--sm vpd-info-card--desc">
              <BilingualText ar="وصف التغيير" en="VARIATION DESCRIPTION" className="vpd-info-card__label" />
              {(data.variation_description || data.variation_description_ar) && (
                <div className="vpd-info-card__desc-block">
                  {data.variation_description && (
                    <p className="vpd-info-card__desc-text vpd-info-card__desc-text--en" dir="ltr">
                      {data.variation_description}
                    </p>
                  )}
                  {data.variation_description_ar && (
                    <p className="vpd-info-card__desc-text vpd-info-card__desc-text--ar" dir="rtl">
                      {data.variation_description_ar}
                    </p>
                  )}
                </div>
              )}
              {data.variation_cause && data.variation_cause !== data.variation_description && (
                <p className="vpd-info-card__desc-cause">
                  <strong><BilingualText ar="السبب:" en="Cause:" /></strong> {data.variation_cause}
                </p>
              )}
              {!data.variation_description && !data.variation_description_ar && !data.variation_cause && (
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
              <table className="vpd-table" data-vpd-print-table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th><BilingualText ar="الوصف" en="Description" /></th>
                    <th><BilingualText ar="الكمية" en="Qty" /></th>
                    <th><BilingualText ar="الوحدة" en="Unit" /></th>
                    <th><BilingualText ar="السعر" en="Rate" /></th>
                    <th><BilingualText ar="المبلغ" en="Amount" /></th>
                    <th className="vpd-th--section-title vpd-th--desc-ar vpd-th--added">
                      <BilingualText ar="البنود المضافة" en="ADDED ITEMS" />
                      <span className="vpd-th--section-count">{String(addedItems.length).padStart(2, "0")} lines</span>
                    </th>
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
                        <td className="vpd-td--desc-ar" dir="rtl">{item.description_ar || EMPTY}</td>
                      </tr>
                      {item.remarks?.trim() && (
                        <tr className="vpd-item-remark-row" data-vpd-item-remark-row>
                          <td />
                          <td colSpan={6} className="vpd-td--remark">
                            <div className="vpd-remark-inner">
                              <span className="vpd-remark-label">Remark (ملاحظة):</span>
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
              <table className="vpd-table" data-vpd-print-table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th><BilingualText ar="الوصف" en="Description" /></th>
                    <th><BilingualText ar="الكمية" en="Qty" /></th>
                    <th><BilingualText ar="الوحدة" en="Unit" /></th>
                    <th><BilingualText ar="السعر" en="Rate" /></th>
                    <th><BilingualText ar="المبلغ" en="Amount" /></th>
                    <th className="vpd-th--section-title vpd-th--desc-ar vpd-th--omitted">
                      <BilingualText ar="البنود المحذوفة" en="OMITTED ITEMS" />
                      <span className="vpd-th--section-count">{String(omittedItems.length).padStart(2, "0")} lines</span>
                    </th>
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
                        <td className="vpd-td--desc-ar" dir="rtl">{item.description_ar || EMPTY}</td>
                      </tr>
                      {item.remarks?.trim() && (
                        <tr className="vpd-item-remark-row" data-vpd-item-remark-row>
                          <td />
                          <td colSpan={6} className="vpd-td--remark">
                            <div className="vpd-remark-inner">
                              <span className="vpd-remark-label">Remark (ملاحظة):</span>
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
                <div className="vpd-totals-row" data-vpd-page-part>
                  {totalsRows.map((row, i) => (
                    <div
                      key={i}
                      className={[
                        "vpd-totals-cell",
                        row.variant === "grand" ? "vpd-totals-cell--grand" : "",
                        row.variant === "highlight" ? "vpd-totals-cell--highlight" : "",
                        row.variant === "subtotal" ? "vpd-totals-cell--subtotal" : "",
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

              {hasIndexItems && (
                <section className="vpd-index-page" data-vpd-page-part>
                  <h3 className="vpd-index-title">Attachments Index</h3>
                  <div className="vpd-index-grid" role="table">
                    <div className="vpd-index-grid__row vpd-index-grid__row--head" role="row">
                      <div role="columnheader">No.</div>
                      <div role="columnheader">Attachment</div>
                      <div role="columnheader">Ref. No.</div>
                      <div role="columnheader">Date</div>
                      <div role="columnheader">Pages</div>
                      <div role="columnheader">Remark</div>
                    </div>
                    {indexItems.map((item, index) => (
                      <div className="vpd-index-grid__row" role="row" key={`${item.serial_no}-${index}`}>
                        <div role="cell">{item.serial_no || index + 1}</div>
                        <div role="cell">{item.attachment || EMPTY}</div>
                        <div role="cell">{item.ref_no || EMPTY}</div>
                        <div role="cell">{formatIndexDate(item.date) || EMPTY}</div>
                        <div role="cell">{item.page_numbers || EMPTY}</div>
                        <div role="cell">{item.purpose || EMPTY}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="vpd-index-note-page" data-vpd-page-part>
                <p className="vpd-index-ack">
                  <span className="vpd-index-ack__en">
                    {indexDiscrepancyNote.en}
                  </span>
                  <span className="vpd-index-ack__ar" dir="rtl">
                    {indexDiscrepancyNote.ar}
                  </span>
                </p>
              </section>

              <div className="vpd-pinned-bottom">
                {!hideSignatures && pmInitialApproved && pmSignatureResolved && (
                  <div className="vpd-pm-signature-row">
                    <div className="vpd-sign-date-group">
                      <img
                        src={pmSignatureResolved}
                        alt="PM Signature"
                        className="vpd-pm-signature-img"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                      <span className="vpd-sign-date">{formatDate(variation?.project_manager_initial_approved_at)}</span>
                    </div>
                  </div>
                )}
                <section className="vpd-signatures">
                  <div className="vpd-sign-card vpd-sign-card--stamp">
                    <div className="vpd-stamp-placeholder">
                      <BilingualText ar="توقيع الاستشاري" en="CONSULTANT SIGNATURE" />
                    </div>
                    {!hideSignatures && consultantApproved && consultantStampResolved && (
                      <img
                        src={consultantStampResolved}
                        alt="Consultant Stamp"
                        className="vpd-stamp-img"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    {!hideSignatures && consultantApproved && <span className="vpd-sign-date">{formatDate(variation?.consultant_approval_confirmed_at)}</span>}
                  </div>
                  <div className={`vpd-sign-card vpd-sign-card--stamp${gmFinallyApproved ? ' vpd-sign-card--gm' : ''}`}>
                    {gmFinallyApproved ? (
                      <>
                        <div className="vpd-stamp-placeholder">
                          <BilingualText ar="توقيع المدير العام" en="GENERAL MANAGER" />
                        </div>
                        {!hideSignatures && gmSignatureResolved && (
                          <img
                            src={gmSignatureResolved}
                            alt="GM Signature"
                            className="vpd-stamp-img"
                            onError={e => { e.currentTarget.style.display = "none"; }}
                          />
                        )}
                        {!hideSignatures && <span className="vpd-sign-date">{formatDate(variation?.general_manager_final_approved_at)}</span>}
                      </>
                    ) : (
                      <>
                        <div className="vpd-stamp-placeholder">
                          <BilingualText ar="ختم الشركة" en="COMPANY STAMP" />
                        </div>
                        {!hideSignatures && isFinallyApproved && stampUrl && (
                          <img
                            src={stampUrl}
                            alt="Company Stamp"
                            className="vpd-stamp-img"
                            onError={e => { e.currentTarget.style.display = "none"; }}
                          />
                        )}
                      </>
                    )}
                  </div>
                  <div className="vpd-sign-card vpd-sign-card--stamp vpd-sign-card--owner">
                    <div className="vpd-stamp-placeholder">
                      <BilingualText ar="توقيع العميل" en="CLIENT SIGNATURE" />
                    </div>
                    {!hideSignatures && ownerApproved && ownerSignatureResolved && (
                      <img
                        src={ownerSignatureResolved}
                        alt="Owner Signature"
                        className="vpd-stamp-img"
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    {!hideSignatures && ownerApproved && <span className="vpd-sign-date">{formatDate(variation?.owner_approval_confirmed_at)}</span>}
                  </div>
                </section>
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
