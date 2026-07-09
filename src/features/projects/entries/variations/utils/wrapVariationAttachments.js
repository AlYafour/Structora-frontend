import { PDFDocument, PDFName, StandardFonts, degrees, rgb } from "pdf-lib";
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
const HEADER_HEIGHT = 64;
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

function getSourcePageRotationAngle(sourcePage) {
  try {
    const angle = Number(sourcePage?.getRotation?.()?.angle || 0);
    const normalized = ((angle % 360) + 360) % 360;
    return [90, 180, 270].includes(normalized) ? normalized : 0;
  } catch {
    return 0;
  }
}

function getSourcePageDisplaySize(sourcePage, embeddedPage) {
  const pageSize = getSourcePageSize(sourcePage, embeddedPage);
  const rotationAngle = getSourcePageRotationAngle(sourcePage);
  if (rotationAngle === 90 || rotationAngle === 270) {
    return { width: pageSize.height, height: pageSize.width };
  }
  return pageSize;
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

function truncateToWidth(text, font, size, maxWidth) {
  const value = safeText(text);
  if (!value) return value;
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;

  const ellipsis = "...";
  let lo = 0;
  let hi = value.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = `${value.slice(0, mid).trim()}${ellipsis}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo > 0 ? `${value.slice(0, lo).trim()}${ellipsis}` : ellipsis;
}

function wrapTextToLines(text, font, size, maxWidth, maxLines = 2) {
  const value = safeText(text);
  if (!value) return [];

  const words = value.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;

  const usedWords = lines.join(" ").split(" ").filter(Boolean).length;
  if (usedWords < words.length && lines.length > 0) {
    lines[lines.length - 1] = truncateToWidth(`${lines[lines.length - 1]}...`, font, size, maxWidth);
  }

  return lines.map((line) => truncateToWidth(line, font, size, maxWidth));
}

function drawTextClipped(page, text, x, y, width, options = {}) {
  const font = options.font;
  const size = options.size || 8;
  page.drawText(truncateToWidth(text, font, size, width), {
    x,
    y,
    size,
    font,
    color: options.color || TEXT,
  });
}

function drawTextWrapped(page, text, x, y, width, options = {}) {
  const font = options.font;
  const size = options.size || 8;
  const lineHeight = options.lineHeight || size + 2;
  const lines = wrapTextToLines(text, font, size, width, options.maxLines || 2);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - (index * lineHeight),
      size,
      font,
      color: options.color || TEXT,
    });
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
  if (options.wrap) {
    drawTextWrapped(page, value || "-", x, y, width, {
      size: options.valueSize || 9,
      font: fonts.bold,
      color: TEXT,
      lineHeight: options.lineHeight,
      maxLines: options.maxLines,
    });
    return;
  }
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
  const topRowH = 34;
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
    valueSize: 6.7,
    wrap: true,
    maxLines: 2,
    lineHeight: 8,
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

  // Project Name usually needs the most room; Project No. is almost always a
  // short code, so give the name column extra width taken from that column
  // instead of splitting the row into four equal parts.
  const colW = w / 4;
  const nameW = colW * 1.6;
  const refW = colW * 1.0;
  const projNoW = colW * 0.6;
  const timeW = colW * 0.8;
  const col1X = x;
  const col2X = col1X + nameW;
  const col3X = col2X + refW;
  const col4X = col3X + projNoW;

  [col2X, col3X, col4X].forEach((lineX) => {
    page.drawLine({ start: { x: lineX, y }, end: { x: lineX, y: topRowY }, thickness: 0.55, color: BORDER });
  });

  drawLabelValue(page, fonts, "Project Name", getProjectName(project), col1X + 6, y + 8, nameW - 12, { labelSize: 5, labelGap: 11, valueSize: 7.2 });
  drawLabelValue(page, fonts, "Reference No.", getReferenceNo(variation, noticeData) || "-", col2X + 6, y + 8, refW - 12, { labelSize: 5, labelGap: 11, valueSize: 7.2 });
  drawLabelValue(page, fonts, "Project No.", getProjectNumber(project) || "-", col3X + 6, y + 8, projNoW - 12, { labelSize: 5, labelGap: 11, valueSize: 7.2 });
  drawLabelValue(page, fonts, "Additional Time", noticeData?.additional_time || "-", col4X + 6, y + 8, timeW - 12, { labelSize: 5, labelGap: 11, valueSize: 7.2 });
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

function drawPageNumber(page, fonts, pageNo, totalPages, {
  variation = null,
  project = null,
  noticeData = {},
  showDetails = false,
} = {}) {
  const { width: pageWidth } = normalizePageSize(page.getSize());
  const pageText = `Page ${pageNo} / ${totalPages}`;
  const size = showDetails ? 8 : 7;
  const maxTextWidth = pageWidth - (SIDE_MARGIN * 2) - 12;

  // Attachment pages can have varied source content, so they keep an opaque
  // chip. Notice pages already reserve a footer band, so they use plain text.
  const paddingX = 6;
  const paddingY = 4;
  const x = SIDE_MARGIN;
  const y = showDetails ? 10 : 2;

  const sectionGap = showDetails ? 3 : 10;
  const separator = "|";
  const referenceText = getReferenceNo(variation, noticeData) || "-";
  const projectName = getProjectName(project) || "-";
  const pageWidthText = fonts.bold.widthOfTextAtSize(pageText, size);
  const separatorWidth = fonts.bold.widthOfTextAtSize(separator, size);
  const referenceMaxWidth = Math.min(120, maxTextWidth * 0.28);
  const clippedReference = truncateToWidth(referenceText, fonts.bold, size, referenceMaxWidth);
  const referenceWidth = fonts.bold.widthOfTextAtSize(clippedReference, size);
  const usedWidth = pageWidthText + (separatorWidth * 2) + referenceWidth + (sectionGap * 4);
  const projectMaxWidth = Math.max(40, maxTextWidth - usedWidth);
  const clippedProject = truncateToWidth(projectName, fonts.bold, size, projectMaxWidth);
  const projectWidth = fonts.bold.widthOfTextAtSize(clippedProject, size);
  const textWidth = usedWidth + projectWidth;
  const boxWidth = textWidth + (paddingX * 2);
  const boxHeight = size + (paddingY * 2);

  if (showDetails) {
    page.drawRectangle({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: rgb(1, 1, 1),
      opacity: 0.9,
      borderColor: BORDER,
      borderWidth: 0.6,
    });
  }

  let cursorX = showDetails ? x + paddingX : x;
  const textY = showDetails ? y + paddingY : y;
  const drawSegment = (value) => {
    page.drawText(value, {
      x: cursorX,
      y: textY,
      size,
      font: fonts.bold,
      color: rgb(0.25, 0.25, 0.25),
    });
    cursorX += fonts.bold.widthOfTextAtSize(value, size);
  };

  drawSegment(pageText);
  cursorX += sectionGap;
  drawSegment(separator);
  cursorX += sectionGap;
  drawSegment(clippedReference);
  cursorX += sectionGap;
  drawSegment(separator);
  cursorX += sectionGap;
  drawSegment(clippedProject);
}

function scaleToFit(srcW, srcH, boxW, boxH) {
  const ratio = Math.min(boxW / srcW, boxH / srcH);
  return {
    width: srcW * ratio,
    height: srcH * ratio,
  };
}

function getRotatedPageDrawOptions(embeddedPage, box, rotationAngle, inset = 10) {
  const displaySize = rotationAngle === 90 || rotationAngle === 270
    ? { width: embeddedPage.height, height: embeddedPage.width }
    : { width: embeddedPage.width, height: embeddedPage.height };
  const fit = scaleToFit(
    displaySize.width,
    displaySize.height,
    box.width - (inset * 2),
    box.height - (inset * 2)
  );
  const scale = Math.min(fit.width / displaySize.width, fit.height / displaySize.height);
  const drawW = embeddedPage.width * scale;
  const drawH = embeddedPage.height * scale;
  const x = box.x + ((box.width - fit.width) / 2);
  const y = box.y + ((box.height - fit.height) / 2);

  if (rotationAngle === 90) {
    return {
      x: x + fit.width,
      y,
      width: drawW,
      height: drawH,
      rotate: degrees(90),
    };
  }
  if (rotationAngle === 180) {
    return {
      x: x + fit.width,
      y: y + fit.height,
      width: drawW,
      height: drawH,
      rotate: degrees(180),
    };
  }
  if (rotationAngle === 270) {
    return {
      x,
      y: y + fit.height,
      width: drawW,
      height: drawH,
      rotate: degrees(270),
    };
  }

  return {
    x,
    y,
    width: drawW,
    height: drawH,
  };
}

function sourcePageHasContents(sourcePage) {
  try {
    return !!sourcePage?.node?.Contents?.();
  } catch {
    return false;
  }
}

function sourcePageHasAnnotations(sourcePage) {
  try {
    const annots = sourcePage?.node?.Annots?.();
    return !!annots && typeof annots.size === "function" && annots.size() > 0;
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
    await sourcePage.render({
      canvasContext: ctx,
      viewport,
      annotationMode: pdfjsLib.AnnotationMode?.ENABLE,
    }).promise;

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
  const rasterFallbackPages = sourcePages.map((sourcePage) => (
    !sourcePageHasContents(sourcePage) || sourcePageHasAnnotations(sourcePage)
  ));
  sourcePages.forEach((sourcePage) => ensureSourcePageContents(sourcePage, srcDoc));
  const embeddedPages = sourcePages.length > 0 ? await pdfDoc.embedPages(sourcePages) : [];
  const appendedIndexes = [];

  for (let sourceIndex = 0; sourceIndex < embeddedPages.length; sourceIndex += 1) {
    const embeddedPage = embeddedPages[sourceIndex];
    if (!embeddedPage) continue;

    const sourcePage = sourcePages[sourceIndex];
    const rotationAngle = getSourcePageRotationAngle(sourcePage);
    const pageSize = getSourcePageDisplaySize(sourcePage, embeddedPage);
    const { page, box } = await createAttachmentPage(pdfDoc, fonts, opts, pageSize);
    appendedIndexes.push(pdfDoc.getPageCount() - 1);

    if (rasterFallbackPages[sourceIndex]) {
      await drawRasterizedPdfPage(pdfDoc, page, box, bytes, sourceIndex);
      continue;
    }

    page.drawPage(embeddedPage, getRotatedPageDrawOptions(embeddedPage, box, rotationAngle));
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

  return appendedPageIndexes;
}

// Stamps page numbers on every page of the document (main content + any
// appended attachment pages). Call this once, after all pages exist, so the
// main Variation Order pages get numbered too, not just the attachments.
export async function stampVariationPageNumbers(pdfDoc, context = {}) {
  const fonts = await getFonts(pdfDoc);
  const totalPages = pdfDoc.getPageCount();
  const detailedPageIndexes = new Set(context.detailedPageIndexes || []);
  for (let i = 0; i < totalPages; i += 1) {
    drawPageNumber(pdfDoc.getPage(i), fonts, i + 1, totalPages, {
      ...context,
      showDetails: detailedPageIndexes.has(i),
    });
  }
}
