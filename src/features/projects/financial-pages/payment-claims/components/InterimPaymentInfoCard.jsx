/**
 * InterimPaymentInfoCard
 *
 * Displays the "Interim Payment Claim Information" card with project details.
 * Shared between CreatePaymentClaimPage (editable owner/description) and
 * ViewPaymentClaimPage (read-only).
 */
export default function InterimPaymentInfoCard({ data, onChange, readOnly = false, t }) {
  return (
    <div className="payment-claim-form-card">
      <div className="payment-claim-form-card-header">
        {t('interim_payment_claim_information') || 'معلومات طلب الدفعة المؤقتة'}
      </div>
      <div className="payment-claim-form-card-body">
        <div className="form-row">
          <div className="form-group">
            <label>{t('project_no') || 'PROJECT NO'}</label>
            <input
              type="text"
              value={data.project_no}
              readOnly
              className="read-only-field"
            />
          </div>

          <div className="form-group">
            <label>{t('interim_payment_number') || 'INTERIM PAYMENT NUMBER'}</label>
            <input
              type="text"
              value={data.interim_payment_number}
              readOnly
              className="read-only-field"
            />
          </div>

          <div className="form-group">
            <label>{t('date') || 'DATE'}</label>
            <input
              type="text"
              value={data.date}
              readOnly
              className="read-only-field"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label>{t('project_title') || 'PROJECT TITLE'}</label>
            <input
              type="text"
              value={data.project_title}
              readOnly
              className="read-only-field"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('project_image') || 'PROJECT IMAGE'}</label>
            {data.project_image ? (
              <div className="project-image-preview">
                <img
                  src={data.project_image}
                  alt={t('project_image') || 'Project Image'}
                  className="ds-img-thumbnail"
                />
              </div>
            ) : (
              <div className="no-image-placeholder">
                {t('no_image_available') || 'No image available'}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>{t('owner') || 'OWNER'}</label>
            {readOnly ? (
              <input
                type="text"
                value={data.owner}
                readOnly
                className="read-only-field"
              />
            ) : (
              <input
                type="text"
                value={data.owner}
                onChange={(e) => onChange?.('owner', e.target.value)}
                placeholder={t('enter_owner_name') || 'Enter owner name'}
              />
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label>{t('project_description') || 'PROJECT DESCRIPTION'}</label>
            {readOnly ? (
              <textarea
                value={data.project_description}
                readOnly
                rows={4}
                className="read-only-field"
              />
            ) : (
              <textarea
                value={data.project_description}
                onChange={(e) => onChange?.('project_description', e.target.value)}
                rows={4}
                placeholder={t('enter_project_description') || 'Enter project description'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
