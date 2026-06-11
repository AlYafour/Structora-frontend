export function parseVariationNoticeData(variation) {
  if (!variation?.description) return {};

  try {
    return JSON.parse(variation.description);
  } catch (_e) {
    return {};
  }
}

export function getVariationTotalAmount(variation) {
  const noticeData = parseVariationNoticeData(variation);

  return (
    noticeData.total_amount ??
    variation?.total_amount ??
    variation?.final_amount ??
    variation?.net_amount ??
    variation?.amount ??
    0
  );
}
