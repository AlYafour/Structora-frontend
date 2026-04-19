/**
 * useVariationFinancials Hook
 *
 * Manages financial calculations for variations
 */

import { useMemo } from "react";
import { parseNoticeData, extractFinancialData } from "../utils/noticeDataParser";

export const useVariationFinancials = (variation) => {
  const noticeData = useMemo(() => parseNoticeData(variation), [variation]);

  const financials = useMemo(
    () => extractFinancialData(noticeData, variation),
    [noticeData, variation]
  );

  return {
    noticeData,
    ...financials,
  };
};
