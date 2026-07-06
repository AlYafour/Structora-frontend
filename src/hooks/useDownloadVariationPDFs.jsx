import { useState, useCallback, createRef } from "react";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../contexts/NotificationContext";
import { api } from "../services/api";
import { projectApi } from "../services";
import { downloadBlob, fetchFileWithAuth, buildFileUrl } from "../utils/helpers/file";
import VariationPrintDocument from "../features/projects/entries/variations/components/VariationPrintDocument";
import { applyPrintPagePartBreaks, applyPrintTablePagination, pinPrintBottomGroup } from "../features/projects/entries/variations/utils/printPagination";
import { generatePDFFilename } from "../features/projects/entries/variations/utils/pdfFilenameGenerator";
import { appendWrappedVariationAttachments } from "../features/projects/entries/variations/utils/wrapVariationAttachments";

const PRINT_A4_WIDTH_PX = 794;
const PRINT_A4_HEIGHT_PX = Math.round(PRINT_A4_WIDTH_PX * Math.SQRT2);
const PDF_RENDER_CONCURRENCY = 1;
const PDF_CANVAS_SCALE = 3;

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

async function runWithConcurrency(items, limit, worker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await worker(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
}

async function waitForFrame(count = 1) {
  for (let i = 0; i < count; i++) {
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}

async function waitForImages(el) {
  const images = Array.from(el.querySelectorAll("img"));
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
}

async function preparePrintDocumentLayout(el) {
  el.classList.add('vpd-print-mode');
  el.style.width = `${PRINT_A4_WIDTH_PX}px`;
  await waitForFrame(2);

  applyPrintTablePagination(el, PRINT_A4_HEIGHT_PX);
  await waitForFrame();

  applyPrintPagePartBreaks(el, PRINT_A4_HEIGHT_PX);
  await waitForFrame();

  pinPrintBottomGroup(el, {
    pageHeight: PRINT_A4_HEIGHT_PX,
    continuationPageHeight: PRINT_A4_HEIGHT_PX,
  });
  await waitForFrame();
}

async function renderVariationPrintPdfBlob({ variation, project, companyInfo, noticeData, consultantStampUrl, gmSignatureUrl, hideSignatures = false }) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const container = document.createElement("div");
  const docRef = createRef();
  const root = createRoot(container);

  Object.assign(container.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${PRINT_A4_WIDTH_PX}px`,
    background: "#ffffff",
    zIndex: "-1",
  });

  document.body.appendChild(container);

  try {
    root.render(
      <VariationPrintDocument
        ref={docRef}
        variation={variation}
        project={project}
        companyInfo={companyInfo}
        noticeData={noticeData}
        consultantStampUrl={consultantStampUrl}
        gmSignatureUrl={gmSignatureUrl}
        hideSignatures={hideSignatures}
      />
    );

    await waitForFrame(3);

    const el = docRef.current;
    if (!el) throw new Error("Variation print document did not render");

    await waitForImages(el);
    await preparePrintDocumentLayout(el);

    // Hide the CSS watermark element — will be drawn onto canvas instead
    const watermarkEl = el.querySelector('.vpd-watermark');
    const logoSrc = watermarkEl?.src || null;
    if (watermarkEl) watermarkEl.style.display = 'none';

    const canvas = await html2canvas(el, {
      scale: PDF_CANVAS_SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: PRINT_A4_WIDTH_PX,
      windowHeight: el.scrollHeight,
      width: el.scrollWidth,
      height: el.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    // jsPDF defaults to FitH (fit width), which opens heavily zoomed in some
    // viewers. Explicitly request fitting the entire page instead.
    pdf.setDisplayMode("fullpage", "continuous", "UseNone");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const scale = pageW / canvas.width;
    const pageCanvasH = Math.round(pageH / scale);
    const pages = Math.ceil(canvas.height / pageCanvasH);

    if (watermarkEl) watermarkEl.style.display = '';

    let watermarkImage = null;
    if (logoSrc) {
      try {
        watermarkImage = await createPdfWatermarkImage(logoSrc);
      } catch (watermarkErr) {
        console.warn("[useDownloadVariationPDFs] Could not prepare PDF watermark", logoSrc, watermarkErr);
      }
    }

    // Draw a canvas-safe logo watermark. Do not draw the DOM <img> directly:
    // cross-origin images can taint the canvas and make toDataURL() fail.
    if (logoSrc && !watermarkImage && window.__STRUCTORA_ENABLE_CANVAS_WATERMARK_FALLBACK__) {
      try {
        const logoBlob = await fetchFileWithAuth(logoSrc);
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
      pdf.rect(0, 0, pageW, pageH, "F");

      const srcY = i * pageCanvasH;
      const srcH = Math.min(pageCanvasH, canvas.height - srcY);
      if (srcH <= 0) continue;
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = srcH;
      slice.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.97),
        "JPEG",
        0,
        0,
        pageW,
        srcH * scale
      );
      if (watermarkImage) {
        const maxW = pageW * 0.55;
        const maxH = pageH * 0.55;
        const ratio = Math.min(maxW / watermarkImage.width, maxH / watermarkImage.height);
        const drawW = watermarkImage.width * ratio;
        const drawH = watermarkImage.height * ratio;
        pdf.addImage(
          watermarkImage.dataUrl,
          "PNG",
          (pageW - drawW) / 2,
          (pageH - drawH) / 2,
          drawW,
          drawH
        );
      }
    }

    const attachments = variation?.variation_attachments || [];
    if (attachments.length === 0) {
      return pdf.output("blob");
    }

    // Merge PDF/image attachments as header/footer attachment pages.
    const { PDFDocument } = await import("pdf-lib");
    const mainBytes = pdf.output("arraybuffer");
    const mergedDoc = await PDFDocument.load(mainBytes);
    await appendWrappedVariationAttachments(mergedDoc, {
      attachments,
      variation,
      project,
      companyInfo,
      noticeData,
      logger: console,
    });

    const mergedBytes = await mergedDoc.save();
    return new Blob([mergedBytes], { type: "application/pdf" });
  } finally {
    root.unmount();
    container.remove();
  }
}

async function fetchProjectAndCompanyInfo(projectId) {
  const [projectData, settingsRes, licenseData] = await Promise.all([
    projectApi.getWithIncludes(projectId, ["siteplan", "license", "contract"]),
    api.get("auth/tenant-settings/current/", { _skipAuthRedirect: true }),
    projectApi.getLicense(projectId).catch(() => null),
  ]);

  const settingsData = settingsRes.data;
  const rawLogoPath = (settingsData.logo_url || settingsData.company_logo || "").split("?")[0];
  const logoUrl = rawLogoPath
    ? (rawLogoPath.startsWith("http") ? rawLogoPath : `${window.location.origin}/media/${rawLogoPath}`)
    : null;

  const companyInfo = {
    logo:    logoUrl,
    name:    settingsData.contractor_name    || settingsData.company_name    || "",
    name_en: settingsData.contractor_name_en || settingsData.company_name    || "",
    phone:   settingsData.company_phone      || settingsData.contractor_phone || "",
    email:   settingsData.company_email      || settingsData.contractor_email || "",
    address: settingsData.company_address    || settingsData.contractor_address || "",
    company_stamp_url: settingsData.company_stamp_url || null,
  };

  const license = Array.isArray(licenseData) ? licenseData[0] : licenseData;
  const consultantStampUrl = license?.consultant_stamp
    ? (license.consultant_stamp.startsWith("http") ? license.consultant_stamp : buildFileUrl(license.consultant_stamp))
    : null;

  return { projectData, companyInfo, consultantStampUrl };
}

export function useDownloadVariationPDFs(projectId) {
  const { t } = useTranslation();
  const { success, error: showError } = useNotifications();
  const [zipLoading, setZipLoading] = useState(false);
  const [singleLoading, setSingleLoading] = useState(null);

  const downloadSingle = useCallback(async (variation, options = {}) => {
    const hideSignatures = !!options.hideSignatures;
    setSingleLoading(variation.id);
    try {
      const { projectData, companyInfo, consultantStampUrl } = await fetchProjectAndCompanyInfo(projectId);
      const fullVariation = await projectApi.getVariationById(projectId, variation.id).catch(() => variation);

      let noticeData = {};
      if (fullVariation?.description) {
        try { noticeData = JSON.parse(fullVariation.description); } catch { noticeData = {}; }
      }

      const blob = await renderVariationPrintPdfBlob({
        variation: fullVariation,
        project: projectData,
        companyInfo,
        noticeData,
        consultantStampUrl,
        gmSignatureUrl: fullVariation?.general_manager_final_approved_by?.signature_url || null,
        hideSignatures,
      });

      if (blob) {
        const filename = hideSignatures
          ? generatePDFFilename(fullVariation, noticeData).replace(/\.pdf$/i, "_unsigned.pdf")
          : generatePDFFilename(fullVariation, noticeData);
        downloadBlob(blob, filename);
      }

      success(t("document_downloaded", "Document downloaded successfully"));
    } catch (err) {
      console.error("[useDownloadVariationPDFs] single failed:", variation?.id, err);
      showError(t("download_error", "Download failed. Please try again."));
    } finally {
      setSingleLoading(null);
    }
  }, [projectId, t, success, showError]);

  const downloadZip = useCallback(async ({ items, zipName }) => {
    if (!items?.length) return;
    setZipLoading(true);
    try {
      const { projectData, companyInfo } = await fetchProjectAndCompanyInfo(projectId);

      const zip = new JSZip();
      let skipped = 0;

      await runWithConcurrency(
        items,
        PDF_RENDER_CONCURRENCY,
        async (variation) => {
          try {
            let noticeData = {};
            if (variation?.description) {
              try { noticeData = JSON.parse(variation.description); } catch { noticeData = {}; }
            }

            const blob = await renderVariationPrintPdfBlob({
              variation,
              project: projectData,
              companyInfo,
              noticeData,
            });

            if (blob) {
              zip.file(generatePDFFilename(variation, noticeData), blob);
            }
          } catch (err) {
            console.error("[useDownloadVariationPDFs] item failed:", variation?.id, err);
            skipped++;
          }
        }
      );

      const projectName = (projectData.display_name || projectData.name || `Project_${projectId}`)
        .replace(/[\\/:*?"<>|]/g, "_");
      const finalName = (zipName || `${projectName}_Variations.zip`).replace(/[\\/:*?"<>|]/g, "_");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, finalName);

      if (skipped > 0) {
        showError(t("documents_partial", `Downloaded with ${skipped} item(s) skipped due to errors.`));
      } else {
        success(t("documents_downloaded", "Documents downloaded successfully"));
      }
    } catch (err) {
      console.error("[useDownloadVariationPDFs]", err);
      showError(t("download_error", "Download failed. Please try again."));
    } finally {
      setZipLoading(false);
    }
  }, [projectId, t, success, showError]);

  return { downloadZip, zipLoading, downloadSingle, singleLoading };
}
