import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from 'react-router-dom';
import { projectApi } from "../../../../../services";
import { logger } from "../../../../../utils/logger";

/**
 * Custom hook to manage variation data loading and state
 */
export function useVariationData(variationId) {
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [variation, setVariation] = useState(null);
  const [project, setProject] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [alterationRequests, setAlterationRequests] = useState([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  const loadAuditLogs = useCallback(async (projectId, varId) => {
    if (!projectId || !varId) return;
    setLoadingAuditLogs(true);
    try {
      const data = await projectApi.getVariationAuditLog(projectId, varId);
      setAuditLogs(data?.logs || []);
    } catch (e) {
      logger.error("Error loading audit logs", e);
    } finally {
      setLoadingAuditLogs(false);
    }
  }, []);

  const loadVariation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let projectId = projectIdFromUrl;

      // Fast path: if projectId is known from URL, fetch directly (no loop)
      if (projectId) {
        try {
          const fullVariation = await projectApi.getVariationById(projectId, variationId);
          setVariation(fullVariation);
        } catch (e) {
          logger.error("Error loading variation by project ID", e);
          setError("variation_not_found");
          return;
        }
      } else {
        // Fallback: scan projects to find which one owns this variation
        const projectsData = await projectApi.getAll();
        const projectsList = Array.isArray(projectsData)
          ? projectsData
          : projectsData?.results || [];

        let foundVariation = null;

        for (const proj of projectsList) {
          try {
            const variations = await projectApi.getVariations(proj.id);
            const items = Array.isArray(variations) ? variations : variations?.results || [];
            const found = items.find((v) => v.id === parseInt(variationId));
            if (found) {
              foundVariation = found;
              projectId = proj.id;
              break;
            }
          } catch (_e) {
            continue;
          }
        }

        if (!foundVariation || !projectId) {
          setError("variation_not_found");
          return;
        }

        try {
          const fullVariation = await projectApi.getVariationById(projectId, variationId);
          setVariation(fullVariation);
        } catch (_e) {
          setVariation(foundVariation);
        }
      }

      try {
        const projectData = await projectApi.getVariationContext(projectId);
        setProject(projectData);
      } catch (e) {
        logger.error("Error loading project", e);
      }

      try {
        const requests = await projectApi.listAlterationRequests(projectId, variationId);
        setAlterationRequests(Array.isArray(requests) ? requests : []);
      } catch (e) {
        logger.warn("Could not load variation alteration requests", e);
        setAlterationRequests([]);
      }

      loadAuditLogs(projectId, variationId);
    } catch (e) {
      logger.error("Error loading variation", e);
      setError("load_error");
    } finally {
      setLoading(false);
    }
  }, [variationId, projectIdFromUrl, loadAuditLogs]);

  useEffect(() => {
    loadVariation();
  }, [loadVariation]);

  const getNoticeData = useCallback(() => {
    if (!variation?.description) return {};
    try {
      return JSON.parse(variation.description);
    } catch (_e) {
      return {};
    }
  }, [variation]);

  return {
    loading,
    error,
    variation,
    project,
    auditLogs,
    alterationRequests,
    loadingAuditLogs,
    loadVariation,
    getNoticeData,
  };
}
