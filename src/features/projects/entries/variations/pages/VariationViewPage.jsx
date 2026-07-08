import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import { logger } from "../../../../../utils/logger";
import PageLayout from "../../../../../components/layout/PageLayout";
import { getProjectName } from "../../../utils/projectNameUtils.jsx";
import Button from "../../../../../components/common/Button";
import Dialog from "../../../../../components/common/Dialog";
import { formatDate, formatMoney } from "../../../../../utils/formatters";
import NoticeOfVariationPage from "./NoticeOfVariationPage";
import VariationPrintDocument from "../components/VariationPrintDocument";
import FileAttachmentView from "../../../../../components/file-upload/FileAttachmentView";
import { useAuth } from "../../../../../contexts/AuthContext";
import { useLanguage } from "../../../../../hooks";
import { useNotifications } from "../../../../../contexts/NotificationContext";
import { FaPrint, FaFilePdf, FaCheckCircle, FaTimesCircle, FaClock, FaEdit, FaFileAlt, FaFilePdf as FaFilePdfIcon, FaPaperclip, FaExchangeAlt } from "react-icons/fa";
import { FiFile, FiDownload } from "react-icons/fi";
import { useVariationData } from "../hooks/useVariationData";
import { useVariationApprovalHandlers } from "../hooks/useVariationApprovalHandlers";
import { useVariationFinancials } from "../hooks/useVariationFinancials";
import { getStatusLabel, getStatusConfig, calculatePermissions, canDirectUnapproveVariation, canRequestUnapproveVariation, isRejected as checkRejected } from "../utils/variationStatusHelpers";
import { generatePDFFilename, generateDocumentTitle } from "../utils/pdfFilenameGenerator";
import { prepareVariationPrintDocumentLayout } from "../utils/variationPdfExport";
import { appendWrappedVariationAttachments, stampVariationPageNumbers } from "../utils/wrapVariationAttachments";
import { fetchFileWithAuth, buildFileUrl } from "../../../../../utils/helpers/file";
import "./VariationViewPage.css";
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';
import VariationAiAuditPanel from './components/VariationAiAuditPanel';
import { projectApi } from '../../../../../services/projects/projectApi';

const PRINT_A4_WIDTH_PX = 794;
const PRINT_A4_HEIGHT_PX = Math.round(PRINT_A4_WIDTH_PX * Math.SQRT2);
const PDF_CANVAS_SCALE = 3;
const PDF_JPEG_QUALITY = 0.97;
const NOTICE_PDF_FOOTER_HEIGHT_PT = 11;

