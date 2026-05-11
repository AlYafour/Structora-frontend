import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { projectApi } from "../../../services/projects";
import { api, API_BASE_URL } from "../../../services/api";
import { logger } from "../../../utils/logger";
import { getErrorMessage } from "../../../utils/errorHandler";
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
import useProjectPermissions from "../../../hooks/useProjectPermissions";


import "./components/wizard.css";
import useTenantNavigate from "../../../hooks/useTenantNavigate";

const STEP_INDEX_WITH_LICENSE = { classification: 0, siteplan: 1, license: 2, contract: 3 };
const STEP_INDEX_WITHOUT_LICENSE = { classification: 0, siteplan: 1, contract: 2 };

export default function WizardPage() {
  const { t, i18n } = useTranslation();
  const isAR = i18n.language === "ar";

  const { error: showError, success: showSuccess } = useNotifications();
  const navigate = useTenantNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { projectId } = useParams();
  const [params] = useSearchParams();

  const isNewProject = !projectId || location.pathname === "/wizard/new";
  const draftIdFromUrl = params.get("draftId");

  const {
    permissions: projectPermissions,
    loading: permissionsLoading,
  } = useProjectPermissions(isNewProject ? null : projectId);

  const canEditProject = !!projectPermissions?.can_edit;


  const mode = (params.get("mode") || "").toLowerCase();
  const isViewFromUrl = mode === "view";
  const stepParam = (params.get("step") || "").toLowerCase();
  const sectionOnly = params.get("sectionOnly") === "true";

  const [viewMode, setViewMode] = useState(isViewFromUrl);
  const isView = viewMode;

  const { setup, setSetup } = useWizardState();
  const [project, setProject] = useState(null);
  const [index, setIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState(() => new Set([0]));
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const pendingAdvanceRef = useRef(false);

  const [draftId, setDraftId] = useState(draftIdFromUrl ? Number(draftIdFromUrl) : null);
  const [wizardData, setWizardData] = useState({
    setup: {},
    siteplan: null,
    sitePlanFormData: null,
    license: null,
    licenseFormData: null,
    contract: null,
  });
  const draftSaveTimerRef = useRef(null);

  useEffect(() => {
    if (isNewProject && !draftIdFromUrl) {
      setIndex(0);
    }
    if (!isNewProject) {
      setVisitedSteps(new Set([0, 1, 2, 3]));
    }
  }, [isNewProject, draftIdFromUrl]);

  const projectData = useProjectData(isNewProject ? null : projectId);
  const { siteplan, license, contract: contractData, reload } = projectData;

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
        } catch (e) {
          logger.error("Error updating contract classification", e);
        }
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

  useEffect(() => {
    if (isNewProject) {
      if (!draftIdFromUrl) {
        setSetup({
          projectType: "",
          contractType: "",
          internalCode: "",
          legacyCode: "",
          contractClassification: "",
          projectCategory: "",
          maintenanceType: "",
          contractYear: new Date().getFullYear(),
        });
        try {
          localStorage.removeItem("wizard_setup_state_v1");
        } catch (_e) { }
      }
      return;
    }

    if (!projectId) return;

    (async () => {
      try {
        const data = await projectApi.getWithIncludes(projectId, ["siteplan", "license", "contract"]);
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
      } catch (_e) {
        logger.debug("WizardPage: setup load failed", _e);
      }
    })();
  }, [projectId, setSetup, isNewProject, draftIdFromUrl]);

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

  const noPermit = setup._classification?.requiresPermit === "false" || setup.requiresPermit === "false";

  const STEP_INDEX = noPermit ? STEP_INDEX_WITHOUT_LICENSE : STEP_INDEX_WITH_LICENSE;

  const contractStepIndex = noPermit ? 2 : 3;

  useEffect(() => {
    if (pendingAdvanceRef.current && allowSitePlanFlow && index === 0) {
      pendingAdvanceRef.current = false;
      setIndex(1);
    }
  }, [allowSitePlanFlow, index]);

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
    if (!stepParam) return;
    const wanted = STEP_INDEX[stepParam] ?? 0;
    const maxIndex = allowSitePlanFlow ? STEPS.length - 1 : 0;
    const target = Math.min(wanted, maxIndex);
    setIndex(target);
    setVisitedSteps((p) => new Set([...p, target]));
  }, [stepParam, allowSitePlanFlow, STEPS.length]);

  useEffect(() => {
    if (index >= STEPS.length) setIndex(Math.max(0, STEPS.length - 1));
  }, [STEPS.length, index]);

  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;
  const goPrev = () =>
    !isFirst &&
    setIndex((i) => {
      const n = i - 1;
      setVisitedSteps((p) => new Set([...p, n]));
      return n;
    });
  const goNext = () =>
    !isLast &&
    setIndex((i) => {
      const n = i + 1;
      setVisitedSteps((p) => new Set([...p, n]));
      return n;
    });

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

  const onStepClick = (i) => {
    if (canEnter(i)) {
      setIndex(i);
      setVisitedSteps((p) => new Set([...p, i]));
    }
  };

  const saveDraft = useCallback(
    async (currentStep) => {
      if (!isNewProject) return;
      const rawStep = STEPS[currentStep]?.id || "setup";
      const stepName = rawStep === "classification" ? "setup" : rawStep;
      const { _projectImageFile, ...serializableSetup } = setup;

      const payload = {
        title: setup.legacyCode || setup.internalCode || t("untitled_draft"),
        current_step: stepName,
        data: {
          setup: serializableSetup,
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
    },
    [isNewProject, setup, wizardData, draftId, STEPS, t]
  );

  useEffect(() => {
    if (!isNewProject || !setupHasAllSelections()) return;
    clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => saveDraft(index), 2000);
    return () => clearTimeout(draftSaveTimerRef.current);
  }, [index, isNewProject, saveDraft]);

  const createProjectAndSaveAllData = async (contractFormData) => {
    try {
      setIsCreatingProject(true);

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

      if (setup._projectImageFile && setup._projectImageFile.size > 0) {
        try {
          const { getCsrfToken } = await import("../../../utils/cookies");
          const imgForm = new FormData();
          imgForm.append("project_image", setup._projectImageFile, setup._projectImageFile.name);
          const headers = {};
          const csrf = getCsrfToken();
          if (csrf) headers["X-CSRFToken"] = csrf;

          await fetch(`${API_BASE_URL}projects/${newProjectId}/`, {
            method: "PATCH",
            credentials: "include",
            headers,
            body: imgForm,
          });
        } catch (e) {
          logger.warn("Could not upload project image", e);
        }
      }

      if (wizardData.sitePlanFormData) {
        await projectApi.createSitePlan(newProjectId, wizardData.sitePlanFormData);
      }

      if (!noPermit && wizardData.licenseFormData) {
        try {
          await api.post(`projects/${newProjectId}/license/`, wizardData.licenseFormData);
        } catch (e) {
          logger.warn("Could not save license", e);
        }
      }

      if (contractFormData) {
        await api.post(`projects/${newProjectId}/contract/`, contractFormData);
      }

      if (setup.contractClassification && !contractFormData) {
        try {
          await projectApi.saveContract(newProjectId, {
            contract_classification: setup.contractClassification,
          });
        } catch (_e) { }
      }

      if (draftId) {
        try {
          await projectApi.deleteDraft(draftId);
        } catch (_e) { }
      }

      try {
        localStorage.removeItem("wizard_setup_state_v1");
      } catch (_e) { }

      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${newProjectId}`);
    } catch (err) {
      logger.error("Error creating project", err);
      showError(`${t("homepage_error_creating_project")}: ${getErrorMessage(err)}`);
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

  useEffect(() => {
    if (!isNewProject && !permissionsLoading && !canEditProject) {
      setViewMode(true);
    }
  }, [isNewProject, permissionsLoading, canEditProject]);


  const projectTitle = isNewProject
    ? t("new_project")
    : (
      isAR
        ? project?.display_name || project?.name
        : project?.display_name_en || project?.name
    ) || labels.projectPrefix;

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
      <Dialog
        open={showBackConfirm}
        title={t("wizard.confirm_return_title")}
        desc={t("wizard.confirm_return_desc")}
        confirmLabel={t("wizard.confirm_return_yes")}
        cancelLabel={t("cancel")}
        onClose={() => setShowBackConfirm(false)}
        onConfirm={() => {
          setShowBackConfirm(false);
          if (isNewProject && setupHasAllSelections()) {
            saveDraft(index);
          }
          navigate(backTarget);
        }}
        onCancel={() => setShowBackConfirm(false)}
      />

      <PageHeader
        onBack={handleBackToProjects}
        backLabel={sectionOnly ? t("back") : t("wizard.back_to_projects")}
        title={projectTitle}
        subtitle={!isNewProject && project?.internal_code ? project.internal_code : undefined}
        className={
          !sectionOnly && STEPS.length > 1
            ? "wizard-page-header"
            : "wizard-page-header wizard-page-header--no-stepper"
        }
        actions={
          viewMode && !isNewProject && canEditProject ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setViewMode(false)}
              disabled={permissionsLoading}
            >
              {t("edit")}
            </Button>
          ) : !viewMode && !isNewProject ? (
            <Button variant="secondary" size="sm" onClick={() => setViewMode(true)}>
              {t("view")}
            </Button>
          ) : null
        }

      />

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

      <div className="wizard-content">
        <div style={{ display: index === 0 ? undefined : "none" }}>
          {STEPS.length > 0 && (
            <ProjectTypeSelector
              onChange={setSetup}
              onNext={() => {
                pendingAdvanceRef.current = true;

                setIndex((current) => {
                  if (current === 0 && allowSitePlanFlow) {
                    setVisitedSteps((p) => new Set([...p, 1]));
                    pendingAdvanceRef.current = false;
                    return 1;
                  }
                  return current;
                });
              }}
              initialData={!isNewProject ? setup._classification : null}
              isView={isView}
              projectId={isNewProject ? null : projectId}
              isNewProject={isNewProject}
            />
          )}
        </div>

        {allowSitePlanFlow && (
          <>
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
                  isActive={index === 1}
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

            {!noPermit && (index >= 2 || visitedSteps.has(2)) && (
              <div style={{ display: index === 2 ? undefined : "none" }}>
                <LicenseStep
                  projectId={isNewProject ? null : projectId}
                  onPrev={sectionOnly ? undefined : goPrev}
                  onNext={sectionOnly ? undefined : goNext}
                  isView={isView}
                  isNewProject={isNewProject}
                  isActive={index === 2}
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

        {(!isNewProject
          ? !!projectId
          : allowSitePlanFlow && (index >= contractStepIndex || visitedSteps.has(contractStepIndex))) && (
            <div
              style={{
                display: index === contractStepIndex && allowSitePlanFlow ? undefined : "none",
              }}
            >
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
