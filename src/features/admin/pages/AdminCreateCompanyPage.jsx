import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../../services/admin/adminApi';
import { useNotifications } from '../../../contexts/NotificationContext';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import DateInput from '../../../components/forms/DateInput';
import PhoneInput from '../../../components/forms/PhoneInput';
import RtlSelect from '../../../components/forms/RtlSelect';
import { COUNTRIES, UAE_CITIES } from '../../../utils/constants';
import {
  FaBuilding,
  FaUser,
  FaSave,
  FaTimes,
  FaCrown,
  FaFileContract,
  FaExclamationTriangle,
  FaArrowRight,
  FaArrowLeft,
} from 'react-icons/fa';
import { logger } from '../../../utils/logger';
import './AdminCreateCompanyPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function AdminCreateCompanyPage() {
  const navigate = useTenantNavigate();
  const { t, i18n } = useTranslation();
  const { success, error: showError } = useNotifications();
  const isRTL = i18n.language === 'ar';
  const lang = i18n.language;
  const ArrowIcon = isRTL ? FaArrowLeft : FaArrowRight;
  const [loading, setLoading] = useState(false);

  const countryOptions = useMemo(() =>
    COUNTRIES.map(c => ({ value: c.value, label: c.label[lang] || c.label.en })), [lang]);
  const cityOptions = useMemo(() =>
    UAE_CITIES.map(c => ({ value: c.value, label: c.label[lang] || c.label.en })), [lang]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    company_name: '',
    company_name_en: '',
    company_slug: '',
    company_email: '',
    company_phone: '',
    company_license_number: '',
    company_country: '',
    company_city: '',
    company_address: '',
    subscription_status: 'trial',
    subscription_start_date: '',
    subscription_end_date: '',
    is_trial: true,
    trial_ends_at: '',
    max_users: 10,
    max_projects: 50,
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_password: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanedData = { ...formData };

      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '' && (key.includes('date') || key.includes('trial_ends_at'))) {
          cleanedData[key] = null;
        } else if (cleanedData[key] === '') {
          const requiredFields = [
            'company_name', 'company_email', 'company_phone',
            'admin_first_name', 'admin_last_name', 'admin_email', 'admin_password',
          ];
          if (!requiredFields.includes(key)) {
            delete cleanedData[key];
          }
        }
      });

      // Add +971 prefix to phone if digits only
      if (cleanedData.company_phone && !cleanedData.company_phone.startsWith('+')) {
        cleanedData.company_phone = `+971${cleanedData.company_phone}`;
      }

      logger.debug('Sending data', cleanedData);
      const response = await adminApi.createCompany(cleanedData);

      if (response) {
        success(t('admin_company_created_success'));
        navigate('/admin/tenants');
      }
    } catch (err) {
      logger.error('Error creating company', err.response?.data || err);

      const fieldLabels = {
        company_email: t('admin_field_company_email'),
        admin_email: t('admin_field_admin_email'),
        company_name: t('admin_field_company_name'),
        company_phone: t('admin_field_phone_number'),
        admin_first_name: t('admin_field_admin_first_name'),
        admin_last_name: t('admin_field_admin_last_name'),
        admin_password: t('admin_field_password'),
        company_slug: t('admin_field_company_code'),
      };

      let errorMsg = '';
      const extractErrors = (errorData) => {
        if (errorData && typeof errorData === 'object' && !errorData.message) {
          const errors = Object.entries(errorData)
            .filter(([key]) => !['detail', 'non_field_errors', 'message', 'error', 'status_code', 'debug'].includes(key))
            .map(([key, value]) => {
              const fieldLabel = fieldLabels[key] || key;
              const errorText = Array.isArray(value) ? value[0] : value;
              return `• ${fieldLabel}: ${errorText}`;
            });
          return errors.length > 0 ? errors.join('\n') : null;
        }
        return null;
      };

      if (err.data && typeof err.data === 'object') {
        errorMsg = extractErrors(err.data) || err.data.message || err.message || t('admin_company_create_error');
      } else if (err.response?.data) {
        const d = err.response.data;
        errorMsg = d.error || d.message || extractErrors(d) || JSON.stringify(d);
      } else {
        errorMsg = err.message || t('admin_company_create_error');
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="admin-create">
      {/* Header */}
      <div className="admin-create__header">
        <div>
          <h1 className="admin-create__title">{t('admin_create_new_company')}</h1>
          <p className="admin-create__subtitle">{t('admin_add_company_with_admin')}</p>
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
        {/* Section 1: Company Info */}
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
                name="company_name_en"
                className="admin-create__input"
                value={formData.company_name_en}
                onChange={handleChange}
              />
            </Field>

            <Field label={t('admin_field_company_code')} helpText={t('admin_company_code_help')}>
              <input
                type="text"
                name="company_slug"
                className="admin-create__input admin-create__input--mono"
                value={formData.company_slug}
                onChange={handleChange}
                placeholder={t('admin_company_code_placeholder')}
                pattern="[a-z0-9-]+"
                onInput={(e) => { e.target.value = e.target.value.toLowerCase(); }}
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
                value={formData.company_phone}
                onChange={(val) => setFormData(prev => ({ ...prev, company_phone: val }))}
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
                  // Strip the CN- prefix, keep only digits after it
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

            <Field label={t('admin_country')}>
              <RtlSelect
                options={countryOptions}
                value={formData.company_country}
                onChange={(val) => setFormData(prev => ({ ...prev, company_country: val }))}
                placeholder={t('admin_select_country')}
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

        {/* Section 2: Subscription & Limits */}
        <Card className="admin-create__section">
          <div className="admin-create__section-header">
            <div className="admin-create__section-icon admin-create__section-icon--gold">
              <FaFileContract />
            </div>
            <div>
              <h2 className="admin-create__section-title">{t('admin_subscription_and_limits')}</h2>
              <p className="admin-create__section-desc">{t('admin_subscription_desc')}</p>
            </div>
          </div>

          <div className="admin-create__grid admin-create__grid--narrow">
            <Field label={t('admin_subscription_status')}>
              <select
                name="subscription_status"
                className="admin-create__input"
                value={formData.subscription_status}
                onChange={handleChange}
              >
                <option value="trial">{t('admin_status_trial')}</option>
                <option value="active">{t('admin_status_active')}</option>
                <option value="suspended">{t('admin_status_suspended')}</option>
                <option value="expired">{t('admin_status_expired')}</option>
              </select>
            </Field>

            <Field label={t('admin_subscription_start_date')}>
              <DateInput
                className="admin-create__input"
                value={formData.subscription_start_date}
                onChange={(value) => setFormData(prev => ({ ...prev, subscription_start_date: value }))}
              />
            </Field>

            <Field label={t('admin_subscription_end_date')}>
              <DateInput
                className="admin-create__input"
                value={formData.subscription_end_date}
                onChange={(value) => setFormData(prev => ({ ...prev, subscription_end_date: value }))}
              />
            </Field>

            <Field label={t('admin_max_users')}>
              <input
                type="number"
                name="max_users"
                className="admin-create__input"
                value={formData.max_users}
                onChange={handleChange}
                min="1"
                required
              />
            </Field>

            <Field label={t('admin_max_projects')}>
              <input
                type="number"
                name="max_projects"
                className="admin-create__input"
                value={formData.max_projects}
                onChange={handleChange}
                min="1"
                required
              />
            </Field>
          </div>
        </Card>

        {/* Section 3: Admin User */}
        <Card className="admin-create__section">
          <div className="admin-create__section-header">
            <div className="admin-create__section-icon admin-create__section-icon--navy">
              <FaCrown />
            </div>
            <div>
              <h2 className="admin-create__section-title">{t('admin_main_user_data')}</h2>
              <p className="admin-create__section-desc">{t('admin_main_user_desc')}</p>
            </div>
          </div>

          <div className="admin-create__grid admin-create__grid--narrow">
            <Field label={t('admin_field_admin_first_name')} required>
              <input
                type="text"
                name="admin_first_name"
                className="admin-create__input"
                value={formData.admin_first_name}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label={t('admin_field_admin_last_name')} required>
              <input
                type="text"
                name="admin_last_name"
                className="admin-create__input"
                value={formData.admin_last_name}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label={t('admin_field_admin_email')} required>
              <input
                type="email"
                name="admin_email"
                className="admin-create__input"
                value={formData.admin_email}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label={t('admin_field_password')} required>
              <input
                type="password"
                name="admin_password"
                className="admin-create__input"
                value={formData.admin_password}
                onChange={handleChange}
                required
                minLength="8"
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
            <FaTimes /> {t('admin_cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            loading={loading}
          >
            <FaSave /> {t('admin_create_company')}
          </Button>
        </div>
      </form>
    </div>
  );
}
