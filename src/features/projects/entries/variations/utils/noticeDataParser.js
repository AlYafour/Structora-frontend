/**
 * Notice Data Parser Utility
 *
 * Parses and extracts notice data from variation descriptions
 */

/**
 * Parses variation description JSON to extract notice data
 * @param {Object} variation - Variation object with description field
 * @returns {Object} Parsed notice data or empty object if parsing fails
 */
export const parseNoticeData = (variation) => {
  if (!variation?.description) return {};

  try {
    return JSON.parse(variation.description);
  } catch (e) {
    return {};
  }
};

/**
 * Extracts financial data from notice data
 * @param {Object} noticeData - Parsed notice data
 * @param {Object} variation - Variation object (for fallback values)
 * @returns {Object} Financial data extracted from notice
 */
export const extractFinancialData = (noticeData, variation) => {
  const totalOmitted = noticeData.total_omitted || 0;
  const totalAdded = noticeData.total_added || 0;
  const totalVariationAmount = noticeData.total_variation_amount || (totalAdded - totalOmitted);
  const contractorOHP = noticeData.contractor_engineering_oh_p || 0;
  const consultantFees = noticeData.consultant_fees || 0;
  const totalAmountBeforeDiscount = noticeData.total_amount_before_discount ||
    (totalVariationAmount + contractorOHP + consultantFees);
  const discountAmount = noticeData.discount_amount || 0;
  const discountPercentage = noticeData.discount_percentage || 0;
  const finalAmount = noticeData.total_amount || variation?.total_amount || 0;

  return {
    totalOmitted,
    totalAdded,
    totalVariationAmount,
    contractorOHP,
    consultantFees,
    totalAmountBeforeDiscount,
    discountAmount,
    discountPercentage,
    finalAmount,
  };
};
