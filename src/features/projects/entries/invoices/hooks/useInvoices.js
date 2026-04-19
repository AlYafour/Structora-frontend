import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../../../../../services';
import { QUERY_STALE_TIME } from '../../../../../utils/constants';

/**
 * React Query hook for invoices data
 * Provides caching, background refetch, and optimistic updates
 *
 * @returns {Object} Query result with data, loading, error states and mutations
 */
export const useInvoices = () => {
  const queryClient = useQueryClient();

  // Query for fetching all invoices (single API call instead of N+1)
  const query = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const allInvoices = await projectApi.getAllInvoices();

      // Map to expected format
      return allInvoices
        .filter(item => {
          // Must have invoice_number or invoice_date to be considered an invoice
          if (!item.invoice_number && !item.invoice_date) return false;
          // Exclude anything that looks like a payment
          if (item.payment_date && !item.invoice_date) return false;
          // Exclude invoices already linked to payments
          if (item.payment_id || item.payment) return false;
          return true;
        })
        .map(inv => ({
          ...inv,
          __type: 'actual',
          items: Array.isArray(inv.items) ? inv.items : []
        }));
    },
    staleTime: QUERY_STALE_TIME,
    retry: 1,
  });

  // Mutation for deleting an invoice
  const deleteInvoiceMutation = useMutation({
    mutationFn: ({ invoiceId, projectId }) => projectApi.deleteInvoice(projectId, invoiceId),
    onMutate: async ({ invoiceId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['invoices'] });

      // Snapshot previous value
      const previousInvoices = queryClient.getQueryData(['invoices']);

      // Optimistically update cache
      queryClient.setQueryData(['invoices'], (old) => {
        return old?.filter((inv) => inv.id !== invoiceId) || [];
      });

      return { previousInvoices };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['invoices'], context.previousInvoices);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  // Mutation for bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: async (invoices) => {
      const results = await Promise.allSettled(
        invoices.map(({ invoiceId, projectId }) =>
          projectApi.deleteInvoice(projectId, invoiceId)
        )
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return { succeeded, failed, total: invoices.length };
    },
    onMutate: async (invoices) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] });
      const previousInvoices = queryClient.getQueryData(['invoices']);

      // Optimistically remove all
      const invoiceIds = invoices.map(inv => inv.invoiceId);
      queryClient.setQueryData(['invoices'], (old) => {
        return old?.filter((inv) => !invoiceIds.includes(inv.id)) || [];
      });

      return { previousInvoices };
    },
    onError: (_error, _invoices, context) => {
      queryClient.setQueryData(['invoices'], context.previousInvoices);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  return {
    // Query states
    invoices: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    deleteInvoice: deleteInvoiceMutation.mutate,
    bulkDelete: bulkDeleteMutation.mutate,

    // Mutation states
    isDeleting: deleteInvoiceMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
};
