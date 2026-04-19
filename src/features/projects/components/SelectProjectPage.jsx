import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaSearch, FaTimes, FaFolderOpen } from "react-icons/fa";
import Button from "../../../components/common/Button";
import PageLayout from "../../../components/layout/PageLayout";
import Dialog from "../../../components/common/Dialog";
import Radio from "../../../components/forms/Radio";
import { formatInternalCode } from "../../../utils/formatters/id";
import { formatDate } from "../../../utils/formatters";
import { getProjectName } from "../utils/projectNameUtils.jsx";
import { useSelectProject } from "../hooks/useSelectProject";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

/**
 * Reusable SelectProjectPage component
 * Clean card-based design for selecting a project before adding data.
 */
export default function SelectProjectPage({
  navigationTarget,
  titleKey,
  subtitleKey,
  buttonLabelKey,
  emptyStateKey = "no_final_approved_projects",
  apiFilters = { approval_status: "final_approved" },
  apiIncludes = "contract,siteplan",
  customFilter = null,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const [search, setSearch] = useState("");

  const {
    projects,
    loading,
    selectedProjectId,
    setSelectedProjectId,
    errorMsg,
    setErrorMsg,
  } = useSelectProject({
    apiFilters,
    apiIncludes,
    customFilter,
  });

  // Filter projects by search
  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const name = getProjectName(p);
      const code = p?.internal_code || "";
      return (
        (name.ar || "").toLowerCase().includes(q) ||
        (name.en || "").toLowerCase().includes(q) ||
        (name.full || "").toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        formatInternalCode(code).toLowerCase().includes(q)
      );
    });
  }, [projects, search]);

  const handleContinue = () => {
    if (!selectedProjectId) {
      setErrorMsg(t("please_select_project"));
      return;
    }
    const targetPath = navigationTarget.replace(":id", selectedProjectId);
    navigate(targetPath);
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="select-project">
        {/* Header — single title, no subtitle repetition */}
        <div className="select-project__header">
          <h1 className="select-project__title">{t(titleKey)}</h1>
          <div className="select-project__toolbar">
            {projects.length > 0 && (
              <div className="select-project__search">
                <FaSearch className="select-project__search-icon" />
                <input
                  type="text"
                  className="select-project__search-input"
                  placeholder={t("search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="select-project__search-clear"
                    onClick={() => setSearch("")}
                  >
                    <FaTimes />
                  </Button>
                )}
              </div>
            )}
            <Button
              type="button"
              variant="primary"
              className="select-project__btn"
              onClick={handleContinue}
              disabled={!selectedProjectId || projects.length === 0}
            >
              {t(buttonLabelKey)}
            </Button>
          </div>
        </div>

        {/* Count */}
        {projects.length > 0 && (
          <div className="select-project__count">
            {filtered.length} {t("projects")}
          </div>
        )}

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="select-project__empty">
            <FaFolderOpen className="select-project__empty-icon" />
            <p className="select-project__empty-text">{t(emptyStateKey)}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="select-project__empty">
            <FaSearch className="select-project__empty-icon" />
            <p className="select-project__empty-text">{t("no_results")}</p>
          </div>
        ) : (
          <div className="select-project__list">
            {filtered.map((p) => {
              const isSelected = selectedProjectId === p.id;
              const projectName = getProjectName(p);
              return (
                <div
                  key={p.id}
                  className={`select-project__card ${isSelected ? "select-project__card--selected" : ""}`}
                  onClick={() => setSelectedProjectId(p.id)}
                >
                  <div className="select-project__card-radio">
                    <Radio
                      checked={isSelected}
                      onChange={() => setSelectedProjectId(p.id)}
                      name="selectedProject"
                      value={p.id}
                    />
                  </div>
                  <div className="select-project__card-body">
                    <div className="select-project__card-code">
                      {p?.internal_code
                        ? formatInternalCode(p.internal_code)
                        : `PRJ-${p?.id}`}
                    </div>
                    <div className="select-project__card-info">
                      <div className="select-project__card-name">
                        {projectName.ar || projectName.full || t("empty_value")}
                      </div>
                      {projectName.en && projectName.en !== projectName.ar && (
                        <div className="select-project__card-name-en">
                          {projectName.en}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="select-project__card-date">
                    {p?.contract_data?.project_end_date
                      ? formatDate(p.contract_data.project_end_date, i18n.language)
                      : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={!!errorMsg}
        title={t("error")}
        desc={errorMsg}
        confirmLabel={t("ok")}
        onClose={() => setErrorMsg("")}
        onConfirm={() => setErrorMsg("")}
      />
    </PageLayout>
  );
}
