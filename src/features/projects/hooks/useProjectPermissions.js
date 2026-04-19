import { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { logger } from "../../../utils/logger";

/**
 * Hook for checking user permissions on a specific project
 * @param {string|number} projectId - Project ID
 * @returns {Object} - Available permissions
 */
export default function useProjectPermissions(projectId) {
  const [permissions, setPermissions] = useState({
    can_view: true,
    can_edit: false,
    can_create: false,
    can_submit: false,
    can_approve: false,
    can_reject: false,
    can_final_approve: false,
    can_delete: false,
    current_status: null,
    is_final_approved: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setPermissions({
        can_view: true,
        can_edit: false,
        can_create: false,
        can_submit: false,
        can_approve: false,
        can_reject: false,
        can_final_approve: false,
        can_delete: false,
        current_status: null,
        is_final_approved: false,
      });
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    logger.debug(`Fetching permissions for project ${projectId}`);
    api
      .get(`projects/${projectId}/permissions/`)
      .then(({ data }) => {
        if (mounted) {
          logger.debug(`Permissions fetched successfully for project ${projectId}`, data);
          setPermissions(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          logger.error("Error fetching project permissions", err);
          setError(err);
          // On error, use default permissions (view only)
          setPermissions({
            can_view: true,
            can_edit: false,
            can_create: false,
            can_submit: false,
            can_approve: false,
            can_reject: false,
            can_final_approve: false,
            can_delete: false,
            current_status: null,
            is_final_approved: false,
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  return { permissions, loading, error };
}

