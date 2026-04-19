/**
 * useProjectFilters Hook
 *
 * Manages filtering, sorting, and selection logic for projects
 */

import { useState, useMemo, useCallback } from "react";
import { useDebounce } from "../../../hooks";

export const useProjectFilters = (projects, t) => {
  // Filter state
  const [filters, setFilters] = useState({
    q: "",
    internal_code: "",
    city: "",
    project_type: "",
    consultant: "",
    contract_type: "",
    owner_name: "",
    phone: "",
    email: "",
  });

  // Sorting state
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Debounce search query
  const debouncedSearchQuery = useDebounce(filters.q, 300);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    const code = filters.internal_code.trim().toLowerCase();
    const city = filters.city.trim().toLowerCase();
    const type = filters.project_type;
    const consultant = filters.consultant.trim().toLowerCase();
    const ctype = filters.contract_type;
    const ownerName = filters.owner_name.trim().toLowerCase();
    const phone = filters.phone.trim().toLowerCase();
    const email = filters.email.trim().toLowerCase();

    let filtered = projects.filter((p) => {
      const awardingData = p?.__awarding_data;
      const ownersData = p?.__owners_data || [];
      const consultantAr = p?.__consultant_name_ar || "";
      const consultantEn = p?.__consultant_name_en || "";
      const consultantFull = p?.__consultant_name || "";

      const hay = [
        p?.display_name,
        p?.name,
        p?.internal_code,
        p?.project_type,
        p?.contract_type,
        p?.city,
        p?.__owner_label,
        consultantAr,
        consultantEn,
        consultantFull,
        awardingData?.project_number || "",
        awardingData?.consultant_registration_number || "",
        awardingData?.contractor_registration_number || "",
        awardingData?.award_date || "",
      ]
        .join(" ")
        .toLowerCase();

      if (q && !hay.includes(q)) return false;

      const internalCode = (p?.internal_code || "").toLowerCase();
      const codeToSearch = code.startsWith("m") ? code.substring(1) : code;
      if (code && !internalCode.includes(codeToSearch)) return false;

      if (city && !(p?.city || "").toLowerCase().includes(city)) return false;
      if (type && type !== (p?.project_type || "")) return false;

      if (consultant) {
        const consultantMatch =
          consultantAr.toLowerCase().includes(consultant) ||
          consultantEn.toLowerCase().includes(consultant) ||
          consultantFull.toLowerCase().includes(consultant);
        if (!consultantMatch) return false;
      }

      if (ctype && ctype !== (p?.contract_type || "")) return false;

      if (ownerName) {
        const ownerMatch = ownersData.some((o) => {
          const nameAr = (o?.owner_name_ar || "").toLowerCase();
          const nameEn = (o?.owner_name_en || "").toLowerCase();
          return nameAr.includes(ownerName) || nameEn.includes(ownerName);
        });
        if (!ownerMatch) return false;
      }

      if (phone) {
        const phoneMatch = ownersData.some((o) => {
          const ownerPhone = (o?.phone || "").toLowerCase();
          return ownerPhone.includes(phone);
        });
        if (!phoneMatch) return false;
      }

      if (email) {
        const emailMatch = ownersData.some((o) => {
          const ownerEmail = (o?.email || "").toLowerCase();
          return ownerEmail.includes(email);
        });
        if (!emailMatch) return false;
      }

      return true;
    });

    // Apply sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aVal, bVal;

        switch (sortBy) {
          case 'project_end_date':
            aVal = a?.__contract_data?.project_end_date || '';
            bVal = b?.__contract_data?.project_end_date || '';
            aVal = aVal ? new Date(aVal).getTime() : 0;
            bVal = bVal ? new Date(bVal).getTime() : 0;
            break;
          case 'project_name':
            aVal = (a?.display_name || a?.name || '').toLowerCase();
            bVal = (b?.display_name || b?.name || '').toLowerCase();
            break;
          case 'internal_code':
            aVal = (a?.internal_code || `PRJ-${a?.id || 0}`).toLowerCase();
            bVal = (b?.internal_code || `PRJ-${b?.id || 0}`).toLowerCase();
            break;
          case 'consultant':
            aVal = (a?.__consultant_name || '').toLowerCase();
            bVal = (b?.__consultant_name || '').toLowerCase();
            break;
          case 'status':
            aVal = (a?.status || '').toLowerCase();
            bVal = (b?.status || '').toLowerCase();
            break;
          case 'approval_status':
            aVal = (a?.approval_status || '').toLowerCase();
            bVal = (b?.approval_status || '').toLowerCase();
            break;
          case 'created_at':
            aVal = a?.created_at ? new Date(a.created_at).getTime() : 0;
            bVal = b?.created_at ? new Date(b.created_at).getTime() : 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [projects, filters, debouncedSearchQuery, sortBy, sortOrder]);

  // Unique values for filter dropdowns
  const uniqueValues = useCallback((getter) => {
    const s = new Set();
    projects.forEach((p) => {
      const v = getter(p);
      if (v) s.add(v);
    });
    return Array.from(s);
  }, [projects]);

  const projectTypes = useMemo(() => uniqueValues((p) => p?.project_type), [uniqueValues]);
  const consultants = useMemo(() => uniqueValues((p) => p?.__consultant_name), [uniqueValues]);
  const contractTypes = useMemo(() => uniqueValues((p) => p?.contract_type), [uniqueValues]);
  const cities = useMemo(() => uniqueValues((p) => p?.city).sort(), [uniqueValues]);

  // Sorting handlers
  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

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

  // Selection handlers
  const isAllSelected = filteredProjects.length > 0 && filteredProjects.every((p) => selectedIds.has(p.id));

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(() => {
      if (isAllSelected) return new Set();
      return new Set(filteredProjects.map((p) => p.id));
    });
  }, [isAllSelected, filteredProjects]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    filters,
    setFilters,
    filteredProjects,
    sortBy,
    sortOrder,
    handleSort,
    getSortIcon,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
    filterOptions: {
      projectTypes,
      consultants,
      contractTypes,
      cities,
    },
  };
};
