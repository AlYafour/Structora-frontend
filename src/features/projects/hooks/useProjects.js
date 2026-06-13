import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../../../services/projects';
import { sortProjectsByFinancialRisk } from '../utils/projectHelpers';
import { QUERY_STALE_TIME } from '../../../utils/constants';

/**
 * React Query hook for projects data
 * Provides caching, background refetch, and optimistic updates
 *
 * @param {string} approvalStatusFilter - Filter for approval status
 * @returns {Object} Query result with data, loading, error states and mutations
 */
export const useProjects = (approvalStatusFilter = 'all') => {
  const queryClient = useQueryClient();

  // Query for fetching projects
  const query = useQuery({
    queryKey: ['projects', approvalStatusFilter],
    queryFn: async ({ signal }) => {
      // Build API params (no include needed — list endpoint returns lightweight data)
      const params = {};

      if (approvalStatusFilter === "final_approved") {
        params.approval_status = 'final_approved';
        params.detailed = 'true'; // enable heavy financial calculations — only this tab shows them
      } else if (approvalStatusFilter === "approved") {
        params.approval_status = 'approved';
      } else if (approvalStatusFilter === "pending_approvals") {
        params.exclude_final_approved = 'true';
      }

      // Fetch data with abort signal
      const data = await projectApi.getAll(params, signal);
      let items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);

      // Apply sorting
      items = sortProjectsByFinancialRisk(items);

      return items;
    },
    staleTime: QUERY_STALE_TIME,
    retry: 1,
  });

  // Mutation for deleting a project
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId) => projectApi.delete(projectId),
    onMutate: async (projectId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects', approvalStatusFilter] });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData(['projects', approvalStatusFilter]);

      // Optimistically update cache
      queryClient.setQueryData(['projects', approvalStatusFilter], (old) => {
        return old?.filter((p) => p.id !== projectId) || [];
      });

      return { previousProjects };
    },
    onError: (_error, _projectId, context) => {
      // Rollback on error
      queryClient.setQueryData(['projects', approvalStatusFilter], context.previousProjects);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['projects', approvalStatusFilter] });
    },
  });

  // Mutation for bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (projectIds) => {
      const results = await Promise.allSettled(
        projectIds.map((id) => projectApi.delete(id))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return { succeeded, failed, total: projectIds.length };
    },
    onMutate: async (projectIds) => {
      await queryClient.cancelQueries({ queryKey: ['projects', approvalStatusFilter] });
      const previousProjects = queryClient.getQueryData(['projects', approvalStatusFilter]);

      // Optimistically remove all
      queryClient.setQueryData(['projects', approvalStatusFilter], (old) => {
        return old?.filter((p) => !projectIds.includes(p.id)) || [];
      });

      return { previousProjects };
    },
    onError: (_error, _projectIds, context) => {
      queryClient.setQueryData(['projects', approvalStatusFilter], context.previousProjects);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', approvalStatusFilter] });
    },
  });

  // Mutation for approving a project
  const approveMutation = useMutation({
    mutationFn: ({ projectId, notes }) => projectApi.approve(projectId, notes || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Mutation for rejecting a project
  const rejectMutation = useMutation({
    mutationFn: ({ projectId, notes }) => projectApi.reject(projectId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Mutation for final approval
  const finalApproveMutation = useMutation({
    mutationFn: ({ projectId, notes }) => projectApi.finalApprove(projectId, notes || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    // Query states
    projects: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    deleteProject: deleteProjectMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    finalApprove: finalApproveMutation.mutate,

    // Mutation states
    isDeleting: deleteProjectMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isFinalApproving: finalApproveMutation.isPending,
  };
};
