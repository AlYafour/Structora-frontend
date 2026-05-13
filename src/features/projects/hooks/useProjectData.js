import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from "../../../services/api";

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
    queryClient.invalidateQueries({ queryKey: ['project-progress', id] });
    queryClient.invalidateQueries({ queryKey: ['project-variations', id] });
  }
}

/**
 * Extract data from Promise.allSettled result
 */
const extractData = (result) => {
  if (result.status === "fulfilled") {
    const response = result.value;
    if (response && response.status >= 200 && response.status < 300) {
      const responseData = response.data;
      if (Array.isArray(responseData)) {
        return responseData.length > 0 ? responseData[0] : null;
      }
      return responseData || null;
    }
  }
  return null;
};

/**
 * Extract array data from Promise.allSettled result
 */
const extractArrayData = (result) => {
  if (result.status === "fulfilled") {
    const response = result.value;
    if (response && response.status >= 200 && response.status < 300) {
      const responseData = response.data;
      if (Array.isArray(responseData)) {
        return responseData;
      } else if (responseData && Array.isArray(responseData.results)) {
        return responseData.results;
      }
    }
  }
  return [];
};

/**
 * React Query hook for project data
 * Fetches complete project details including all related data
 *
 * @param {string|number} projectId - Project ID
 * @returns {Object} Project data with loading state and refetch function
 */
export default function useProjectData(projectId) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['project', projectId],
    queryFn: async ({ signal }) => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Fetch all project-related data in parallel
      // Using include parameter to reduce API calls from 6 to 2 (project + payments)
      const [pRes, paymentsRes, variationsRes, invoicesRes, scheduleRes, excavationRes, prolongationFeesRes] = await Promise.allSettled([
        api.get(`projects/${projectId}/?include=siteplan,license,contract,awarding,start_order`, { signal }),
        api.get(`projects/${projectId}/payments/`, { signal }),
        api.get(`projects/${projectId}/variations/`, { signal }),
        api.get(`projects/${projectId}/actual-invoices/`, { signal }),
        api.get(`projects/${projectId}/project-schedule/`, { signal }),
        api.get(`projects/${projectId}/excavation-notice/`, { signal }),
        api.get(`projects/${projectId}/prolongation-fees/`, { signal }),
      ]);

      const project = extractData(pRes);

      // Extract related data from project object
      const siteplan = project?.siteplan_data || null;
      const license = project?.license_data || null;
      const contract = project?.contract_data || null;
      const awarding = project?.awarding_data || null;
      const startOrder = project?.start_order_data || null;

      // Extract ProjectSchedule and ExcavationStartNotice
      const projectSchedule = extractData(scheduleRes);
      const excavationNotice = extractData(excavationRes);

      // Extract arrays safely
      const payments = extractArrayData(paymentsRes);
      const variations = extractArrayData(variationsRes);
      const invoices = extractArrayData(invoicesRes);
      const prolongationFees = extractArrayData(prolongationFeesRes);

      return {
        project,
        siteplan,
        license,
        contract,
        awarding,
        startOrder,
        projectSchedule,
        excavationNotice,
        payments,
        variations,
        invoices,
        prolongationFees,
      };
    },
    enabled: !!projectId,
    staleTime: 0,              // always consider data stale — refetch on every mount/focus
    refetchOnMount: true,
    retry: 1,
  });

  // Refetch function to manually trigger data reload.
  // Invalidates ALL project-related query keys so every tab sees fresh data.
  const reload = () => invalidateProjectQueries(queryClient, projectId);

  return {
    project: query.data?.project || null,
    siteplan: query.data?.siteplan || null,
    license: query.data?.license || null,
    contract: query.data?.contract || null,
    awarding: query.data?.awarding || null,
    startOrder: query.data?.startOrder || null,
    projectSchedule: query.data?.projectSchedule || null,
    excavationNotice: query.data?.excavationNotice || null,
    payments: query.data?.payments || [],
    variations: query.data?.variations || [],
    invoices: query.data?.invoices || [],
    prolongationFees: query.data?.prolongationFees || [],
    loading: query.isLoading,
    error: query.error,
    reload,
  };
}
