const PAGE_PART_SELECTOR = "[data-vpd-page-part]";

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
