import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../hooks";
import { useNotifications } from "../../../contexts/NotificationContext";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import PageLayout from "../../../components/layout/PageLayout";
import PageHeader from "../../../components/layout/PageHeader";
import Checkbox from "../../../components/forms/Checkbox";
import FilterDrawer from "../../../components/common/FilterDrawer";
import { useAuth } from "../../../contexts/AuthContext";
import { getProjectTypeLabel, getContractTypeLabel } from "../../../utils/projectLabels";
import { NoDataFound } from "../../../components/common/EmptyState";
import BulkActionsBar from "../../../components/common/BulkActionsBar";
import ProjectTableRow from "../components/ProjectTableRow";
import ProjectCard from "../components/ProjectCard";
import ApprovalDialog from "../components/ApprovalDialog";
import ProgressDetailsDialog from "../components/ProgressDetailsDialog";
import ProjectsTableErrorBoundary from "../components/ProjectsTableErrorBoundary";
import { useProjects } from "../hooks/useProjects";
import { useProjectFilters } from "../hooks/useProjectFilters";
import { enrichProjectsWithTranslations } from "../utils/projectHelpers";
import projectApi from "../../../services/projects/projectApi";
import './ProjectsPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function ProjectsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const { user } = useAuth();
  const { isArabic: isAR, isRTL } = useLanguage();
  const { success, error: showError } = useNotifications();

  // Role flags
  const isManager = user?.role?.name === 'Manager';
  const isSuperAdmin = user?.is_superuser || user?.role?.name === 'company_super_admin';

  // Approval status filter — visible to ALL users, default "all"
  const [approvalStatusFilter, setApprovalStatusFilter] = useState("all");

  // Drafts state
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState(new Set());
  const [bulkDraftConfirmOpen, setBulkDraftConfirmOpen] = useState(false);
  const [isBulkDeletingDrafts, setIsBulkDeletingDrafts] = useState(false);
  const isDraftsTab = approvalStatusFilter === "drafts";

  const isAllDraftsSelected = drafts.length > 0 && selectedDraftIds.size === drafts.length;
  const toggleDraftSelect = (id) =>
    setSelectedDraftIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSelectAllDrafts = () =>
    setSelectedDraftIds(isAllDraftsSelected ? new Set() : new Set(drafts.map((d) => d.id)));

  const handleBulkDeleteDrafts = async () => {
    setIsBulkDeletingDrafts(true);
    const ids = Array.from(selectedDraftIds);
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      try { await projectApi.deleteDraft(id); succeeded++; } catch { failed++; }
    }
    setDrafts((prev) => prev.filter((d) => !selectedDraftIds.has(d.id)));
    setSelectedDraftIds(new Set());
    setBulkDraftConfirmOpen(false);
    setIsBulkDeletingDrafts(false);
    if (succeeded > 0 && failed === 0) {
      success(t("bulk_delete_success", { count: succeeded }));
    } else if (succeeded > 0 && failed > 0) {
      showError(t("bulk_delete_partial", { succeeded, failed }) || `${succeeded} deleted, ${failed} failed`);
    } else {
      showError(t("bulk_delete_error"));
    }
  };

  // Fetch drafts when drafts tab is selected
  useEffect(() => {
    if (!isDraftsTab) return;
    setDraftsLoading(true);
    projectApi.getDrafts()
      .then((data) => setDrafts(Array.isArray(data) ? data : data?.results || []))
      .catch(() => { setDrafts([]); showError(t("drafts_load_error") || "Failed to load drafts"); })
      .finally(() => setDraftsLoading(false));
  }, [isDraftsTab]);

  const handleDeleteDraft = useCallback(async (draftId) => {
    setDeletingDraftId(draftId);
    try {
      await projectApi.deleteDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      success(t("draft_deleted"));
    } catch {
      showError(t("delete_error"));
    } finally {
      setDeletingDraftId(null);
    }
  }, [success, showError, t]);

  const handleResumeDraft = useCallback((draft) => {
    navigate(`/wizard/new?draftId=${draft.id}`);
  }, [navigate]);

  const STEP_MAP = {
    setup: { index: 0, key: "wizard_step_setup" },
    siteplan: { index: 1, key: "wizard_step_siteplan" },
    license: { index: 2, key: "wizard_step_license" },
    contract: { index: 3, key: "wizard_step_contract" },
  };

  // Compact mode: simplified table for all tabs except approved projects (full table)
  const isCompactTable = approvalStatusFilter !== "final_approved";

  // ✅ React Query hook for projects data
  const {
    projects: rawProjects,
    isLoading: loading,
    refetch,
    deleteProject,
    bulkDelete,
    isDeleting,
    isBulkDeleting,
  } = useProjects(approvalStatusFilter);

  // Enrich raw projects with translations
  const projects = useMemo(() =>
    enrichProjectsWithTranslations(rawProjects, t),
    [rawProjects, t]
  );

  // Use filter hook for filtering, sorting, and selection
  const {
    filters,
    setFilters,
    filteredProjects,
    sortBy,
    handleSort,
    getSortIcon,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
    filterOptions,
  } = useProjectFilters(projects, t);

  // Single delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetProject, setTargetProject] = useState(null);

  // Bulk delete
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Filter drawer state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // State for unified approval dialog
  const [approvalDialogState, setApprovalDialogState] = useState({
    type: null,
    projectId: null,
    open: false,
  });

  // Progress Dialog state
  const [selectedProjectForProgress, setSelectedProjectForProgress] = useState(null);

  const showToast = useCallback((type, msg) => {
    type === "success" ? success(msg) : showError(msg);
  }, [success, showError]);

  const formatDate = (dateString) => {
    if (!dateString) return t("empty_value");
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t("empty_value");
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return isAR ? `${day}/${month}/${year}` : `${year}-${month}-${day}`;
    } catch { /* date format fallback */
      return t("empty_value");
    }
  };

  const askDelete = useCallback((p) => {
    const title = p?.display_name || p?.name || `${t("wizard_project_prefix")} #${p?.id}`;
    setTargetProject({ id: p.id, name: title });
    setConfirmOpen(true);
  }, [t]);

  const handleDelete = () => {
    if (!targetProject?.id) return;
    const id = targetProject.id;

    deleteProject(id, {
      onSuccess: () => {
        if (selectedIds.has(id)) {
          toggleSelect(id);
        }
        showToast("success", t("delete_success"));
        setConfirmOpen(false);
        setTargetProject(null);
      },
      onError: (error) => {
        showToast("error", error?.message || t("delete_error"));
      },
    });
  };

  const askBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkConfirmOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    bulkDelete(ids, {
      onSuccess: (result) => {
        const { succeeded, failed } = result;
        clearSelection();
        setBulkConfirmOpen(false);

        if (failed === 0) {
          showToast("success", t("bulk_delete_success", { count: succeeded }));
        } else if (succeeded === 0) {
          showToast("error", t("bulk_delete_error"));
        } else {
          showToast("error", t("bulk_delete_partial", { ok: succeeded, fail: failed }));
        }
      },
      onError: () => {
        showToast("error", t("bulk_delete_error"));
      },
    });
  };

  const selectedCount = selectedIds.size;

  const clearFilters = () =>
    setFilters({
      q: "", internal_code: "", city: "", project_type: "",
      consultant: "", contract_type: "", owner_name: "",
      phone: "", email: "",
    });

  const createProject = () => {
    // Navigate directly to wizard without creating a project
    navigate("/wizard/new");
  };

  const hasActiveFilters = Object.values(filters).some(v => v && v.trim() !== "");

  // Virtual scrolling for large datasets
  const tableContainerRef = useRef(null);
  const VIRTUAL_THRESHOLD = 50;
  const useVirtual = filteredProjects.length > VIRTUAL_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: filteredProjects.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 15,
    enabled: useVirtual,
  });

  return (
    <PageLayout loading={loading} loadingText={t("loading_projects")}>
      <div className="projects-page-modern">
          {/* Page Header Bar - Title + Search + Actions all in one bar */}
          <PageHeader
            title={t("projects_title")}
            actions={
              <Button onClick={createProject} variant="primary" size="sm">
                {t("homepage_cta")}
              </Button>
            }
          >
            {/* Search + Filter inline in the header */}
            <div className="prj-toolbar__search">
              <div className="prj-toolbar__search-box">
                <svg className="prj-toolbar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  className="prj-toolbar__search-input"
                  type="text"
                  placeholder={t("general_search")}
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                />
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </Button>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFilterDrawerOpen(true)}
              >
                {t("filters")}
                {hasActiveFilters && <span className="prj-toolbar__filter-dot" />}
              </Button>
            </div>
          </PageHeader>

          {/* Approval status tabs — visible to all users */}
          <div className="prj-tabs">
            <Button
              variant="ghost"
              className={`prj-tabs__btn ${approvalStatusFilter === "all" ? "prj-tabs__btn--active" : ""}`}
              onClick={() => setApprovalStatusFilter("all")}
            >
              {t("all_projects")}
            </Button>
            <Button
              variant="ghost"
              className={`prj-tabs__btn ${approvalStatusFilter === "pending_approvals" ? "prj-tabs__btn--active" : ""}`}
              onClick={() => setApprovalStatusFilter("pending_approvals")}
            >
              {t("pending_approvals")}
            </Button>
            {(isManager || isSuperAdmin) && (
              <Button
                variant="ghost"
                className={`prj-tabs__btn ${approvalStatusFilter === "approved" ? "prj-tabs__btn--active" : ""}`}
                onClick={() => setApprovalStatusFilter("approved")}
              >
                {t("final_approvals")}
              </Button>
            )}
            <Button
              variant="ghost"
              className={`prj-tabs__btn ${approvalStatusFilter === "final_approved" ? "prj-tabs__btn--active" : ""}`}
              onClick={() => setApprovalStatusFilter("final_approved")}
            >
              {t("approved_projects")}
            </Button>
            <Button
              variant="ghost"
              className={`prj-tabs__btn ${isDraftsTab ? "prj-tabs__btn--active" : ""}`}
              onClick={() => setApprovalStatusFilter("drafts")}
            >
              {t("drafts_tab")}
            </Button>
          </div>

          {/* Drafts Tab Content */}
          {isDraftsTab ? (
            <div className="drafts-tab-content">
              {draftsLoading ? (
                <div className="projects-loading-skeleton">
                  {[...Array(3)].map((_, i) => (
                    <div key={`draft-skeleton-${i}`} className="projects-skeleton-row">
                      <div className="projects-skeleton-cell projects-skeleton-cell--md"></div>
                      <div className="projects-skeleton-cell projects-skeleton-cell--sm"></div>
                      <div className="projects-skeleton-cell projects-skeleton-cell--flex"></div>
                    </div>
                  ))}
                </div>
              ) : drafts.length === 0 ? (
                <NoDataFound
                  icon="📝"
                  title={t("no_drafts")}
                  description={t("no_drafts_desc")}
                  onCreate={createProject}
                />
              ) : (
                <>
                  {selectedDraftIds.size > 0 && (
                    <BulkActionsBar
                      selectedCount={selectedDraftIds.size}
                      onClear={() => setSelectedDraftIds(new Set())}
                      actions={[{ label: t("delete_selected"), onClick: () => setBulkDraftConfirmOpen(true), variant: "danger" }]}
                    />
                  )}
                  <div className="drafts-grid">
                    <div className="drafts-select-all">
                      <Checkbox
                        checked={isAllDraftsSelected}
                        onChange={toggleSelectAllDrafts}
                        aria-label={t("select_all")}
                      />
                      <span>{t("select_all")}</span>
                    </div>
                  {drafts.map((draft) => {
                    const stepInfo = STEP_MAP[draft.current_step] || STEP_MAP.setup;
                    const stepLabel = t(stepInfo.key);
                    const title = draft.title || draft.data?.project_name || t("untitled_draft");
                    const updatedAt = formatDate(draft.updated_at);

                    return (
                      <div key={draft.id} className={`draft-card ${selectedDraftIds.has(draft.id) ? "draft-card--selected" : ""}`}>
                        <div className="draft-card__header">
                          <Checkbox
                            checked={selectedDraftIds.has(draft.id)}
                            onChange={() => toggleDraftSelect(draft.id)}
                          />
                          <div className="draft-card__title">{title}</div>
                          <span className="draft-card__badge">{t("draft")}</span>
                        </div>

                        <div className="draft-card__meta">
                          <div className="draft-card__step">
                            <span className="draft-card__meta-label">{t("draft_step_label")}:</span>
                            <span className="draft-card__step-name">{stepLabel}</span>
                            <span className="draft-card__step-indicator">
                              {[0, 1, 2, 3].map((s) => (
                                <span
                                  key={s}
                                  className={`draft-card__step-dot ${s <= stepInfo.index ? "draft-card__step-dot--active" : ""}`}
                                />
                              ))}
                            </span>
                          </div>
                          <div className="draft-card__date">
                            <span className="draft-card__meta-label">{t("draft_last_updated")}:</span>
                            <span>{updatedAt}</span>
                          </div>
                        </div>

                        <div className="draft-card__actions">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleResumeDraft(draft)}
                          >
                            {t("resume_draft")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="draft-card__delete-btn"
                            onClick={() => handleDeleteDraft(draft.id)}
                            disabled={deletingDraftId === draft.id}
                          >
                            {deletingDraftId === draft.id ? t("deleting") : t("delete_draft")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
            </div>
          ) : (
          <>
          {/* Bulk actions bar */}
          {selectedCount > 0 && (
            <BulkActionsBar
              selectedCount={selectedCount}
              onClear={() => clearSelection()}
              actions={[
                {
                  label: t("delete_selected"),
                  onClick: askBulkDelete,
                  variant: "danger"
                }
              ]}
            />
          )}

          {loading ? (
            <div className="projects-loading-skeleton">
              {[...Array(5)].map((_, i) => (
                <div key={`skeleton-${i}`} className="projects-skeleton-row">
                  <div className="projects-skeleton-cell projects-skeleton-cell--xs"></div>
                  <div className="projects-skeleton-cell projects-skeleton-cell--xs"></div>
                  <div className="projects-skeleton-cell projects-skeleton-cell--sm"></div>
                  <div className="projects-skeleton-cell projects-skeleton-cell--md"></div>
                  <div className="projects-skeleton-cell projects-skeleton-cell--md"></div>
                  <div className="projects-skeleton-cell projects-skeleton-cell--flex"></div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <NoDataFound
              icon="📋"
              title={
                approvalStatusFilter === "final_approved"
                  ? (t("no_approved_projects"))
                  : approvalStatusFilter === "approved"
                  ? (t("no_final_approvals"))
                  : approvalStatusFilter === "pending_approvals"
                  ? (t("no_pending_approvals"))
                  : (t("no_projects_match"))
              }
              description={
                approvalStatusFilter === "final_approved"
                  ? (t("no_approved_projects_desc"))
                  : approvalStatusFilter === "approved"
                  ? (t("no_final_approvals_description"))
                  : approvalStatusFilter === "pending_approvals"
                  ? (t("no_pending_approvals_desc"))
                  : (t("no_projects_desc"))
              }
              onCreate={approvalStatusFilter === "all" ? createProject : undefined}
            />
          ) : (
            <>
            {/* Desktop Table View */}
            <div className="projects-table-desktop">
              <ProjectsTableErrorBoundary>
              <div
                ref={tableContainerRef}
                className="ds-table__wrap projects-table-container"
                style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', overflowX: 'auto' }}
              >
                <table className={`ds-table projects-table ${isCompactTable ? 'projects-table--compact' : ''}`}>
              <thead>
                <tr>
                  <th className="col-checkbox">
                    <Checkbox
                      checked={isAllSelected}
                      onChange={() => {
                        toggleSelectAll();
                      }}
                      aria-label={t("select_all")}
                    />
                  </th>
                  <th className="col-number">#</th>
                  <th
                    className={`col-code ds-table__sortable ${sortBy === 'internal_code' ? 'active' : ''}`}
                    onClick={() => handleSort('internal_code')}
                    title={`${t("project_view_internal_code").replace(":", "")} - ${t("click_to_sort")}`}
                  >
                    {t("project_view_internal_code").replace(":", "")}
                    <span className="ds-table__sort-icon">{getSortIcon('internal_code')}</span>
                  </th>
                  <th
                    className={`col-name ds-table__sortable ${sortBy === 'project_name' ? 'active' : ''}`}
                    onClick={() => handleSort('project_name')}
                    title={`${t("project_name")} - ${t("click_to_sort")}`}
                  >
                    {t("project_name")}
                    <span className="ds-table__sort-icon">{getSortIcon('project_name')}</span>
                  </th>
                  <th
                    className={`col-consultant ds-table__sortable ${sortBy === 'consultant' ? 'active' : ''}`}
                    onClick={() => handleSort('consultant')}
                    title={`${t("consultant")} - ${t("click_to_sort")}`}
                  >
                    {t("consultant")}
                    <span className="ds-table__sort-icon">{getSortIcon('consultant')}</span>
                  </th>
                  {!isCompactTable && (
                    <>
                  <th
                    className={`col-date ds-table__sortable ${sortBy === 'project_end_date' ? 'active' : ''}`}
                    onClick={() => handleSort('project_end_date')}
                    title={`${t("project_end_date")} - ${t("click_to_sort")}`}
                  >
                    {t("project_end_date")}
                    <span className="ds-table__sort-icon">{getSortIcon('project_end_date')}</span>
                  </th>
                  <th
                    className={`col-status ds-table__sortable ${sortBy === 'status' ? 'active' : ''}`}
                    onClick={() => handleSort('status')}
                    title={`${t("project_status")} - ${t("click_to_sort")}`}
                  >
                    {t("project_status")}
                    <span className="ds-table__sort-icon">{getSortIcon('status')}</span>
                  </th>
                  <th className="col-location" title={t("table_location")}>{t("table_location")}</th>
                  <th className="col-date" title={t("table_start_order_date")}>{t("table_start_order_date")}</th>
                  <th className="col-date" title={t("table_planned_completion")}>{t("table_planned_completion")}</th>
                  <th className="col-days" title={t("table_elapsed_duration")}>{t("table_elapsed_duration")}</th>
                  <th className="col-days" title={t("table_time_delay")}>{t("table_time_delay")}</th>
                  <th className="col-pct" title={t("progress_col_actual_current")}>{t("progress_col_actual_current")}</th>
                  <th className="col-pct" title={t("progress_col_technical")}>{t("progress_col_technical")}</th>
                  <th className="col-pct" title={t("progress_col_technical_approved")}>{t("progress_col_technical_approved")}</th>
                  <th className="col-pct" title={t("progress_col_financial")}>{t("progress_col_financial")}</th>
                  <th className="col-pct" title={t("progress_col_financial_approved")}>{t("progress_col_financial_approved")}</th>
                  <th className="col-pct" title={t("progress_col_gap")}>{t("progress_col_gap")}</th>
                  <th className="col-status" title={t("table_payment_status")}>{t("table_payment_status")}</th>
                  <th className="col-amount" title={t("table_current_due_amount")}>{t("table_current_due_amount")}</th>
                  <th className="col-days" title={t("table_payment_delay_days")}>{t("table_payment_delay_days")}</th>
                  <th className="col-status" title={t("table_project_closure_status")}>{t("table_project_closure_status")}</th>
                  <th className="col-icon" title={t("table_financial_status")}>{t("table_financial_status")}</th>
                    </>
                  )}
                  <th className="col-actions" title={t("action")}>{t("action")}</th>
                </tr>
              </thead>

              <tbody>
                {useVirtual ? (
                  <>
                    {rowVirtualizer.getVirtualItems().length > 0 && (
                      <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                        <td colSpan={isCompactTable ? 6 : 26} className="ds-p-0 ds-border-none" />
                      </tr>
                    )}
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const p = filteredProjects[virtualRow.index];
                      return (
                        <ProjectTableRow
                          key={p?.id ?? virtualRow.index}
                          project={p}
                          index={virtualRow.index}
                          isSelected={selectedIds.has(p.id)}
                          onToggle={() => toggleSelect(p.id)}
                          onDelete={() => askDelete(p)}
                          onApprove={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending" ? () => setApprovalDialogState({ type: 'approve', projectId: p.id, open: true }) : undefined}
                          onReject={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending" ? () => setApprovalDialogState({ type: 'reject', projectId: p.id, open: true }) : undefined}
                          onFinalApprove={approvalStatusFilter === "approved" && isSuperAdmin && p?.approval_status === "approved" ? () => setApprovalDialogState({ type: 'finalApprove', projectId: p.id, open: true }) : undefined}
                          onProgressClick={() => setSelectedProjectForProgress(p)}
                          showApprove={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending"}
                          showReject={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending"}
                          showFinalApprove={approvalStatusFilter === "approved" && isSuperAdmin && p?.approval_status === "approved"}
                          compact={isCompactTable}
                          formatDate={formatDate}
                          isRTL={isRTL}
                        />
                      );
                    })}
                    {rowVirtualizer.getVirtualItems().length > 0 && (
                      <tr style={{ height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0)}px` }}>
                        <td colSpan={isCompactTable ? 6 : 26} className="ds-p-0 ds-border-none" />
                      </tr>
                    )}
                  </>
                ) : (
                  filteredProjects.map((p, i) => (
                    <ProjectTableRow
                      key={p?.id ?? i}
                      project={p}
                      index={i}
                      isSelected={selectedIds.has(p.id)}
                      onToggle={() => toggleSelect(p.id)}
                      onDelete={() => askDelete(p)}
                      onApprove={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending" ? () => setApprovalDialogState({ type: 'approve', projectId: p.id, open: true }) : undefined}
                      onReject={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending" ? () => setApprovalDialogState({ type: 'reject', projectId: p.id, open: true }) : undefined}
                      onFinalApprove={approvalStatusFilter === "approved" && isSuperAdmin && p?.approval_status === "approved" ? () => setApprovalDialogState({ type: 'finalApprove', projectId: p.id, open: true }) : undefined}
                      onProgressClick={() => setSelectedProjectForProgress(p)}
                      showApprove={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending"}
                      showReject={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending"}
                      showFinalApprove={approvalStatusFilter === "approved" && isSuperAdmin && p?.approval_status === "approved"}
                      compact={isCompactTable}
                      formatDate={formatDate}
                      isRTL={isRTL}
                    />
                  ))
                )}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={isCompactTable ? 6 : 26} className="ds-table__foot">
                    {t("matching_total", { count: filteredProjects.length, total: projects.length })}
                  </td>
                </tr>
              </tfoot>
            </table>
              </div>
              </ProjectsTableErrorBoundary>
            </div>

            {/* Mobile Card View */}
            <div className="projects-table-mobile">
              {filteredProjects.map((p, i) => (
                <ProjectCard
                  key={p?.id ?? i}
                  project={p}
                  index={i}
                  isSelected={selectedIds.has(p.id)}
                  onToggle={() => toggleSelect(p.id)}
                  onDelete={() => askDelete(p)}
                  onApprove={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending" ? () => setApprovalDialogState({ type: 'approve', projectId: p.id, open: true }) : undefined}
                  onReject={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending" ? () => setApprovalDialogState({ type: 'reject', projectId: p.id, open: true }) : undefined}
                  onFinalApprove={approvalStatusFilter === "approved" && isSuperAdmin && p?.approval_status === "approved" ? () => setApprovalDialogState({ type: 'finalApprove', projectId: p.id, open: true }) : undefined}
                  showApprove={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending"}
                  showReject={approvalStatusFilter === "pending_approvals" && isManager && p?.approval_status === "pending"}
                  showFinalApprove={approvalStatusFilter === "approved" && isSuperAdmin && p?.approval_status === "approved"}
                />
              ))}
            </div>
            </>
          )}
          </>
          )}

        {/* Filter Drawer */}
        <FilterDrawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          filters={filters}
          setFilters={setFilters}
          clearFilters={clearFilters}
          cities={filterOptions.cities}
          projectTypes={filterOptions.projectTypes}
          consultants={filterOptions.consultants}
          contractTypes={filterOptions.contractTypes}
          getProjectTypeLabel={getProjectTypeLabel}
          getContractTypeLabel={getContractTypeLabel}
          i18n={i18n}
        />

        {/* Unified Approval Dialog */}
        <ApprovalDialog
          type={approvalDialogState.type}
          projectId={approvalDialogState.projectId}
          open={approvalDialogState.open}
          onClose={() => setApprovalDialogState({ type: null, projectId: null, open: false })}
          onSuccess={() => refetch()}
          showToast={showToast}
        />

        {/* Confirm Dialog - single delete */}
        <Dialog
          open={confirmOpen}
          title={t("confirm_delete")}
          desc={
            <>
              {t("confirm_delete_desc")}{" "}
              <strong className="dialog-highlight">{targetProject?.name}</strong>?<br/>
              {t("delete_cannot_undo")}
            </>
          }
          confirmLabel={isDeleting ? t("deleting") : t("delete_permanent")}
          cancelLabel={t("cancel")}
          onClose={() => !isDeleting && setConfirmOpen(false)}
          onConfirm={handleDelete}
          danger
          busy={isDeleting}
        />

        {/* Confirm Dialog - bulk delete drafts */}
        <Dialog
          open={bulkDraftConfirmOpen}
          title={t("bulk_delete")}
          desc={
            <>
              {t("bulk_delete_desc")}{" "}
              <strong>{selectedDraftIds.size}</strong>{" "}
              {t("bulk_delete_desc2")}<br/>
              {t("bulk_delete_continue")}
            </>
          }
          confirmLabel={isBulkDeletingDrafts ? t("deleting") : t("delete_selected")}
          cancelLabel={t("cancel")}
          onClose={() => !isBulkDeletingDrafts && setBulkDraftConfirmOpen(false)}
          onConfirm={handleBulkDeleteDrafts}
          danger
          busy={isBulkDeletingDrafts}
        />

        {/* Confirm Dialog - bulk delete */}
        <Dialog
          open={bulkConfirmOpen}
          title={t("bulk_delete")}
          desc={
            <>
              {t("bulk_delete_desc")}{" "}
              <strong>{selectedCount}</strong>{" "}
              {t("bulk_delete_desc2")}<br/>
              {t("bulk_delete_continue")}
            </>
          }
          confirmLabel={isBulkDeleting ? t("deleting") : t("delete_selected")}
          cancelLabel={t("cancel")}
          onClose={() => !isBulkDeleting && setBulkConfirmOpen(false)}
          onConfirm={handleBulkDelete}
          danger
          busy={isBulkDeleting}
        />

        {/* Progress Details Dialog */}
        <ProgressDetailsDialog
          project={selectedProjectForProgress}
          onClose={() => setSelectedProjectForProgress(null)}
        />
      </div>
    </PageLayout>
  );
}
