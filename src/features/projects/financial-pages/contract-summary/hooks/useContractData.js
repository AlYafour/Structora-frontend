/**
 * useContractData Hook
 *
 * Handles loading contract and variations data for ContractFinancialSummary.
 * Extracted from ContractFinancialSummary.jsx to separate data loading from calculations/rendering.
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../../../../services/api";

/**
 * @param {string} projectId
 * @param {Function} t - Translation function
 * @returns {{ contract: Object|null, variations: Array, loading: boolean, error: string|null }}
 */
export function useContractData(projectId, t) {
  const location = useLocation();
  const [contract, setContract] = useState(null);
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      api.get(`projects/${projectId}/contract/`).catch(() => ({ data: null })),
      api.get(`projects/${projectId}/variations/`).catch(() => ({ data: [] }))
    ])
      .then(([contractRes, variationsRes]) => {
        const contractData = contractRes.data;
        if (Array.isArray(contractData) && contractData.length) setContract(contractData[0]);
        else if (contractData && typeof contractData === "object") setContract(contractData);
        else setContract(null);

        const variationsData = variationsRes.data;
        if (Array.isArray(variationsData)) {
          setVariations(variationsData);
        } else if (variationsData && Array.isArray(variationsData.results)) {
          setVariations(variationsData.results);
        } else {
          setVariations([]);
        }
      })
      .catch((e) => {
        let errorMessage = t("contract_load_error");

        if (e?.response?.data) {
          const errorData = e.response.data;
          if (typeof errorData === "string" && (errorData.trim().startsWith("<!DOCTYPE") || errorData.trim().startsWith("<html"))) {
            const titleMatch = errorData.match(/<title>(.*?)<\/title>/i);
            if (titleMatch) {
              errorMessage = `${t("contract_load_error")}: ${titleMatch[1]}`;
            } else {
              errorMessage = t("contract_load_error");
            }
          } else if (typeof errorData === "string") {
            errorMessage = errorData;
          } else if (errorData?.detail) {
            errorMessage = errorData.detail;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        } else if (e?.message) {
          errorMessage = e.message;
        }

        setError(errorMessage);
        setContract(null);
      })
      .finally(() => setLoading(false));
  }, [projectId, t]);

  // Load on mount and when location changes
  useEffect(() => {
    loadData();
  }, [loadData, location.pathname]);

  // Listen for contract-updated event
  useEffect(() => {
    if (!projectId) return;

    const handleContractUpdate = (event) => {
      if (event.detail?.projectId === projectId) {
        loadData();
      }
    };

    window.addEventListener("contract-updated", handleContractUpdate);
    return () => {
      window.removeEventListener("contract-updated", handleContractUpdate);
    };
  }, [projectId, loadData]);

  return { contract, variations, loading, error };
}
