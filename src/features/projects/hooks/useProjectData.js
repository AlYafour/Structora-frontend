import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from "../../../services/api";
import { projectApi } from "../../../services/projects";

/**
 * Invalidates ALL query keys related to a project so that every tab
 * (progress, variations, invoices, payments) sees fresh data.
 *
 * Call this after any mutation that changes project-level data.
 * Accepts both string and number IDs because React Query key comparison is strict.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {string|number} projectId
 */
export function invalidateProjectQueries(queryClient, projectId) {
  const ids = [String(projectId), Number(projectId)];
  for (const id of ids) {
    queryClient.invalidateQueries({ queryKey: ['project', id] });
    queryClient.invalidateQueries({ queryKey: ['project-payments', id] });
    queryClient.invalidateQueries({ queryKey: ['project-progress', id] });
    queryClient.invalidateQueries({ queryKey: ['project-variations', id] });
    queryClient.invalidateQueries({ queryKey: ['project-invoices', id] });
    queryClient.invalidateQueries({ queryKey: ['project-schedule', id] });
    queryClient.invalidateQueries({ queryKey: ['project-excavation-notice', id] });
    queryClient.invalidateQueries({ queryKey: ['project-prolongation-fees', id] });
  }
}

const extractData = (response) => {
  const responseData = response?.data;
  if (Array.isArray(responseData)) {
    return responseData.length > 0 ? responseData[0] : null;
  }
  return responseData || null;
};

const extractArrayData = (response) => {
  const responseData = response?.data;
  if (Array.isArray(responseData)) {
    return responseData;
  }
  if (responseData && Array.isArray(responseData.results)) {
    return responseData.results;
  }
  return [];
};

const FINANCIAL_TABS = new Set([
  "financial",
  "project_contract_financial_summary",
  "project_financial_entitlements",
]);

/**
 * React Query hook for project data.
 *
 * When activeTab is provided, ProjectView loads only first-render data plus
 * the active tab's collection. When omitted, legacy callers still receive all
 * related collections.
 *
 * @param {string|number} projectId - Project ID
 * @param {string|null} activeTab - Active ProjectView tab.
 * @returns {Object} Project data with loading state and refetch function
 */
export default function useProjectData(projectId, activeTab = null) {
  const queryClient = useQueryClient();
  const lazyByTab = activeTab !== null && activeTab !== undefined;
  const isFinancialTab = FINANCIAL_TABS.has(activeTab);

  const shouldLoadPayments = !lazyByTab || activeTab === "payments" || isFinancialTab;
  const shouldLoadVariations = !lazyByTab || activeTab === "variations" || isFinancialTab;
  const shouldLoadInvoices = !lazyByTab || activeTab === "invoices";
  const shouldLoadSchedule = !lazyByTab || activeTab === "project_schedule";
  const shouldLoadExcavation = !lazyByTab || activeTab === "excavation_notice";
  const shouldLoadProlongationFees = !lazyByTab || isFinancialTab;

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async ({ signal }) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      const project = await projectApi.getViewContext(projectId, { signal });
      return { project };
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const paymentsQuery = useQuery({
    queryKey: ['project-payments', projectId],
    queryFn: ({ signal }) => api.get(`projects/${projectId}/payments/`, { signal }).then(extractArrayData),
    enabled: !!projectId && shouldLoadPayments,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const variationsQuery = useQuery({
    queryKey: ['project-variations', projectId],
    queryFn: ({ signal }) => api.get(`projects/${projectId}/variations/`, { signal }).then(extractArrayData),
    enabled: !!projectId && shouldLoadVariations,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const invoicesQuery = useQuery({
    queryKey: ['project-invoices', projectId],
    queryFn: ({ signal }) => api.get(`projects/${projectId}/actual-invoices/`, { signal }).then(extractArrayData),
    enabled: !!projectId && shouldLoadInvoices,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const scheduleQuery = useQuery({
    queryKey: ['project-schedule', projectId],
    queryFn: ({ signal }) => api.get(`projects/${projectId}/project-schedule/`, { signal }).then(extractData),
    enabled: !!projectId && shouldLoadSchedule,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const excavationQuery = useQuery({
    queryKey: ['project-excavation-notice', projectId],
    queryFn: ({ signal }) => api.get(`projects/${projectId}/excavation-notice/`, { signal }).then(extractData),
    enabled: !!projectId && shouldLoadExcavation,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const prolongationFeesQuery = useQuery({
    queryKey: ['project-prolongation-fees', projectId],
    queryFn: ({ signal }) => api.get(`projects/${projectId}/prolongation-fees/`, { signal }).then(extractArrayData),
    enabled: !!projectId && shouldLoadProlongationFees,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const reload = () => invalidateProjectQueries(queryClient, projectId);
  const project = projectQuery.data?.project || null;

  const tabLoading = (
    (activeTab === "payments" && paymentsQuery.isLoading) ||
    (activeTab === "variations" && variationsQuery.isLoading) ||
    (activeTab === "invoices" && invoicesQuery.isLoading) ||
    (activeTab === "project_schedule" && scheduleQuery.isLoading) ||
    (activeTab === "excavation_notice" && excavationQuery.isLoading) ||
    (isFinancialTab && (
      paymentsQuery.isLoading ||
      variationsQuery.isLoading ||
      prolongationFeesQuery.isLoading
    ))
  );
  const loading = lazyByTab
    ? projectQuery.isLoading
    : (
      projectQuery.isLoading ||
      paymentsQuery.isLoading ||
      variationsQuery.isLoading ||
      invoicesQuery.isLoading ||
      scheduleQuery.isLoading ||
      excavationQuery.isLoading ||
      prolongationFeesQuery.isLoading
    );

  return {
    project,
    siteplan: project?.siteplan_data || null,
    license: project?.license_data || null,
    contract: project?.contract_data || null,
    awarding: project?.awarding_data || null,
    startOrder: project?.start_order_data || null,
    projectSchedule: scheduleQuery.data || null,
    excavationNotice: excavationQuery.data || null,
    payments: paymentsQuery.data || [],
    variations: variationsQuery.data || [],
    invoices: invoicesQuery.data || [],
    prolongationFees: prolongationFeesQuery.data || [],
    loading,
    tabLoading,
    error: projectQuery.error,
    reload,
  };
}
