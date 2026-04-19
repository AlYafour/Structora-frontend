import { memo, useMemo, useState, useCallback } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import BulkActionsBar from "../../../components/common/BulkActionsBar";
import { formatDate } from "../../../utils/formatters";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

const ExtensionsTab = memo(function ExtensionsTab({ projectId, startOrder }) {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const extensions = startOrder?.extensions;
  const hasExtensions = Array.isArray(extensions) && extensions.length > 0;

  // Selection state (index-based since extensions don't have individual IDs)
  const [selectedIdxs, setSelectedIdxs] = useState(new Set());

  const isAllSelected = hasExtensions && selectedIdxs.size === extensions.length;
  const isIndeterminate = selectedIdxs.size > 0 && selectedIdxs.size < (extensions?.length || 0);

  const handleSelect = useCallback((idx, checked) => {
    setSelectedIdxs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(idx);
      else next.delete(idx);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked && extensions) {
      setSelectedIdxs(new Set(extensions.map((_, i) => i)));
    } else {
      setSelectedIdxs(new Set());
    }
  }, [extensions]);

  const clearSelection = useCallback(() => setSelectedIdxs(new Set()), []);

  const selectAllRef = useCallback(
    (input) => { if (input) input.indeterminate = isIndeterminate; },
    [isIndeterminate]
  );

  // Statistics
  const stats = useMemo(() => {
    if (!hasExtensions) return { count: 0, totalDays: 0, totalMonths: 0 };
    let totalDays = 0;
    let totalMonths = 0;
    extensions.forEach((ext) => {
      totalDays += Number(ext.days) || 0;
      totalMonths += Number(ext.months) || 0;
    });
    return { count: extensions.length, totalDays, totalMonths };
  }, [extensions, hasExtensions]);

  // Selected stats
  const selectedStats = useMemo(() => {
    if (selectedIdxs.size === 0 || !extensions) return { count: 0, totalDays: 0, totalMonths: 0 };
    let totalDays = 0;
    let totalMonths = 0;
    extensions.forEach((ext, i) => {
      if (selectedIdxs.has(i)) {
        totalDays += Number(ext.days) || 0;
        totalMonths += Number(ext.months) || 0;
      }
    });
    return { count: selectedIdxs.size, totalDays, totalMonths };
  }, [selectedIdxs, extensions]);

  const editUrl = `/projects/${projectId}/extensions/edit`;

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          <Button as={Link} to={editUrl} variant="primary" size="md">
            {t("add_extension")}
          </Button>
        </div>
      </div>

      {hasExtensions ? (
        <>
          {/* Stats */}
          <MetricGrid>
            <MetricCard variant="blue" icon="hash" label={t("extensions_count")} value={stats.count} />
            <MetricCard variant="emerald" icon="calendar" label={t("total_extension_days")} value={stats.totalDays} />
            <MetricCard variant="emerald" icon="calendar" label={t("total_extension_months")} value={stats.totalMonths} />
          </MetricGrid>

          {/* Bulk Actions Bar */}
          <BulkActionsBar
            selectedCount={selectedIdxs.size}
            onClear={clearSelection}
            stats={selectedIdxs.size > 0 ? `${t("total_extension_days")}: ${selectedStats.totalDays} | ${t("total_extension_months")}: ${selectedStats.totalMonths}` : undefined}
          />

          {/* Table */}
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
                  const isSelected = selectedIdxs.has(i);
                  return (
                    <tr
                      key={ext.id || i}
                      className={isSelected ? "is-selected" : ""}
                      onClick={() => navigate(editUrl)}
                    >
                      <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelect(i, e.target.checked)}
                          className="prj-checkbox"
                        />
                      </td>
                      <td className="ds-text-center ds-font-medium prj-table__index">
                        {i + 1}
                      </td>
                      <td>
                        <span className="ds-table__cell-text" title={ext.reason}>
                          {ext.reason || "-"}
                        </span>
                      </td>
                      <td className="prj-nowrap">
                        {ext.extension_date ? formatDate(ext.extension_date, i18n.language) : "-"}
                      </td>
                      <td>
                        {ext.approval_number || "-"}
                      </td>
                      <td className="ds-text-center ds-font-semibold">
                        {ext.days || 0}
                      </td>
                      <td className="ds-text-center ds-font-semibold">
                        {ext.months || 0}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {ext.file_url ? (
                          <FileAttachmentView
                            fileUrl={ext.file_url}
                            fileName={ext.file_name || extractFileNameFromUrl(ext.file_url)}
                            projectId={projectId}
                            endpoint={`projects/${projectId}/start-order/`}
                          />
                        ) : (
                          <span className="ds-text-muted">-</span>
                        )}
                      </td>
                      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu items={[
                          { label: t("edit"), to: editUrl, type: "link" },
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
