/**
 * Custom Hook for Drag and Drop functionality
 * Handles section and item reordering
 */
import { useState, useCallback } from 'react';
import { boqApi } from '../../../../../services/boq';
import { handleError } from '../../../../../utils/errorHandler';

export function usePaymentClaimDragDrop(projectId, boqSections, setBoqItems, reloadItems) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedSection, setDraggedSection] = useState(null);

  // Item drag handlers
  const handleItemDragStart = useCallback((e, sectionId, itemId) => {
    setDraggedItem({ sectionId, itemId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `move-item-${itemId}`);

    // Visual feedback
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.4';
    }
  }, []);

  const handleItemDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleItemDragEnd = useCallback((e) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedItem(null);
  }, []);

  const handleItemDrop = useCallback(async (e, targetSectionId, targetItemId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || !projectId) {
      setDraggedItem(null);
      return;
    }

    // Don't do anything if dropping on same position
    if (draggedItem.sectionId === targetSectionId && draggedItem.itemId === targetItemId) {
      setDraggedItem(null);
      return;
    }

    try {
      // Create deep copies
      const sections = boqSections.map(s => ({
        ...s,
        items: [...s.items]
      }));

      const sourceSection = sections.find(s => s.id === draggedItem.sectionId);
      const targetSection = sections.find(s => s.id === targetSectionId);

      if (!sourceSection || !targetSection) {
        setDraggedItem(null);
        return;
      }

      // Find the dragged item
      const draggedItemIndex = sourceSection.items.findIndex(item =>
        (item.boq_item_id || item.id) === draggedItem.itemId
      );

      if (draggedItemIndex === -1) {
        setDraggedItem(null);
        return;
      }

      const movedItem = sourceSection.items[draggedItemIndex];

      // Find target position BEFORE modifying arrays
      let targetItemIndex = targetSection.items.findIndex(item =>
        (item.boq_item_id || item.id) === targetItemId
      );

      // Get target item and neighbors BEFORE modifying arrays
      const targetItem = targetItemIndex !== -1 ? targetSection.items[targetItemIndex] : null;
      const prevItem = targetItemIndex > 0 ? targetSection.items[targetItemIndex - 1] : null;
      const nextItem = targetItemIndex !== -1 && targetItemIndex < targetSection.items.length - 1 
        ? targetSection.items[targetItemIndex + 1] 
        : null;

      // Calculate new order using decimals BEFORE modifying arrays
      let newOrder;
      if (targetItem) {
        if (prevItem && nextItem) {
          // Insert between two items
          const prevOrder = parseFloat(prevItem.order) || (targetItemIndex - 1);
          const nextOrder = parseFloat(nextItem.order) || (targetItemIndex + 1);
          newOrder = (prevOrder + nextOrder) / 2;
        } else if (prevItem) {
          // Insert after last item
          const prevOrder = parseFloat(prevItem.order) || (targetItemIndex - 1);
          newOrder = prevOrder + 1;
        } else if (nextItem) {
          // Insert before first item
          const nextOrder = parseFloat(nextItem.order) || targetItemIndex;
          newOrder = Math.max(0, nextOrder - 1);
        } else {
          // Only one item in section
          newOrder = targetItemIndex + 0.5;
        }
      } else {
        // No target item - append to end
        const lastItem = targetSection.items[targetSection.items.length - 1];
        newOrder = lastItem ? (parseFloat(lastItem.order) || targetSection.items.length - 1) + 1 : 0;
      }

      // Handle same-section move
      if (draggedItem.sectionId === targetSectionId) {
        sourceSection.items.splice(draggedItemIndex, 1);

        // Adjust target index if needed
        if (targetItemIndex > draggedItemIndex) {
          targetItemIndex = targetItemIndex - 1;
        }

        if (targetItemIndex >= 0 && targetItemIndex < sourceSection.items.length) {
          sourceSection.items.splice(targetItemIndex, 0, movedItem);
        } else if (targetItemIndex < 0) {
          sourceSection.items.unshift(movedItem);
          targetItemIndex = 0;
        } else {
          sourceSection.items.push(movedItem);
          targetItemIndex = sourceSection.items.length - 1;
        }
      } else {
        // Moving between different sections
        sourceSection.items.splice(draggedItemIndex, 1);

        if (targetItemIndex !== -1 && targetItemIndex >= 0) {
          targetSection.items.splice(targetItemIndex, 0, movedItem);
        } else {
          targetSection.items.push(movedItem);
          targetItemIndex = targetSection.items.length - 1;
        }
      }

      // If order gets too large, reorder the entire section
      const needsReorder = newOrder > 1000 || newOrder < 0;
      
      // Update only the moved item (much faster!)
      const updatePayload = { order: needsReorder ? targetItemIndex : newOrder };
      if (draggedItem.sectionId !== targetSectionId) {
        updatePayload.section = targetSectionId;
      }

      try {
        await boqApi.updateItem(
          projectId,
          movedItem.boq_item_id || movedItem.id,
          updatePayload
        );

        // If order was too large, reorder section in background
        if (needsReorder) {
          setTimeout(async () => {
            try {
              await boqApi.reorderSection(projectId, targetSectionId);
              if (draggedItem.sectionId !== targetSectionId) {
                await boqApi.reorderSection(projectId, draggedItem.sectionId);
              }
            } catch {
              /* background reorder — will retry on next operation */
            }
          }, 1000);
        }
      } catch (err) {

        throw err;
      }

      // Update local state
      setBoqItems(prevItems => {
        const updatedItemsMap = new Map();
        for (const sec of sections) {
          for (const item of sec.items) {
            const itemId = item.boq_item_id || item.id;
            updatedItemsMap.set(itemId, item);
          }
        }

        return prevItems.map(item => {
          const itemId = item.boq_item_id || item.id;
          const itemSectionId = item.section?.id || item.section || item.section_id;

          if (itemSectionId === sourceSection.id || itemSectionId === targetSection.id) {
            return updatedItemsMap.get(itemId) || item;
          }
          return item;
        });
      });

    } catch (error) {
      handleError(error, 'usePaymentClaimDragDrop.handleItemDrop');
      if (reloadItems) {
        await reloadItems();
      }
    } finally {
      setDraggedItem(null);
    }
  }, [draggedItem, projectId, boqSections, setBoqItems, reloadItems]);

  // Section drag handlers
  const handleSectionDragStart = useCallback((e, sectionId) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleSectionDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSectionDrop = useCallback(async (e, targetSectionId) => {
    e.preventDefault();

    if (!draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null);
      return;
    }

    // Reload to get correct order from backend
    if (reloadItems) {
      await reloadItems();
    }

    setDraggedSection(null);
  }, [draggedSection, reloadItems]);

  return {
    draggedItem,
    draggedSection,
    handleItemDragStart,
    handleItemDragOver,
    handleItemDragEnd,
    handleItemDrop,
    handleSectionDragStart,
    handleSectionDragOver,
    handleSectionDrop,
  };
}
