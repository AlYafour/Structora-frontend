import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultantApi } from '../../../services/consultants';
import { QUERY_STALE_TIME } from '../../../utils/constants';

/**
 * Transform consultant data for UI display
 */
const transformConsultantData = (consultant, language = 'ar') => {
  // Group projects by project_id to avoid duplication between design/supervision
  const projectMap = new Map();
  if (consultant.projects && Array.isArray(consultant.projects)) {
    consultant.projects.forEach((pc) => {
      const pid = pc.project_id;
      if (!pid) return;
      if (!projectMap.has(pid)) {
        projectMap.set(pid, {
          id: pid,
          name: pc.project_name,
          roles: new Set(),
        });
      }
      projectMap.get(pid).roles.add(pc.role);
    });
  }

  const allProjects = Array.from(projectMap.values()).map((p) => ({
    id: p.id,
    name: p.name,
    roles: Array.from(p.roles),
  }));

  return {
    id: consultant.id,
    name: consultant.name,
    name_en: consultant.name_en || "",
    licenseNo: consultant.license_no || "",
    image: consultant.image_url || null,
    phone: consultant.phone || "",
    email: consultant.email || "",
    address: consultant.address || "",
    notes: consultant.notes || "",
    projects: allProjects,
    projects_count: allProjects.length,
    __key: `consultant_${consultant.id}`,
  };
};

/**
 * React Query hook for consultants data
 * Provides caching, background refetch, and optimistic updates
 *
 * @param {string} language - Current language for sorting
 * @returns {Object} Query result with data, loading, error states and mutations
 */
export const useConsultants = (language = 'ar') => {
  const queryClient = useQueryClient();

  // Query for fetching consultants
  const query = useQuery({
    queryKey: ['consultants', language],
    queryFn: async ({ signal }) => {
      const data = await consultantApi.getAll({}, signal);
      const consultantsList = Array.isArray(data)
        ? data
        : (data?.results || data?.items || data?.data || []);

      // Transform and sort
      const consultantsWithKey = consultantsList
        .map(consultant => transformConsultantData(consultant, language))
        .sort((a, b) => a.name.localeCompare(b.name, language === 'ar' ? 'ar' : 'en'));

      return consultantsWithKey;
    },
    staleTime: QUERY_STALE_TIME,
    retry: 1,
  });

  // Mutation for deleting a consultant
  const deleteConsultantMutation = useMutation({
    mutationFn: (consultantId) => consultantApi.delete(consultantId),
    onMutate: async (consultantId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['consultants', language] });

      // Snapshot previous value
      const previousConsultants = queryClient.getQueryData(['consultants', language]);

      // Optimistically update cache
      queryClient.setQueryData(['consultants', language], (old) => {
        return old?.filter((c) => c.id !== consultantId) || [];
      });

      return { previousConsultants };
    },
    onError: (_error, _consultantId, context) => {
      // Rollback on error
      queryClient.setQueryData(['consultants', language], context.previousConsultants);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });

  // Mutation for bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (consultantIds) => {
      const results = await Promise.allSettled(
        consultantIds.map((id) => consultantApi.delete(id))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return { succeeded, failed, total: consultantIds.length };
    },
    onMutate: async (consultantIds) => {
      await queryClient.cancelQueries({ queryKey: ['consultants', language] });
      const previousConsultants = queryClient.getQueryData(['consultants', language]);

      // Optimistically remove all
      queryClient.setQueryData(['consultants', language], (old) => {
        return old?.filter((c) => !consultantIds.includes(c.id)) || [];
      });

      return { previousConsultants };
    },
    onError: (_error, _consultantIds, context) => {
      queryClient.setQueryData(['consultants', language], context.previousConsultants);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });

  return {
    // Query states
    consultants: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    deleteConsultant: deleteConsultantMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,

    // Mutation states
    isDeleting: deleteConsultantMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
};
