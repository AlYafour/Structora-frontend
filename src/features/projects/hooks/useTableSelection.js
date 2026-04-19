import { useState, useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { handleError } from '../../../utils/errorHandler';

/**
 * useTableSelection - Reusable hook for table row selection & bulk delete
 *
 * Supports two-phase deletion:
 * 1. Try normal delete
 * 2. If 409 Conflict with can_force=true → auto-retry with force=true
 * 3. If 409 with can_force=false → show error, skip item
 */
export default function useTableSelection({
  items,
  deleteApi,
  onReload,
  showToast,
  t,
  labels = {},
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  const handleSelect = useCallback((id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedIds(new Set(items.map((item) => item.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [items]
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const askBulkDelete = useCallback(() => {
    if (selectedIds.size > 0) setBulkDeleteOpen(true);
  }, [selectedIds.size]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let ok = 0;
    let fail = 0;
    const blocked = [];

    for (const id of ids) {
      try {
        await deleteApi(id);
        ok++;
      } catch (error) {
        // Handle 409 Conflict (financial validation)
        if (error?.response?.status === 409) {
          const data = error.response.data;
          if (data.can_force) {
            // Auto-retry with force
            try {
              await deleteApi(id, { force: true });
              ok++;
              continue;
            } catch (forceError) {
              const detail = forceError?.response?.data?.detail;
              if (detail) {
                blocked.push(Array.isArray(detail) ? detail[0] : detail);
              }
              fail++;
              continue;
            }
          }
          // can_force=false → hard block
          const detail = data.detail;
          blocked.push(Array.isArray(detail) ? detail[0] : detail);
          fail++;
          continue;
        }

        const handledError = handleError(error, `${labels.context || 'BulkDelete'}`);
        logger.error(`Bulk delete failed for ${labels.itemName || 'item'} ${id}`, handledError);
        fail++;
      }
    }

    setSelectedIds(new Set());
    setBulkDeleting(false);
    setBulkDeleteOpen(false);

    if (fail === 0) {
      showToast(
        'success',
        t('bulk_delete_success')?.replace('{{count}}', ok) ||
          `${ok} ${t(labels.countKey || 'items') || labels.itemName || 'items'} ${t('deleted_successfully') || 'deleted successfully'}`
      );
    } else if (ok === 0) {
      // Show blocked reasons
      if (blocked.length > 0) {
        showToast('error', blocked[0]);
      } else {
        showToast('error', t('bulk_delete_error') || `Failed to delete ${labels.itemName || 'items'}`);
      }
    } else {
      showToast(
        'error',
        t('bulk_delete_partial')?.replace('{{ok}}', ok).replace('{{fail}}', fail) ||
          `${ok} deleted, ${fail} failed`
      );
    }

    if (onReload) onReload();
  }, [selectedIds, deleteApi, onReload, showToast, t, labels]);

  const selectAllRef = useCallback(
    (input) => {
      if (input) input.indeterminate = isIndeterminate;
    },
    [isIndeterminate]
  );

  return {
    selectedIds,
    setSelectedIds,
    isAllSelected,
    isIndeterminate,
    handleSelect,
    handleSelectAll,
    clearSelection,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkDeleting,
    askBulkDelete,
    handleBulkDelete,
    selectAllRef,
  };
}
