const PAGE_PART_SELECTOR = "[data-vpd-page-part]";
const PINNED_BOTTOM_SELECTOR = ".vpd-pinned-bottom";
const TABLE_SECTION_SELECTOR = "[data-vpd-print-table-section]";
const INSERTED_TABLE_BREAK_SELECTOR = "[data-vpd-inserted-table-break]";
const GENERAL_REMARKS_PAGE_SELECTOR = "[data-vpd-general-remarks-page]";

function getTopWithin(root, el) {
  return el.getBoundingClientRect().top - root.getBoundingClientRect().top;
}

function getPageRemainder(top, pageHeight) {
  const remainder = top % pageHeight;
  return remainder < 0 ? remainder + pageHeight : remainder;
}

function parsePx(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clearPreviousBreaks(root) {
  root.querySelectorAll(PAGE_PART_SELECTOR).forEach((el) => {
    if (el.dataset.vpdAutoMarginTop !== undefined) {
      el.style.marginTop = el.dataset.vpdOriginalMarginTop || "";
      delete el.dataset.vpdOriginalMarginTop;
      delete el.dataset.vpdAutoMarginTop;
    }
  });
}

function clearTableBreaks(root) {
  root.querySelectorAll(INSERTED_TABLE_BREAK_SELECTOR).forEach((el) => el.remove());
  root.querySelectorAll(TABLE_SECTION_SELECTOR).forEach((el) => {
    if (el.dataset.vpdAutoTableMarginTop !== undefined) {
      el.style.marginTop = el.dataset.vpdOriginalTableMarginTop || "";
      delete el.dataset.vpdOriginalTableMarginTop;
      delete el.dataset.vpdAutoTableMarginTop;
    }
  });
}

function clearPinnedBottom(root) {
  root.querySelectorAll(PINNED_BOTTOM_SELECTOR).forEach((el) => {
    if (el.dataset.vpdAutoPinMarginTop !== undefined) {
      el.style.marginTop = el.dataset.vpdOriginalPinMarginTop || "";
      delete el.dataset.vpdOriginalPinMarginTop;
      delete el.dataset.vpdAutoPinMarginTop;
    }
  });
}

function clearForcedPageStart(root) {
  root.querySelectorAll(GENERAL_REMARKS_PAGE_SELECTOR).forEach((el) => {
    if (el.dataset.vpdAutoForcedMarginTop !== undefined) {
      el.style.marginTop = el.dataset.vpdOriginalForcedMarginTop || "";
      delete el.dataset.vpdOriginalForcedMarginTop;
      delete el.dataset.vpdAutoForcedMarginTop;
    }
    if (el.dataset.vpdAutoForcedMinHeight !== undefined) {
      el.style.minHeight = el.dataset.vpdOriginalForcedMinHeight || "";
      delete el.dataset.vpdOriginalForcedMinHeight;
      delete el.dataset.vpdAutoForcedMinHeight;
    }
  });
}

function getElementHeight(el) {
  return el?.getBoundingClientRect().height || 0;
}

function getRowGroupHeight(startRow) {
  let height = getElementHeight(startRow);
  const nextRow = startRow.nextElementSibling;
  if (nextRow?.matches("[data-vpd-item-remark-row]")) {
    height += getElementHeight(nextRow);
  }
  return height;
}

function getTableColumnCount(table) {
  return table?.querySelector("thead tr")?.children.length || 1;
}

function createSpacerRow(colSpan, height) {
  const row = document.createElement("tr");
  row.className = "vpd-table-page-spacer";
  row.dataset.vpdInsertedTableBreak = "true";

  const cell = document.createElement("td");
  cell.colSpan = colSpan;
  cell.style.height = `${Math.max(0, height)}px`;
  row.appendChild(cell);

  return row;
}

function createContinuationTitleRow(section, colSpan) {
  const header = section.querySelector("[data-vpd-table-section-header]");
  if (!header) return null;

  const row = document.createElement("tr");
  row.className = "vpd-table-continuation-title";
  row.dataset.vpdInsertedTableBreak = "true";

  const cell = document.createElement("td");
  cell.colSpan = colSpan;
  cell.appendChild(header.cloneNode(true));
  row.appendChild(cell);

  return row;
}

function createContinuationHeaderRow(table) {
  const sourceRow = table.querySelector("thead tr");
  if (!sourceRow) return null;

  const row = sourceRow.cloneNode(true);
  row.classList.add("vpd-table-continuation-head");
  row.dataset.vpdInsertedTableBreak = "true";
  return row;
}

// Unconditionally pushes the element matching `selector` so its top lands at
// or after `minPageIndex * pageHeight` (0-indexed: minPageIndex=1 => "page
// 2"), then (by default) forces it to occupy exactly one full page via
// minHeight, so whatever follows in the DOM starts no earlier than the next
// page boundary. Unlike applyPrintPagePartBreaks below, this is NOT
// conditional on "does it fit" — it always pushes.
//
// Uses Math.ceil(naturalTop / pageHeight) rather than a hardcoded target so
// it degrades safely if content before it already overflows past
// minPageIndex (e.g. an unusually long header): the element lands on the
// next real page boundary at or after wherever the header actually ends,
// instead of a hardcoded target producing a negative margin and visually
// overlapping the still-flowing header.
//
// Must run BEFORE applyPrintTablePagination/applyPrintPagePartBreaks/
// pinPrintBottomGroup in every caller — it defines how much of page 1 is
// consumed, which those functions' own remaining-space math depends on.
export function forceElementToPageStart(root, selector, minPageIndex, pageHeight, { fillFullPage = true } = {}) {
  if (!root || !pageHeight) return () => {};

  clearForcedPageStart(root); // undo any stale push from a previous measurement pass first

  const el = root.querySelector(selector);
  if (!el) return () => clearForcedPageStart(root);

  const naturalTop = getTopWithin(root, el);
  const targetPageIndex = Math.max(minPageIndex, Math.ceil(naturalTop / pageHeight));
  const targetTop = targetPageIndex * pageHeight;

  const computedMarginTop = parsePx(window.getComputedStyle(el).marginTop);
  const forcedMarginTop = Math.max(0, computedMarginTop + (targetTop - naturalTop));

  el.dataset.vpdOriginalForcedMarginTop = el.style.marginTop || "";
  el.dataset.vpdAutoForcedMarginTop = String(forcedMarginTop);
  el.style.marginTop = `${forcedMarginTop}px`;

  if (fillFullPage) {
    el.dataset.vpdOriginalForcedMinHeight = el.style.minHeight || "";
    el.dataset.vpdAutoForcedMinHeight = String(pageHeight);
    el.style.minHeight = `${pageHeight}px`;
  }

  return () => clearForcedPageStart(root);
}

export function applyPrintPagePartBreaks(root, pageHeight, { continuationTopGap = 14 } = {}) {
  if (!root || !pageHeight) return () => {};

  clearPreviousBreaks(root);

  const parts = Array.from(root.querySelectorAll(PAGE_PART_SELECTOR));

  parts.forEach((part) => {
    const height = part.getBoundingClientRect().height;
    if (!height || height >= pageHeight) return;

    const top = getTopWithin(root, part);
    const positionInPage = getPageRemainder(top, pageHeight);
    const remaining = pageHeight - positionInPage;

    if (height > remaining) {
      const computedMarginTop = parsePx(window.getComputedStyle(part).marginTop);
      const pushToNextPage = remaining + continuationTopGap + computedMarginTop;
      part.dataset.vpdOriginalMarginTop = part.style.marginTop || "";
      part.dataset.vpdAutoMarginTop = String(pushToNextPage);
      part.style.marginTop = `${pushToNextPage}px`;
    }
  });

  return () => clearPreviousBreaks(root);
}

export function applyPrintTablePagination(root, pageHeight, { bottomGap = 10, continuationTopGap = 12 } = {}) {
  if (!root || !pageHeight) return () => {};

  clearTableBreaks(root);

  const sections = Array.from(root.querySelectorAll(TABLE_SECTION_SELECTOR));

  sections.forEach((section) => {
    const table = section.querySelector("[data-vpd-print-table]");
    const tbody = table?.querySelector("tbody");
    const firstRow = tbody?.querySelector("[data-vpd-item-row]");
    if (!table || !tbody || !firstRow) return;

    const firstGroupHeight = getRowGroupHeight(firstRow);
    const sectionIntroHeight = firstRow.getBoundingClientRect().top - section.getBoundingClientRect().top;
    const firstBlockHeight = sectionIntroHeight + firstGroupHeight;

    if (firstBlockHeight > 0 && firstBlockHeight < pageHeight) {
      const sectionTop = getTopWithin(root, section);
      const sectionPosition = getPageRemainder(sectionTop, pageHeight);
      const sectionRemaining = pageHeight - sectionPosition;

      if (firstBlockHeight > sectionRemaining - bottomGap) {
        const computedMarginTop = parsePx(window.getComputedStyle(section).marginTop);
        const pushToNextPage = sectionRemaining + continuationTopGap + computedMarginTop;
        section.dataset.vpdOriginalTableMarginTop = section.style.marginTop || "";
        section.dataset.vpdAutoTableMarginTop = String(pushToNextPage);
        section.style.marginTop = `${pushToNextPage}px`;
      }
    }
  });

  sections.forEach((section) => {
    const table = section.querySelector("[data-vpd-print-table]");
    const tbody = table?.querySelector("tbody");
    if (!table || !tbody) return;

    const colSpan = getTableColumnCount(table);
    const rows = Array.from(tbody.querySelectorAll("[data-vpd-item-row]"));

    rows.forEach((row) => {
      const groupHeight = getRowGroupHeight(row);
      if (!groupHeight || groupHeight >= pageHeight) return;

      const top = getTopWithin(root, row);
      const positionInPage = getPageRemainder(top, pageHeight);
      const remaining = pageHeight - positionInPage;

      if (groupHeight <= remaining - bottomGap) return;

      const spacer = createSpacerRow(colSpan, remaining + continuationTopGap);
      const continuationTitle = createContinuationTitleRow(section, colSpan);
      const continuationHeader = createContinuationHeaderRow(table);

      tbody.insertBefore(spacer, row);
      if (continuationTitle) tbody.insertBefore(continuationTitle, row);
      if (continuationHeader) tbody.insertBefore(continuationHeader, row);
    });
  });

  return () => clearTableBreaks(root);
}

function normalizePageMetrics(pageMetrics) {
  if (typeof pageMetrics === "number") {
    return {
      firstPageHeight: pageMetrics,
      continuationPageHeight: pageMetrics,
    };
  }

  const firstPageHeight = pageMetrics?.pageHeight || pageMetrics?.firstPageHeight || 0;
  return {
    firstPageHeight,
    continuationPageHeight: pageMetrics?.continuationPageHeight || firstPageHeight,
  };
}

function getTargetPageEnd(top, height, firstPageHeight, continuationPageHeight) {
  if (top < firstPageHeight) {
    const firstPageEnd = firstPageHeight;
    return top + height <= firstPageEnd
      ? firstPageEnd
      : firstPageEnd + continuationPageHeight;
  }

  const continuationOffset = top - firstPageHeight;
  const pageIndex = Math.floor(continuationOffset / continuationPageHeight);
  const currentPageEnd = firstPageHeight + ((pageIndex + 1) * continuationPageHeight);

  return top + height <= currentPageEnd
    ? currentPageEnd
    : currentPageEnd + continuationPageHeight;
}

export function pinPrintBottomGroup(root, pageMetrics) {
  const { firstPageHeight, continuationPageHeight } = normalizePageMetrics(pageMetrics);
  if (!root || !firstPageHeight || !continuationPageHeight) return () => {};

  clearPinnedBottom(root);

  const pinnedBottom = root.querySelector(PINNED_BOTTOM_SELECTOR);
  const maxPageHeight = Math.max(firstPageHeight, continuationPageHeight);
  const group = pinnedBottom;

  if (!group) return () => clearPinnedBottom(root);

  const height = group.getBoundingClientRect().height;
  if (!height || height >= maxPageHeight) {
    return () => clearPinnedBottom(root);
  }

  const top = getTopWithin(root, group);
  const targetPageEnd = getTargetPageEnd(top, height, firstPageHeight, continuationPageHeight);
  const computedMarginTop = parsePx(window.getComputedStyle(group).marginTop);
  const pinMargin = computedMarginTop + Math.max(0, targetPageEnd - top - height);

  group.dataset.vpdOriginalPinMarginTop = group.style.marginTop || "";
  group.dataset.vpdAutoPinMarginTop = String(pinMargin);
  group.style.marginTop = `${pinMargin}px`;

  return () => clearPinnedBottom(root);
}
