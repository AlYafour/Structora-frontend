import { ATTACHMENT_SECTIONS } from './attachmentSections';

export const generateLocalId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

// Returns every known section key in the variation's own drag-customized
// order (`attachment_section_order`), followed by any section missing from
// that list — a section added to the catalog after this variation last saved
// its order, or a variation that never customized it — in catalog order.
export const getOrderedAttachmentSections = (customOrder) => {
  const seen = new Set();
  const ordered = [];
  (Array.isArray(customOrder) ? customOrder : []).forEach((section) => {
    if (ATTACHMENT_SECTIONS.includes(section) && !seen.has(section)) {
      seen.add(section);
      ordered.push(section);
    }
  });
  ATTACHMENT_SECTIONS.forEach((section) => {
    if (!seen.has(section)) {
      seen.add(section);
      ordered.push(section);
    }
  });
  return ordered;
};

// Splits `variationAttachments` into the same groups the UI renders as boxes:
// one list per section (in `orderedSections` order), a trailing "Other" list
// (already-saved attachments with a legacy/unrecognized section), and
// "pending" (brand-new attachments with no section chosen yet). Each item
// keeps its original index (`i`) into the full array so mutation handlers
// stay index-based regardless of which box renders it.
export const partitionAttachmentsBySection = (variationAttachments, orderedSections) => {
  const indexed = (variationAttachments || []).map((att, i) => ({ att, i }));
  const sectionGroups = orderedSections.map((section) => ({
    key: section,
    items: indexed.filter(({ att }) => att.section === section),
  }));
  const otherItems = indexed.filter(({ att }) => att.id && !orderedSections.includes(att.section));
  const pendingItems = indexed.filter(({ att }) => !att.id && !orderedSections.includes(att.section));
  return { sectionGroups, otherItems, pendingItems };
};

// Final flat order used both to re-sequence the Index table and to build the
// `variation_attachments_order` tokens sent on save: every section box's
// items (in their on-screen, drag-customized order), then the legacy "Other"
// box. Pending (unsaved, no section yet) items are excluded — nothing to
// order until they have a section/file.
export const getAttachmentDisplayOrder = (variationAttachments, orderedSections) => {
  const { sectionGroups, otherItems } = partitionAttachmentsBySection(variationAttachments, orderedSections);
  const flat = [];
  sectionGroups.forEach(({ items }) => flat.push(...items));
  flat.push(...otherItems);
  return flat.map(({ att }) => att);
};

// Moves the attachment at `fromIndex` (its index in the full array) next to
// `toIndex`, but only reshuffles among items that share its own section —
// every other section/box keeps the exact array slots it already occupied,
// so dragging inside one box never touches another box's order.
export const reorderAttachmentsWithinSection = (variationAttachments, fromIndex, toIndex) => {
  if (fromIndex === toIndex) return variationAttachments;
  const section = variationAttachments[fromIndex]?.section;
  if (section == null || variationAttachments[toIndex]?.section !== section) return variationAttachments;

  const slots = variationAttachments
    .map((att, i) => (att.section === section ? i : -1))
    .filter((i) => i !== -1);
  const fromPos = slots.indexOf(fromIndex);
  const toPos = slots.indexOf(toIndex);
  if (fromPos === -1 || toPos === -1) return variationAttachments;

  const reorderedSource = [...slots];
  const [moved] = reorderedSource.splice(fromPos, 1);
  reorderedSource.splice(toPos, 0, moved);

  const next = [...variationAttachments];
  slots.forEach((slot, i) => {
    next[slot] = variationAttachments[reorderedSource[i]];
  });
  return next;
};

// Re-sequences index_items so rows linked to an attachment (`linked_attachment_id`)
// follow that attachment's current display order, without moving manually-added
// (unlinked) rows out of their slot — only the linked rows shuffle among
// themselves, dropped back into the same positions the linked rows already held.
export const reorderIndexItemsForAttachmentOrder = (items = [], orderedLocalIds = []) => {
  const linkedRows = items.filter((row) => row.linked_attachment_id);
  if (linkedRows.length < 2) return items;

  const rank = new Map(orderedLocalIds.map((id, i) => [id, i]));
  const sortedLinked = [...linkedRows].sort((a, b) => {
    const rankA = rank.has(a.linked_attachment_id) ? rank.get(a.linked_attachment_id) : Infinity;
    const rankB = rank.has(b.linked_attachment_id) ? rank.get(b.linked_attachment_id) : Infinity;
    return rankA - rankB;
  });

  let cursor = 0;
  const next = items.map((row) => {
    if (!row.linked_attachment_id) return row;
    const replacement = sortedLinked[cursor];
    cursor += 1;
    return replacement;
  });
  return next.some((row, i) => row !== items[i]) ? next : items;
};

// The attachment <-> Index-row link (`linked_attachment_id`) is a
// client-generated id assigned when an attachment is first added in-browser.
// It's persisted server-side as `VariationAttachment.client_ref` so it can be
// read back after a reload — but attachments uploaded before that field
// existed have no `client_ref`. For those, fall back to pairing them, in
// order, with whichever linked Index rows weren't already claimed by a
// `client_ref` match: rows are always appended in the same order their
// attachment was uploaded, and `reorderIndexItemsForAttachmentOrder` keeps
// that same relative order in lockstep with the attachment order on every
// save, so the positional pairing stays valid on every subsequent load too.
export const relinkAttachmentsToIndexItems = (rawAttachments, indexItems) => {
  const attachments = (rawAttachments || []).map((a) => ({ ...a, localId: a.client_ref || null }));
  const items = indexItems || [];

  const claimedRowIds = new Set(
    items
      .filter((row) => row.linked_attachment_id && attachments.some((a) => a.localId === row.linked_attachment_id))
      .map((row) => row.linked_attachment_id)
  );
  const unclaimedRows = items.filter((row) => row.linked_attachment_id && !claimedRowIds.has(row.linked_attachment_id));
  const legacyAttachments = attachments.filter((a) => !a.localId);

  const relinkMap = new Map();
  legacyAttachments.forEach((att, i) => {
    const row = unclaimedRows[i];
    if (!row) return;
    att.localId = generateLocalId();
    relinkMap.set(row.linked_attachment_id, att.localId);
  });

  const relinkedIndexItems = items.map((row) => (
    row.linked_attachment_id && relinkMap.has(row.linked_attachment_id)
      ? { ...row, linked_attachment_id: relinkMap.get(row.linked_attachment_id) }
      : row
  ));

  return { attachments, indexItems: relinkedIndexItems };
};

// Moves the element at `fromIndex` to `toIndex`, leaving every other
// element's relative order untouched.
export const moveArrayItem = (arr, fromIndex, toIndex) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= arr.length || toIndex >= arr.length) {
    return arr;
  }
  const next = [...arr];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};
