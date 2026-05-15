/**
 * useInvoiceForm Hook
 *
 * Manages invoice form state, data loading, and invoice number generation.
 * Uses a single combined API endpoint for project-specific data to minimize
 * network round-trips (1 call instead of 7+).
 */

import { useState, useEffect, useRef } from "react";
import { useLocation } from 'react-router-dom';
import { api } from "../../../../../services/api";
import { projectApi } from "../../../../../services";
import { logger } from "../../../../../utils/logger";
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

export const useInvoiceForm = (invoiceId, projectFromQuery, isEditMode, toast, t) => {
  const navigate = useTenantNavigate();
  const location = useLocation();

  // Counter that increments every time this page becomes "active" — ensures data refresh
  const [refreshKey, setRefreshKey] = useState(0);

  // Deferred navigation — avoids calling navigate() during render/async callbacks
  const [redirectTo, setRedirectTo] = useState(null);
  useEffect(() => {
    if (redirectTo) {
      navigate(redirectTo);
      setRedirectTo(null);
    }
  }, [redirectTo, navigate]);

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [variations, setVariations] = useState([]);
  const [prolongationFees, setProlongationFees] = useState([]);
  const [contractData, setContractData] = useState(null);
  const [latestProgress, setLatestProgress] = useState(null);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [advanceSummary, setAdvanceSummary] = useState(null);
  const [creditSummary, setCreditSummary] = useState(null);
  const [formData, setFormData] = useState({
    project: "",
    payment: "",
    payer: "owner",
    amount: "0.00",
    invoice_date: new Date().toISOString().split("T")[0],
    invoice_number: "",
    description: "",
    items: [{ description: "", quantity: 1, unit_price: 0, total: 0, variation_id: null }],
  });

  // Load next invoice number (standalone — used when date changes)
  const loadNextInvoiceNumber = async (invoiceDate = null) => {
    try {
      let year = null;
      if (invoiceDate) {
        year = new Date(invoiceDate).getFullYear();
      }
      const config = year ? { params: { year } } : {};
      const response = await api.get("invoices/next-number/", config);
      if (response?.data?.next_invoice_number) {
        setFormData(prev => ({ ...prev, invoice_number: response.data.next_invoice_number }));
      }
    } catch (error) {
      logger.warn("Could not load next invoice number", error);
      const year = invoiceDate ? new Date(invoiceDate).getFullYear() : new Date().getFullYear();
      setFormData(prev => ({ ...prev, invoice_number: `${year}0000001` }));
    }
  };

  /**
   * Load all project-specific data in a SINGLE API call.
   * Replaces 7+ separate calls (contract, variations, progress, invoices,
   * next number, advance summary, credit summary).
   */
  const loadProjectFormData = async (projectId, options = {}) => {
    try {
      if (!projectId) return;

      const year = options.year || new Date().getFullYear();
      const data = await projectApi.getInvoiceFormData(projectId, year, { mode: "create" });

      // Contract
      const contract = data.contract;
      setContractData(contract ? (Array.isArray(contract) ? contract[0] || null : contract) : null);

      // Variations (already filtered to approved on backend)
      setVariations(Array.isArray(data.variations) ? data.variations : []);
      setProlongationFees(Array.isArray(data.prolongation_fees) ? data.prolongation_fees : []);

      // Latest progress
      setLatestProgress(data.latest_progress || null);

      // Existing invoices
      setExistingInvoices(Array.isArray(data.existing_invoices) ? data.existing_invoices : []);

      // Invoice number (only for create mode)
      if (!isEditMode && data.next_invoice_number) {
        setFormData(prev => ({ ...prev, invoice_number: data.next_invoice_number }));
      }

      // Advance payment summary
      const advData = data.advance_summary;
      const hasActive = advData?.advances?.some(ap => ap.status === 'active');
      setAdvanceSummary(hasActive ? advData : null);

      // Credit summary
      const credData = data.credit_summary;
      setCreditSummary(credData?.has_credit ? credData : null);

    } catch (error) {
      logger.error("Error loading project form data", error);
      setContractData(null);
      setVariations([]);
      setProlongationFees([]);
      setLatestProgress(null);
      setExistingInvoices([]);
      setAdvanceSummary(null);
      setCreditSummary(null);
    }
  };

  // Load projects list (lightweight — only id, name, display_name, internal_code)
  const loadProjects = async () => {
    try {
      const projectsList = await projectApi.getSimpleList();
      setProjects(projectsList || []);
      return projectsList || [];
    } catch (error) {
      logger.error("Error loading projects", error);
      return [];
    }
  };

  // Load existing invoice for editing — single API call to find invoice by ID
  const loadInvoice = async () => {
    setLoading(true);
    try {
      // Find the invoice directly by ID (1 call instead of looping all projects)
      const result = await projectApi.findInvoiceById(invoiceId);
      const invoice = result?.invoice;
      const projectId = result?.project_id;

      if (!invoice || !projectId) {
        toast.error(t("invoice_not_found") || "Invoice not found");
        setRedirectTo("/invoices");
        return;
      }

      // Load projects list AND project-specific data in parallel (2 calls)
      await Promise.all([
        loadProjects(),
        loadProjectFormData(projectId),
      ]);

      // Set form data from invoice
      setFormData({
        project: projectId.toString(),
        payment: invoice.payment?.toString() || "",
        payer: invoice.payer || "owner",
        amount: invoice.amount?.toString() || "0.00",
        invoice_date: invoice.invoice_date || new Date().toISOString().split("T")[0],
        invoice_number: invoice.invoice_number || "",
        description: invoice.description || "",
        items: invoice.items && invoice.items.length > 0
          ? invoice.items.map(item => ({
              description: item.description || "",
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              total: item.total || 0,
              source: item.source || (item.variation_id ? "variation" : item.prolongation_fee_id ? "prolongation_fee" : "base_contract"),
              variation_id: item.variation_id || null,
              prolongation_fee_id: item.prolongation_fee_id || null,
            }))
          : [{ description: "", quantity: 1, unit_price: 0, total: 0, variation_id: null }],
      });
    } catch (error) {
      logger.error("Error loading invoice", error);
      toast.error(t("load_error") || "Error loading invoice");
      setRedirectTo("/invoices");
    } finally {
      setLoading(false);
    }
  };

  // Bump refreshKey on React Router navigation
  const locationKeyRef = useRef(location.key);
  useEffect(() => {
    if (location.key !== locationKeyRef.current) {
      locationKeyRef.current = location.key;
      setRefreshKey(k => k + 1);
    }
  }, [location.key]);

  // Only refresh on popstate (browser back/forward)
  useEffect(() => {
    const bump = () => setRefreshKey(k => k + 1);
    window.addEventListener("popstate", bump);
    return () => window.removeEventListener("popstate", bump);
  }, []);

  // Keep a ref to the current project so refresh helpers can read it
  const projectRef = useRef(formData.project);
  projectRef.current = formData.project;

  // Initial data loading — re-runs whenever refreshKey changes
  useEffect(() => {
    if (isEditMode) {
      loadInvoice();
    } else if (projectFromQuery) {
      setFormData(prev => ({ ...prev, project: projectFromQuery }));
      // Load projects list AND project-specific data in parallel (2 calls total)
      Promise.all([
        loadProjects(),
        loadProjectFormData(projectFromQuery),
      ]).finally(() => setLoading(false));
    } else {
      const pid = projectRef.current;
      if (pid) {
        Promise.all([
          loadProjects(),
          loadProjectFormData(pid),
        ]).finally(() => setLoading(false));
      } else {
        // No project selected — just load projects list + invoice number
        loadProjects().finally(() => setLoading(false));
        loadNextInvoiceNumber();
      }
    }
  }, [invoiceId, isEditMode, projectFromQuery, refreshKey]);

  // Load next invoice number when date changes (standalone call)
  useEffect(() => {
    if (!isEditMode && formData.invoice_date && !formData.project) {
      loadNextInvoiceNumber(formData.invoice_date);
    }
  }, [formData.invoice_date, formData.project, isEditMode]);

  // Handle project change — single API call for all project data
  const handleProjectChange = (projectId) => {
    setFormData(prev => ({ ...prev, project: projectId, payment: "" }));
    if (projectId) {
      loadProjectFormData(projectId);
    } else {
      setPayments([]);
      setVariations([]);
      setProlongationFees([]);
      setContractData(null);
      setLatestProgress(null);
      setExistingInvoices([]);
      setAdvanceSummary(null);
      setCreditSummary(null);
    }
  };

  return {
    loading,
    projects,
    payments,
    variations,
    prolongationFees,
    contractData,
    latestProgress,
    existingInvoices,
    advanceSummary,
    creditSummary,
    formData,
    setFormData,
    handleProjectChange,
    loadNextInvoiceNumber,
  };
};
