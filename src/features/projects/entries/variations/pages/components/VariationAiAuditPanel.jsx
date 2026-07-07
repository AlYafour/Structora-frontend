import { useId, useState } from 'react';
import { FaRobot, FaUpload, FaTrash, FaFilePdf, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import Button from '../../../../../../components/common/Button';
import { projectApi } from '../../../../../../services/projects/projectApi';

const outcomes = {
  matched_locked: 'ai_outcome_matched_locked',
  approved_with_notes: 'ai_outcome_approved_with_notes',
  awaiting_amended_copy: 'ai_outcome_awaiting_amended_copy',
  non_conforming: 'ai_outcome_non_conforming',
  externally_rejected: 'ai_outcome_externally_rejected',
  externally_cancelled: 'ai_outcome_externally_cancelled',
};

export default function VariationAiAuditPanel({ variation, project, user, t, isArabic, reload, success, showError }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInputId = useId();
  const role = user?.role?.name;
  const pendingUpload = variation?.status === 'pending_official_document' || (variation?.status === 'approved' && variation?.updated_document_pending);
  const pendingAudit = variation?.status === 'pending_general_manager_final';
  const canManageOfficialDocument = !!user;
  const canUpload = pendingUpload && canManageOfficialDocument;
  const canAudit = pendingAudit && (role === 'company_super_admin' || user?.is_superuser);
  const result = variation?.ai_audit_result_json;
  const failedAuditError = variation?.ai_audit_status === 'failed' && typeof result?.error === 'string'
    ? result.error
    : '';
  const auditPoints = (() => {
    const directPoints = isArabic ? result?.points_ar : result?.points_en;
    if (Array.isArray(directPoints) && directPoints.length) {
      return directPoints.filter(point => typeof point === 'string' && point.trim());
    }

    if (Array.isArray(result?.discrepancies) && result.discrepancies.length) {
      return result.discrepancies
        .map((item) => {
          const description = isArabic ? item.description_ar : item.description_en;
          const page = item.page ? ` (${t('page')} ${item.page})` : '';
          return description ? `${description}${page}` : '';
        })
        .filter(Boolean);
    }

    const legacySummary = isArabic ? variation?.ai_audit_summary_ar : variation?.ai_audit_summary_en;
    return String(legacySummary || '')
      .split(/\n+/)
      .map(point => point.trim())
      .filter(Boolean);
  })();
  const selectedFileSize = file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '';

  const renderAuditPoint = (point) => {
    const pageMatch = String(point).match(/\s*\((Page|صفحة|الصفحة)\s+(\d+)\)\s*$/i);
    const pageLabel = pageMatch ? `${t('page')} ${pageMatch[2]}` : '';
    const text = pageMatch ? String(point).slice(0, pageMatch.index).trim() : String(point);
    const parts = text.split(/(BASELINE|SIGNED COPY)/g);

    return (
      <>
        <span className="var-ai-audit__finding-text">
          {parts.map((part, index) => (
            part === 'BASELINE' || part === 'SIGNED COPY'
              ? <strong key={`${part}-${index}`}>{part}</strong>
              : <span key={`${part}-${index}`}>{part}</span>
          ))}
        </span>
        {pageLabel && <span className="var-ai-audit__page-badge">{pageLabel}</span>}
      </>
    );
  };

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
      await reload();
      success(t('signed_copy_action_success'));
      setFile(null);
    } catch (error) {
      showError(error?.message || t('signed_copy_action_error'));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  if (!pendingUpload && !pendingAudit && !variation?.ai_audit_outcome) return null;
  return (
    <section className="var-ai-audit no-print">
      <div className="var-ai-audit__header">
        <div className="var-ai-audit__icon"><FaRobot /></div>
        <div className="var-ai-audit__heading">
          <div className="var-ai-audit__eyebrow"><FaShieldAlt /> {t('document_verification')}</div>
          <h3>{t('ai_final_audit')}</h3>
          <p>{t('ai_audit_advisory')}</p>
        </div>
        <span className="var-ai-audit__advisory-badge">{t('advisory_only')}</span>
      </div>
      {canUpload && (
        <div className="var-ai-audit__upload">
          <input id={fileInputId} className="var-ai-audit__file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] || null)} disabled={busy} />
          <label className={`var-ai-audit__dropzone ${file ? 'var-ai-audit__dropzone--selected' : ''}`} htmlFor={fileInputId}>
            <span className="var-ai-audit__dropzone-icon">{file ? <FaFilePdf /> : <FaUpload />}</span>
            <span className="var-ai-audit__dropzone-copy">
              <strong>{file ? file.name : t('choose_official_document')}</strong>
              <small>{file ? selectedFileSize : t('official_document_file_hint')}</small>
            </span>
            <span className="var-ai-audit__browse">{t('browse_files')}</span>
          </label>
          <div className="var-ai-audit__upload-actions">
            <Button size="md" loading={busy} disabled={!file} startIcon={<FaUpload />} onClick={() => run(() => projectApi.uploadVariationSignedCopy(project.id, variation.id, file))}>{t('upload_signed_copy')}</Button>
            {variation?.variation_invoice_file && <Button variant="ghost" size="md" disabled={busy} startIcon={<FaTrash />} onClick={() => run(() => projectApi.removeVariationSignedCopy(project.id, variation.id))}>{t('remove')}</Button>}
          </div>
        </div>
      )}
      {!pendingUpload && !pendingAudit && <p>{t('signed_copy_stage_locked')}</p>}
      {variation?.variation_invoice_file && <div className="var-ai-audit__file"><FaCheckCircle /><span>{t('signed_copy_ready')}</span></div>}
      {canAudit && <div className="var-ai-audit__audit-action"><div><strong>{t('official_document_ready_for_audit')}</strong><small>{t('ai_audit_compare_hint')}</small></div><Button size="md" loading={busy} disabled={!variation?.variation_invoice_file} startIcon={<FaRobot />} onClick={() => run(() => projectApi.runVariationAiAudit(project.id, variation.id))}>{t('run_ai_audit')}</Button></div>}
      {variation?.ai_audit_status === 'failed' && (
        <div className="var-ai-audit__error">
          <strong>{t('ai_audit_failed')}</strong>
          {failedAuditError && <small>{failedAuditError}</small>}
        </div>
      )}
      {variation?.ai_audit_outcome && (
        <div className={`var-ai-audit__result var-ai-audit__result--${variation.ai_audit_outcome}`}>
          <div className="var-ai-audit__result-head">
            <span className="var-ai-audit__outcome">{t(outcomes[variation.ai_audit_outcome])}</span>
            {result?.needs_human_review && (
              <span className="var-ai-audit__review-badge">{t('human_review_required')}</span>
            )}
          </div>
          {!!auditPoints.length && (
            <ol className="var-ai-audit__findings">
              {auditPoints.map((point, index) => (
                <li key={`${variation.ai_audit_outcome}-${index}`}>
                  {renderAuditPoint(point)}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
