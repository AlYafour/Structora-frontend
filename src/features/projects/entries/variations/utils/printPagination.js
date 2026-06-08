const PAGE_PART_SELECTOR = "[data-vpd-page-part]";
const PINNED_BOTTOM_SELECTOR = ".vpd-pinned-bottom";

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

function clearPinnedBottom(root) {
  root.querySelectorAll(PINNED_BOTTOM_SELECTOR).forEach((el) => {
    if (el.dataset.vpdAutoPinMarginTop !== undefined) {
      el.style.marginTop = el.dataset.vpdOriginalPinMarginTop || "";
      delete el.dataset.vpdOriginalPinMarginTop;
      delete el.dataset.vpdAutoPinMarginTop;
    }
  });
}

export function applyPrintPagePartBreaks(root, pageHeight) {
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
      const pushToNextPage = remaining + computedMarginTop;
      part.dataset.vpdOriginalMarginTop = part.style.marginTop || "";
      part.dataset.vpdAutoMarginTop = String(pushToNextPage);
      part.style.marginTop = `${pushToNextPage}px`;
    }
  });

  return () => clearPreviousBreaks(root);
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
