import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectApi } from '../../../../services/projects';
import { logger } from '../../../../utils/logger';
import { handleError } from '../../../../utils/errorHandler';
import PageLayout from '../../../../components/layout/PageLayout';
import FinancialActionBar from '../../../../components/common/FinancialActionBar';
import ProjectEntryInfo from '../../../../components/common/ProjectEntryInfo';
import Button from '../../../../components/common/Button';
import FileAttachmentView from '../../../../components/file-upload/FileAttachmentView';
import { formatDate, formatPercent } from '../../../../utils/formatters';
import { MetricCard, MetricGrid } from '../../../../components/common/MetricCard';
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import { parseAttachmentData } from '../../../../utils/helpers/parsing';
import { parseVariationProgress } from './utils/progressCalculations';
import useTenantNavigate from '../../../../hooks/useTenantNavigate';
import './ViewProgressEntryPage.css';

export default function ViewProgressEntryPage() {
  const { projectId, entryId } = useParams();
  const navigate = useTenantNavigate();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entry, setEntry] = useState(null);
  const [project, setProject] = useState(null);
  const [contract, setContract] = useState(null);
  const [variations, setVariations] = useState([]);

  useEffect(() => {
    loadData();
  }, [projectId, entryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [progressHistory, projectData, contractData, variationsData] = await Promise.all([
        projectApi.getProjectProgress(projectId),
        projectApi.getById(projectId),
        projectApi.getContract(projectId).catch(() => null),
        projectApi.getVariations(projectId).catch(() => []),
      ]);

      const foundEntry = progressHistory?.find(e => String(e.id) === String(entryId));

      if (!foundEntry) {
        setError(t('progress_entry_not_found'));
        setLoading(false);
        return;
      }

      setEntry(foundEntry);
      setProject(projectData);
      setContract(Array.isArray(contractData) ? contractData[0] : contractData);

      const variationsList = Array.isArray(variationsData)
        ? variationsData
        : (variationsData?.results || variationsData?.items || []);
      setVariations(variationsList);
    } catch (err) {
      const handledError = handleError(err, 'ViewProgressEntryPage.loadData');
      setError(handledError.message || t('error_loading_data'));
      logger.error('Error loading progress entry', handledError);
    } finally {
      setLoading(false);
    }
  };

  const fmtPct = (val) => formatPercent(val, { fallback: '—' });

  const handleBack = () => navigate(`/projects/${projectId}?tab=progress`);

  /** Lookup variation details by ID */
  const getVariationInfo = (variationId) => {
    const v = variations.find(v => String(v.id) === String(variationId));
    if (!v) return { number: `#${variationId}`, description: '' };

    const number = v.variation_number || v.modification_number || `#${v.id}`;
    let description = v.description || '';
    try {
      const parsed = JSON.parse(description);
      description = parsed.variation_description || parsed.description || parsed.subject || '';
    } catch (_e) { /* not JSON, use as-is */ }

    return { number, description };
  };

  if (error && !entry) {
    return (
      <PageLayout>
        <div className="entry-form">
          <FinancialActionBar onBack={handleBack} showSave={false} />
          <div className="card">
            <div className="card__body">
              <div className="prj-empty-state">
                <p>{error || t('progress_entry_not_found')}</p>
                <Button variant="primary" onClick={handleBack}>
                  {t('back_to_progress')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const variationProgress = entry ? parseVariationProgress(entry.variation_progress) : {};
  const { urls: attachmentUrls, names: attachmentNames } = entry ? parseAttachmentData(entry) : { urls: [], names: [] };

  return (
    <PageLayout loading={loading} loadingText={t('loading')}>
      <div className="entry-form entry-form--wide">
        <FinancialActionBar onBack={handleBack} showSave={false}>
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>

        {entry && (
          <>
            {/* ── Overall Progress ── */}
            <div className="card">
              <div className="card__header">
                {t('progress_buckets_overall')}
              </div>
              <div className="card__body">
                <MetricGrid columns={5}>
                  <MetricCard variant="cyan" icon="eye" label={t('progress_actual_current')} value={fmtPct(entry.overall_actual_current)} />
                  <MetricCard variant="blue" icon="gauge" label={t('progress_buckets_technical_current')} value={fmtPct(entry.technical_progress_current)} />
                  <MetricCard variant="emerald" icon="check" label={t('progress_buckets_technical_approved')} value={fmtPct(entry.technical_progress_approved)} />
                  <MetricCard variant="amber" icon="dollar" label={t('progress_buckets_financial')} value={fmtPct(entry.financial_progress)} />
                  <MetricCard variant="violet" icon="file" label={t('progress_buckets_invoice_approved')} value={fmtPct(entry.invoice_approved_progress)} />
                </MetricGrid>
              </div>
            </div>

            {/* ── Buckets Detail ── */}
            <div className="card">
              <div className="card__header">
                {t('progress_additional_info')}
              </div>
              <div className="card__body">
                <div className="progress-view__buckets">
                  {/* Owner */}
                  <div className="progress-view__bucket progress-view__bucket--info">
                    <div className="progress-view__bucket-header">
                      <span className="progress-view__bucket-icon">👤</span>
                      <span className="progress-view__bucket-title">{t('progress_buckets_owner')}</span>
                    </div>
                    <div className="progress-view__bucket-rows">
                      <div className="progress-view__bucket-row">
                        <span className="progress-view__bucket-label">{t('progress_current_percent')}</span>
                        <span className="progress-view__bucket-value">{fmtPct(entry.owner_actual_current)}</span>
                      </div>
                      <div className="progress-view__bucket-row">
                        <span className="progress-view__bucket-label">{t('progress_approved_percent')}</span>
                        <span className="progress-view__bucket-value">{fmtPct(entry.owner_technical_current)}</span>
                      </div>
                      <div className="progress-view__bucket-row">
                        <span className="progress-view__bucket-label">{t('progress_financial_claims_percent')}</span>
                        <span className="progress-view__bucket-value">{fmtPct(entry.owner_technical_approved)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bank — only for housing loan program projects */}
                  {contract?.contract_classification === 'housing_loan_program' && (
                    <div className="progress-view__bucket progress-view__bucket--success">
                      <div className="progress-view__bucket-header">
                        <span className="progress-view__bucket-icon">🏦</span>
                        <span className="progress-view__bucket-title">{t('progress_buckets_bank')}</span>
                      </div>
                      <div className="progress-view__bucket-rows">
                        <div className="progress-view__bucket-row">
                          <span className="progress-view__bucket-label">{t('progress_current_percent')}</span>
                          <span className="progress-view__bucket-value">{fmtPct(entry.bank_actual_current)}</span>
                        </div>
                        <div className="progress-view__bucket-row">
                          <span className="progress-view__bucket-label">{t('progress_approved_percent')}</span>
                          <span className="progress-view__bucket-value">{fmtPct(entry.bank_technical_current)}</span>
                        </div>
                        <div className="progress-view__bucket-row">
                          <span className="progress-view__bucket-label">{t('progress_financial_claims_percent')}</span>
                          <span className="progress-view__bucket-value">{fmtPct(entry.bank_technical_approved)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Variations */}
                  <div className="progress-view__bucket progress-view__bucket--warning">
                    <div className="progress-view__bucket-header">
                      <span className="progress-view__bucket-icon">📋</span>
                      <span className="progress-view__bucket-title">{t('progress_buckets_variations')}</span>
                    </div>
                    <div className="progress-view__bucket-rows">
                      <div className="progress-view__bucket-row">
                        <span className="progress-view__bucket-label">{t('progress_current_percent')}</span>
                        <span className="progress-view__bucket-value">{fmtPct(entry.variations_actual_current)}</span>
                      </div>
                      <div className="progress-view__bucket-row">
                        <span className="progress-view__bucket-label">{t('progress_approved_percent')}</span>
                        <span className="progress-view__bucket-value">{fmtPct(entry.variations_technical_current)}</span>
                      </div>
                      <div className="progress-view__bucket-row">
                        <span className="progress-view__bucket-label">{t('progress_financial_claims_percent')}</span>
                        <span className="progress-view__bucket-value">{fmtPct(entry.variations_technical_approved)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Individual Variations ── */}
            {Object.keys(variationProgress).length > 0 && (
              <div className="card">
                <div className="card__header">
                  {t('progress_variations_individual')}
                </div>
                <div className="card__body">
                  <div className="progress-view__variations-table-wrap">
                    <table className="progress-view__variations-table">
                      <thead>
                        <tr>
                          <th>{t('invoice_item_variation_column')}</th>
                          <th>{t('progress_current_percent')}</th>
                          <th>{t('progress_approved_percent')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(variationProgress).map((variationId) => {
                          const progress = variationProgress[variationId];
                          const info = getVariationInfo(variationId);
                          return (
                            <tr key={variationId}>
                              <td>
                                <span className="progress-view__var-number">{info.number}</span>
                                {info.description && (
                                  <span className="progress-view__var-desc">
                                    {info.description.length > 60 ? info.description.substring(0, 60) + '...' : info.description}
                                  </span>
                                )}
                              </td>
                              <td className="progress-view__var-val">
                                {progress.actual_current ? `${Number(progress.actual_current).toFixed(2)}%` : '—'}
                              </td>
                              <td className="progress-view__var-val">
                                {progress.technical_current ? `${Number(progress.technical_current).toFixed(2)}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Entry Meta & Notes & Attachments ── */}
            <div className="card">
              <div className="card__header">
                {t('progress_entry_date_label')} &amp; {t('progress_notes_label')}
              </div>
              <div className="card__body">
                <div className="prj-info-grid">
                  <div className="prj-info-item">
                    <div className="prj-info-label">{t('progress_entry_date_label')}</div>
                    <div className="prj-info-value">
                      {entry.entry_date ? formatDate(entry.entry_date, i18n.language) : '—'}
                    </div>
                  </div>
                  <div className="prj-info-item">
                    <div className="prj-info-label">{t('progress_history_created_by')}</div>
                    <div className="prj-info-value">{entry.created_by_name || '—'}</div>
                  </div>
                </div>

                {entry.notes && (
                  <div className="progress-view__notes">
                    <div className="prj-info-label">{t('progress_notes_label')}</div>
                    <div className="progress-view__notes-text">{entry.notes}</div>
                  </div>
                )}

                {attachmentUrls.length > 0 && (
                  <div className="progress-view__attachments">
                    <div className="prj-info-label">{t('progress_attachment_label')} ({attachmentUrls.length})</div>
                    <div className="progress-view__files">
                      {attachmentUrls.map((url, index) => {
                        if (!url || url.trim() === '') return null;
                        return (
                          <FileAttachmentView
                            key={url}
                            fileUrl={url}
                            fileName={attachmentNames[index] || extractFileNameFromUrl(url)}
                            projectId={projectId}
                            endpoint={`projects/${projectId}/progress/${entry.id}/`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
