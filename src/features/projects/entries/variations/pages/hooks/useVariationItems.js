/**
 * useVariationItems Hook
 *
 * Manages omitted and added items state and handlers
 */

import { useState, useCallback } from 'react';

const createNewItem = (id, includeOverheadProfit = false) => ({
  id,
  qty: '',
  unit: 'LS',
  rate: '',
  amount: '',
  description: '',
  remarks: '',
  ...(includeOverheadProfit && { includesOverheadProfit: false })
});

/**
 * Calculate item amount from qty and rate
 */
const calculateItemAmount = (qty, rate) => {
  const qtyNum = parseFloat(qty) || 0;
  const rateNum = parseFloat(rate) || 0;
  const result = qtyNum * rateNum;
  return isNaN(result) ? 0 : result;
};

export function useVariationItems() {
  const [omittedItems, setOmittedItems] = useState([createNewItem(1, true)]);
  const [addedItems, setAddedItems] = useState([createNewItem(1, false)]);
  const [expandedOmittedItems, setExpandedOmittedItems] = useState(new Set());
  const [expandedAddedItems, setExpandedAddedItems] = useState(new Set());

  /**
   * Update omitted item
   */
  const updateOmittedItem = useCallback((id, field, value) => {
    setOmittedItems((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, [field]: value };
          if (field === 'qty' || field === 'rate') {
            newItem.amount = calculateItemAmount(newItem.qty, newItem.rate);
          }
          return newItem;
        }
        return item;
      });
    });
  }, []);

  /**
   * Update added item
   */
  const updateAddedItem = useCallback((id, field, value) => {
    setAddedItems((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, [field]: value };
          if (field === 'qty' || field === 'rate') {
            newItem.amount = calculateItemAmount(newItem.qty, newItem.rate);
          }
          return newItem;
        }
        return item;
      });
    });
  }, []);

  /**
   * Add omitted item
   */
  const addOmittedItem = useCallback(() => {
    const newId = Math.max(...omittedItems.map((i) => i.id), 0) + 1;
    setOmittedItems([...omittedItems, createNewItem(newId, true)]);
  }, [omittedItems]);

  /**
   * Add added item
   */
  const addAddedItem = useCallback(() => {
    const newId = Math.max(...addedItems.map((i) => i.id), 0) + 1;
    setAddedItems([...addedItems, createNewItem(newId, false)]);
  }, [addedItems]);

  /**
   * Remove omitted item
   */
  const removeOmittedItem = useCallback((id) => {
    setOmittedItems(prev => prev.filter((item) => item.id !== id));
    setExpandedOmittedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  /**
   * Remove added item
   */
  const removeAddedItem = useCallback((id) => {
    setAddedItems(prev => prev.filter((item) => item.id !== id));
    setExpandedAddedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  /**
   * Toggle omitted item expand
   */
  const toggleOmittedItemExpand = useCallback((itemId) => {
    setExpandedOmittedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  /**
   * Toggle added item expand
   */
  const toggleAddedItemExpand = useCallback((itemId) => {
    setExpandedAddedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  return {
    omittedItems,
    addedItems,
    expandedOmittedItems,
    expandedAddedItems,
    setOmittedItems,
    setAddedItems,
    setExpandedOmittedItems,
    setExpandedAddedItems,
    updateOmittedItem,
    updateAddedItem,
    addOmittedItem,
    addAddedItem,
    removeOmittedItem,
    removeAddedItem,
    toggleOmittedItemExpand,
    toggleAddedItemExpand
  };
}
