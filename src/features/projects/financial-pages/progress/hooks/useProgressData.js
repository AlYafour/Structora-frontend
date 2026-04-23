import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../../../../../services/projects';
import { logger } from '../../../../../utils/logger';

export function useProgressData(projectId, t) {
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState(null);

  const unwrap = useCallback((res) => res?.data ?? res ?? null, []);

  const asList = useCallback((res) => {
    const value = unwrap(res);

    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.results)) return value.results;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.data)) return value.data;

    return [];
  }, [unwrap]);

  const projectQuery = useQuery({
    queryKey: ['project-progress-summary', projectId],
    queryFn: async () => {
      const res = await projectApi.getById(projectId);
      return unwrap(res);
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const historyQuery = useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: async () => {
      const res = await projectApi.getProjectProgress(projectId);
      return unwrap(res);
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const variationsQuery = useQuery({
    queryKey: ['project-variations', projectId],
    queryFn: async () => {
      const res = await projectApi.getVariations(projectId);
      return unwrap(res);
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const loadHistory = useCallback(async () => {
    setLocalError(null);
    await queryClient.invalidateQueries({
      queryKey: ['project-progress', projectId],
    });
  }, [queryClient, projectId]);

  const loadProjectData = useCallback(async () => {
    setLocalError(null);
    await queryClient.invalidateQueries({
      queryKey: ['project-progress-summary', projectId],
    });
  }, [queryClient, projectId]);

  const loadVariations = useCallback(async () => {
    setLocalError(null);
    await queryClient.invalidateQueries({
      queryKey: ['project-variations', projectId],
    });
  }, [queryClient, projectId]);

  const getLatestProgress = useCallback(async () => {
    try {
      const res = await projectApi.getProjectProgress(projectId);
      const data = asList(res);
      return data.length > 0 ? data[0] : null;
    } catch (err) {
      logger.warn('Could not load latest progress', err);
      return null;
    }
  }, [projectId, asList]);

  const projectData = projectQuery.data ?? null;
  const history = asList(historyQuery.data);
  const variations = asList(variationsQuery.data);

  const hasAnyData =
    !!projectData ||
    (Array.isArray(history) && history.length > 0) ||
    (Array.isArray(variations) && variations.length > 0);

  const loading =
    (!projectData && projectQuery.isPending) ||
    (history.length === 0 && historyQuery.isPending);

  const queryError =
    projectQuery.error
      ? (t ? t('progress_project_not_found') : 'Error loading project')
      : historyQuery.error
        ? (t ? t('progress_load_error') : 'Error loading progress')
        : variationsQuery.error
          ? (t ? t('progress_load_error') : 'Error loading progress')
          : null;

  return {
    loading,
    isFetching:
      projectQuery.isFetching ||
      historyQuery.isFetching ||
      variationsQuery.isFetching,
    hasAnyData,
    projectData,
    history,
    variations,
    error: localError || queryError,
    setError: setLocalError,
    loadHistory,
    loadProjectData,
    loadVariations,
    getLatestProgress,
  };
}