import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import { logger } from "../../../../../utils/logger";
import PageLayout from "../../../../../components/layout/PageLayout";
import { getProjectName } from "../../../utils/projectNameUtils.jsx";
import Button from "../../../../../components/common/Button";
import Dialog from "../../../../../components/common/Dialog";
import { formatDate } from "../../../../../utils/formatters";
import NoticeOfVariationPage from "./NoticeOfVariationPage";
import VariationPrintDocument from "../components/VariationPrintDocument";
import FileAttachmentView from "../../../../../components/file-upload/FileAttachmentView";
import { useAuth } from "../../../../../contexts/AuthContext";
import { useLanguage } from "../../../../../hooks";
import { useNotifications } from "../../../../../contexts/NotificationContext";
import { FaPrint, FaFilePdf, FaCheckCircle, FaTimesCircle, FaClock, FaEdit, FaFileAlt, FaFilePdf as FaFilePdfIcon, FaPaperclip, FaExchangeAlt } from "react-icons/fa";
import { useVariationData } from "../hooks/useVariationData";
import { useVariationApprovalHandlers } from "../hooks/useVariationApprovalHandlers";
import { useVariationFinancials } from "../hooks/useVariationFinancials";
import { getStatusLabel, getStatusConfig, calculatePermissions, isRejected as checkRejected } from "../utils/variationStatusHelpers";
import { generatePDFFilename, generateDocumentTitle } from "../utils/pdfFilenameGenerator";
import { applyPrintPagePartBreaks, applyPrintTablePagination, pinPrintBottomGroup } from "../utils/printPagination";
import { fetchFileWithAuth } from "../../../../../utils/helpers/file";
import "./VariationViewPage.css";
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

const PRINT_A4_WIDTH_PX = 794;
const PRINT_A4_HEIGHT_PX = Math.round(PRINT_A4_WIDTH_PX * Math.SQRT2);
const PDF_CANVAS_SCALE = 3;
const PDF_JPEG_QUALITY = 0.97;

