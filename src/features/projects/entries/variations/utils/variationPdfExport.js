import { generatePDFFilename } from "./pdfFilenameGenerator";
import { applyPrintPagePartBreaks, applyPrintTablePagination, pinPrintBottomGroup } from "./printPagination";
import { appendWrappedVariationAttachments } from "./wrapVariationAttachments";
import { fetchFileWithAuth } from "../../../../../utils/helpers/file";

const PRINT_A4_WIDTH_PX = 794;
const PRINT_A4_HEIGHT_PX = Math.round(PRINT_A4_WIDTH_PX * Math.SQRT2);
const PDF_CANVAS_SCALE = 3;
const PDF_JPEG_QUALITY = 0.97;

async function createPdfWatermarkImage(src) {
  const blob = await fetchFileWithAuth(src);
  const blobUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("watermark img load failed"));
      img.src = blobUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.12;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export async function prepareVariationPrintDocumentLayout(el) {
  const prevWidth = el?.style.width || "";
  let cleanupTablePagination = null;
  let cleanupPageBreaks = null;
  let cleanupPinnedBottom = null;

  el.classList.add("vpd-print-mode");
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
    el.classList.remove("vpd-print-mode");
    el.style.width = prevWidth;
  };
}

export async function exportVariationPdf({
  ref,
  variation,
  project,
  companyInfo,
  noticeData,
  filenameSuffix = "",
  download = true,
  logger,
}) {
  if (!variation || !project || !ref?.current) {
    throw new Error("Variation PDF document is not ready");
  }

  let cleanupPrintLayout = null;
  let watermarkEl = null;
  const authImages = [];

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const el = ref.current;
    cleanupPrintLayout = await prepareVariationPrintDocumentLayout(el);

    const attachments = variation?.variation_attachments || [];
    watermarkEl = el.querySelector(".vpd-watermark");
    const logoSrc = watermarkEl?.src || null;
    if (watermarkEl) watermarkEl.style.display = "none";

    const authImgEls = el.querySelectorAll('img[src*="/api/files/"]');
    await Promise.all(Array.from(authImgEls).map(async (imgEl) => {
      const originalSrc = imgEl.src;
      try {
        const blob = await fetchFileWithAuth(originalSrc);
        const blobUrl = URL.createObjectURL(blob);
        imgEl.src = blobUrl;
        authImages.push({ imgEl, originalSrc, blobUrl });
      } catch (e) {
        logger?.warn?.("Could not pre-fetch auth image for PDF", originalSrc, e);
      }
    }));
    await new Promise(resolve => requestAnimationFrame(resolve));

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
    pdf.setDisplayMode("fullpage", "continuous", "UseNone");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const contentW = pageW;
    const contentH = pageH;
    const scale = contentW / canvas.width;
    const pageCanvasH = Math.round(contentH / scale);
    const pages = Math.ceil(canvas.height / pageCanvasH);

    let watermarkImage = null;
    if (logoSrc) {
      try {
        watermarkImage = await createPdfWatermarkImage(logoSrc);
      } catch (watermarkErr) {
        logger?.warn?.("Could not prepare PDF watermark", logoSrc, watermarkErr);
      }
    }

    if (logoSrc && !watermarkImage && window.__STRUCTORA_ENABLE_CANVAS_WATERMARK_FALLBACK__) {
      try {
        const logoBlob = await fetchFileWithAuth(logoSrc);
        const logoBlobUrl = URL.createObjectURL(logoBlob);
        const wImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("watermark img load failed"));
          img.src = logoBlobUrl;
        });
        URL.revokeObjectURL(logoBlobUrl);
        const maxW = canvas.width * 0.55;
        const maxH = pageCanvasH * 0.55;
        const ratio = Math.min(maxW / wImg.naturalWidth, maxH / wImg.naturalHeight);
        const drawW = wImg.naturalWidth * ratio;
        const drawH = wImg.naturalHeight * ratio;
        const drawX = (canvas.width - drawW) / 2;
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.globalAlpha = 0.12;
        for (let p = 0; p < pages; p += 1) {
          const pageStart = p * pageCanvasH;
          const pageSliceH = Math.min(pageCanvasH, canvas.height - pageStart);
          const midY = pageStart + pageSliceH / 2;
          ctx.drawImage(wImg, drawX, midY - drawH / 2, drawW, drawH);
        }
        ctx.restore();
      } catch {
        // Logo unavailable; skip watermark.
      }
    }

    for (let i = 0; i < pages; i += 1) {
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
        slice.toDataURL("image/jpeg", PDF_JPEG_QUALITY),
        "JPEG",
        0,
        0,
        contentW,
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

    if (attachments.length > 0) {
      const { PDFDocument } = await import("pdf-lib");
      const mainPdfBytes = pdf.output("arraybuffer");
      const mergedDoc = await PDFDocument.load(mainPdfBytes);

      await appendWrappedVariationAttachments(mergedDoc, {
        attachments,
        variation,
        project,
        companyInfo,
        noticeData,
        logger,
      });

      const mergedBytes = await mergedDoc.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      if (!download) return blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generatePDFFilename(variation, noticeData).replace(/\.pdf$/i, `${filenameSuffix}.pdf`);
      a.click();
      URL.revokeObjectURL(url);
      return blob;
    }

    const blob = pdf.output("blob");
    if (download) {
      pdf.save(generatePDFFilename(variation, noticeData).replace(/\.pdf$/i, `${filenameSuffix}.pdf`));
    }
    return blob;
  } finally {
    if (watermarkEl) watermarkEl.style.display = "";
    authImages.forEach(({ imgEl, originalSrc, blobUrl }) => {
      imgEl.src = originalSrc;
      URL.revokeObjectURL(blobUrl);
    });
    cleanupPrintLayout?.();
  }
}
