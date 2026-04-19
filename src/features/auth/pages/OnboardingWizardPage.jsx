import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { authApi, companyApi } from '../../../services';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import PhoneInput from '../../../components/forms/PhoneInput';
import { FaUser, FaBuilding, FaCheck, FaArrowRight, FaArrowLeft, FaUpload, FaImage } from 'react-icons/fa';
import { logger } from '../../../utils/logger';
import BRAND from '../../../config/brand';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function OnboardingWizardPage() {
  const navigate = useTenantNavigate();
  const { user, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';

  // Permission check
  useEffect(() => {
    if (user) {
      if (user.is_superuser) {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      const isCompanySuperAdmin = user.role?.name === 'company_super_admin';
      if (!isCompanySuperAdmin) {
        navigate('/dashboard', { replace: true });
        return;
      }
      if (user.onboarding_completed) {
        navigate('/dashboard', { replace: true });
        return;
      }
    }
  }, [user, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Step 1: Profile (phone + avatar only — name/email already set by admin)
    phone: '',
    avatar: null,
    // Step 2: Company branding
    company_logo: null,
    background_image: null,
  });

  // Preview URLs for uploaded files
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      // Create preview
      const url = URL.createObjectURL(files[0]);
      if (name === 'avatar') setAvatarPreview(url);
      if (name === 'company_logo') setLogoPreview(url);
      if (name === 'background_image') setBgPreview(url);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (bgPreview) URL.revokeObjectURL(bgPreview);
    };
  }, [avatarPreview, logoPreview, bgPreview]);

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(2);
      setError('');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Step 1: Update profile + mark onboarding complete
      const profileData = new FormData();
      if (formData.phone && formData.phone.trim()) {
        const digits = formData.phone.trim().replace(/\s+/g, '');
        profileData.append('phone', `+971${digits}`);
      }
      if (formData.avatar) {
        profileData.append('avatar', formData.avatar);
      }
      profileData.append('onboarding_completed', 'true');
      await authApi.updateProfile(profileData);

      // Step 2: Update company branding (logo + background only)
      const settingsData = new FormData();
      if (formData.company_logo) {
        settingsData.append('company_logo', formData.company_logo);
      }
      if (formData.background_image) {
        settingsData.append('background_image', formData.background_image);
      }
      // Fixed STRUCTORA colors
      settingsData.append('primary_color', BRAND.primaryColor);
      settingsData.append('secondary_color', BRAND.secondaryColor);

      // Only send if there's something to update
      if (formData.company_logo || formData.background_image) {
        await companyApi.updateCurrentSettings(settingsData);
      }

      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      logger.error('Onboarding error', err);
      let errorMsg = t('onboarding_error_saving_settings');
      if (err.response?.data) {
        const d = err.response.data;
        if (typeof d === 'string') errorMsg = d;
        else if (d.error) errorMsg = d.error;
        else if (d.message) errorMsg = d.message;
        else if (d.detail) errorMsg = d.detail;
        else {
          const errors = Object.entries(d)
            .filter(([k]) => !['detail', 'non_field_errors'].includes(k))
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`);
          if (errors.length) errorMsg = errors.join(', ');
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: t('onboarding_step_profile_setup'), icon: FaUser },
    { number: 2, title: t('onboarding_step_company_theme'), icon: FaBuilding },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="onboarding-page">
      <Card className="onboarding-card">
        {/* Progress Steps */}
        <div className="onboarding-steps-container">
          <div className="onboarding-steps">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              return (
                <div key={step.number} className="onboarding-step">
                  <div className={`onboarding-step-icon ${isActive || isCompleted ? 'onboarding-step-icon--active' : 'onboarding-step-icon--inactive'}`}>
                    {isCompleted ? <FaCheck /> : <Icon />}
                  </div>
                  <div className={`onboarding-step-label ${isActive || isCompleted ? 'onboarding-step-label--active' : 'onboarding-step-label--inactive'}`}>
                    {step.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="onboarding-error">
            <strong>{t('onboarding_error_label')}</strong> {error}
          </div>
        )}

        {/* Step 1: Profile Setup */}
        {currentStep === 1 && (
          <div>
            <h2 className="onboarding-step-title">
              {t('onboarding_profile_setup_title')}
            </h2>

            <div className="ds-flex ds-flex-col ds-gap-4">
              <Field label={t('onboarding_phone')}>
                <PhoneInput
                  value={formData.phone}
                  onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))}
                />
              </Field>

              <Field label={t('onboarding_profile_picture')}>
                <div className="onboarding-upload-area">
                  <input
                    type="file"
                    name="avatar"
                    accept="image/*"
                    onChange={handleChange}
                    className="ds-hidden"
                    id="avatar-upload"
                  />
                  {avatarPreview ? (
                    <label htmlFor="avatar-upload" className="onboarding-upload-preview onboarding-upload-preview--round">
                      <img src={avatarPreview} alt="Avatar" className="onboarding-upload-img" />
                      <span className="onboarding-upload-change">{t('onboarding_change_image')}</span>
                    </label>
                  ) : (
                    <label htmlFor="avatar-upload" className="onboarding-upload-placeholder onboarding-upload-placeholder--round">
                      <FaUser className="onboarding-upload-icon" />
                      <span>{t('onboarding_choose_image')}</span>
                    </label>
                  )}
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* Step 2: Company Branding (Logo + Background) */}
        {currentStep === 2 && (
          <div>
            <h2 className="onboarding-step-title">
              {t('onboarding_company_theme_title')}
            </h2>

            <div className="ds-flex ds-flex-col ds-gap-6">
              {/* Logo upload */}
              <Field label={t('onboarding_company_logo')}>
                <div className="onboarding-upload-area">
                  <input
                    type="file"
                    name="company_logo"
                    accept="image/*"
                    onChange={handleChange}
                    className="ds-hidden"
                    id="logo-upload"
                  />
                  {logoPreview ? (
                    <label htmlFor="logo-upload" className="onboarding-upload-preview">
                      <img src={logoPreview} alt="Logo" className="onboarding-upload-img" />
                      <span className="onboarding-upload-change">{t('onboarding_change_image')}</span>
                    </label>
                  ) : (
                    <label htmlFor="logo-upload" className="onboarding-upload-placeholder">
                      <FaUpload className="onboarding-upload-icon" />
                      <span>{t('onboarding_choose_logo')}</span>
                    </label>
                  )}
                </div>
              </Field>

              {/* Background image upload */}
              <Field label={t('onboarding_background_image')}>
                <div className="onboarding-upload-area onboarding-upload-area--wide">
                  <input
                    type="file"
                    name="background_image"
                    accept="image/*"
                    onChange={handleChange}
                    className="ds-hidden"
                    id="bg-upload"
                  />
                  {bgPreview ? (
                    <label htmlFor="bg-upload" className="onboarding-upload-preview onboarding-upload-preview--wide">
                      <img src={bgPreview} alt="Background" className="onboarding-upload-img onboarding-upload-img--wide" />
                      <span className="onboarding-upload-change">{t('onboarding_change_image')}</span>
                    </label>
                  ) : (
                    <label htmlFor="bg-upload" className="onboarding-upload-placeholder onboarding-upload-placeholder--wide">
                      <FaImage className="onboarding-upload-icon" />
                      <span>{t('onboarding_choose_background')}</span>
                    </label>
                  )}
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="onboarding-nav">
          {currentStep > 1 ? (
            <Button type="button" variant="secondary" onClick={handleBack} disabled={loading}>
              <FaArrowLeft className="ds-icon-gap-reverse" />
              {t('onboarding_back')}
            </Button>
          ) : (
            <div></div>
          )}

          {currentStep < 2 ? (
            <Button type="button" variant="primary" onClick={handleNext} disabled={loading}>
              {t('onboarding_next')}
              <FaArrowRight className="ds-icon-gap" />
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={handleSubmit} disabled={loading} loading={loading}>
              <FaCheck className="ds-icon-gap" />
              {t('onboarding_save_and_complete')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
