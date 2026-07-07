import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import { buildFileUrl, fetchFileWithAuth } from "../../../../../utils/helpers/file";
import { logger as defaultLogger } from "../../../../../utils/logger";

const DEFAULT_PAGE_SIZE = {
  width: 595.28,
  height: 841.89,
};
const TEXT = rgb(0.09, 0.13, 0.2);
const MUTED = rgb(0.47, 0.42, 0.36);
const BORDER = rgb(0.78, 0.72, 0.64);
const HEADER_BG = rgb(1, 1, 1);

const HEADER_TOP = 14;
const HEADER_HEIGHT = 58;
const FOOTER_HEIGHT = 34;
const SIDE_MARGIN = 16;
const CONTENT_GAP = 8;

let pdfjsLibPromise = null;

function safeText(value, fallback = "") {
  const text = value === null || value === undefined ? fallback : String(value);
  return text
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, max = 82) {
  const value = safeText(text);
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return safeText(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getProjectNumber(project) {
  if (!project) return "";
  return (
    project.contract_data?.tender_no ||
    project.awarding_data?.project_number ||
    project.siteplan?.project_no ||
    project.siteplan_data?.project_no ||
    project.internal_code ||
    (project.id ? `PRJ-${project.id}` : "")
  );
}

function getProjectName(project) {
  return project?.display_name_en || project?.display_name || project?.name || "";
}

function getReferenceNo(variation, noticeData) {
  return noticeData?.reference_no || variation?.variation_number || "";
}

function getVariationDescription(noticeData) {
  return noticeData?.variation_description || noticeData?.variation_cause || "";
}

async function getFonts(pdfDoc) {
  const [regular, bold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
  ]);
  return { regular, bold };
}

async function getLogoImage(pdfDoc, logoUrl, cache) {
  if (!logoUrl) return null;
  if (cache.logo !== undefined) return cache.logo;

  try {
    const blob = await fetchFileWithAuth(logoUrl);
    const bytes = await blob.arrayBuffer();
    const fullUrl = buildFileUrl(logoUrl) || logoUrl;
    const contentType = (blob.type || "").toLowerCase();
    const lowerUrl = fullUrl.toLowerCase();
    cache.logo = lowerUrl.endsWith(".png") || contentType.includes("png")
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);
  } catch {
    cache.logo = null;
  }

  return cache.logo;
}

function normalizePageSize(size) {
  const width = Number(size?.width);
  const height = Number(size?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return { width, height };
}

function getSourcePageSize(sourcePage, embeddedPage) {
  try {
    return normalizePageSize(sourcePage?.getSize?.() || embeddedPage);
  } catch {
    return normalizePageSize(embeddedPage);
  }
}

async function drawWatermark(page, pdfDoc, companyInfo, cache, pageSize = DEFAULT_PAGE_SIZE) {
  const logo = await getLogoImage(pdfDoc, companyInfo?.logo, cache);
  if (!logo) return;

  const { width, height } = normalizePageSize(pageSize);
  const maxW = width * 0.5;
  const maxH = height * 0.5;
  const fit = logo.scaleToFit(maxW, maxH);
  page.drawImage(logo, {
    x: (width - fit.width) / 2,
    y: (height - fit.height) / 2,
    width: fit.width,
    height: fit.height,
    opacity: 0.08,
  });
}

async function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return pdfjsLib;
    });
  }

  return pdfjsLibPromise;
}

function drawTextClipped(page, text, x, y, width, options = {}) {
  const font = options.font;
  const size = options.size || 8;
  const maxChars = Math.max(4, Math.floor(width / (size * 0.48)));
  page.drawText(truncate(text, maxChars), {
    x,
    y,
    size,
    font,
    color: options.color || TEXT,
  });
}

function drawLabelValue(page, fonts, label, value, x, y, width, options = {}) {
  page.drawText(safeText(label).toUpperCase(), {
    x,
    y: y + (options.labelGap || 15),
    size: options.labelSize || 5.8,
    font: fonts.bold,
    color: MUTED,
  });
  drawTextClipped(page, value || "-", x, y, width, {
    size: options.valueSize || 9,
    font: fonts.bold,
    color: TEXT,
  });
}

function drawCenteredText(page, text, x, y, width, font, size, color = TEXT) {
  const value = truncate(text, Math.floor(width / (size * 0.48)));
  const textWidth = font.widthOfTextAtSize(value, size);
  page.drawText(value, {
    x: x + Math.max(0, (width - textWidth) / 2),
    y,
    size,
    font,
    color,
  });
}

