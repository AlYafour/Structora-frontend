// Unified hook for fetching project data
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../services/api";

export default function useProject(projectId) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Function to reload project data (e.g., after saving from view screen)
  const reload = useCallback(() => {
    setReloadToken((x) => x + 1);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    api
      .get(`projects/${projectId}/`)
      .then(({ data }) => {
        if (mounted) {
          setProject(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setProject(null);
          setError(err);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId, reloadToken]);

  return { project, loading, error, reload };
}

