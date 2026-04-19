import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { logger } from "../../../utils/logger";

/**
 * Custom hook for SelectProject logic
 * @param {Object} config - Configuration object
 * @param {Object} config.apiFilters - Filters for API query (default: { approval_status: 'final_approved' })
 * @param {string} config.apiIncludes - Includes for API query (default: 'contract,siteplan')
 * @param {Function} config.customFilter - Optional custom filter function for client-side filtering
 * @returns {Object} - { projects, loading, selectedProjectId, setSelectedProjectId, errorMsg, setErrorMsg, handleLoad }
 */
export const useSelectProject = (config = {}) => {
  const { t } = useTranslation();
  const {
    apiFilters = { approval_status: "final_approved" },
    apiIncludes = "contract,siteplan",
    customFilter = null,
  } = config;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      Object.entries(apiFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, value);
        }
      });
      if (apiIncludes) {
        params.append("include", apiIncludes);
      }

      const { data } = await api.get(`projects/?${params.toString()}`);
      let items = Array.isArray(data) ? data : data?.results || data?.items || [];

      // Apply custom client-side filter if provided
      if (customFilter && typeof customFilter === "function") {
        items = items.filter(customFilter);
      }

      setProjects(items);
    } catch (e) {
      logger.error("Error loading projects", e);
      setErrorMsg(t("load_error"));
    } finally {
      setLoading(false);
    }
  };

  return {
    projects,
    loading,
    selectedProjectId,
    setSelectedProjectId,
    errorMsg,
    setErrorMsg,
    handleLoad: loadProjects,
  };
};
