/**
 * Custom Hook for Payment Claim Items Management
 * Handles BOQ items state, calculations, and auto-save
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentClaimApi } from '../../../../../services/paymentClaim';
import { boqApi } from '../../../../../services/boq';
import { handleError } from '../../../../../utils/errorHandler';
import { isZeroValue } from '../../../../../utils/helpers/parsing';

export function usePaymentClaimItems(projectId, paymentClaimId = null) {
  const { t } = useTranslation();
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingStatus, setSavingStatus] = useState(''); // 'saving' | 'saved' | 'error' | ''
  const saveTimeoutRef = useRef(null);
  const statusTimerRef = useRef(null);
  const pendingChangesRef = useRef({});

  // Memoized sections calculation - groups items by section
  const boqSections = useMemo(() => {
    if (!boqItems || boqItems.length === 0) return [];

    // Remove duplicates by id (keep first occurrence)
    const uniqueItems = [];
    const seenIds = new Set();
    for (const item of boqItems) {
      const itemId = item.boq_item_id || item.id;
      if (!seenIds.has(itemId)) {
        seenIds.add(itemId);
        uniqueItems.push(item);
      }
    }

    const sectionsMap = new Map();
    const seenSectionIds = new Set(); // Track unique section IDs to prevent duplicates

    uniqueItems.forEach(item => {
      // Show all items from Excel - only skip completely empty rows
      const hasAnyData =
        (item.description && item.description.trim() !== '' && item.description !== '-') ||
        (item.item_code && item.item_code.trim() !== '' && item.item_code !== '-') ||
        parseFloat(item.amount || 0) > 0 ||
        !isZeroValue(item.qty) ||
        !isZeroValue(item.rate);

      // Only skip completely empty items (no data at all)
      if (!hasAnyData) {
        return;
      }

      const sectionId = item.section_id;
      const sectionName = item.section_name || '';
      const billNo = item.bill_no || '';

      // Skip items without section_id
      if (!sectionId) {
        return;
      }

      // Skip items in "General" section without bill_no
      if (!sectionName || sectionName.toLowerCase() === 'general') {
        if (!billNo || billNo.trim() === '') {
          return;
        }
      }

      // Use section_id as key to ensure unique sections
      const sectionKey = sectionId;

      // Only create section once per unique section_id
      if (!seenSectionIds.has(sectionKey)) {
        // Use section_name directly from database (should be from Excel)
        // The section_name should already be correct from Excel import
        let displayName = sectionName;
        
        // If section_name is empty or "general", try bill_no
        if (!displayName || displayName.toLowerCase() === 'general' || displayName === '') {
          displayName = billNo || `Section ${sectionId}`;
        }

        // Only create section if it has a valid name
        if (displayName && displayName.toLowerCase() !== 'general') {
          sectionsMap.set(sectionKey, {
            id: sectionId,
            section_name: displayName,
            bill_no: billNo,
            items: []
          });
          seenSectionIds.add(sectionKey);
        }
      }

      // Add item to section if section exists
      if (sectionsMap.has(sectionKey)) {
        sectionsMap.get(sectionKey).items.push(item);
      }
    });

    return Array.from(sectionsMap.values())
      .map(section => {
        // Show all items from Excel - only remove completely empty ones
        const validItems = section.items.filter(item => {
          return (
            (item.description && item.description.trim() !== '' && item.description !== '-') ||
            (item.item_code && item.item_code.trim() !== '' && item.item_code !== '-') ||
            parseFloat(item.amount || 0) > 0 ||
            !isZeroValue(item.qty) ||
            !isZeroValue(item.rate)
          );
        });
        
        // Sort items within section by item_code to match Excel order
        const sortedItems = validItems.sort((a, b) => {
          const codeA = a.item_code || '';
          const codeB = b.item_code || '';
          
          // If both have item_code, sort numerically (1.10 < 1.20 < 2.10)
          if (codeA && codeB) {
            // Try to parse as numbers (e.g., "1.10" -> 1.10, "2.0" -> 2.0)
            const numA = parseFloat(codeA);
            const numB = parseFloat(codeB);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            // If not pure numbers, use natural sort (handles "1.10" vs "1.2")
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
          }
          
          // Items with codes come before items without codes
          if (codeA && !codeB) return -1;
          if (!codeA && codeB) return 1;
          
          // If both don't have codes, maintain original order (use order field)
          const orderA = parseFloat(a.order || 0);
          const orderB = parseFloat(b.order || 0);
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          
          // Last resort: sort by description
          return (a.description || '').localeCompare(b.description || '');
        });
        
        return {
          ...section,
          items: sortedItems
        };
      })
      .filter(section => {
        // Filter out sections without valid ID
        if (!section.id) {
          return false;
        }
        
        const name = (section.section_name || '').toLowerCase();
        // Only filter out "General" sections without bill_no and completely empty sections
        if (name === 'general' && (!section.bill_no || section.bill_no.trim() === '')) {
          return false;
        }
        if (section.items.length === 0) {
          return false;
        }
        return true;
      })
      // Remove duplicate sections by ID (keep first occurrence)
      .filter((section, index, self) => {
        return index === self.findIndex(s => s.id === section.id);
      })
      .sort((a, b) => {
        // Sort sections by bill_no (numeric) to match Excel order
        if (a.bill_no && b.bill_no) {
          // Extract numeric part from bill_no (e.g., "1.0" -> 1, "2.0" -> 2)
          const aNum = parseFloat(a.bill_no) || 999;
          const bNum = parseFloat(b.bill_no) || 999;
          if (aNum !== bNum) {
          return aNum - bNum;
          }
          // If bill_no is same, compare as strings for sub-numbers (e.g., "1.0" vs "1.10")
          return a.bill_no.localeCompare(b.bill_no, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (a.bill_no && !b.bill_no) return -1;
        if (!a.bill_no && b.bill_no) return 1;
        // If no bill_no, sort by section_name
        return (a.section_name || '').localeCompare(b.section_name || '');
      });
  }, [boqItems]);

  // Calculate totals
  const totals = useMemo(() => {
    return boqItems.reduce((acc, item) => ({
      amount: acc.amount + (parseFloat(item.amount) || 0),
      previous_amount: acc.previous_amount + (parseFloat(item.previous_amount) || 0),
      current_amount: acc.current_amount + (parseFloat(item.current_amount) || 0),
      total_amount: acc.total_amount + (parseFloat(item.total_amount) || 0),
    }), { amount: 0, previous_amount: 0, current_amount: 0, total_amount: 0 });
  }, [boqItems]);

  // Load BOQ items from project (create mode)
  const loadProjectBOQItems = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await paymentClaimApi.getProjectBOQItems(projectId);
      const rawItems = data.items || [];
      
      // Remove duplicates by id (keep first occurrence)
      const uniqueItemsMap = new Map();
      for (const item of rawItems) {
        const itemId = item.boq_item_id || item.id;
        if (!uniqueItemsMap.has(itemId)) {
          uniqueItemsMap.set(itemId, item);
        }
      }
      
      const items = Array.from(uniqueItemsMap.values()).map(item => ({
        ...item,
        // Convert 0 values to empty strings for qty, rate, and total_percent
        qty: isZeroValue(item.qty) ? '' : item.qty,
        rate: isZeroValue(item.rate) ? '' : item.rate,
        total_percent: isZeroValue(item.total_percent) ? '' : item.total_percent,
      }));
      setBoqItems(items);

      if (items.length === 0) {
        // Check if there's a message from backend
        const backendMessage = data?.message || '';
        if (backendMessage.includes('inactive')) {
          setError(t('boq_error_inactive'));
        } else if (backendMessage.includes('template')) {
          setError(t('boq_error_no_template'));
        } else {
          setError(t('boq_error_empty'));
        }
      }
    } catch (err) {
      handleError(err, 'usePaymentClaimItems.loadProjectBOQItems');
      const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || err?.message;
      if (errorMsg?.includes('No BOQ items found') || errorMsg?.includes('BOQ')) {
        setError(t('boq_error_empty'));
      } else {
        setError(errorMsg || t('boq_error_load'));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load BOQ items for existing payment claim (edit mode)
  const loadClaimBOQItems = useCallback(async () => {
    if (!projectId || !paymentClaimId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await paymentClaimApi.getBOQItems(projectId, paymentClaimId);
      const rawItems = data.items || [];
      
      // Remove duplicates by id (keep first occurrence)
      const uniqueItemsMap = new Map();
      for (const item of rawItems) {
        const itemId = item.boq_item_id || item.id;
        if (!uniqueItemsMap.has(itemId)) {
          uniqueItemsMap.set(itemId, item);
        }
      }
      
      const items = Array.from(uniqueItemsMap.values()).map(item => ({
        ...item,
        // Convert 0 values to empty strings for qty, rate, and total_percent
        qty: isZeroValue(item.qty) ? '' : item.qty,
        rate: isZeroValue(item.rate) ? '' : item.rate,
        total_percent: isZeroValue(item.total_percent) ? '' : item.total_percent,
      }));
      setBoqItems(items);
    } catch (err) {
      handleError(err, 'usePaymentClaimItems.loadClaimBOQItems');
      setError(err?.response?.data?.detail || 'Error loading BOQ items');
    } finally {
      setLoading(false);
    }
  }, [projectId, paymentClaimId]);

  // Auto-calculate amounts when fields change
  const calculateAmounts = useCallback((item, field, value) => {
    const updated = { ...item, [field]: value };

    if (field === 'total_percent') {
      // User enters total_percent, calculate current_percent
      // Empty value is treated as 0 for calculation
      // Use parseInt for integers only (no decimals)
      const totalPercent = (value === '' || value === null || value === undefined) ? 0 : parseInt(value, 10) || 0;
      const previousPercent = parseInt(updated.previous_percent || 0, 10);
      const currentPercent = totalPercent - previousPercent;
      const amount = parseFloat(updated.amount) || 0;
      
      // Store empty string if 0, otherwise store the value
      updated.total_percent = (totalPercent === 0) ? '' : totalPercent;
      updated.current_percent = currentPercent;
      
      // Calculate amounts
      if (updated.is_ls) {
        // For LS items, use rate as contract_value
        const contractValue = parseFloat(updated.rate) || 0;
        updated.current_amount = (contractValue * currentPercent) / 100;
        updated.total_amount = (contractValue * totalPercent) / 100;
        updated.previous_amount = (contractValue * previousPercent) / 100;
      } else {
        updated.current_amount = (amount * currentPercent) / 100;
        updated.total_amount = (amount * totalPercent) / 100;
        updated.previous_amount = (amount * previousPercent) / 100;
      }
    } else if (field === 'qty' || field === 'rate') {
      const qty = parseFloat(field === 'qty' ? value : updated.qty) || 0;
      const rate = parseFloat(field === 'rate' ? value : updated.rate) || 0;
      updated.amount = qty * rate;
      
      // Recalculate percentages amounts
      // Use parseInt for integers only (no decimals)
      const previousPercent = parseInt(updated.previous_percent || 0, 10);
      const totalPercent = parseInt(updated.total_percent || 0, 10);
      const currentPercent = totalPercent - previousPercent;
      
      updated.current_percent = currentPercent;
      
      if (updated.is_ls) {
        const contractValue = rate;
        updated.previous_amount = (contractValue * previousPercent) / 100;
        updated.current_amount = (contractValue * currentPercent) / 100;
        updated.total_amount = (contractValue * totalPercent) / 100;
      } else {
        updated.previous_amount = (updated.amount * previousPercent) / 100;
        updated.current_amount = (updated.amount * currentPercent) / 100;
        updated.total_amount = (updated.amount * totalPercent) / 100;
      }
    }

    return updated;
  }, []);

  // Update item field with auto-save
  const updateItemField = useCallback((itemId, field, value) => {
    // Update local state immediately (optimistic update)
    setBoqItems(prevItems =>
      prevItems.map(item => {
        if ((item.boq_item_id || item.id) !== itemId) return item;
        const updated = calculateAmounts(item, field, value);
        // For unit, ensure it's uppercase
        if (field === 'unit' && value) {
          updated.unit = value.toUpperCase();
        }
        return updated;
      })
    );

    // Skip auto-save for item_code (read-only)
    if (field === 'item_code' || !projectId) return;

    // Track pending changes
    if (!pendingChangesRef.current[itemId]) {
      pendingChangesRef.current[itemId] = {};
    }
    pendingChangesRef.current[itemId][field] = value;

    // If qty or rate changed, also save amount
    if (field === 'qty' || field === 'rate') {
      const item = boqItems.find(i => (i.boq_item_id || i.id) === itemId);
      if (item) {
        const qty = parseFloat(field === 'qty' ? value : item.qty) || 0;
        const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
        pendingChangesRef.current[itemId].amount = qty * rate;
      }
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Show saving status
    setSavingStatus('saving');

    // Debounced save (500ms) with batch updates
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const changes = pendingChangesRef.current;
        pendingChangesRef.current = {};

        // Prepare batch updates - convert empty strings to 0 for DecimalFields
        const batchUpdates = Object.entries(changes).map(([id, fieldChanges]) => {
          const cleanedChanges = { ...fieldChanges };
          // For unit, ensure it's uppercase
          if ('unit' in cleanedChanges && cleanedChanges.unit) {
            cleanedChanges.unit = cleanedChanges.unit.toUpperCase();
          }
          // Convert empty strings to 0 for qty and rate (DecimalFields don't accept null)
          if ('qty' in cleanedChanges) {
            if (cleanedChanges.qty === '' || cleanedChanges.qty === null || cleanedChanges.qty === undefined) {
              cleanedChanges.qty = 0;
            } else {
              // Convert string to number if needed
              cleanedChanges.qty = parseFloat(cleanedChanges.qty) || 0;
            }
          }
          if ('rate' in cleanedChanges) {
            if (cleanedChanges.rate === '' || cleanedChanges.rate === null || cleanedChanges.rate === undefined) {
              cleanedChanges.rate = 0;
            } else {
              // Convert string to number if needed
              cleanedChanges.rate = parseFloat(cleanedChanges.rate) || 0;
            }
          }
          return {
            id: id,
            ...cleanedChanges
          };
        });

        // Use batch update API if available (faster)
        if (batchUpdates.length > 0) {
          await boqApi.batchUpdateItems(projectId, batchUpdates);
        }

        setSavingStatus('saved');
        statusTimerRef.current = setTimeout(() => setSavingStatus(''), 2000);
      } catch (err) {
        handleError(err, 'usePaymentClaimItems.updateItemField');
        setSavingStatus('error');
        statusTimerRef.current = setTimeout(() => setSavingStatus(''), 3000);
      }
    }, 500);
  }, [projectId, boqItems, calculateAmounts]);

  // Add new item to section
  const addItem = useCallback(async (sectionId, afterItemId = null) => {
    if (!projectId) return null;

    try {
      const section = boqSections.find(s => s.id === sectionId);
      const sectionItems = section?.items || [];

      // Generate item code
      let sectionNumber = section?.bill_no || '';
      if (!sectionNumber) {
        const sectionIndex = boqSections.findIndex(s => s.id === sectionId);
        sectionNumber = (sectionIndex + 1).toString();
      } else {
        const numericMatch = sectionNumber.match(/\d+/);
        if (numericMatch) sectionNumber = numericMatch[0];
      }

      let maxItemNumber = 0;
      sectionItems.forEach(item => {
        if (item.item_code) {
          const parts = item.item_code.split('.');
          if (parts.length === 2 && parts[0] === sectionNumber) {
            const itemNum = parseInt(parts[1]);
            if (!isNaN(itemNum) && itemNum > maxItemNumber) {
              maxItemNumber = itemNum;
            }
          }
        }
      });

      const itemCode = `${sectionNumber}.${maxItemNumber + 1}`;

      // Calculate order using decimals to avoid updating all items
      let order = sectionItems.length;
      if (afterItemId) {
        const afterIndex = sectionItems.findIndex(
          item => (item.boq_item_id || item.id) === afterItemId
        );
        if (afterIndex !== -1) {
          const afterItem = sectionItems[afterIndex];
          const nextItem = sectionItems[afterIndex + 1];
          
          // Use decimal order to insert between items without updating others
          const afterOrder = parseFloat(afterItem.order) || afterIndex;
          
          if (nextItem) {
            const nextOrder = parseFloat(nextItem.order) || (afterIndex + 1);
            // Insert between two items
            order = (afterOrder + nextOrder) / 2;
          } else {
            // Insert at end
            order = afterOrder + 1;
          }
          
          // If order gets too large (>1000), use integer order and reorder section later
          if (order > 1000) {
            order = afterIndex + 1;
            // Schedule reorder (non-blocking)
            setTimeout(async () => {
              try {
                await boqApi.reorderSection(projectId, sectionId);
              } catch {
                /* background reorder — will retry on next drag or manual reorder */
              }
            }, 2000);
          }
        }
      }

      const newItem = {
        section: sectionId,
        item_code: itemCode,
        description: '',
        unit: '',
        qty: 0, // Send 0 for DecimalField (model doesn't accept null)
        rate: 0, // Send 0 for DecimalField (model doesn't accept null)
        amount: 0,
        order: order,
      };

      const createdItem = await boqApi.createItem(projectId, newItem);

      // Get section info from existing items to populate missing fields
      // The serializer doesn't return section_id, section_name, bill_no, so we get them from existing items
      const existingItemsInSection = boqItems.filter(item => item.section_id === sectionId || item.section === sectionId);
      const firstItemInSection = existingItemsInSection[0];
      
      // If no existing items, try to get section info from boqSections
      let sectionInfo = null;
      if (!firstItemInSection) {
        const section = boqSections.find(s => s.id === sectionId);
        if (section) {
          sectionInfo = {
            section_name: section.section_name || '',
            bill_no: section.bill_no || '',
          };
        }
      }
      
      // Convert 0 values to empty strings for display (like other items)
      const displayItem = {
        ...createdItem,
        boq_item_id: createdItem.id, // Ensure boq_item_id is set for consistency
        section: sectionId, // Ensure section is set
        section_id: sectionId, // For boqSections grouping
        section_name: firstItemInSection?.section_name || sectionInfo?.section_name || '', // Get from existing items or section
        bill_no: firstItemInSection?.bill_no || sectionInfo?.bill_no || '', // Get from existing items or section
        qty: isZeroValue(createdItem.qty) ? '' : createdItem.qty,
        rate: isZeroValue(createdItem.rate) ? '' : createdItem.rate,
        // Add default values for percentages and amounts if missing
        previous_percent: createdItem.previous_percent || '0',
        current_percent: createdItem.current_percent || '0',
        total_percent: createdItem.total_percent || '0',
        previous_amount: createdItem.previous_amount || '0',
        current_amount: createdItem.current_amount || '0',
        total_amount: createdItem.total_amount || '0',
        is_ls: createdItem.is_ls || false,
        contract_qty: createdItem.contract_qty || createdItem.qty || '0',
      };

      // Update local state - add to the end of the list
      setBoqItems(prevItems => {
        // Check if item already exists (shouldn't, but just in case)
        const exists = prevItems.some(item => (item.boq_item_id || item.id) === displayItem.id);
        if (exists) {
          // Update existing item
          return prevItems.map(item => 
            (item.boq_item_id || item.id) === displayItem.id ? displayItem : item
          );
        }
        // Add new item
        return [...prevItems, displayItem];
      });

      return displayItem;
    } catch (err) {
      handleError(err, 'usePaymentClaimItems.addItem');
      return null;
    }
  }, [projectId, boqSections]);

  // Delete item
  const deleteItem = useCallback(async (itemId) => {
    if (!projectId) return false;

    // Normalize itemId to string for comparison
    const normalizedItemId = String(itemId);

    try {
      await boqApi.deleteItem(projectId, normalizedItemId);
      // Update local state - remove item
      setBoqItems(prevItems =>
        prevItems.filter(item => String(item.boq_item_id || item.id) !== normalizedItemId)
      );
      return true;
    } catch (err) {
      // If 404, item might already be deleted - remove from local state anyway
      if (err?.response?.status === 404) {
        setBoqItems(prevItems =>
          prevItems.filter(item => String(item.boq_item_id || item.id) !== normalizedItemId)
        );
        return true; // Consider it successful since item is gone
      }
      handleError(err, 'usePaymentClaimItems.deleteItem');
      return false;
    }
  }, [projectId]);

  // Bulk delete items
  const bulkDeleteItems = useCallback(async (itemIds) => {
    if (!projectId || itemIds.length === 0) return false;

    // Normalize all itemIds to strings for comparison
    const normalizedItemIds = itemIds.map(id => String(id));
    const itemIdSet = new Set(normalizedItemIds);

    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled(
        normalizedItemIds.map(id => boqApi.deleteItem(projectId, id))
      );
      
      // Count successful deletions (including 404s - item already deleted)
      const successful = results.filter(result => 
        result.status === 'fulfilled' || 
        (result.status === 'rejected' && result.reason?.response?.status === 404)
      ).length;
      
      // Update local state - remove all items that were attempted to delete
      setBoqItems(prevItems =>
        prevItems.filter(item => {
          const itemId = String(item.boq_item_id || item.id);
          return !itemIdSet.has(itemId);
        })
      );
      
      // Return true if at least some items were deleted or already gone
      return successful > 0;
    } catch (err) {
      // Even if there's an error, remove items from local state
      setBoqItems(prevItems =>
        prevItems.filter(item => {
          const itemId = String(item.boq_item_id || item.id);
          return !itemIdSet.has(itemId);
        })
      );
      handleError(err, 'usePaymentClaimItems.bulkDeleteItems');
      return false;
    }
  }, [projectId]);

  // Add new section
  const addSection = useCallback(async () => {
    if (!projectId) return null;

    try {
      const newSection = {
        project: projectId,
        bill_no: String(boqSections.length + 1),
        section_name: t('new_section'),
        description: '',
        order: boqSections.length,
      };

      const createdSection = await boqApi.createSection(projectId, newSection);
      return createdSection;
    } catch (err) {
      handleError(err, 'usePaymentClaimItems.addSection');
      return null;
    }
  }, [projectId, boqSections.length]);

  // Update section name
  const updateSectionName = useCallback(async (sectionId, newName) => {
    if (!projectId) return false;

    try {
      // Update local state
      setBoqItems(prevItems =>
        prevItems.map(item =>
          item.section_id === sectionId
            ? { ...item, section_name: newName }
            : item
        )
      );

      // Save to backend
      await boqApi.updateSection(projectId, sectionId, { section_name: newName });
      return true;
    } catch (err) {
      handleError(err, 'usePaymentClaimItems.updateSectionName');
      // Reload on error
      await loadProjectBOQItems();
      return false;
    }
  }, [projectId, loadProjectBOQItems]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimeoutRef.current);
      clearTimeout(statusTimerRef.current);
    };
  }, []);

  return {
    boqItems,
    setBoqItems,
    boqSections,
    loading,
    error,
    setError,
    totals,
    savingStatus,
    loadProjectBOQItems,
    loadClaimBOQItems,
    updateItemField,
    addItem,
    deleteItem,
    bulkDeleteItems,
    addSection,
    updateSectionName,
  };
}
