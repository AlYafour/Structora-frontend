import React from 'react';
import { formatDate, formatPercent } from '../../../../../utils/formatters';
import ActionMenu from '../../../../../components/common/ActionMenu';

export default function ProgressHistoryTable({
  history,
  projectData,
  i18n,
  canEditEntry,
  canDeleteEntry,
  handleOpenDialog,
  handleDeleteClick,
  navigate,
  projectId,
  t,
  canDeleteProgress,
  selectedIds,
  handleSelect,
  handleSelectAll,
  isAllSelected,
  selectAllRef,
}) {
  if (history.length === 0) {
    return (
      <div className="prj-empty-state">
        {t('progress_no_entries')}
      </div>
    );
  }

  const fmtPct = (val) => formatPercent(val, { fallback: '-' });

  return (
    <div className="prj-tab-section">
      <div className="prj-tab-section__title">{t('progress_history_title')}</div>
      <div className="prj-table__wrapper">
        <table className="prj-table">
          <thead>
            <tr>
              {canDeleteProgress && (
                <th rowSpan="2" style={{ width: '40px' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    ref={selectAllRef}
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              <th rowSpan="2" className="ds-text-center">{t('progress_history_date')}</th>
              <th colSpan="3" className="ds-text-center prj-history-th--owner">{t('progress_history_owner')}</th>
              <th colSpan="3" className="ds-text-center prj-history-th--bank">{t('progress_history_bank')}</th>
              <th colSpan="3" className="ds-text-center prj-history-th--vtotal">{t('progress_history_variations_total')}</th>
              <th rowSpan="2" className="ds-text-center">{t('progress_history_created_by')}</th>
              <th rowSpan="2" className="ds-text-center">{t('progress_history_notes')}</th>
              <th rowSpan="2" className="ds-w-60 ds-text-center">{t('progress_history_actions')}</th>
            </tr>
            <tr>
              <th className="ds-text-center prj-history-subth--owner">{t('progress_current_percent')}</th>
              <th className="ds-text-center prj-history-subth--owner">{t('progress_approved_percent')}</th>
              <th className="ds-text-center prj-history-subth--owner">{t('progress_financial_claims_percent')}</th>
              <th className="ds-text-center prj-history-subth--bank">{t('progress_current_percent')}</th>
              <th className="ds-text-center prj-history-subth--bank">{t('progress_approved_percent')}</th>
              <th className="ds-text-center prj-history-subth--bank">{t('progress_financial_claims_percent')}</th>
              <th className="ds-text-center prj-history-subth--vtotal">{t('progress_current_percent')}</th>
              <th className="ds-text-center prj-history-subth--vtotal">{t('progress_approved_percent')}</th>
              <th className="ds-text-center prj-history-subth--vtotal">{t('progress_financial_claims_percent')}</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr
                key={entry.id}
                style={selectedIds?.has(entry.id) ? { backgroundColor: '#eff6ff' } : undefined}
                onClick={() => navigate(`/projects/${projectId}/progress/${entry.id}/view`)}
              >
                {canDeleteProgress && (
                  <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(entry.id) ?? false}
                      onChange={(e) => handleSelect(entry.id, e.target.checked)}
                    />
                  </td>
                )}
                <td className="ds-text-center prj-nowrap ds-font-semibold">
                  {entry.entry_date ? formatDate(entry.entry_date, i18n.language) : '-'}
                </td>
                <td className="ds-text-center prj-history-td--owner">
                  {fmtPct(entry.owner_actual_current)}
                </td>
                <td className="ds-text-center ds-font-semibold prj-history-td--owner">
                  {fmtPct(entry.owner_technical_current)}
                </td>
                <td className="ds-text-center prj-history-td--owner">
                  {fmtPct(projectData?.owner_technical_approved)}
                </td>
                <td className="ds-text-center prj-history-td--bank">
                  {fmtPct(entry.bank_actual_current)}
                </td>
                <td className="ds-text-center ds-font-semibold prj-history-td--bank">
                  {fmtPct(entry.bank_technical_current)}
                </td>
                <td className="ds-text-center prj-history-td--bank">
                  {fmtPct(projectData?.bank_technical_approved)}
                </td>
                <td className="ds-text-center prj-history-td--vtotal">
                  {fmtPct(entry.variations_actual_current)}
                </td>
                <td className="ds-text-center ds-font-semibold prj-history-td--vtotal">
                  {fmtPct(entry.variations_technical_current)}
                </td>
                <td className="ds-text-center prj-history-td--vtotal">
                  {fmtPct(projectData?.variations_technical_approved)}
                </td>
                <td className="ds-text-center">
                  {entry.created_by_name || '-'}
                </td>
                <td className="prj-history-td--notes">
                  {entry.notes || '-'}
                </td>
                <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu items={[
                    ...(canEditEntry(entry)
                      ? [{ label: t('edit'), type: 'button', onClick: () => handleOpenDialog(entry) }]
                      : []),
                    ...(canDeleteEntry(entry)
                      ? [{ label: t('delete'), type: 'button', variant: 'danger', onClick: () => handleDeleteClick(entry.id) }]
                      : []),
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
