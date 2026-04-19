import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../../components/common/Button";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import useProject from "../../../../hooks/useProject";
import ProjectSetupStep from "../steps/ProjectSetupStep";
import { api } from "../../../../services/api";

export default function ViewSetup() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const { project, loading, error, reload } = useProject(projectId);

  // Local state for project setup data to allow in-page editing
  const [setup, setSetup] = useState({
    projectType: "",
    contractType: "",
    internalCode: "",
    contractClassification: "",
  });

  // Function to load contract_classification
  const loadContractClassification = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data } = await api.get(`projects/${projectId}/contract/`);
      if (Array.isArray(data) && data.length > 0 && data[0].contract_classification) {
        setSetup((prev) => ({
          ...prev,
          contractClassification: data[0].contract_classification,
        }));
      } else {
        // If no contract or classification exists, clear the value
        setSetup((prev) => ({
          ...prev,
          contractClassification: "",
        }));
      }
    } catch (e) {
      // If no contract exists yet, clear contractClassification
      setSetup((prev) => ({
        ...prev,
        contractClassification: "",
      }));
    }
  }, [projectId]);

  // Sync state with project data on load/update
  useEffect(() => {
    if (!project) return;
    setSetup((prev) => ({
      ...prev,
      projectType: project.project_type || "",
      contractType: project.contract_type || "",
      internalCode: project.internal_code || "",
    }));
    // Reload contract_classification when project changes (e.g., after reload)
    if (projectId) {
      loadContractClassification();
    }
  }, [project, projectId, loadContractClassification]);

  // Load contract_classification from Contract on initial load and when projectId changes
  // Wait until useProject loading completes
  useEffect(() => {
    if (!projectId) return;

    // If loading is finished, load the data
    if (!loading) {
      // Small delay to ensure everything is ready (especially after F5 refresh)
      const timer = setTimeout(() => {
        loadContractClassification();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [projectId, loading, loadContractClassification]);

  // Listen for the contract-updated event to reload data
  useEffect(() => {
    const handleContractUpdate = (event) => {
      if (event.detail?.projectId === projectId) {
        loadContractClassification();
      }
    };

    window.addEventListener("contract-updated", handleContractUpdate);

    return () => {
      window.removeEventListener("contract-updated", handleContractUpdate);
    };
  }, [projectId, loadContractClassification]);

  // Reload contract_classification when the page becomes visible again (after saving contract)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadContractClassification();
      }
    };

    const handleFocus = () => {
      loadContractClassification();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadContractClassification]);

  const title = project?.display_name || project?.name || `${t("wizard_project_prefix")} #${projectId}`;

  return (
    <PageLayout
      loading={loading}
      error={error}
      loadingText={t("loading")}
      errorText={t("error_default")}
    >
      <div className="container">
        <ViewPageHeader
          title={`${t("project_information")} — ${title}`}
          projectId={projectId}
          showWizard={false}
          backLabel={t("back_projects")}
        />

        <div className="mt-12">
          <ProjectSetupStep
            value={setup}
            onChange={setSetup}
            onNext={null}
            onPrev={null}
            isView={true}
            onSaved={reload}
          />
        </div>

        {/* Extra edit button removed here to reduce clutter.
            Editing is done from within the card itself (white edit button at top of setup section)
            or from the ProjectView page via the "edit project" / "edit" button */}
      </div>
    </PageLayout>
  );
}
