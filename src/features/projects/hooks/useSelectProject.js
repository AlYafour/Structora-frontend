import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { logger } from "../../../utils/logger";

export const useSelectProject = (config = {}) => {
  const { t } = useTranslation();

  const {
    apiFilters = {},
    apiIncludes = "contract,siteplan",
    customFilter = null,
  } = config;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const filtersKey = useMemo(() => JSON.stringify(apiFilters || {}), [apiFilters]);

  const loadProjects = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setErrorMsg("");
      }

      const parsedFilters = JSON.parse(filtersKey);
      const params = new URLSearchParams();

      Object.entries(parsedFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });

      if (apiIncludes && String(apiIncludes).trim()) {
        params.append("include", apiIncludes);
      }

      const query = params.toString();
      const url = query ? `projects/?${query}` : "projects/";

      const { data } = await api.get(url);

      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }

      let items = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.items)
        ? data.items
        : [];

      if (typeof customFilter === "function") {
        items = items.filter((item) => {
          try {
            return customFilter(item);
          } catch (err) {
            logger.error("Error in customFilter", err);
            return false;
          }
        });
      }

      setProjects(items);
      setSelectedProjectId((prev) =>
        items.some((item) => item?.id === prev) ? prev : null
      );
    } catch (e) {
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }

      logger.error("Error loading projects", e);
      setProjects([]);
      setErrorMsg(t("load_error"));
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filtersKey, apiIncludes, customFilter, t]);

  useEffect(() => {
    isMountedRef.current = true;
    loadProjects();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadProjects]);

  return {
    projects,
    loading,
    selectedProjectId,
    setSelectedProjectId,
    errorMsg,
    setErrorMsg,
    handleLoad: loadProjects,
    reload: loadProjects,
  };
};