export default function VariationViewPage() {
  const { variationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const { user, tenantTheme } = useAuth();
  const { isArabic: isAR } = useLanguage();
  const printDocumentRef = useRef(null);
  const { success, error: showError } = useNotifications();

  // Tab management
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "view");
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [blockEditDialogOpen, setBlockEditDialogOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printPreviewTimerRef = useRef(null);
  const printLayoutCleanupRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(printPreviewTimerRef.current);
  }, []);

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("tab");
      setSearchParams(nextParams, { replace: true });
    }
  }, [tabFromUrl, searchParams, setSearchParams]);

  // Use custom hooks for data management
  const toast = (type, msg) => type === "success" ? success(msg) : showError(msg);

  const { variation, project, loading, error: loadError, auditLogs, alterationRequests, loadingAuditLogs, loadVariation } = useVariationData(
    variationId,
    toast,
    t,
    navigate
  );

  const { noticeData } = useVariationFinancials(variation);

  const {
    processingApproval,
    actionNotes,
    setActionNotes,
    dialogStates,
    handlers,
  } = useVariationApprovalHandlers(variation, project, toast, t, loadVariation);

  // Load company information for print header (non-critical — don't redirect on 401)
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const { api } = await import("../../../../../services/api");
        const { data } = await api.get('auth/tenant-settings/current/', { _skipAuthRedirect: true });
        setCompanyInfo({
          logo: data.company_logo || tenantTheme?.logo || null,
          name: data.contractor_name || data.company_name || "",
          name_en: data.contractor_name_en || data.company_name || "",
          phone: data.company_phone || data.contractor_phone || "",
          email: data.company_email || data.contractor_email || "",
          website: data.company_website || "",
          address: data.company_address || "",
          company_stamp_url: data.company_stamp_url || null,
        });
      } catch (e) {
        logger.warn("Could not load company info", e);
      }
    };
    loadCompanyInfo();
  }, [tenantTheme]);

  // Status and permissions
  const variationStatus = variation?.status || variation?.workflow_status || 'draft';
  const permissions = calculatePermissions(variation, user, alterationRequests);
  const isRejected = checkRejected(variation);

  const preparePrintDocumentLayout = async (el) => {
    const prevWidth = el?.style.width || "";
    let cleanupTablePagination = null;
    let cleanupPageBreaks = null;
    let cleanupPinnedBottom = null;

    el.classList.add('vpd-print-mode');
    el.style.width = `${PRINT_A4_WIDTH_PX}px`;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    cleanupTablePagination = applyPrintTablePagination(el, PRINT_A4_HEIGHT_PX);
    await new Promise(resolve => requestAnimationFrame(resolve));

    cleanupPageBreaks = applyPrintPagePartBreaks(el, PRINT_A4_HEIGHT_PX);
    await new Promise(resolve => requestAnimationFrame(resolve));

    cleanupPinnedBottom = pinPrintBottomGroup(el, {
      pageHeight: PRINT_A4_HEIGHT_PX,
      continuationPageHeight: PRINT_A4_HEIGHT_PX,
    });
    await new Promise(resolve => requestAnimationFrame(resolve));

    return () => {
      cleanupPinnedBottom?.();
      cleanupPageBreaks?.();
      cleanupTablePagination?.();
      el.classList.remove('vpd-print-mode');
      el.style.width = prevWidth;
    };
  };

  // Professional Print Handler using react-to-print v3
  const handlePrint = useReactToPrint({
    contentRef: printDocumentRef,
    documentTitle: generateDocumentTitle(variation, noticeData),
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
    onBeforePrint: async () => {
      if (!printDocumentRef.current) return;
      printLayoutCleanupRef.current = await preparePrintDocumentLayout(printDocumentRef.current);
    },
    onAfterPrint: () => {
      printLayoutCleanupRef.current?.();
      printLayoutCleanupRef.current = null;
    },
  });

  // Print Preview handlers
  const handlePrintPreview = () => {
    setIsPrintPreview(true);
    printPreviewTimerRef.current = setTimeout(() => window.scrollTo(0, 0), 100);
  };

  const handleClosePrintPreview = () => {
    setIsPrintPreview(false);
  };

  // PDF Export — client-side using html2canvas + jsPDF, then pdf-lib to append attachments
  const handleExportPDF = async () => {
    if (!variation || !project || !printDocumentRef.current) {
      showError(t("pdf_export_error"));
      return;
    }
    setPdfLoading(true);
    let cleanupPrintLayout = null;
    let _watermarkEl = null;
    try {
      success(t("generating_pdf"));
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const el = printDocumentRef.current;
      cleanupPrintLayout = await preparePrintDocumentLayout(el);

      // Hide the CSS watermark element — will be drawn onto canvas instead
      _watermarkEl = el.querySelector('.vpd-watermark');
      const _logoSrc = _watermarkEl?.src || null;
      if (_watermarkEl) _watermarkEl.style.display = 'none';

      const canvas = await html2canvas(el, {
        scale: PDF_CANVAS_SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: el.scrollHeight,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 0;
      const contentW = pageW;
      const contentH = pageH;
      const scale = contentW / canvas.width;
      const pageCanvasH = Math.round(contentH / scale);
      const pages = Math.ceil(canvas.height / pageCanvasH);

      // Draw logo watermark at the centre of every page slice
      if (_logoSrc) {
        try {
          const logoBlob = await fetchFileWithAuth(_logoSrc);
          const logoBlobUrl = URL.createObjectURL(logoBlob);
          const wImg = await new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => rej(new Error('watermark img load failed'));
            img.src = logoBlobUrl;
          });
          URL.revokeObjectURL(logoBlobUrl);
          const maxW = canvas.width * 0.55;
          const maxH = pageCanvasH * 0.55;
          const ratio = Math.min(maxW / wImg.naturalWidth, maxH / wImg.naturalHeight);
          const drawW = wImg.naturalWidth * ratio;
          const drawH = wImg.naturalHeight * ratio;
          const drawX = (canvas.width - drawW) / 2;
          const ctx = canvas.getContext('2d');
          ctx.save();
          ctx.globalAlpha = 0.12;
          for (let p = 0; p < pages; p++) {
            const pageStart = p * pageCanvasH;
            const pageSliceH = Math.min(pageCanvasH, canvas.height - pageStart);
            const midY = pageStart + pageSliceH / 2;
            ctx.drawImage(wImg, drawX, midY - drawH / 2, drawW, drawH);
          }
          ctx.restore();
        } catch { /* logo unavailable — skip watermark */ }
      }

      for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();
        pdf.setFillColor(251, 248, 242);
        pdf.rect(0, 0, pageW, pageH, 'F');

        const srcY = i * pageCanvasH;
        const srcH = Math.min(pageCanvasH, canvas.height - srcY);
        if (srcH <= 0) continue;
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = srcH;
        slice.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        pdf.addImage(
          slice.toDataURL('image/jpeg', PDF_JPEG_QUALITY),
          'JPEG',
          margin,
          margin,
          contentW,
          srcH * scale
        );
      }

      // Merge variation_attachments (PDFs/images) using pdf-lib
      const attachments = variation?.variation_attachments || [];
      if (attachments.length > 0) {
        const { PDFDocument } = await import('pdf-lib');
        const mainPdfBytes = pdf.output('arraybuffer');
        const mergedDoc = await PDFDocument.load(mainPdfBytes);

        const { fetchFileWithAuth, buildFileUrl } = await import('../../../../../utils/helpers/file');

        for (const att of attachments) {
          const fileUrl = att.file || att.url;
          if (!fileUrl) continue;
          try {
            const blob = await fetchFileWithAuth(fileUrl);
            const bytes = await blob.arrayBuffer();
            const fullUrl = buildFileUrl(fileUrl) || fileUrl;
            const contentType = blob.type || '';
            const lowerUrl = fullUrl.toLowerCase();

            if (contentType.includes('pdf') || lowerUrl.endsWith('.pdf')) {
              const attDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
              const copiedPages = await mergedDoc.copyPages(attDoc, attDoc.getPageIndices());
              copiedPages.forEach(p => mergedDoc.addPage(p));
            } else {
              // Image — embed as a full A4 page
              const imgPage = mergedDoc.addPage([pageW, pageH]);
              let embeddedImg;
              if (lowerUrl.endsWith('.png') || contentType.includes('png')) {
                embeddedImg = await mergedDoc.embedPng(bytes);
              } else {
                embeddedImg = await mergedDoc.embedJpg(bytes);
              }
              const { width: iW, height: iH } = embeddedImg.scaleToFit(pageW, pageH);
              imgPage.drawImage(embeddedImg, {
                x: (pageW - iW) / 2,
                y: (pageH - iH) / 2,
                width: iW,
                height: iH,
              });
            }
          } catch (attErr) {
            logger.warn('Could not append attachment', fileUrl, attErr);
          }
        }

        const mergedBytes = await mergedDoc.save();
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generatePDFFilename(variation, noticeData);
        a.click();
        URL.revokeObjectURL(url);
      } else {
        pdf.save(generatePDFFilename(variation, noticeData));
      }

      success(t("pdf_exported_successfully"));
    } catch (error) {
      logger.error("Error generating PDF", error);
      showError(t("pdf_export_error"));
    } finally {
      if (_watermarkEl) _watermarkEl.style.display = '';
      cleanupPrintLayout?.();
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout loading={true} loadingText={t("loading")}>
        <div></div>
      </PageLayout>
    );
  }

  if (loadError || !variation || !project) {
    return (
      <PageLayout>
        <div className="prj-error-state">
          <div className="prj-error-state__icon">⚠️</div>
          <h2 className="prj-error-state__title">
            {loadError === "variation_not_found" ? t("variation_not_found") : t("load_error")}
          </h2>
          <p className="prj-error-state__desc">
            {t("error_description")}
          </p>
          <div className="prj-error-state__actions">
            <Button variant="primary" onClick={() => loadVariation()}>
              {t("error_try_again")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("/projects")}>
              {t("error_go_to_projects")}
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const statusConfig = getStatusConfig(variationStatus);
  const StatusIcon = statusConfig.icon;

  const projectNameData = project ? getProjectName(project) : null;
  const _pnAr = projectNameData?.ar || projectNameData?.full || '';
  const _pnEn = projectNameData?.en || '';
  const _hasBothNames = !!_pnAr && !!_pnEn && _pnAr !== _pnEn;
  const projectNamePrimary = isAR ? (_pnAr || _pnEn || t('variation_order')) : (_pnEn || _pnAr || t('variation_order'));
  const projectNameSecondary = _hasBothNames ? (isAR ? _pnEn : _pnAr) : null;

  return (
    <PageLayout>
      <div className="var-view-container">
        {/* Print Preview Overlay */}
        {isPrintPreview && (
          <div className="print-preview-overlay">
            <div className="print-preview-controls">
              <Button variant="primary" onClick={handlePrint}>
                <FaPrint /> {t("print")}
              </Button>
              <Button variant="secondary" onClick={handleExportPDF}>
                <FaFilePdf /> {t("export_pdf")}
              </Button>
              <Button variant="danger" onClick={handleClosePrintPreview}>
                {t("close")}
              </Button>
            </div>
            <div className="print-preview-content">
              <VariationPrintDocument
                variation={variation}
                project={project}
                companyInfo={companyInfo}
                noticeData={noticeData}
              />
            </div>
          </div>
        )}

        {/* ========== PROFESSIONAL PRINT DOCUMENT (Hidden on screen, visible on print) ========== */}
        {variation && project && (
          <div
            id="variation-print-document-wrapper"
            className="var-print-document-wrapper"
          >
            <VariationPrintDocument
              ref={printDocumentRef}
              variation={variation}
              project={project}
              companyInfo={companyInfo}
              noticeData={noticeData}
            />
          </div>
        )}

        {/* ========== UNIFIED STICKY HEADER ========== */}
        <div className="var-unified-header no-print">

          {/* TOP ROW: back + project name + meta + actions */}
          <div className="var-unified-header__top">
            <button
              type="button"
              className="page-bar__back"
              onClick={() => navigate(`/projects/${project.id}?tab=variations`)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t("back")}</span>
            </button>

            <div className="var-unified-header__name-group">
              <span className="var-unified-header__project">{projectNamePrimary}</span>
              {projectNameSecondary && (
                <span className="var-unified-header__project-sub">{projectNameSecondary}</span>
              )}
            </div>

            <div className="var-unified-header__meta">
              <div className="var-header-meta__chip">
                <span className="var-header-meta__label">{t("variation_no")}</span>
                <span className="var-header-meta__value">{variation?.variation_number || `VAR-${variation?.id}`}</span>
              </div>
              <div className={`var-status-pill var-status-pill--${variationStatus}`}>
                <StatusIcon />
                <span>{getStatusLabel(variationStatus, t)}</span>
              </div>
            </div>

            <div className="var-unified-header__actions">
              <Button variant="ghost" size="sm" onClick={handlePrint} title={t("print")}>
                <FaPrint />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportPDF} disabled={pdfLoading} title={t("export_pdf")}>
                <FaFilePdf />
              </Button>
            </div>
          </div>

          {/* BOTTOM ROW: tabs + approval actions */}
          <div className="var-unified-header__toolbar">
            <div className="var-toolbar__tabs">
              <button
                className={`var-toolbar__tab ${activeTab === "view" ? "var-toolbar__tab--active" : ""}`}
                onClick={() => setActiveTab("view")}
              >
                {t("view")}
              </button>
              <button
                className={`var-toolbar__tab ${activeTab === "edit" ? "var-toolbar__tab--active" : ""} ${!permissions.canEdit ? "var-toolbar__tab--disabled" : ""}`}
                onClick={() => {
                  if (!permissions.canEdit) { setBlockEditDialogOpen(true); return; }
                  setActiveTab("edit");
                }}
                title={!permissions.canEdit ? t("cannot_edit_approved") : ""}
              >
                {t("edit")}
              </button>
              <button
                className={`var-toolbar__tab ${activeTab === "approvals" ? "var-toolbar__tab--active" : ""}`}
                onClick={() => setActiveTab("approvals")}
              >
                {t("approvals")}
              </button>
            </div>

            {(activeTab === "edit" && permissions.canEdit ||
              permissions.canApproveProjectManager || permissions.canRejectProjectManager ||
              permissions.canApproveGeneralManagerInitial || permissions.canRejectGeneralManager ||
              permissions.canConfirmOwnerApproval || permissions.canConfirmConsultantApproval ||
              permissions.canApproveGeneralManagerFinal) && (
                <div className="var-toolbar__actions">
                  {activeTab === "edit" && permissions.canEdit && (
                    <>
                      <span className="var-toolbar__actions-label">{t("actions")}</span>
                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        form="notice-variation-form"
                      >
                        {t("save")}
                      </Button>
                    </>
                  )}
                  {(permissions.canApproveProjectManager || permissions.canRejectProjectManager ||
                    permissions.canApproveGeneralManagerInitial || permissions.canRejectGeneralManager ||
                    permissions.canConfirmOwnerApproval || permissions.canConfirmConsultantApproval ||
                    permissions.canApproveGeneralManagerFinal) && (
                    <>
                      <span className="var-toolbar__actions-label">{t("available_actions")}</span>
                      {permissions.canApproveProjectManager && (
                        <Button variant="primary" size="sm" onClick={() => dialogStates.setApproveProjectManagerDialogOpen(true)}>
                          <FaCheckCircle /> {t("approve_project_manager_initial")}
                        </Button>
                      )}
                      {permissions.canRejectProjectManager && (
                        <Button variant="danger" size="sm" onClick={() => dialogStates.setRejectProjectManagerDialogOpen(true)}>
                          <FaTimesCircle /> {t("reject")}
                        </Button>
                      )}
                      {permissions.canApproveGeneralManagerInitial && (
                        <Button variant="primary" size="sm" onClick={() => dialogStates.setApproveGeneralManagerInitialDialogOpen(true)}>
                          <FaCheckCircle /> {t("approve_general_manager_initial")}
                        </Button>
                      )}
                      {permissions.canRejectGeneralManager && (
                        <Button variant="danger" size="sm" onClick={() => dialogStates.setRejectGeneralManagerDialogOpen(true)}>
                          <FaTimesCircle /> {t("reject")}
                        </Button>
                      )}
                      {permissions.canConfirmOwnerApproval && (
                        <Button variant="primary" size="sm" onClick={() => dialogStates.setConfirmOwnerApprovalDialogOpen(true)}>
                          <FaCheckCircle /> {t("confirm_owner_approval")}
                        </Button>
                      )}
                      {permissions.canConfirmConsultantApproval && (
                        <Button variant="primary" size="sm" onClick={() => dialogStates.setConfirmConsultantApprovalDialogOpen(true)}>
                          <FaCheckCircle /> {t("confirm_consultant_approval")}
                        </Button>
                      )}
                      {permissions.canApproveGeneralManagerFinal && (
                        <Button variant="primary" size="sm" onClick={() => dialogStates.setApproveGeneralManagerFinalDialogOpen(true)}>
                          <FaCheckCircle /> {t("approve_general_manager_final")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
          </div>
        </div>


        {/* ========== REJECTION WARNING ========== */}
        {variation?.rejected_by && variation?.rejection_reason && (
          <div className="var-rejection-alert no-print">
            <div className="var-rejection-alert__icon">
              <FaTimesCircle />
            </div>
            <div className="var-rejection-alert__content">
              <div className="var-rejection-alert__title">{t("variation_rejected")}</div>
              <div className="var-rejection-alert__reason">{variation.rejection_reason}</div>
              <div className="var-rejection-alert__meta">
                {t("rejected_by")}: {variation.rejected_by?.full_name || variation.rejected_by?.email}
                {variation.rejected_at && ` • ${formatDate(variation.rejected_at)}`}
              </div>
              {isRejected && (
                <div className="var-rejection-alert__warning">
                  {t("must_edit_before_approval")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== TAB CONTENT ========== */}
        <div className="var-content prj-tab-panel">
          {activeTab === "view" && (
            <div className="var-view-content">
              <NoticeOfVariationPage variation={variation} project={project} viewMode={true} />

              {/* ========== BOTTOM PANELS: ATTACHMENTS + AUDIT ========== */}
              <div className="var-bottom-panels no-print">

                {/* LEFT: Attachments */}
                <div className="var-panel var-panel--attachments">
                  <div className="var-panel__header">
                    <FaPaperclip className="var-panel__icon var-panel__icon--gold" />
                    <span className="var-panel__title">{t("attachments")}</span>
                  </div>
                  <div className="var-panel__body">

                    {/* الفاريشن الورقي */}
                    <div className="var-attach-row">
                      <div className="var-attach-row__label">
                        <span className="var-attach-dot var-attach-dot--gold" />
                        {t("variation_document")}
                      </div>
                      <div className="var-attach-row__sub">{t("variation_document_desc")}</div>
                      {variation?.variation_invoice_file ? (
                        <FileAttachmentView
                          fileUrl={variation.variation_invoice_file}
                          fileName={variation.variation_invoice_file.split('/').pop()}
                          projectId={project?.id}
                          endpoint={project?.id ? `projects/${project.id}/variations/${variation.id}/` : undefined}
                        />
                      ) : (
                        <span className="var-attach-row__empty">{t("no_file_attached")}</span>
                      )}
                    </div>

                    <div className="var-attach-divider" />

                    {/* PDF إلكتروني */}
                    <div className="var-attach-row">
                      <div className="var-attach-row__label">
                        <span className="var-attach-dot var-attach-dot--red" />
                        {t("export_pdf")}
                      </div>
                      <div className="var-attach-row__sub">{t("pdf_export_desc")}</div>
                      <Button variant="secondary" size="sm" onClick={handleExportPDF} disabled={pdfLoading}>
                        <FaFilePdf /> {pdfLoading ? t("generating_pdf") : t("export_pdf")}
                      </Button>
                    </div>

                    <div className="var-attach-divider" />

                    {variation?.revision_history?.length > 0 && (
                      <>
                        <div className="var-attach-row var-attach-row--revisions">
                          <div className="var-attach-row__label">
                            <span className="var-attach-dot var-attach-dot--blue" />
                            {t("previous_revisions")}
                          </div>
                          <div className="var-attach-row__sub">{t("previous_revisions_desc")}</div>
                          <div className="var-revision-list">
                            {variation.revision_history.map((revision) => (
                              <button
                                type="button"
                                key={revision.id}
                                className="var-revision-link"
                                onClick={() => navigate(`/variations/${revision.id}/view?project=${project.id}`)}
                              >
                                <span className="var-revision-link__number">
                                  {revision.variation_number || `VAR-${revision.id}`}
                                </span>
                                <span className="var-revision-link__meta">
                                  {revision.updated_at ? formatDate(revision.updated_at) : getStatusLabel(revision.status, t)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="var-attach-divider" />
                      </>
                    )}

                    {/* الطباعة */}
                    <div className="var-attach-row">
                      <div className="var-attach-row__label">
                        <span className="var-attach-dot var-attach-dot--blue" />
                        {t("print_document")}
                      </div>
                      <div className="var-attach-row__sub">{t("print_document_desc")}</div>
                      <Button variant="secondary" size="sm" onClick={handlePrint}>
                        <FaPrint /> {t("print")}
                      </Button>
                    </div>

                  </div>
                </div>

                {/* RIGHT: Audit Log */}
                <div className="var-panel var-panel--audit">
                  <div className="var-panel__header">
                    <FaClock className="var-panel__icon var-panel__icon--gold" />
                    <span className="var-panel__title">{t("variation_history")}</span>
                    {auditLogs.length > 0 && (
                      <span className="var-panel__badge">{auditLogs.length}</span>
                    )}
                  </div>
                  <div className="var-panel__body var-panel__body--scroll">
                    {loadingAuditLogs ? (
                      <div className="var-audit-loading">
                        <div className="var-audit-loading__spinner" />
                        <span>{t("loading")}</span>
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="var-audit-empty">
                        <FaClock />
                        <span>{t("no_history")}</span>
                      </div>
                    ) : (
                      <div className="var-audit-timeline">
                        {auditLogs.map((log, index) => {
                          const isApprove = log.action === 'approve' || log.action?.includes('approv');
                          const isReject = log.action === 'reject' || log.action?.includes('reject');
                          const isCreate = log.action === 'create' || log.action?.includes('creat');
                          const isEdit = log.action === 'update' || log.action?.includes('edit') || log.action?.includes('updat');
                          let logClass = '';
                          if (isApprove) logClass = 'var-audit-entry--approve';
                          else if (isReject) logClass = 'var-audit-entry--reject';
                          else if (isCreate) logClass = 'var-audit-entry--create';
                          else if (isEdit) logClass = 'var-audit-entry--edit';

                          return (
                            <div key={log.id || index} className={`var-audit-entry ${logClass}`}>
                              <div className="var-audit-entry__dot">
                                {isApprove && <FaCheckCircle />}
                                {isReject && <FaTimesCircle />}
                                {isCreate && <FaFileAlt />}
                                {isEdit && <FaEdit />}
                                {!isApprove && !isReject && !isCreate && !isEdit && <FaExchangeAlt />}
                              </div>
                              <div className="var-audit-entry__body">
                                <div className="var-audit-entry__top">
                                  <span className="var-audit-entry__action">
                                    {log.action_display || log.action}
                                  </span>
                                  <span className="var-audit-entry__date">
                                    {log.created_at ? formatDate(log.created_at) : ''}
                                  </span>
                                </div>
                                {log.user && (
                                  <div className="var-audit-entry__user">
                                    <span className="var-audit-entry__user-avatar">
                                      {(log.user.full_name || log.user.email || '?')[0].toUpperCase()}
                                    </span>
                                    {log.user.full_name || log.user.email}
                                  </div>
                                )}
                                {log.description && (
                                  <div className="var-audit-entry__desc">{log.description}</div>
                                )}
                                {log.changes?.old_status && log.changes?.new_status && (
                                  <div className="var-audit-entry__status-change">
                                    <span className="var-audit-entry__status-old">{t(log.changes.old_status) || log.changes.old_status}</span>
                                    <FaExchangeAlt className="var-audit-entry__status-arrow" />
                                    <span className="var-audit-entry__status-new">{t(log.changes.new_status) || log.changes.new_status}</span>
                                  </div>
                                )}
                                {log.changes?.new_rejection_reason && (
                                  <div className="var-audit-entry__rejection">
                                    <strong>{t("rejection_reason")}:</strong> {log.changes.new_rejection_reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "edit" && (
            <div className="var-edit-content no-print">
              <div className="var-edit-header">
                {/* <Button variant="secondary" onClick={() => setActiveTab("view")}>
                  {t("back_to_view")}
                </Button> */}
              </div>
              <NoticeOfVariationPage variation={variation} project={project} viewMode={false} allowRevisionEdit={permissions.canEdit} />
            </div>
          )}

          {activeTab === "approvals" && (
            <div className="var-approvals-content no-print">
              <h2 className="var-approvals-title">
                {t("approval_workflow")}
              </h2>

              <div className="var-approvals-timeline">
                {/* Project Manager Initial */}
                <div className={`var-approval-step ${variation?.project_manager_initial_approved_by ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.project_manager_initial_approved_by ? <FaCheckCircle /> : <span>1</span>}
                  </div>
                  <div className="var-approval-step__content">
                    <div className="var-approval-step__title">{t("project_manager_initial_approval")}</div>
                    {variation?.project_manager_initial_approved_by ? (
                      <div className="var-approval-step__info">
                        <span className="var-approval-step__user">{variation.project_manager_initial_approved_by?.full_name}</span>
                        {variation.project_manager_initial_approved_at && (
                          <span className="var-approval-step__date">{formatDate(variation.project_manager_initial_approved_at)}</span>
                        )}
                      </div>
                    ) : (
                      <div className="var-approval-step__pending">{t("pending")}</div>
                    )}
                  </div>
                </div>

                {/* General Manager Initial */}
                <div className={`var-approval-step ${variation?.general_manager_initial_approved_by ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.general_manager_initial_approved_by ? <FaCheckCircle /> : <span>2</span>}
                  </div>
                  <div className="var-approval-step__content">
                    <div className="var-approval-step__title">{t("general_manager_initial_approval")}</div>
                    {variation?.general_manager_initial_approved_by ? (
                      <div className="var-approval-step__info">
                        <span className="var-approval-step__user">{variation.general_manager_initial_approved_by?.full_name}</span>
                        {variation.general_manager_initial_approved_at && (
                          <span className="var-approval-step__date">{formatDate(variation.general_manager_initial_approved_at)}</span>
                        )}
                      </div>
                    ) : (
                      <div className="var-approval-step__pending">{t("pending")}</div>
                    )}
                  </div>
                </div>

                {/* Owner Confirmation */}
                <div className={`var-approval-step ${variation?.owner_approval_confirmed ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.owner_approval_confirmed ? <FaCheckCircle /> : <span>3</span>}
                  </div>
                  <div className="var-approval-step__content">
                    <div className="var-approval-step__title">{t("owner_approval_confirmed")}</div>
                    {variation?.owner_approval_confirmed ? (
                      <div className="var-approval-step__info">
                        <span className="var-approval-step__status">{t("confirmed")}</span>
                        {variation.owner_approval_confirmed_by && (
                          <span className="var-approval-step__user">{variation.owner_approval_confirmed_by?.full_name}</span>
                        )}
                        {variation.owner_approval_confirmed_at && (
                          <span className="var-approval-step__date">{formatDate(variation.owner_approval_confirmed_at)}</span>
                        )}
                      </div>
                    ) : (
                      <div className="var-approval-step__pending">{t("pending")}</div>
                    )}
                  </div>
                </div>

                {/* Consultant Confirmation */}
                <div className={`var-approval-step ${variation?.consultant_approval_confirmed ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.consultant_approval_confirmed ? <FaCheckCircle /> : <span>4</span>}
                  </div>
                  <div className="var-approval-step__content">
                    <div className="var-approval-step__title">{t("consultant_approval_confirmed")}</div>
                    {variation?.consultant_approval_confirmed ? (
                      <div className="var-approval-step__info">
                        <span className="var-approval-step__status">{t("confirmed")}</span>
                        {variation.consultant_approval_confirmed_by && (
                          <span className="var-approval-step__user">{variation.consultant_approval_confirmed_by?.full_name}</span>
                        )}
                        {variation.consultant_approval_confirmed_at && (
                          <span className="var-approval-step__date">{formatDate(variation.consultant_approval_confirmed_at)}</span>
                        )}
                      </div>
                    ) : (
                      <div className="var-approval-step__pending">{t("pending")}</div>
                    )}
                  </div>
                </div>

                {/* General Manager Final */}
                <div className={`var-approval-step ${variation?.general_manager_final_approved_by ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.general_manager_final_approved_by ? <FaCheckCircle /> : <span>5</span>}
                  </div>
                  <div className="var-approval-step__content">
                    <div className="var-approval-step__title">{t("general_manager_final_approval")}</div>
                    {variation?.general_manager_final_approved_by ? (
                      <div className="var-approval-step__info">
                        <span className="var-approval-step__user">{variation.general_manager_final_approved_by?.full_name}</span>
                        {variation.general_manager_final_approved_at && (
                          <span className="var-approval-step__date">{formatDate(variation.general_manager_final_approved_at)}</span>
                        )}
                      </div>
                    ) : (
                      <div className="var-approval-step__pending">{t("pending")}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========== PRINT FOOTER ========== */}
        <div className="var-print-footer print-only">
          <div className="var-print-footer__content">
            {companyInfo?.phone && <span>📞 {companyInfo.phone}</span>}
            {companyInfo?.email && <span>✉️ {companyInfo.email}</span>}
            {companyInfo?.website && <span>🌐 {companyInfo.website}</span>}
          </div>
        </div>

        {/* ========== DIALOGS ========== */}
        <Dialog
          open={dialogStates.approveProjectManagerDialogOpen}
          title={t("approve_project_manager_initial")}
          desc={
            <div>
              <p>{t("approve_project_manager_initial_confirmation")}</p>
              <label className="var-dialog-label">
                {t("notes")} ({t("optional")})
              </label>
              <textarea
                className="var-dialog-textarea"
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("approval_notes_placeholder")}
              />
            </div>
          }
          confirmLabel={t("approve")}
          cancelLabel={t("cancel")}
          onClose={() => { dialogStates.setApproveProjectManagerDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleApproveProjectManagerInitial}
          busy={processingApproval}
        />

        {/* Block Edit Dialog for Final Approved Variations */}
        <Dialog
          open={blockEditDialogOpen}
          title={t("variation_edit_not_allowed")}
          desc={t("variation_edit_not_allowed_desc")}
          confirmLabel={t("ok_label")}
          cancelLabel={null}
          onClose={() => setBlockEditDialogOpen(false)}
          onConfirm={() => setBlockEditDialogOpen(false)}
        />

        <Dialog
          open={dialogStates.approveGeneralManagerInitialDialogOpen}
          title={t("approve_general_manager_initial")}
          desc={
            <div>
              <p>{t("approve_general_manager_initial_confirmation")}</p>
              <label className="var-dialog-label">
                {t("notes")} ({t("optional")})
              </label>
              <textarea
                className="var-dialog-textarea"
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("approval_notes_placeholder")}
              />
            </div>
          }
          confirmLabel={t("approve")}
          cancelLabel={t("cancel")}
          onClose={() => { dialogStates.setApproveGeneralManagerInitialDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleApproveGeneralManagerInitial}
          busy={processingApproval}
        />

        <Dialog
          open={dialogStates.confirmOwnerApprovalDialogOpen}
          title={t("confirm_owner_approval")}
          desc={
            <div>
              <p>{t("confirm_owner_approval_confirmation")}</p>
              <label className="var-dialog-label">
                {t("notes")} ({t("optional")})
              </label>
              <textarea
                className="var-dialog-textarea"
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("approval_notes_placeholder")}
              />
            </div>
          }
          confirmLabel={t("confirm")}
          cancelLabel={t("cancel")}
          onClose={() => { dialogStates.setConfirmOwnerApprovalDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleConfirmOwnerApproval}
          busy={processingApproval}
        />

        <Dialog
          open={dialogStates.confirmConsultantApprovalDialogOpen}
          title={t("confirm_consultant_approval")}
          desc={
            <div>
              <p>{t("confirm_consultant_approval_confirmation")}</p>
              <label className="var-dialog-label">
                {t("notes")} ({t("optional")})
              </label>
              <textarea
                className="var-dialog-textarea"
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("approval_notes_placeholder")}
              />
            </div>
          }
          confirmLabel={t("confirm")}
          cancelLabel={t("cancel")}
          onClose={() => { dialogStates.setConfirmConsultantApprovalDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleConfirmConsultantApproval}
          busy={processingApproval}
        />

        <Dialog
          open={dialogStates.approveGeneralManagerFinalDialogOpen}
          title={t("approve_general_manager_final")}
          desc={
            <div>
              <p>{t("approve_general_manager_final_confirmation")}</p>
              <label className="var-dialog-label">
                {t("notes")} ({t("optional")})
              </label>
              <textarea
                className="var-dialog-textarea"
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("approval_notes_placeholder")}
              />
            </div>
          }
          confirmLabel={t("approve")}
          cancelLabel={t("cancel")}
          onClose={() => { dialogStates.setApproveGeneralManagerFinalDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleApproveGeneralManagerFinal}
          busy={processingApproval}
        />

        <Dialog
          open={dialogStates.rejectProjectManagerDialogOpen}
          title={t("reject_variation")}
          desc={
            <div>
              <p>{t("reject_project_manager_confirmation")}</p>
              <label className="var-dialog-label">
                {t("rejection_reason")} <span className="var-required">*</span>
              </label>
              <textarea
                className="var-dialog-textarea"
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("enter_rejection_reason")}
                required
              />
            </div>
          }
          confirmLabel={t("reject")}
          cancelLabel={t("cancel")}
          onClose={() => { dialogStates.setRejectProjectManagerDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleRejectProjectManager}
          busy={processingApproval}
        />

        <Dialog
          open={dialogStates.rejectGeneralManagerDialogOpen}
          title={t("reject_variation")}
          desc={
            <div>
              <p>{t("reject_general_manager_confirmation")}</p>
              <label className="var-dialog-label">
                {t("rejection_reason")} <span className="var-required">*</span>
              </label>
              <textarea
                className="var-dialog-textarea"
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("enter_rejection_reason")}
                required
              />
            </div>
          }
          confirmLabel={t("reject")}
          cancelLabel={t("cancel")}
          onClose={() => { dialogStates.setRejectGeneralManagerDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleRejectGeneralManager}
          busy={processingApproval}
        />
      </div>
    </PageLayout>
  );
}
