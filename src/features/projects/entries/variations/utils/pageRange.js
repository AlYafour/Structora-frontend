// Attachments in the Notice of Variation Index table are appended, in the
// final exported PDF, right after the Notice + Index pages themselves — so
// an attachment's page numbers must be offset by however many pages the
// Notice + Index content occupies, not start back at page 1.

export const formatPageRange = (startPage, pageCount = 1) => {
  const count = Math.max(1, Number(pageCount) || 1);
  const start = Math.max(1, Number(startPage) || 1);
  const end = start + count - 1;
  return count <= 1 ? String(start) : `${start}-${end}`;
};

// How many pages a "start-end" or single "n" page_numbers string spans.
export const parsePageRangeSpan = (value) => {
  const str = String(value ?? '').trim();
  if (!str) return 0;
  const rangeMatch = str.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    return Math.max(1, Math.abs(Number(rangeMatch[2]) - Number(rangeMatch[1])) + 1);
  }
  return /^\d+$/.test(str) ? 1 : 0;
};

// Recomputes page_numbers for every row, in order, starting right after
// `noticePages`. Rows tagged with a `page_count` (auto-filled from an
// uploaded attachment) get their page_numbers recalculated from it; other
// rows (manually added, or not yet AI-extracted) keep whatever page_numbers
// they already have, but that value still counts toward the running total so
// later attachments are still numbered correctly around them. Returns the
// same row reference wherever nothing changed, so callers can diff cheaply.
export const recalculatePageRanges = (items = [], noticePages = 1) => {
  let lastUsedPage = Math.max(0, Number(noticePages) || 0);
  return items.map((row) => {
    if (row.linked_attachment_id && row.page_count) {
      const start = lastUsedPage + 1;
      const pageNumbers = formatPageRange(start, row.page_count);
      lastUsedPage = start + row.page_count - 1;
      return row.page_numbers === pageNumbers ? row : { ...row, page_numbers: pageNumbers };
    }
    lastUsedPage += parsePageRangeSpan(row.page_numbers);
    return row;
  });
};
