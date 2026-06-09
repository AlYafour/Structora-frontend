import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from './useDebounce';

const normalize = (value) => String(value ?? '').trim().toLowerCase();

export function useTableActivity({
  items = [],
  getId = (item) => item?.id,
  getSearchText = () => '',
  sortAccessors = {},
  defaultSortBy = null,
  defaultSortOrder = 'asc',
  searchDelay = 300,
} = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const debouncedSearchQuery = useDebounce(searchQuery, searchDelay);

  const visibleItems = useMemo(() => {
    const query = normalize(debouncedSearchQuery);
    let nextItems = items;

    if (query) {
      nextItems = nextItems.filter((item) => normalize(getSearchText(item)).includes(query));
    }

    if (sortBy && sortAccessors[sortBy]) {
      const accessor = sortAccessors[sortBy];
      nextItems = [...nextItems].sort((a, b) => {
        const aRaw = accessor(a);
        const bRaw = accessor(b);
        const aValue = typeof aRaw === 'number' ? aRaw : normalize(aRaw);
        const bValue = typeof bRaw === 'number' ? bRaw : normalize(bRaw);

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return nextItems;
  }, [items, debouncedSearchQuery, getSearchText, sortAccessors, sortBy, sortOrder]);

  const visibleIds = useMemo(
    () => visibleItems.map((item) => getId(item)).filter((id) => id !== undefined && id !== null),
    [getId, visibleItems]
  );

  useEffect(() => {
    const validIds = new Set(items.map((item) => getId(item)));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [getId, items]);

  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const selectedVisibleIds = useMemo(
    () => visibleIds.filter((id) => selectedIds.has(id)),
    [selectedIds, visibleIds]
  );

  const handleSort = useCallback((column) => {
    setSortBy((currentSortBy) => {
      if (currentSortBy === column) {
        setSortOrder((currentSortOrder) => (currentSortOrder === 'asc' ? 'desc' : 'asc'));
        return currentSortBy;
      }

      setSortOrder('asc');
      return column;
    });
  }, []);

  const toggleSelect = useCallback((id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelect = typeof checked === 'boolean' ? checked : !next.has(id);

      if (shouldSelect) next.add(id);
      else next.delete(id);

      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback((checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelect = typeof checked === 'boolean' ? checked : !isAllVisibleSelected;

      visibleIds.forEach((id) => {
        if (shouldSelect) next.add(id);
        else next.delete(id);
      });

      return next;
    });
  }, [isAllVisibleSelected, visibleIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const getSortIcon = useCallback((column) => {
    if (sortBy !== column) {
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 4.5L6 1.5L9 4.5M3 7.5L6 10.5L9 7.5" />
        </svg>
      );
    }

    return sortOrder === 'asc' ? (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 4.5L6 1.5L9 4.5" />
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7.5L6 10.5L9 7.5" />
      </svg>
    );
  }, [sortBy, sortOrder]);

  return {
    searchQuery,
    setSearchQuery,
    clearSearch,
    visibleItems,
    visibleIds,
    sortBy,
    sortOrder,
    handleSort,
    getSortIcon,
    selectedIds,
    selectedVisibleIds,
    toggleSelect,
    toggleSelectAllVisible,
    clearSelection,
    isAllVisibleSelected,
  };
}

export default useTableActivity;
