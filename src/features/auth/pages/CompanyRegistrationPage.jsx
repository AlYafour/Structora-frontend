import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import Field from '../../../components/forms/Field';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import BrandLogo from '../../../components/common/BrandLogo';
import FileUpload from '../../../components/file-upload/FileUpload';
import PhoneInput from '../../../components/forms/PhoneInput';
import { api } from '../../../services/api';
import { authApi } from '../../../services/auth/authApi';
import { logger } from '../../../utils/logger';
import './CompanyRegistrationPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function CompanyRegistrationPage() {
  const navigate = useTenantNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Company Data
    company_name: '',
    company_logo: null,
    company_license_number: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    // Admin User Data
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_password: '',
    admin_password_confirm: '',
  });

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate password match
    if (formData.admin_password !== formData.admin_password_confirm) {
      setError(t('auth_passwords_not_match'));
      setLoading(false);
      return;
    }

    try {
      // Create FormData for file uploads
      const data = new FormData();
      data.append('company_name', formData.company_name);
      if (formData.company_logo) {
        data.append('company_logo', formData.company_logo);
      }
      data.append('company_license_number', formData.company_license_number || '');
      data.append('company_email', formData.company_email);
      data.append('company_phone', formData.company_phone ? `+971${formData.company_phone}` : '');
      data.append('company_address', formData.company_address || '');
      data.append('admin_first_name', formData.admin_first_name);
      data.append('admin_last_name', formData.admin_last_name);
      data.append('admin_email', formData.admin_email);
      data.append('admin_password', formData.admin_password);

      const response = await authApi.registerCompanyAlt(data);

      // Auto-login after registration
      if (response?.tokens || response?.data?.tokens) {
        await login(formData.admin_email, formData.admin_password);
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (err) {
      logger.error('Registration error', err.response?.data);
      const errorData = err.response?.data;
      let errorMessage = t('auth_registration_failed');

      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          // Display the first error from the list
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="company-registration">
      <Card className="company-registration__card">
        <div className="card-header company-registration__header">
          <BrandLogo type="structora" size={56} className="company-registration__logo" />
          <h1 className="card-title company-registration__title">
            {t('auth_register_new_company')}
          </h1>
          <p className="ds-text-muted ds-text-sm">
            {t('auth_register_description')}
          </p>
        </div>

        {error && (
          <div className="company-registration__error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Company Information Section */}
          <div>
            <h2 className="company-registration__section-title">
              {t('auth_company_information')}
            </h2>
            <div className="ds-grid-auto-250">
              <Field label={t('auth_company_name')} required>
                <input
                  type="text"
                  name="company_name"
                  className="input"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={t('auth_company_email')} required>
                <input
                  type="email"
                  name="company_email"
                  className="input"
                  value={formData.company_email}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={t('auth_phone_number')} required>
                <PhoneInput
                  value={formData.company_phone}
                  onChange={(val) => setFormData(prev => ({ ...prev, company_phone: val }))}
                />
              </Field>
              <Field label={t('auth_company_logo')}>
                <FileUpload
                  value={formData.company_logo instanceof File ? formData.company_logo : null}
                  onChange={(file) => setFormData({ ...formData, company_logo: file })}
                  accept="image/*"
                  maxSizeMB={5}
                  showPreview={true}
                  compressionOptions={{
                    maxSizeMB: 1,
                    maxWidthOrHeight: 800 }}
                />
              </Field>
              <Field label={t('auth_license_number')}>
                <input
                  type="text"
                  name="company_license_number"
                  className="input"
                  value={formData.company_license_number}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={t('auth_company_address')}>
                <textarea
                  name="company_address"
                  className="input"
                  rows={3}
                  value={formData.company_address}
                  onChange={handleInputChange}
                />
              </Field>
            </div>
          </div>

          <div className="company-registration__divider" />

          {/* Admin User Information Section */}
          <div>
            <h2 className="company-registration__section-title">
              {t('auth_admin_user_information')}
            </h2>
            <div className="ds-grid-auto-250">
              <Field label={t('auth_first_name')} required>
                <input
                  type="text"
                  name="admin_first_name"
                  className="input"
                  value={formData.admin_first_name}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={t('auth_last_name')} required>
                <input
                  type="text"
                  name="admin_last_name"
                  className="input"
                  value={formData.admin_last_name}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={t('auth_email')} required>
                <input
                  type="email"
                  name="admin_email"
                  className="input"
                  value={formData.admin_email}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={t('auth_password')} required>
                <input
                  type="password"
                  name="admin_password"
                  className="input"
                  value={formData.admin_password}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                />
              </Field>
              <Field label={t('auth_confirm_password')} required>
                <input
                  type="password"
                  name="admin_password_confirm"
                  className="input"
                  value={formData.admin_password_confirm}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                />
              </Field>
            </div>
          </div>

          <div className="company-registration__actions">
            <Button variant="secondary" onClick={() => navigate('/')} disabled={loading}>
              {t('auth_cancel')}
            </Button>
            <Button type="submit" variant="primary" size="lg" disabled={loading} loading={loading}>
              {t('auth_register_company')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

