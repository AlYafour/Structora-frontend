/**
 * useProgressData Hook
 *
 * Manages data loading for progress history, project data, and variations.
 * Uses React Query so that invalidation from any tab (variations, payments, etc.)
 * automatically refreshes progress data — no manual reload needed.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../../../../../services/projects';
import { logger } from '../../../../../utils/logger';

export function useProgressData(projectId, t) {
  const queryClient = useQueryClient();

  // ── Project summary (overall percents + progress_amounts) ──────────────
  const projectQuery = useQuery({
    queryKey: ['project', projectId],          // same key as useProjectData → shared cache
    queryFn: () => projectApi.getById(projectId),
    enabled: !!projectId,
    staleTime: 0,                              // always fresh after any invalidation
    retry: 1,
  });

  // ── Progress history entries ───────────────────────────────────────────
  const historyQuery = useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: async () => {
      const data = await projectApi.getProjectProgress(projectId);
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 0,
    retry: 1,
  });

  // ── Variations (needed for weighted-average calculation in history table) ─
  const variationsQuery = useQuery({
    queryKey: ['project-variations', projectId],
    queryFn: async () => {
      const data = await projectApi.getVariations(projectId);
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,   // variations change less often
    retry: 1,
  });

  // ── Manual reload helpers (kept for backward-compat with ProgressTab) ──
  const loadHistory = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] });
  }, [queryClient, projectId]);

  const loadProjectData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  }, [queryClient, projectId]);

  const loadVariations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['project-variations', projectId] });
  }, [queryClient, projectId]);

  // Legacy helper — not used by ProgressTab but exported for safety
  const getLatestProgress = useCallback(async () => {
    try {
      const data = await projectApi.getProjectProgress(projectId);
      return data?.length > 0 ? data[0] : null;
    } catch (err) {
      logger.warn('Could not load latest progress', err);
      return null;
    }
  }, [projectId]);

  const loading = projectQuery.isLoading || historyQuery.isLoading;
  const error = projectQuery.error
    ? (t ? t('progress_project_not_found') : 'Error loading project')
    : historyQuery.error
    ? (t ? t('progress_load_error') : 'Error loading progress')
    : null;

  return {
    loading,
    projectData: projectQuery.data || null,
    history: historyQuery.data || [],
    variations: variationsQuery.data || [],
    error,
    setError: () => {},           // no-op — errors come from React Query now
    loadHistory,
    loadProjectData,
    loadVariations,
    getLatestProgress,
  };
}