function drawCompactHeader(page, fonts, { variation, project, noticeData }, pageSize = DEFAULT_PAGE_SIZE) {
  const { width, height } = normalizePageSize(pageSize);
  const x = SIDE_MARGIN;
  const topY = height - HEADER_TOP;
  const y = topY - HEADER_HEIGHT;
  const w = width - (SIDE_MARGIN * 2);
  const topRowH = 28;
  const topRowY = topY - topRowH;

  page.drawRectangle({ x, y, width: w, height: HEADER_HEIGHT, color: HEADER_BG, borderColor: BORDER, borderWidth: 0.7 });
  page.drawLine({ start: { x, y: topRowY }, end: { x: x + w, y: topRowY }, thickness: 0.55, color: BORDER });

  const titleW = 158;
  const metaW = 86;
  const descX = x + titleW;
  const descW = w - titleW - (metaW * 2);
  const dateX = x + titleW + descW;
  const varX = dateX + metaW;
  page.drawLine({ start: { x: descX, y: topRowY }, end: { x: descX, y: topY }, thickness: 0.55, color: BORDER });
  page.drawLine({ start: { x: dateX, y: topRowY }, end: { x: dateX, y: topY }, thickness: 0.55, color: BORDER });
  page.drawLine({ start: { x: varX, y: topRowY }, end: { x: varX, y: topY }, thickness: 0.55, color: BORDER });

  drawCenteredText(page, "VARIATION ORDER", x, topY - 15, titleW, fonts.bold, 10.5);
  drawCenteredText(page, "ATTACHMENT", x, topY - 25, titleW, fonts.regular, 5.5, MUTED);
  drawLabelValue(page, fonts, "Variation Description", getVariationDescription(noticeData), descX + 6, topY - 19, descW - 12, {
    labelSize: 5,
    labelGap: 11,
    valueSize: 7.6,
  });
  drawLabelValue(page, fonts, "Date", formatDate(noticeData?.document_date || variation?.created_at), dateX + 6, topY - 19, metaW - 12, {
    labelSize: 5,
    labelGap: 11,
    valueSize: 7.4,
  });
  drawLabelValue(page, fonts, "Var. No.", variation?.variation_number || "-", varX + 6, topY - 19, metaW - 12, {
    labelSize: 5,
    labelGap: 11,
    valueSize: 7.4,
  });

  const colW = w / 4;
  for (let i = 1; i < 4; i += 1) {
    page.drawLine({ start: { x: x + (colW * i), y }, end: { x: x + (colW * i), y: topRowY }, thickness: 0.55, color: BORDER });
  }

  drawLabelValue(page, fonts, "Project Name", getProjectName(project), x + 6, y + 8, colW - 12, { labelSize: 5, labelGap: 11, valueSize: 7.2 });
  drawLabelValue(page, fonts, "Reference No.", getReferenceNo(variation, noticeData) || "-", x + colW + 6, y + 8, colW - 12, { labelSize: 5, labelGap: 11, valueSize: 7.2 });
  drawLabelValue(page, fonts, "Project No.", getProjectNumber(project) || "-", x + (colW * 2) + 6, y + 8, colW - 12, { labelSize: 5, labelGap: 11, valueSize: 7.2 });
  drawLabelValue(page, fonts, "Additional Time", noticeData?.additional_time || "-", x + (colW * 3) + 6, y + 8, colW - 12, { labelSize: 5, labelGap: 11, valueSize: 7.2 });
}

function getContentBox(pageSize = DEFAULT_PAGE_SIZE) {
  const { width, height } = normalizePageSize(pageSize);
  const x = SIDE_MARGIN;
  const top = height - HEADER_TOP - HEADER_HEIGHT - CONTENT_GAP;
  const bottom = FOOTER_HEIGHT + 30;
  return {
    x,
    y: bottom,
    width: width - (SIDE_MARGIN * 2),
    height: top - bottom,
  };
}

function drawPageNumber(page, fonts, pageNo, totalPages) {
  const { width: pageWidth } = normalizePageSize(page.getSize());
  const text = `Page ${pageNo} of ${totalPages}`;
  const size = 10;
  const width = fonts.regular.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (pageWidth - width) / 2,
    y: 22,
    size,
    font: fonts.regular,
    color: MUTED,
  });
}

function scaleToFit(srcW, srcH, boxW, boxH) {
  const ratio = Math.min(boxW / srcW, boxH / srcH);
  return {
    width: srcW * ratio,
    height: srcH * ratio,
  };
}

function sourcePageHasContents(sourcePage) {
  try {
    return !!sourcePage?.node?.Contents?.();
  } catch {
    return false;
  }
}

function ensureSourcePageContents(sourcePage, srcDoc) {
  try {
    if (sourcePage?.node?.Contents?.()) return;
    sourcePage.node.set(PDFName.of("Contents"), srcDoc.context.obj([]));
  } catch {
    // Leave the page as-is; embedPages will surface any unrecoverable PDF issue.
  }
}

async function createAttachmentPage(pdfDoc, fonts, opts, pageSize = DEFAULT_PAGE_SIZE) {
  const normalizedPageSize = normalizePageSize(pageSize);
  const page = pdfDoc.addPage([normalizedPageSize.width, normalizedPageSize.height]);
  await drawWatermark(page, pdfDoc, opts.companyInfo, opts.cache, normalizedPageSize);
  drawCompactHeader(page, fonts, opts, normalizedPageSize);
  return { page, box: getContentBox(normalizedPageSize) };
}

