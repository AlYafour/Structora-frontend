import { memo, useMemo, useState, useCallback } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { pdf } from "@react-pdf/renderer";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import BulkActionsBar from "../../../components/common/BulkActionsBar";
import { formatDate } from "../../../utils/formatters";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import { projectApi } from "../../../services/projects";
import { useNotifications } from "../../../contexts/NotificationContext";
import ExtensionLetterDocument from "../entries/extensions/ExtensionLetterDocument";
import { prepareExtensionLetterAssets } from "../entries/extensions/extensionLetterAssets";

const ExtensionsTab = memo(function ExtensionsTab({ projectId, extensions = [] }) {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const { error: showError } = useNotifications();
  const hasExtensions = Array.isArray(extensions) && extensions.length > 0;

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadLetter = useCallback(async (ext) => {
    setDownloadingId(ext.id);
    try {
      const rawData = await projectApi.getProjectExtensionLetterData(projectId, ext.id);
      const data = await prepareExtensionLetterAssets(rawData);
      const blob = await pdf(<ExtensionLetterDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Extension_Letter_${data.approval_number || ext.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showError(t("download_extension_letter_failed"));
    } finally {
      setDownloadingId(null);
    }
  }, [projectId, showError, t]);

  const handleSelect = useCallback((id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedIds(new Set(extensions.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [extensions]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const isAllSelected = hasExtensions && selectedIds.size === extensions.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < extensions.length;

  const selectAllRef = useCallback(
    (input) => { if (input) input.indeterminate = isIndeterminate; },
    [isIndeterminate]
  );

  const stats = useMemo(() => {
    if (!hasExtensions) return { count: 0, totalDays: 0, totalMonths: 0 };
    let totalDays = 0, totalMonths = 0;
    extensions.forEach((ext) => {
      totalDays += Number(ext.days) || 0;
      totalMonths += Number(ext.months) || 0;
    });
    return { count: extensions.length, totalDays, totalMonths };
  }, [extensions, hasExtensions]);

  const selectedStats = useMemo(() => {
    if (selectedIds.size === 0) return { count: 0, totalDays: 0, totalMonths: 0 };
    let totalDays = 0, totalMonths = 0;
    extensions.forEach((ext) => {
      if (selectedIds.has(ext.id)) {
        totalDays += Number(ext.days) || 0;
        totalMonths += Number(ext.months) || 0;
      }
    });
    return { count: selectedIds.size, totalDays, totalMonths };
  }, [selectedIds, extensions]);

  const newUrl = `/projects/${projectId}/extensions/new`;
  const editUrlFor = (id) => `/projects/${projectId}/extensions/${id}/edit`;

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          <Button as={Link} to={newUrl} variant="primary" size="md">
            {t("add_extension")}
          </Button>
        </div>
      </div>

      {hasExtensions ? (
        <>
          <MetricGrid>
            <MetricCard variant="blue" icon="hash" label={t("extensions_count")} value={stats.count} />
            <MetricCard variant="emerald" icon="calendar" label={t("total_extension_days")} value={stats.totalDays} />
            <MetricCard variant="emerald" icon="calendar" label={t("total_extension_months")} value={stats.totalMonths} />
          </MetricGrid>

          <BulkActionsBar
            selectedCount={selectedIds.size}
            onClear={clearSelection}
            stats={selectedIds.size > 0 ? `${t("total_extension_days")}: ${selectedStats.totalDays} | ${t("total_extension_months")}: ${selectedStats.totalMonths}` : undefined}
          />

          <div className="prj-table__wrapper">
            <table className="prj-table">
              <thead>
                <tr>
                  <th className="ds-text-center ds-w-50">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={selectAllRef}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="prj-checkbox"
                      aria-label={t("select_all")}
                    />
                  </th>
                  <th className="ds-text-center ds-w-60">#</th>
                  <th>{t("extension_reason")}</th>
                  <th>{t("extension_date")}</th>
                  <th>{t("approval_number")}</th>
                  <th className="ds-text-center">{t("extension_duration_days")}</th>
                  <th className="ds-text-center">{t("extension_duration_months")}</th>
                  <th>{t("extension_file")}</th>
                  <th className="ds-w-60 ds-text-center">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {extensions.map((ext, i) => {
                  const isSelected = selectedIds.has(ext.id);
                  return (
                    <tr
                      key={ext.id}
                      className={isSelected ? "is-selected" : ""}
                      onClick={() => navigate(editUrlFor(ext.id))}
                    >
                      <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelect(ext.id, e.target.checked)}
                          className="prj-checkbox"
                        />
                      </td>
                      <td className="ds-text-center ds-font-medium prj-table__index">{i + 1}</td>
                      <td>
                        <span className="ds-table__cell-text" title={ext.reason}>
                          {ext.reason || "-"}
                        </span>
                      </td>
                      <td className="prj-nowrap">
                        {ext.extension_date ? formatDate(ext.extension_date, i18n.language) : "-"}
                      </td>
                      <td>{ext.approval_number || "-"}</td>
                      <td className="ds-text-center ds-font-semibold">{ext.days || 0}</td>
                      <td className="ds-text-center ds-font-semibold">{ext.months || 0}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {ext.file_url ? (
                          <FileAttachmentView
                            fileUrl={ext.file_url}
                            fileName={ext.file_name || extractFileNameFromUrl(ext.file_url)}
                            projectId={projectId}
                          />
                        ) : (
                          <span className="ds-text-muted">-</span>
                        )}
                      </td>
                      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu items={[
                          { label: t("edit"), to: editUrlFor(ext.id), type: "link" },
                          {
                            label: downloadingId === ext.id ? t("downloading") : t("download_extension_letter"),
                            onClick: () => handleDownloadLetter(ext),
                            type: "button",
                            disabled: downloadingId === ext.id,
                          },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="prj-empty-state">
          {t("no_extensions")}
        </div>
      )}
    </div>
  );
});

export default ExtensionsTab;
