/**
 * useVariationCalculations Hook
 *
 * Handles all financial calculations for variation
 */

import { useMemo } from 'react';
import { calculateAllFinancials } from '../utils/variationCalculations';

export function useVariationCalculations(formData, omittedItems, addedItems) {
  return useMemo(() => {
    return calculateAllFinancials(formData, omittedItems, addedItems);
  }, [formData, omittedItems, addedItems]);
}