async function renderSourcePdfPageImage(bytes, pageIndex) {
  const pdfjsLib = await getPdfjsLib();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) });
  const pdf = await loadingTask.promise;

  try {
    const sourcePage = await pdf.getPage(pageIndex + 1);
    const viewport = sourcePage.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const ctx = canvas.getContext("2d");
    await sourcePage.render({ canvasContext: ctx, viewport }).promise;

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: viewport.width,
      height: viewport.height,
    };
  } finally {
    await pdf.destroy();
  }
}

async function drawRasterizedPdfPage(pdfDoc, page, box, bytes, sourceIndex) {
  const rendered = await renderSourcePdfPageImage(bytes, sourceIndex);
  const embeddedImg = await pdfDoc.embedPng(rendered.dataUrl);
  const inset = 10;
  const fit = embeddedImg.scaleToFit(box.width - (inset * 2), box.height - (inset * 2));

  page.drawImage(embeddedImg, {
    x: box.x + ((box.width - fit.width) / 2),
    y: box.y + ((box.height - fit.height) / 2),
    width: fit.width,
    height: fit.height,
  });
}

async function appendWrappedPdfAttachment(pdfDoc, fonts, bytes, opts) {
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const sourcePages = srcDoc.getPages();
  const rasterFallbackPages = sourcePages.map((sourcePage) => !sourcePageHasContents(sourcePage));
  sourcePages.forEach((sourcePage) => ensureSourcePageContents(sourcePage, srcDoc));
  const embeddedPages = sourcePages.length > 0 ? await pdfDoc.embedPages(sourcePages) : [];
  const appendedIndexes = [];

  for (let sourceIndex = 0; sourceIndex < embeddedPages.length; sourceIndex += 1) {
    const embeddedPage = embeddedPages[sourceIndex];
    if (!embeddedPage) continue;

    const pageSize = getSourcePageSize(sourcePages[sourceIndex], embeddedPage);
    const { page, box } = await createAttachmentPage(pdfDoc, fonts, opts, pageSize);
    appendedIndexes.push(pdfDoc.getPageCount() - 1);

    if (rasterFallbackPages[sourceIndex]) {
      await drawRasterizedPdfPage(pdfDoc, page, box, bytes, sourceIndex);
      continue;
    }

    const inset = 10;
    const fit = scaleToFit(
      embeddedPage.width,
      embeddedPage.height,
      box.width - (inset * 2),
      box.height - (inset * 2)
    );
    page.drawPage(embeddedPage, {
      x: box.x + ((box.width - fit.width) / 2),
      y: box.y + ((box.height - fit.height) / 2),
      width: fit.width,
      height: fit.height,
    });
  }

  return appendedIndexes;
}

async function appendWrappedImageAttachment(pdfDoc, fonts, bytes, contentType, lowerUrl, opts) {
  const embeddedImg = lowerUrl.endsWith(".png") || contentType.includes("png")
    ? await pdfDoc.embedPng(bytes)
    : await pdfDoc.embedJpg(bytes);
  const { page, box } = await createAttachmentPage(pdfDoc, fonts, opts);
  const inset = 14;
  const fit = embeddedImg.scaleToFit(box.width - (inset * 2), box.height - (inset * 2));

  page.drawImage(embeddedImg, {
    x: box.x + ((box.width - fit.width) / 2),
    y: box.y + ((box.height - fit.height) / 2),
    width: fit.width,
    height: fit.height,
  });

  return [pdfDoc.getPageCount() - 1];
}

export async function appendWrappedVariationAttachments(pdfDoc, {
  attachments = [],
  variation = null,
  project = null,
  companyInfo = null,
  noticeData = {},
  logger = defaultLogger,
} = {}) {
  if (!attachments.length) return [];

  const fonts = await getFonts(pdfDoc);
  const cache = {};
  const appendedPageIndexes = [];

  for (const att of attachments) {
    const fileUrl = att?.file || att?.url;
    if (!fileUrl) continue;

    try {
      const blob = await fetchFileWithAuth(fileUrl);
      const bytes = await blob.arrayBuffer();
      const fullUrl = buildFileUrl(fileUrl) || fileUrl;
      const lowerUrl = fullUrl.toLowerCase();
      const contentType = (blob.type || "").toLowerCase();
      const opts = { variation, project, companyInfo, noticeData, cache };

      const indexes = contentType.includes("pdf") || lowerUrl.endsWith(".pdf")
        ? await appendWrappedPdfAttachment(pdfDoc, fonts, bytes, opts)
        : await appendWrappedImageAttachment(pdfDoc, fonts, bytes, contentType, lowerUrl, opts);

      appendedPageIndexes.push(...indexes);
    } catch (err) {
      logger.warn("Could not append wrapped variation attachment", fileUrl, err);
    }
  }

  const totalPages = pdfDoc.getPageCount();
  appendedPageIndexes.forEach((pageIndex) => {
    const page = pdfDoc.getPage(pageIndex);
    drawPageNumber(page, fonts, pageIndex + 1, totalPages);
  });

  return appendedPageIndexes;
}