async function createPdfWatermarkImage(src) {
  const blob = await fetchFileWithAuth(src);
  const blobUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("watermark img load failed"));
      image.src = blobUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.12;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export default function VariationViewPage() {
  const { variationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const { user, tenantTheme, hasPermission, isAdmin } = useAuth();
  const { isArabic: isAR } = useLanguage();
  const printDocumentRef = useRef(null);
  const printDocumentCleanRef = useRef(null);
  const { success, error: showError } = useNotifications();

  // Tab management
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "view");
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [blockEditDialogOpen, setBlockEditDialogOpen] = useState(false);
  const [returnEditDialogOpen, setReturnEditDialogOpen] = useState(false);
  const [returnEditReason, setReturnEditReason] = useState('');
  const [returnEditBusy, setReturnEditBusy] = useState(false);
  const [unapproveBusy, setUnapproveBusy] = useState(false);
  const [requestUnapproveDialogOpen, setRequestUnapproveDialogOpen] = useState(false);
  const [requestUnapproveReason, setRequestUnapproveReason] = useState('');
  const [requestUnapproveBusy, setRequestUnapproveBusy] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [consultantStampUrl, setConsultantStampUrl] = useState(null);
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

  // Load consultant stamp from project license for print document
  useEffect(() => {
    if (!project?.id) return;
    const loadConsultantStamp = async () => {
      try {
        const { api } = await import("../../../../../services/api");
        const { data } = await api.get(`projects/${project.id}/license/`, { _skipAuthRedirect: true });
        const licenseData = Array.isArray(data) ? data[0] : data;
        if (licenseData?.consultant_stamp) {
          const url = licenseData.consultant_stamp;
          setConsultantStampUrl(url.startsWith("http") ? url : buildFileUrl(url));
        }
      } catch (e) {
        logger.warn("Could not load consultant stamp", e);
      }
    };
    loadConsultantStamp();
  }, [project?.id]);

  // Status and permissions
  const variationStatus = variation?.status || variation?.workflow_status || 'draft';
  const draftWorkflowStatuses = ['draft', 'returned_for_edit', 'rejected_by_owner_consultant'];
  const canManageReturnedVariation = !!(
    user?.is_superuser ||
    user?.role?.name === 'Manager' ||
    user?.role?.name === 'Supervisor' ||
    user?.role?.name === 'company_super_admin'
  );
  const isCompanyGeneralManager = !!(user?.is_superuser || user?.role?.name === 'company_super_admin');
  const isProjectManager = user?.role?.name === 'Manager';
  const isSupervisor = user?.role?.name === 'Supervisor';
  const canDirectUnapprove = canDirectUnapproveVariation(variation, user);
  const canRequestUnapprove = canRequestUnapproveVariation(variation, user);
  const canEditVariationContent = isAdmin ||
    isCompanyGeneralManager ||
    hasPermission("variations.create") ||
    (variationStatus === 'returned_for_edit' && canManageReturnedVariation);
  const canManageHiddenFees = !!(
    user?.is_superuser ||
    user?.role?.name === 'Manager' ||
    user?.role?.name === 'Supervisor' ||
    user?.role?.name === 'company_super_admin'
  );
  const canDecideHiddenFees = !!(user?.is_superuser || user?.role?.name === 'company_super_admin');
  const hiddenConsultantFeeGross = parseFloat(variation?.hidden_consultant_fee_gross_amount || 0);
  const hiddenConsultantFeeNet = parseFloat(variation?.hidden_consultant_fee_net_amount || variation?.hidden_consultant_fee || 0);
  const hasHiddenConsultantFee = hiddenConsultantFeeGross > 0 || hiddenConsultantFeeNet > 0;
  const hiddenFeeStatus = variation?.hidden_consultant_fee_status || 'pending';
  const hiddenFeeAttachmentUrl = variation?.hidden_consultant_fee_attachment;
  const hiddenFeeAttachmentName = variation?.hidden_consultant_fee_attachment_name || (hiddenFeeAttachmentUrl || '').split('/').pop();
  const permissions = calculatePermissions(variation, user, alterationRequests, {
    hasVariationEditPermission: canEditVariationContent,
  });
  const hasAcceptedEditRequest = alterationRequests.some((request) =>
    request?.request_type === 'edit' &&
    request?.status === 'accepted' &&
    (!request?.requested_by || !user?.id || String(request.requested_by) === String(user.id))
  );
  const editBlockedMessageKey = !canEditVariationContent
    ? "variation_edit_no_permission_desc"
    : canDirectUnapprove
      ? "variation_edit_use_unapprove_desc"
      : canRequestUnapprove
        ? "variation_edit_use_request_unapprove_desc"
        : (variationStatus === 'pending_supervisor' || variationStatus === 'pending_gm_initial') && !hasAcceptedEditRequest
          ? "variation_edit_requires_alteration_request_desc"
          : "variation_edit_not_allowed_desc";
  const isRejected = checkRejected(variation);

  const handleReturnForEdit = async () => {
    if (!returnEditReason.trim()) {
      showError(t('return_for_edit_reason_required'));
      return;
    }
    setReturnEditBusy(true);
    try {
      await projectApi.returnVariationForEdit(project.id, variation.id, returnEditReason.trim());
      success(t('variation_returned_for_edit'));
      setReturnEditDialogOpen(false);
      setReturnEditReason('');
      await loadVariation();
    } catch (error) {
      showError(error?.message || t('return_for_edit_error'));
    } finally {
      setReturnEditBusy(false);
    }
  };

  const handleUnapproveVariation = async () => {
    if (!variation?.id || !project?.id) return;
    setUnapproveBusy(true);
    try {
      if (isProjectManager) {
        await projectApi.unapproveVariationProjectManager(project.id, variation.id);
      } else if (isSupervisor) {
        await projectApi.unapproveVariationSupervisor(project.id, variation.id);
      }
      success(t('variation_unapproved', 'Variation approval removed'));
      await loadVariation();
    } catch (error) {
      showError(error?.response?.data?.error || error?.message || t('error_generic'));
    } finally {
      setUnapproveBusy(false);
    }
  };

  const handleSubmitRequestUnapprove = async () => {
    if (!variation?.id || !project?.id || !requestUnapproveReason.trim()) return;
    setRequestUnapproveBusy(true);
    try {
      await projectApi.createAlterationRequest(project.id, variation.id, {
        request_type: 'unapprove',
        reason: requestUnapproveReason.trim(),
      });
      const sentToKey = isProjectManager ? 'alteration_request_sent_to_supervisor' : 'alteration_request_sent';
      success(`${t('request_unapprove', 'Request Unapprove')} - ${t(sentToKey)}`);
      setRequestUnapproveDialogOpen(false);
      setRequestUnapproveReason('');
      await loadVariation();
    } catch (error) {
      showError(error?.response?.data?.error || error?.message || t('error_generic'));
    } finally {
      setRequestUnapproveBusy(false);
    }
  };

  const preparePrintDocumentLayout = prepareVariationPrintDocumentLayout;

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
      printLayoutCleanupRef.current = await prepareVariationPrintDocumentLayout(printDocumentRef.current);
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
  const exportPDF = async (ref, filenameSuffix = '', { download = true } = {}) => {
    if (!variation || !project || !ref.current) {
      if (download) showError(t("pdf_export_error"));
      throw new Error('Variation PDF document is not ready');
    }
    setPdfLoading(true);
    let cleanupPrintLayout = null;
    let _watermarkEl = null;
    const _authImages = [];
    try {
      if (download) success(t("generating_pdf"));
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const el = ref.current;
      cleanupPrintLayout = await preparePrintDocumentLayout(el);

      const attachments = variation?.variation_attachments || [];
      // Hide the CSS watermark element — will be drawn onto canvas instead
      _watermarkEl = el.querySelector('.vpd-watermark');
      const _logoSrc = _watermarkEl?.src || null;
      if (_watermarkEl) _watermarkEl.style.display = 'none';

      // Pre-fetch all auth-protected images and swap to blob URLs so html2canvas
      // can load them without needing the auth token in its own requests.
      const authImgEls = el.querySelectorAll('img[src*="/api/files/"]');
      await Promise.all(Array.from(authImgEls).map(async (imgEl) => {
        const originalSrc = imgEl.src;
        try {
          const blob = await fetchFileWithAuth(originalSrc);
          const blobUrl = URL.createObjectURL(blob);
          imgEl.src = blobUrl;
          _authImages.push({ imgEl, originalSrc, blobUrl });
        } catch (e) {
          logger.warn('Could not pre-fetch auth image for PDF', originalSrc, e);
        }
      }));
      // Wait one frame so the browser renders the new blob src values
      await new Promise(resolve => requestAnimationFrame(resolve));

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
      pdf.setDisplayMode("fullpage", "continuous", "UseNone");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 0;
      const contentW = pageW;
      const contentH = pageH - NOTICE_PDF_FOOTER_HEIGHT_PT;
      const scale = contentW / canvas.width;
      const pageCanvasH = Math.round(pageH / scale);
      const pages = Math.ceil(canvas.height / pageCanvasH);

      let watermarkImage = null;
      if (_logoSrc) {
        try {
          watermarkImage = await createPdfWatermarkImage(_logoSrc);
        } catch (watermarkErr) {
          logger.warn("Could not prepare PDF watermark", _logoSrc, watermarkErr);
        }
      }

      // Draw a canvas-safe logo watermark. Do not draw the DOM <img> directly:
      // cross-origin images can taint the canvas and make toDataURL() fail.
      if (_logoSrc && !watermarkImage && window.__STRUCTORA_ENABLE_CANVAS_WATERMARK_FALLBACK__) {
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
        const drawScale = Math.min(contentW / canvas.width, contentH / srcH);
        const drawW = canvas.width * drawScale;
        const drawH = srcH * drawScale;
        pdf.addImage(
          slice.toDataURL('image/jpeg', PDF_JPEG_QUALITY),
          'JPEG',
          (pageW - drawW) / 2,
          margin,
          drawW,
          drawH
        );
        pdf.setFillColor(251, 248, 242);
        pdf.rect(0, contentH, pageW, NOTICE_PDF_FOOTER_HEIGHT_PT, 'F');
        pdf.setDrawColor(216, 201, 179);
        pdf.setLineWidth(0.5);
        pdf.line(0, contentH, pageW, contentH);
        if (watermarkImage) {
          const maxW = pageW * 0.55;
          const maxH = pageH * 0.55;
          const ratio = Math.min(maxW / watermarkImage.width, maxH / watermarkImage.height);
          const drawW = watermarkImage.width * ratio;
          const drawH = watermarkImage.height * ratio;
          pdf.addImage(
            watermarkImage.dataUrl,
            'PNG',
            (pageW - drawW) / 2,
            (pageH - drawH) / 2,
            drawW,
            drawH
          );
        }
      }

      // Load into pdf-lib (even with no attachments) so we can stamp page
      // numbers on the main Variation Order pages too, not just attachments.
      const { PDFDocument } = await import('pdf-lib');
      const mainPdfBytes = pdf.output('arraybuffer');
      const mergedDoc = await PDFDocument.load(mainPdfBytes);

      // Merge variation_attachments (PDFs/images) as header/footer attachment pages.
      let attachmentPageIndexes = [];
      if (attachments.length > 0) {
        attachmentPageIndexes = await appendWrappedVariationAttachments(mergedDoc, {
          attachments,
          variation,
          project,
          companyInfo,
          noticeData,
          logger,
        });
      }

      await stampVariationPageNumbers(mergedDoc, {
        variation,
        project,
        noticeData,
        detailedPageIndexes: attachmentPageIndexes,
      });

      const mergedBytes = await mergedDoc.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      if (!download) return blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = generatePDFFilename(variation, noticeData).replace(/\.pdf$/i, `${filenameSuffix}.pdf`);
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);

      if (download) success(t("pdf_exported_successfully"));
    } catch (error) {
      logger.error("Error generating PDF", error);
      if (download) showError(t("pdf_export_error"));
      throw error;
    } finally {
      if (_watermarkEl) _watermarkEl.style.display = '';
      // Restore original image src values and free blob URLs
      _authImages.forEach(({ imgEl, originalSrc, blobUrl }) => {
        imgEl.src = originalSrc;
        URL.revokeObjectURL(blobUrl);
      });
      cleanupPrintLayout?.();
      setPdfLoading(false);
    }
  };

  const handleExportPDF = () => exportPDF(printDocumentRef);
  const handleExportPDFClean = () => exportPDF(printDocumentCleanRef, '_unsigned');
  const createGmInitialSnapshot = () => exportPDF(
    printDocumentRef, '_gm_initial_snapshot', { download: false }
  );

  const {
    processingApproval,
    actionNotes,
    setActionNotes,
    dialogStates,
    handlers,
  } = useVariationApprovalHandlers(
    variation, project, toast, t, loadVariation, createGmInitialSnapshot
  );

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
                consultantStampUrl={consultantStampUrl}
                gmSignatureUrl={variation?.general_manager_final_approved_by?.signature_url || null}
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
              consultantStampUrl={consultantStampUrl}
              gmSignatureUrl={variation?.general_manager_final_approved_by?.signature_url || null}
            />
          </div>
        )}
        {variation && project && (
          <div
            id="variation-print-document-wrapper-clean"
            className="var-print-document-wrapper"
          >
            <VariationPrintDocument
              ref={printDocumentCleanRef}
              variation={variation}
              project={project}
              companyInfo={companyInfo}
              noticeData={noticeData}
              consultantStampUrl={consultantStampUrl}
              gmSignatureUrl={variation?.general_manager_final_approved_by?.signature_url || null}
              hideSignatures={true}
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
              <Button variant="ghost" size="sm" onClick={handleExportPDF} disabled={pdfLoading} title={t("export_pdf")}>
                <FaFilePdf style={{ fontSize: '15px' }} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handlePrint} title={t("print")}>
                <FaPrint style={{ fontSize: '15px' }} />
              </Button>             
            </div>
          </div>

          {canManageHiddenFees && hasHiddenConsultantFee && (
            <div className="var-hidden-fee-alert">
              <div className="var-hidden-fee-alert__icon">!</div>
              <div className="var-hidden-fee-alert__content">
                <div className="var-hidden-fee-alert__title">
                  {t("hidden_consultant_fee_alert_title", "This variation includes a hidden fee payable to the consultant")}
                </div>
                <div className="var-hidden-fee-alert__body">
                  {t("hidden_consultant_fee_alert_body", "This amount is paid by the contractor to the consultant and is not receivable from the owner/client.")}
                </div>
                <div className="var-hidden-fee-alert__meta">
                  <span className={`var-hidden-fee-status var-hidden-fee-status--${hiddenFeeStatus}`}>
                    {t(`hidden_fee_status_${hiddenFeeStatus}`, hiddenFeeStatus)}
                  </span>
                  {variation?.hidden_consultant_fee_decision_by && (
                    <span>
                      {variation.hidden_consultant_fee_decision_by.full_name || variation.hidden_consultant_fee_decision_by.email}
                      {variation.hidden_consultant_fee_decision_at && ` • ${formatDate(variation.hidden_consultant_fee_decision_at)}`}
                    </span>
                  )}
                </div>
                {hiddenFeeStatus === 'rejected' && variation?.hidden_consultant_fee_rejection_reason && (
                  <div className="var-hidden-fee-alert__reason">
                    {variation.hidden_consultant_fee_rejection_reason}
                  </div>
                )}
                {hiddenFeeAttachmentUrl && (
                  <div className="var-hidden-fee-alert__attachment no-print">
                    <FileAttachmentView
                      fileUrl={hiddenFeeAttachmentUrl}
                      fileName={hiddenFeeAttachmentName}
                      projectId={project?.id}
                    />
                  </div>
                )}
              </div>
              <div className="var-hidden-fee-alert__amount">
                {formatMoney(hiddenConsultantFeeGross || hiddenConsultantFeeNet, { lang: isAR ? "ar" : "en" })}
              </div>
              {canDecideHiddenFees && (
                <div className="var-hidden-fee-alert__actions no-print">
                  {hiddenFeeStatus !== 'approved' && (
                    <Button variant="primary" size="sm" onClick={() => dialogStates.setApproveHiddenFeesDialogOpen(true)}>
                      <FaCheckCircle /> {t("approve_hidden_fee", "Approve hidden fee")}
                    </Button>
                  )}
                  {hiddenFeeStatus !== 'rejected' && (
                    <Button variant="danger" size="sm" onClick={() => dialogStates.setRejectHiddenFeesDialogOpen(true)}>
                      <FaTimesCircle /> {t("reject_hidden_fee", "Reject hidden fee")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

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
                title={!permissions.canEdit ? t("variation_edit_not_allowed") : ""}
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
              permissions.canRejectOwnerConsultant ||
              permissions.canReturnForEdit ||
              permissions.canApproveGeneralManagerFinal ||
              canDirectUnapprove || canRequestUnapprove) && (
                <div className="var-toolbar__actions">
                  {activeTab === "edit" && permissions.canEdit && (
                    <>
                      <span className="var-toolbar__actions-label">{t("actions")}</span>
                      {draftWorkflowStatuses.includes(variationStatus) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => document.getElementById('nvc-save-draft-trigger')?.click()}
                        >
                          {t("save_as_draft", "Save as Draft")}
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        form="notice-variation-form"
                      >
                        {draftWorkflowStatuses.includes(variationStatus) ? t("submit", "Submit") : t("save")}
                      </Button>
                    </>
                  )}
                  {(permissions.canApproveProjectManager || permissions.canRejectProjectManager ||
                    permissions.canApproveGMInitial || permissions.canRejectGMInitial ||
                    permissions.canApproveGeneralManagerInitial || permissions.canRejectGeneralManager ||
                    permissions.canConfirmOwnerApproval || permissions.canConfirmConsultantApproval ||
                    permissions.canRejectOwnerConsultant ||
                    permissions.canReturnForEdit ||
                    permissions.canApproveGeneralManagerFinal ||
                    canDirectUnapprove || canRequestUnapprove) && (
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
                      {permissions.canApproveGMInitial && (
                        <Button variant="primary" size="sm" onClick={() => dialogStates.setApproveGmInitialDialogOpen(true)}>
                          <FaCheckCircle /> {t("approve_gm_initial")}
                        </Button>
                      )}
                      {permissions.canRejectGMInitial && (
                        <Button variant="danger" size="sm" onClick={() => dialogStates.setRejectGmInitialDialogOpen(true)}>
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
                      {permissions.canRejectOwnerConsultant && (
                        <Button variant="danger" size="sm" onClick={() => dialogStates.setRejectOwnerConsultantDialogOpen(true)}>
                          <FaTimesCircle /> {t("reject")}
                        </Button>
                      )}
                      {permissions.canApproveGeneralManagerFinal && (
                        <Button variant="primary" size="sm" onClick={() => dialogStates.setApproveGeneralManagerFinalDialogOpen(true)}>
                          <FaCheckCircle /> {t("approve_general_manager_final")}
                        </Button>
                      )}
                      {permissions.canReturnForEdit && (
                        <Button variant="secondary" size="sm" onClick={() => setReturnEditDialogOpen(true)}>
                          <FaEdit /> {t('return_for_edit')}
                        </Button>
                      )}
                      {canDirectUnapprove && (
                        <Button variant="secondary" size="sm" onClick={handleUnapproveVariation} disabled={unapproveBusy}>
                          <FaExchangeAlt /> {t('unapprove', 'Unapprove')}
                        </Button>
                      )}
                      {!canDirectUnapprove && canRequestUnapprove && (
                        <Button variant="secondary" size="sm" onClick={() => setRequestUnapproveDialogOpen(true)}>
                          <FaExchangeAlt /> {t('request_unapprove', 'Request Unapprove')}
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

              <VariationAiAuditPanel
                variation={variation} project={project} user={user} t={t} isArabic={isAR}
                reload={loadVariation} success={success} showError={showError}
              />

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
                          fileName={(() => {
                            const raw = variation.variation_invoice_file_name || variation.variation_invoice_file.split('/').pop();
                            const ext = raw.includes('.') ? '.' + raw.split('.').pop().toLowerCase() : '';
                            const varSuffix = variation.variation_number ? ` - VAR${variation.variation_number}` : '';
                            return `Approved Variation${varSuffix}${ext}`;
                          })()}
                          projectId={project?.id}
                          endpoint={project?.id ? `projects/${project.id}/variations/${variation.id}/` : undefined}
                        />
                      ) : (
                        <span className="var-attach-row__empty">{t("no_file_attached")}</span>
                      )}
                    </div>

                    <div className="var-attach-row">
                      <div className="var-attach-row__label">
                        <span className="var-attach-dot var-attach-dot--gold" />
                        {t("download_pdf_clean")}
                      </div>
                      <div className="var-attach-row__sub">{t("download_pdf_clean_desc")}</div>
                      <div className="file-attachment-view__container">
                        <div className="file-attachment-view__icon"><FiFile /></div>
                        <div className="file-attachment-view__info">
                          <span className="file-attachment-view__filename">
                            {generatePDFFilename(variation, noticeData).replace(/\.pdf$/i, '_unsigned.pdf')}
                          </span>
                        </div>
                        <div className="file-attachment-view__actions">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="file-attachment-view__btn"
                            onClick={handleExportPDFClean}
                            disabled={pdfLoading}
                            title={t("download_pdf_clean")}
                          >
                            <FiDownload />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="var-attach-row">
                      <div className="var-attach-row__label">
                        <span className="var-attach-dot var-attach-dot--gold" />
                        {t("download_pdf_signed")}
                      </div>
                      <div className="var-attach-row__sub">{t("download_pdf_signed_desc")}</div>
                      <div className="file-attachment-view__container">
                        <div className="file-attachment-view__icon"><FiFile /></div>
                        <div className="file-attachment-view__info">
                          <span className="file-attachment-view__filename">
                            {generatePDFFilename(variation, noticeData)}
                          </span>
                        </div>
                        <div className="file-attachment-view__actions">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="file-attachment-view__btn"
                            onClick={handleExportPDF}
                            disabled={pdfLoading}
                            title={t("download_pdf_signed")}
                          >
                            <FiDownload />
                          </Button>
                        </div>
                      </div>
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
                          const descriptionKey = {
                            return_for_edit: 'audit_description_return_for_edit',
                            add_discount: 'audit_description_add_discount',
                          }[log.action];
                          const translatedDescription = descriptionKey
                            ? t(descriptionKey, { reason: log.changes?.reason, discount: log.changes?.discount })
                            : log.description;

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
                                    {t(log.action, log.action_display || log.action)}
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
                                {translatedDescription && (
                                  <div className="var-audit-entry__desc">{translatedDescription}</div>
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

                {/* GM Initial Approval (Step 2) */}
                <div className={`var-approval-step ${variation?.gm_initial_approved_by ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.gm_initial_approved_by ? <FaCheckCircle /> : <span>2</span>}
                  </div>
                  <div className="var-approval-step__content">
                    <div className="var-approval-step__title">{t("gm_initial_approval")}</div>
                    {variation?.gm_initial_approved_by ? (
                      <div className="var-approval-step__info">
                        <span className="var-approval-step__user">{variation.gm_initial_approved_by?.full_name}</span>
                        {variation.gm_initial_approved_at && (
                          <span className="var-approval-step__date">{formatDate(variation.gm_initial_approved_at)}</span>
                        )}
                      </div>
                    ) : (
                      <div className="var-approval-step__pending">{t("pending")}</div>
                    )}
                  </div>
                </div>

                {/* Supervisor Approval (Step 3) */}
                <div className={`var-approval-step ${variation?.general_manager_initial_approved_by ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.general_manager_initial_approved_by ? <FaCheckCircle /> : <span>3</span>}
                  </div>
                  <div className="var-approval-step__content">
                    <div className="var-approval-step__title">{t("supervisor_approval")}</div>
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

                {/* Owner Confirmation (Step 4) */}
                <div className={`var-approval-step ${variation?.owner_approval_confirmed ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.owner_approval_confirmed ? <FaCheckCircle /> : <span>4</span>}
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

                {/* Consultant Confirmation (Step 5) */}
                <div className={`var-approval-step ${variation?.consultant_approval_confirmed ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.consultant_approval_confirmed ? <FaCheckCircle /> : <span>5</span>}
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

                {/* General Manager Final (Step 6) */}
                <div className={`var-approval-step ${variation?.general_manager_final_approved_by ? 'var-approval-step--completed' : ''}`}>
                  <div className="var-approval-step__indicator">
                    {variation?.general_manager_final_approved_by ? <FaCheckCircle /> : <span>6</span>}
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

        <Dialog
          open={dialogStates.approveGmInitialDialogOpen}
          title={t("approve_gm_initial")}
          desc={
            <div>
              <p>{t("approve_gm_initial_confirmation")}</p>
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
          onClose={() => { dialogStates.setApproveGmInitialDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleApproveGMInitial}
          busy={processingApproval}
        />

        <Dialog
          open={dialogStates.rejectGmInitialDialogOpen}
          title={t("reject_variation")}
          desc={
            <div>
              <p>{t("reject_gm_initial_confirmation")}</p>
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
          onClose={() => { dialogStates.setRejectGmInitialDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleRejectGMInitial}
          busy={processingApproval}
        />

        {/* Block Edit Dialog for Final Approved Variations */}
        <Dialog
          open={returnEditDialogOpen}
          title={t('return_for_edit')}
          desc={<div><p>{t('return_for_edit_confirmation')}</p><label className="var-dialog-label">{t('reason')} <span className="var-required">*</span></label><textarea className="var-dialog-textarea" rows={4} value={returnEditReason} onChange={(e) => setReturnEditReason(e.target.value)} placeholder={t('return_for_edit_reason_placeholder')} /></div>}
          confirmLabel={t('return_for_edit')}
          cancelLabel={t('cancel')}
          onClose={() => { if (!returnEditBusy) { setReturnEditDialogOpen(false); setReturnEditReason(''); } }}
          onConfirm={handleReturnForEdit}
          busy={returnEditBusy}
        />

        <Dialog
          open={blockEditDialogOpen}
          title={t("variation_edit_not_allowed")}
          desc={t(editBlockedMessageKey)}
          confirmLabel={t("ok_label")}
          cancelLabel={null}
          onClose={() => setBlockEditDialogOpen(false)}
          onConfirm={() => setBlockEditDialogOpen(false)}
        />

        <Dialog
          open={requestUnapproveDialogOpen}
          title={t('request_unapprove', 'Request Unapprove')}
          desc={<div><p>{t('request_unapprove_desc', 'This will send an unapprove request to the approver responsible for the current approval step.')}</p><label className="var-dialog-label">{t('reason')} <span className="var-required">*</span></label><textarea className="var-dialog-textarea" rows={4} value={requestUnapproveReason} onChange={(e) => setRequestUnapproveReason(e.target.value)} /></div>}
          confirmLabel={t('submit', 'Submit')}
          cancelLabel={t('cancel')}
          onClose={() => { if (!requestUnapproveBusy) { setRequestUnapproveDialogOpen(false); setRequestUnapproveReason(''); } }}
          onConfirm={handleSubmitRequestUnapprove}
          busy={requestUnapproveBusy}
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
          open={dialogStates.approveHiddenFeesDialogOpen}
          title={t("approve_hidden_fee", "Approve hidden fee")}
          desc={
            <div>
              <p>{t("approve_hidden_fee_confirmation", "Are you sure you want to approve the hidden consultant fee?")}</p>
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
          onClose={() => { dialogStates.setApproveHiddenFeesDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleApproveHiddenFees}
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

        <Dialog
          open={dialogStates.rejectOwnerConsultantDialogOpen}
          title={t("reject_variation")}
          desc={
            <div>
              <p>{t("reject_owner_consultant_confirmation")}</p>
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
          onClose={() => { dialogStates.setRejectOwnerConsultantDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleRejectOwnerConsultant}
          busy={processingApproval}
        />

        <Dialog
          open={dialogStates.rejectHiddenFeesDialogOpen}
          title={t("reject_hidden_fee", "Reject hidden fee")}
          desc={
            <div>
              <p>{t("reject_hidden_fee_confirmation", "Are you sure you want to reject the hidden consultant fee? Please enter the rejection reason below.")}</p>
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
          onClose={() => { dialogStates.setRejectHiddenFeesDialogOpen(false); setActionNotes(""); }}
          onConfirm={handlers.handleRejectHiddenFees}
          busy={processingApproval}
        />
      </div>
    </PageLayout>
  );
}
