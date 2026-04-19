import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { projectApi } from "../../../services/projects";
import { api, API_BASE_URL } from "../../../services/api";
import { logger } from "../../../utils/logger";
import { handleError } from "../../../utils/errorHandler";
import Button from "../../../components/common/Button";
import BrandedLoader from "../../../components/common/BrandedLoader";
import Dialog from "../../../components/common/Dialog";
import PageHeader from "../../../components/layout/PageHeader";
import { useNotifications } from "../../../contexts/NotificationContext";

import useWizardState from "./hooks/useWizardState";
import useProjectData from "../../../hooks/useProjectData";
import ProjectTypeSelector from "./components/ProjectTypeSelector";
import SitePlanStep from "./steps/SitePlanStep";
import LicenseStep from "./steps/LicenseStep";
import ContractStep from "./steps/ContractStep";
import WizardStepper from "./components/WizardStepper";

import "./components/wizard.css";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

const STEP_INDEX_WITH_LICENSE    = { classification: 0, siteplan: 1, license: 2, contract: 3 };
const STEP_INDEX_WITHOUT_LICENSE = { classification: 0, siteplan: 1, contract: 2 };

export default function WizardPage() {
  const { t } = useTranslation();
  const { error: showError, success: showSuccess } = useNotifications();
  const navigate = useTenantNavigate();
  const location = useLocation();

  const { projectId } = useParams();
  const [params] = useSearchParams();

  // Check if this is a new project or resuming a draft
  const isNewProject = !projectId || location.pathname === "/wizard/new";
  const draftIdFromUrl = params.get("draftId");

  const mode = (params.get("mode") || "").toLowerCase();
  const isViewFromUrl = mode === "view";
  const stepParam = (params.get("step") || "").toLowerCase();
  const sectionOnly = params.get("sectionOnly") === "true";

  // Lifted view mode state
  const [viewMode, setViewMode] = useState(isViewFromUrl);
  const isView = viewMode;

  const { setup, setSetup } = useWizardState();
  const [project, setProject] = useState(null);
  const [index, setIndex] = useState(0);
  // Track which steps have been visited — once visited, stay mounted
  const [visitedSteps, setVisitedSteps] = useState(() => new Set([0]));
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Flag: classification step completed, waiting for STEPS to expand before advancing
  const pendingAdvanceRef = useRef(false);

  // Draft state — stores all wizard data for new projects
  const [draftId, setDraftId] = useState(draftIdFromUrl ? Number(draftIdFromUrl) : null);
  const [wizardData, setWizardData] = useState({
    setup: {},
    siteplan: null,         // plain-object snapshot (for draft saving)
    sitePlanFormData: null, // FormData (for API submission — not serializable)
    license: null,          // plain-object snapshot (for draft saving)
    licenseFormData: null,  // FormData (for API submission — not serializable)
    contract: null,
  });
  const draftSaveTimerRef = useRef(null);

  // Reset index to 0 when opening a new project
  useEffect(() => {
    if (isNewProject && !draftIdFromUrl) {
      setIndex(0);
    }
    // For existing projects, all steps are immediately accessible
    if (!isNewProject) {
      setVisitedSteps(new Set([0, 1, 2, 3]));
    }
  }, [isNewProject, draftIdFromUrl]);

  // Fetch project data for existing projects
  const projectData = useProjectData(isNewProject ? null : projectId);
  const { siteplan, license, contract: contractData, reload } = projectData;

  // Listen for data update events
  useEffect(() => {
    if (isNewProject || !projectId || !reload) return;

    const handleDataUpdate = (event) => {
      if (event.detail?.projectId === projectId) reload();
    };

    const handleContractUpdate = async (event) => {
      if (event.detail?.projectId === projectId) {
        try {
          const data = await projectApi.getContract(projectId);
          if (Array.isArray(data) && data.length > 0 && data[0].contract_classification) {
            setSetup((prev) => ({ ...prev, contractClassification: data[0].contract_classification }));
          }
        } catch (e) { logger.error("Error updating contract classification", e); }
        reload();
      }
    };

    window.addEventListener("license-updated", handleDataUpdate);
    window.addEventListener("contract-updated", handleContractUpdate);
    window.addEventListener("siteplan-owners-updated", handleDataUpdate);

    return () => {
      window.removeEventListener("license-updated", handleDataUpdate);
      window.removeEventListener("contract-updated", handleContractUpdate);
      window.removeEventListener("siteplan-owners-updated", handleDataUpdate);
    };
  }, [projectId, isNewProject, reload, setSetup]);

  // Load existing project setup data
  useEffect(() => {
    if (isNewProject) {
      if (!draftIdFromUrl) {
        setSetup({ projectType: "", contractType: "", internalCode: "", legacyCode: "", contractClassification: "", projectCategory: "", maintenanceType: "", contractYear: new Date().getFullYear() });
        try { localStorage.removeItem("wizard_setup_state_v1"); } catch (_e) {}
      }
      return;
    }
    if (!projectId) return;
    (async () => {
      try {
        const data = await projectApi.getWithIncludes(projectId, ['siteplan', 'license', 'contract']);
        setProject(data);
        setSetup((prev) => ({
          projectType: data?.project_type || "",
          contractType: data?.contract_type || "",
          internalCode: data?.internal_code || "",
          legacyCode: data?.legacy_code || "",
          contractClassification: prev?.contractClassification || "",
          projectCategory: data?.project_category || "",
          maintenanceType: data?.maintenance_type || "",
          contractYear: data?.contract_year || new Date().getFullYear(),
          _classification: data?.classification_data || prev?._classification || null,
        }));
      } catch (_e) { logger.debug("WizardPage: setup load failed", _e); }
    })();
  }, [projectId, setSetup, isNewProject, draftIdFromUrl]);

  // Load draft data if resuming
  useEffect(() => {
    if (!draftIdFromUrl) return;
    (async () => {
      try {
        const draft = await projectApi.getDraft(draftIdFromUrl);
        if (draft?.data) {
          const d = draft.data;
          if (d.setup) {
            setSetup(d.setup);
          }
          setWizardData({
            setup: d.setup || {},
            siteplan: d.siteplan || null,
            license: d.license || null,
            contract: d.contract || null,
          });
          setDraftId(draft.id);
          // Navigate to the step where user left off (backend uses "setup", we use "classification")
          const mappedStep = draft.current_step === "setup" ? "classification" : draft.current_step;
          const stepIdx = STEP_INDEX[mappedStep] ?? 0;
          setIndex(stepIdx);
        }
      } catch (e) {
        logger.error("Failed to load draft", e);
      }
    })();
  }, [draftIdFromUrl, setSetup]);

  const setupHasAllSelections = (s = setup) => !!s.contractType && !!s.projectCategory;

  const allowSitePlanFlow = !!setup.projectType && !!setup.contractType;

  // When the project doesn't require a building permit, skip LicenseStep entirely
  // requiresPermit lives inside _classification (set by ProjectTypeSelector and loaded from classification_data)
  const noPermit = setup._classification?.requiresPermit === "false" || setup.requiresPermit === "false";

  // Step index map — depends on whether we show the license step
  const STEP_INDEX = noPermit ? STEP_INDEX_WITHOUT_LICENSE : STEP_INDEX_WITH_LICENSE;

  // Contract step index shifts from 3 → 2 when there's no permit
  const contractStepIndex = noPermit ? 2 : 3;

  // Auto-advance from classification step once setup is ready
  useEffect(() => {
    if (pendingAdvanceRef.current && allowSitePlanFlow && index === 0) {
      pendingAdvanceRef.current = false;
      setIndex(1);
    }
  }, [allowSitePlanFlow, index]);

  // contract_classification is loaded by useContract inside ContractStep — no separate fetch needed here

  const labels = {
    setup: t("wizard_step_setup"),
    siteplan: t("wizard_step_siteplan"),
    license: t("wizard_step_license"),
    contract: t("wizard_step_contract"),
    projectPrefix: t("wizard_project_prefix"),
  };

  const STEPS = useMemo(() => {
    const base = [{ id: "classification", title: labels.setup, Component: ProjectTypeSelector }];
    if (!allowSitePlanFlow) return base;
    const withPermit = [
      ...base,
      { id: "siteplan", title: labels.siteplan, Component: SitePlanStep },
      { id: "license", title: labels.license, Component: LicenseStep },
      { id: "contract", title: labels.contract, Component: ContractStep },
    ];
    const withoutPermit = [
      ...base,
      { id: "siteplan", title: labels.siteplan, Component: SitePlanStep },
      { id: "contract", title: labels.contract, Component: ContractStep },
    ];
    return noPermit ? withoutPermit : withPermit;
  }, [allowSitePlanFlow, noPermit, labels.setup, labels.siteplan, labels.license, labels.contract]);

  useEffect(() => {
    if (!stepParam) return; // Only apply when URL has ?step= param
    const wanted = STEP_INDEX[stepParam] ?? 0;
    const maxIndex = allowSitePlanFlow ? (STEPS.length - 1) : 0;
    const target = Math.min(wanted, maxIndex);
    setIndex(target);
    setVisitedSteps(p => new Set([...p, target]));
  }, [stepParam, allowSitePlanFlow, STEPS.length]);

  useEffect(() => {
    if (index >= STEPS.length) setIndex(Math.max(0, STEPS.length - 1));
  }, [STEPS.length, index]);

  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;
  const goPrev = () => !isFirst && setIndex((i) => { const n = i - 1; setVisitedSteps(p => new Set([...p, n])); return n; });
  const goNext = () => !isLast && setIndex((i) => { const n = i + 1; setVisitedSteps(p => new Set([...p, n])); return n; });

  // Step completion logic
  const isStepCompleted = (stepId) => {
    if (isNewProject) {
      switch (stepId) {
        case "classification":
          return setupHasAllSelections();
        case "siteplan":
          return !!wizardData.sitePlanFormData;
        case "license":
          return noPermit || !!wizardData.licenseFormData;
        default:
          return false;
      }
    }
    switch (stepId) {
      case "classification":
        return setupHasAllSelections();
      case "siteplan":
        return !!siteplan && siteplan.id;
      case "license":
        return noPermit || (!!license && license.id && !!(license.license_number || license.license_no));
      case "contract":
        return !!contractData && contractData.id && !!contractData.contract_date;
      default:
        return false;
    }
  };

  const canEnter = (i) => {
    if (i === 0) return true;
    if (!allowSitePlanFlow) return false;
    for (let j = 0; j < i; j++) {
      if (!isStepCompleted(STEPS[j]?.id)) return false;
    }
    return true;
  };
  const onStepClick = (i) => { if (canEnter(i)) { setIndex(i); setVisitedSteps(p => new Set([...p, i])); } };

  // ===== AUTO-SAVE DRAFT (for new projects) =====
  const saveDraft = useCallback(async (currentStep) => {
    if (!isNewProject) return;
    const rawStep = STEPS[currentStep]?.id || "setup";
    // Backend only accepts: setup, siteplan, license, contract
    const stepName = rawStep === "classification" ? "setup" : rawStep;
    // Exclude File objects from setup before serializing
    const { _projectImageFile, ...serializableSetup } = setup;
    const payload = {
      title: setup.legacyCode || setup.internalCode || t("untitled_draft"),
      current_step: stepName,
      data: {
        setup: serializableSetup,
        // siteplan and license are plain-object snapshots (not FormData)
        siteplan: wizardData.siteplan && typeof wizardData.siteplan === "object" ? wizardData.siteplan : null,
        license: wizardData.license && typeof wizardData.license === "object" ? wizardData.license : null,
        contract: wizardData.contract,
      },
    };
    try {
      if (draftId) {
        await projectApi.updateDraft(draftId, payload);
      } else {
        const created = await projectApi.createDraft(payload);
        if (created?.id) setDraftId(created.id);
      }
    } catch (e) {
      logger.warn("Draft auto-save failed", e);
    }
  }, [isNewProject, setup, wizardData, draftId, STEPS, t]);

  // Auto-save draft when moving between steps (for new projects)
  useEffect(() => {
    if (!isNewProject || !setupHasAllSelections()) return;
    clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => saveDraft(index), 2000);
    return () => clearTimeout(draftSaveTimerRef.current);
  }, [index, isNewProject, saveDraft]);

  // ===== CREATE PROJECT AT CONTRACT STEP =====
  const createProjectAndSaveAllData = async (contractFormData) => {
    try {
      setIsCreatingProject(true);

      // 1. Create the base project (code is auto-generated by backend)
      const projectPayload = {
        status: "draft",
        project_type: setup.projectType || "",
        contract_type: setup.contractType || "",
        project_category: setup.projectCategory || "",
        maintenance_type: setup.maintenanceType || "",
        contract_year: setup.contractYear || new Date().getFullYear(),
        legacy_code: setup.legacyCode || "",
        classification_data: setup._classification || {},
      };
      const projectRes = await projectApi.create(projectPayload);
      const newProjectId = projectRes?.id || projectRes?.data?.id;
      if (!newProjectId) throw new Error("Failed to create project");

      // 2. Upload project image if present
      if (setup._projectImageFile && setup._projectImageFile.size > 0) {
        try {
          const { getCsrfToken } = await import("../../../utils/cookies");
          const imgForm = new FormData();
          imgForm.append("project_image", setup._projectImageFile, setup._projectImageFile.name);
          const headers = {};
          const csrf = getCsrfToken();
          if (csrf) headers["X-CSRFToken"] = csrf;
          await fetch(`${API_BASE_URL}projects/${newProjectId}/`, {
            method: "PATCH", credentials: "include", headers, body: imgForm,
          });
        } catch (e) { logger.warn("Could not upload project image", e); }
      }

      // 3. Save site plan data (stored from SitePlanStep)
      if (wizardData.sitePlanFormData) {
        await projectApi.createSitePlan(newProjectId, wizardData.sitePlanFormData);
      }

      // 4. Save license data (stored from LicenseStep) — skipped when noPermit
      if (!noPermit && wizardData.licenseFormData) {
        try {
          await api.post(`projects/${newProjectId}/license/`, wizardData.licenseFormData);
        } catch (e) { logger.warn("Could not save license", e); }
      }

      // 5. Save contract data
      if (contractFormData) {
        // Update owners in contract FormData to remove is_authorized
        await api.post(`projects/${newProjectId}/contract/`, contractFormData);
      }

      // 6. Save contract_classification
      if (setup.contractClassification && !contractFormData) {
        try {
          await projectApi.saveContract(newProjectId, {
            contract_classification: setup.contractClassification,
          });
        } catch (_e) {}
      }

      // 7. Delete the draft (project created successfully)
      if (draftId) {
        try { await projectApi.deleteDraft(draftId); } catch (_e) {}
      }

      // Clear wizard localStorage
      try { localStorage.removeItem("wizard_setup_state_v1"); } catch (_e) {}

      // 8. Navigate to the new project
      navigate(`/projects/${newProjectId}`);

    } catch (err) {
      logger.error("Error creating project", err);
      const msg = err?.response?.data
        ? JSON.stringify(err.response.data, null, 2)
        : err.message || t("unknown_error");
      showError(`${t("homepage_error_creating_project")}: ${msg}`);
      throw err;
    } finally {
      setIsCreatingProject(false);
    }
  };

  const hasUnsavedChanges = () => {
    if (isNewProject) return setupHasAllSelections();
    return false;
  };

  const backTarget = sectionOnly && projectId ? `/projects/${projectId}` : "/projects";

  const handleBackToProjects = () => {
    if (hasUnsavedChanges() && !isView) {
      setShowBackConfirm(true);
    } else {
      navigate(backTarget);
    }
  };

  // Show loading overlay during project creation
  if (isCreatingProject) {
    return (
      <div className="container">
        <div className="card wizard-creating-overlay">
          <BrandedLoader size={80} />
          <div className="wizard-creating-overlay__text">
            {t("creating_project")}
          </div>
          {t("please_wait") && (
            <div className="wizard-creating-overlay__subtext">
              {t("please_wait")}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Back Confirmation Dialog */}
      <Dialog
        open={showBackConfirm}
        title={t("wizard.confirm_return_title")}
        desc={t("wizard.confirm_return_desc")}
        confirmLabel={t("wizard.confirm_return_yes")}
        cancelLabel={t("cancel")}
        onClose={() => setShowBackConfirm(false)}
        onConfirm={() => {
          setShowBackConfirm(false);
          // Auto-save draft before leaving
          if (isNewProject && setupHasAllSelections()) {
            saveDraft(index);
          }
          navigate(backTarget);
        }}
        onCancel={() => setShowBackConfirm(false)}
      />

      {/* Header */}
      <PageHeader
        onBack={handleBackToProjects}
        backLabel={sectionOnly ? t("back") : t("wizard.back_to_projects")}
        title={isNewProject ? t("new_project") : (project?.name || labels.projectPrefix)}
        subtitle={!isNewProject && project?.internal_code ? project.internal_code : undefined}
        className={!sectionOnly && STEPS.length > 1 ? 'wizard-page-header' : 'wizard-page-header wizard-page-header--no-stepper'}
        actions={
          viewMode && !isNewProject ? (
            <Button variant="primary" size="sm" onClick={() => setViewMode(false)}>
              {t("edit")}
            </Button>
          ) : !viewMode && !isNewProject ? (
            <Button variant="secondary" size="sm" onClick={() => setViewMode(true)}>
              {t("view")}
            </Button>
          ) : null
        }
      />

      {/* Stepper */}
      {!sectionOnly && STEPS.length > 1 && (
        <div className="wizard-stepper-wrapper">
          <WizardStepper
            steps={STEPS}
            currentIndex={index}
            onStepClick={onStepClick}
            isStepCompleted={isStepCompleted}
            canEnter={canEnter}
          />
        </div>
      )}

      {/* Content Area — mount-once: each step mounts the first time it becomes active,
           then stays mounted (hidden via CSS) to preserve unsaved state */}
      <div className="wizard-content">
        <div style={{ display: index === 0 ? undefined : "none" }}>
          {STEPS.length > 0 && (
            <ProjectTypeSelector
              onChange={setSetup}
              onNext={() => { pendingAdvanceRef.current = true; }}
              initialData={!isNewProject ? setup._classification : null}
            />
          )}
        </div>

        {allowSitePlanFlow && (
          <>
            {/* SitePlanStep: mount when user first reaches step 1 */}
            {(index >= 1 || visitedSteps.has(1)) && (
              <div style={{ display: index === 1 ? undefined : "none" }}>
                <SitePlanStep
                  projectId={isNewProject ? null : projectId}
                  setup={setup}
                  onPrev={sectionOnly ? undefined : goPrev}
                  onNext={sectionOnly ? undefined : goNext}
                  isView={isView}
                  isNewProject={isNewProject}
                  noPermit={noPermit}
                  onSitePlanReady={({ formData, snapshot }) => {
                    setWizardData((prev) => ({
                      ...prev,
                      sitePlanFormData: formData,
                      siteplan: snapshot || true,
                    }));
                    goNext();
                  }}
                />
              </div>
            )}
            {/* LicenseStep: only shown when project requires a building permit */}
            {!noPermit && (index >= 2 || visitedSteps.has(2)) && (
              <div style={{ display: index === 2 ? undefined : "none" }}>
                <LicenseStep
                  projectId={isNewProject ? null : projectId}
                  onPrev={sectionOnly ? undefined : goPrev}
                  onNext={sectionOnly ? undefined : goNext}
                  isView={isView}
                  isNewProject={isNewProject}
                  onLicenseReady={({ formData, snapshot }) => {
                    setWizardData((prev) => ({
                      ...prev,
                      licenseFormData: formData,
                      license: snapshot || true,
                    }));
                    goNext();
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* ContractStep: in edit mode, mount immediately when projectId is available
            so useContract can start loading data right away — never toggled by allowSitePlanFlow.
            In new project mode, only mount once allowSitePlanFlow is true (steps expanded).
            Contract index is 3 (with license) or 2 (without license / noPermit). */}
        {(!isNewProject ? !!projectId : allowSitePlanFlow && (index >= contractStepIndex || visitedSteps.has(contractStepIndex))) && (
          <div style={{ display: index === contractStepIndex && allowSitePlanFlow ? undefined : "none" }}>
            <ContractStep
              projectId={isNewProject ? null : projectId}
              onPrev={sectionOnly ? undefined : goPrev}
              onNext={sectionOnly ? undefined : undefined}
              isView={isView}
              isNewProject={isNewProject}
              onCreateProject={isNewProject ? createProjectAndSaveAllData : undefined}
              setup={setup}
              onSetupChange={setSetup}
              siteplanSnapshot={isNewProject ? wizardData.siteplan : null}
              noPermit={noPermit}
            />
          </div>
        )}
      </div>
    </div>
  );
}
