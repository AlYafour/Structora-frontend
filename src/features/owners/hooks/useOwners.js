import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../../../services/projects';
import { QUERY_STALE_TIME } from '../../../utils/constants';

/**
 * Extract owners from projects siteplan data
 * Owners are derived from projects, not a direct API resource
 */
const extractOwnersFromProjects = (projects, language = 'ar') => {
  const ownersMap = new Map();

  projects.forEach((p) => {
    const projectId = p.id;
    if (!projectId) return;

    const siteplanData = p.siteplan_data || null;
    const first = siteplanData;

    // Get authorized owner or first owner
    if (first?.owners?.length) {
      const owner = first.owners.find((o) => o.is_authorized) || first.owners[0];
      const ownerNameAr = owner?.owner_name_ar || owner?.owner_name || "";
      const ownerNameEn = owner?.owner_name_en || "";
      const ownerName = ownerNameAr || ownerNameEn;

      if (ownerName) {
        const idNumber = owner?.id_number || "";
        const key = `${ownerName.toLowerCase().trim()}_${idNumber}`;

        if (!ownersMap.has(key)) {
          ownersMap.set(key, {
            name: ownerName,
            nameAr: ownerNameAr,
            nameEn: ownerNameEn,
            projects: [],
            fullData: {
              ...owner,
              id_number: owner?.id_number || "",
              nationality: owner?.nationality || "",
              phone: owner?.phone || "",
              email: owner?.email || "",
              id_expiry_date: owner?.id_expiry_date || "",
              id_attachment: owner?.id_attachment || "",
              right_hold_type: owner?.right_hold_type || "",
              share_possession: owner?.share_possession || "",
              share_percent: owner?.share_percent || "",
              age: owner?.age || null,
            },
          });
        }

        const ownerData = ownersMap.get(key);
        if (!ownerData.projects.find((pr) => pr.id === projectId)) {
          ownerData.projects.push({
            id: projectId,
            name: p?.display_name || p?.name || `Project #${projectId}`,
            internalCode: p?.internal_code,
          });
        }
      }
    }
  });

  const ownersArray = Array.from(ownersMap.values());
  const sortLocale = language === "ar" ? "ar" : "en";

  ownersArray.sort((a, b) => {
    const nameA = a.nameAr || a.name || "";
    const nameB = b.nameAr || b.name || "";
    return nameA.localeCompare(nameB, sortLocale);
  });

  // Add unique key
  return ownersArray.map((o) => ({
    ...o,
    __key: `${(o.nameAr || o.name || "").toLowerCase().trim()}_${o.fullData?.id_number || ""}`,
  }));
};

/**
 * React Query hook for owners data
 * Owners are derived from projects' siteplan data
 *
 * @param {string} language - Current language for sorting
 * @returns {Object} Query result with data, loading, error states
 */
export const useOwners = (language = 'ar') => {
  const queryClient = useQueryClient();

  // Query for fetching projects and extracting owners
  const query = useQuery({
    queryKey: ['owners', language],
    queryFn: async ({ signal }) => {
      // Fetch projects with siteplan included
      const projectsData = await projectApi.getAll({ include: 'siteplan' }, signal);
      const items = Array.isArray(projectsData)
        ? projectsData
        : (projectsData?.results || projectsData?.items || projectsData?.data || []);

      // Extract and transform owners from projects
      return extractOwnersFromProjects(items, language);
    },
    staleTime: QUERY_STALE_TIME,
    retry: 1,
  });

  // Refetch when siteplan or contract is updated
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['owners'] });
  };

  return {
    // Query states
    owners: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch,
  };
};
