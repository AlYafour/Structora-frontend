import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../../services/admin/adminApi';
import { useNotifications } from '../../../contexts/NotificationContext';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import PhoneInput from '../../../components/forms/PhoneInput';
import RtlSelect from '../../../components/forms/RtlSelect';
import { UAE_CITIES } from '../../../utils/constants';
import PageLayout from '../../../components/layout/PageLayout';
import {
  FaBuilding,
  FaSave,
  FaArrowRight,
  FaArrowLeft,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { logger } from '../../../utils/logger';
import './AdminCreateCompanyPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function AdminEditCompanyPage() {
  const { tenantId } = useParams();
  const navigate = useTenantNavigate();
  const { t, i18n } = useTranslation();
  const { success, error: showError } = useNotifications();
  const isRTL = i18n.language === 'ar';
  const lang = i18n.language;
  const ArrowIcon = isRTL ? FaArrowLeft : FaArrowRight;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const cityOptions = useMemo(() =>
    UAE_CITIES.map(c => ({ value: c.value, label: c.label[lang] || c.label.en })), [lang]);

  const [formData, setFormData] = useState({
    company_name: '',
    contractor_name_en: '',
    company_email: '',
    company_phone: '',
    company_license_number: '',
    company_city: '',
    company_address: '',
  });

  useEffect(() => {
    loadCompanyData();
  }, [tenantId]);

  const loadCompanyData = async () => {
    setLoadingData(true);
    try {
      const settings = await adminApi.getTenantSettings(tenantId);
      setFormData({
        company_name: settings.company_name || '',
        contractor_name_en: settings.contractor_name_en || '',
        company_email: settings.company_email || '',
        company_phone: settings.company_phone || '',
        company_license_number: settings.company_license_number || '',
        company_city: settings.company_city || '',
        company_address: settings.company_address || '',
      });
    } catch (err) {
      logger.error('Error loading company data', err);
      showError(t('company_error_loading_data'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        company_name: formData.company_name,
        contractor_name: formData.company_name,
        contractor_name_en: formData.contractor_name_en,
        company_email: formData.company_email,
        company_phone: formData.company_phone,
        company_license_number: formData.company_license_number,
        company_city: formData.company_city,
        company_address: formData.company_address,
      };

      await adminApi.updateTenantSettings(tenantId, payload);
      success(t('admin_company_updated_success'));
      navigate('/admin/tenants');
    } catch (err) {
      logger.error('Error updating company', err);
      let errorMsg = t('admin_company_update_error');
      if (err.response?.data) {
        const d = err.response.data;
        if (d.error) errorMsg = d.error;
        else if (d.message) errorMsg = d.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout loading={loadingData} loadingText={t('loading')}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="admin-create">
        {/* Header */}
        <div className="admin-create__header">
          <div>
            <h1 className="admin-create__title">{t('admin_edit_company')}</h1>
            <p className="admin-create__subtitle">{t('admin_edit_company_desc')}</p>
          </div>
          <button
            type="button"
            className="admin-create__back-btn"
            onClick={() => navigate('/admin/tenants')}
          >
            <ArrowIcon /> {t('admin_back_to_companies')}
          </button>
        </div>

        {/* Error */}
        {error && (
          <Card className="admin-create__error-card">
            <div className="admin-create__error">
              <FaExclamationTriangle className="admin-create__error-icon" />
              <div>
                <div className="admin-create__error-title">{t('admin_company_create_error_title')}</div>
                <div className="admin-create__error-body">{error}</div>
              </div>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="admin-create__section">
            <div className="admin-create__section-header">
              <div className="admin-create__section-icon">
                <FaBuilding />
              </div>
              <div>
                <h2 className="admin-create__section-title">{t('admin_company_basic_data')}</h2>
                <p className="admin-create__section-desc">{t('admin_company_basic_data_desc')}</p>
              </div>
            </div>

            <div className="admin-create__grid">
              <Field label={t('admin_company_name_ar')} required>
                <input
                  type="text"
                  name="company_name"
                  className="admin-create__input"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field label={t('admin_company_name_en')}>
                <input
                  type="text"
                  name="contractor_name_en"
                  className="admin-create__input"
                  value={formData.contractor_name_en}
                  onChange={handleChange}
                />
              </Field>

              <Field label={t('admin_field_company_email')} required>
                <input
                  type="email"
                  name="company_email"
                  className="admin-create__input"
                  value={formData.company_email}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field label={t('admin_field_phone_number')} required>
                <PhoneInput
                  value={formData.company_phone?.replace(/^\+971/, '')}
                  onChange={(val) => setFormData(prev => ({ ...prev, company_phone: val ? `+971${val}` : '' }))}
                />
              </Field>

              <Field label={t('admin_license_number')}>
                <input
                  type="text"
                  name="company_license_number"
                  className="admin-create__input admin-create__input--mono"
                  style={{ textTransform: 'uppercase' }}
                  value={formData.company_license_number}
                  onChange={(e) => {
                    let val = e.target.value.toUpperCase();
                    const afterPrefix = val.replace(/^CN-?/, '').replace(/\D/g, '');
                    setFormData(prev => ({ ...prev, company_license_number: afterPrefix ? `CN-${afterPrefix}` : 'CN-' }));
                  }}
                  onFocus={(e) => {
                    if (!e.target.value) {
                      setFormData(prev => ({ ...prev, company_license_number: 'CN-' }));
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === 'CN-') {
                      setFormData(prev => ({ ...prev, company_license_number: '' }));
                    }
                  }}
                  placeholder="CN-XXXXXXX"
                />
              </Field>

              <Field label={t('admin_city')}>
                <RtlSelect
                  options={cityOptions}
                  value={formData.company_city}
                  onChange={(val) => setFormData(prev => ({ ...prev, company_city: val }))}
                  placeholder={t('admin_select_city')}
                />
              </Field>

              <Field label={t('admin_address')} className="admin-create__field--full">
                <textarea
                  name="company_address"
                  className="admin-create__input admin-create__textarea"
                  value={formData.company_address}
                  onChange={handleChange}
                  rows="2"
                />
              </Field>
            </div>
          </Card>

          {/* Actions */}
          <div className="admin-create__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/admin/tenants')}
              disabled={loading}
            >
              {t('admin_cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
            >
              <FaSave /> {t('admin_save_changes')}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
