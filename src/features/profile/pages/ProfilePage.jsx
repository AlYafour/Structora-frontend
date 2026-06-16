import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Field from '../../../components/forms/Field';
import FormGrid from '../../../components/forms/FormGrid';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import {
  ProfileIdentityCard,
  ProfileLayout,
  ProfilePageHeader,
  ProfilePanel,
} from '../../../components/profile/ProfileLayout';
import {
  FaArrowLeft,
  FaArrowRight,
  FaCamera,
  FaEye,
  FaEyeSlash,
  FaFingerprint,
  FaLock,
  FaRegSave,
  FaTrash,
  FaUser,
} from 'react-icons/fa';
import { logger } from '../../../utils/logger';
import { buildFileUrl } from '../../../utils/helpers/file';
import { authApi } from '../../../services/auth/authApi';
import { isWebAuthnSupported, createCredential } from '../../../utils/webauthn';
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, apiClient, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useTenantNavigate();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [biometricCredentials, setBiometricCredentials] = useState([]);
  const [registeringBiometric, setRegisteringBiometric] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
  });

  const languageOptions = [
    { value: 'ar', label: t('profile_lang_arabic') },
    { value: 'en', label: t('profile_lang_english') },
  ];

  const currentLanguage = user?.preferred_language || i18n.language || 'ar';
  const roleName = user?.role?.name
    ? t(`nav_role_${user.role.name.toLowerCase()}`, user.role.name)
    : '';
  const displayName = [formData.first_name, formData.last_name].filter(Boolean).join(' ')
    || user?.username
    || user?.email
    || t('profile_title');

  const loadBiometricCredentials = async () => {
    if (!isWebAuthnSupported()) return;
    try {
      const data = await authApi.listBiometricCredentials();
      setBiometricCredentials(data.credentials || []);
    } catch {
      setBiometricCredentials([]);
    }
  };

  useEffect(() => {
    loadBiometricCredentials();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterBiometric = async () => {
    setRegisteringBiometric(true);
    setMessage({ type: '', text: '' });
    try {
      const beginData = await authApi.webauthnRegisterBegin();
      const credential = await createCredential(beginData.publicKey);
      await authApi.webauthnRegisterComplete({
        state: beginData.state,
        credential,
        device_name: navigator.platform || 'Device',
      });
      setMessage({ type: 'success', text: t('biometric_registered') });
      loadBiometricCredentials();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || t('biometric_register_failed');
      setMessage({ type: 'error', text: msg });
    } finally {
      setRegisteringBiometric(false);
    }
  };

  const handleDeleteBiometric = async (credId) => {
    if (!window.confirm(t('biometric_confirm_delete'))) return;
    try {
      await authApi.deleteBiometricCredential(credId);
      setMessage({ type: 'success', text: t('biometric_deleted') });
      loadBiometricCredentials();
    } catch {
      setMessage({ type: 'error', text: t('biometric_delete_failed') });
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: t('profile_file_must_be_image') });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: t('profile_image_size_limit') });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const uploadData = new FormData();
      uploadData.append('avatar', file);
      await apiClient.post('auth/users/upload_avatar/', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({ type: 'success', text: t('profile_avatar_uploaded') });
      await refreshUser();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.response?.data?.detail || t('profile_upload_failed'),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm(t('profile_confirm_delete_avatar'))) return;

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.delete('auth/users/delete_avatar/');
      setMessage({ type: 'success', text: t('profile_avatar_deleted') });
      await refreshUser();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.response?.data?.detail || t('profile_delete_avatar_failed'),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: t('profile_file_must_be_image') });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: t('profile_image_size_limit') });
      return;
    }
    setUploadingSignature(true);
    setMessage({ type: '', text: '' });
    try {
      const uploadData = new FormData();
      uploadData.append('signature', file);
      await apiClient.post('auth/users/upload_signature/', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({ type: 'success', text: t('profile_signature_uploaded', 'Signature uploaded successfully') });
      await refreshUser();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.response?.data?.detail || t('profile_upload_failed'),
      });
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!window.confirm(t('profile_confirm_delete_signature', 'Delete your signature?'))) return;
    setUploadingSignature(true);
    setMessage({ type: '', text: '' });
    try {
      await apiClient.delete('auth/users/delete_signature/');
      setMessage({ type: 'success', text: t('profile_signature_deleted', 'Signature deleted') });
      await refreshUser();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.response?.data?.detail || t('profile_upload_failed'),
      });
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === currentLanguage) return;

    setChangingLanguage(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await apiClient.post('auth/users/set_language/', { language: newLanguage });
      await i18n.changeLanguage(newLanguage);
      await refreshUser();
      setMessage({
        type: 'success',
        text: response.data?.message || t('profile_language_updated'),
      });
    } catch (error) {
      logger.error('Language change error', error.response?.data);
      const errorData = error.response?.data;
      let errorMessage = t('profile_language_update_failed');

      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setChangingLanguage(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const { old_password, new_password, confirm_password } = passwordData;

    if (!old_password || !new_password || !confirm_password) {
      setMessage({ type: 'error', text: t('password_all_fields_required') });
      return;
    }
    if (new_password.length < 6) {
      setMessage({ type: 'error', text: t('password_too_short') });
      return;
    }
    if (new_password !== confirm_password) {
      setMessage({ type: 'error', text: t('password_mismatch') });
      return;
    }

    setChangingPassword(true);
    setMessage({ type: '', text: '' });

    try {
      await authApi.changePassword(old_password, new_password, confirm_password);
      setMessage({ type: 'success', text: t('password_changed_successfully') });
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      const errorData = error.response?.data || error;
      let errorMessage = t('password_change_failed');
      if (errorData?.error_key === 'wrong_old_password') {
        errorMessage = t('password_wrong_old');
      } else if (errorData?.error_key === 'same_password') {
        errorMessage = t('password_same_as_old');
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.patch('auth/users/update_profile/', formData);
      setMessage({ type: 'success', text: t('profile_updated_successfully') });
      await refreshUser();
    } catch (error) {
      logger.error('Update error', error.response?.data);
      const errorData = error.response?.data;
      let errorMessage = t('profile_update_failed');

      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordInput = (key, value, onChange, autoComplete) => (
    <div className="profile-page__password-wrap">
      <input
        type={showPasswords[key] ? 'text' : 'password'}
        className="input profile-page__input"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={key === 'old' ? undefined : 6}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="profile-page__password-toggle"
        onClick={() => setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }))}
        aria-label={showPasswords[key] ? 'Hide password' : 'Show password'}
      >
        {showPasswords[key] ? <FaEyeSlash /> : <FaEye />}
      </Button>
    </div>
  );

  const avatarUrl = user?.avatar_url || (user?.avatar ? buildFileUrl(user.avatar) : null);
  const alert = message.text ? (
    <div className={`profile-page__alert profile-page__alert--${message.type}`}>
      <span>{message.text}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="profile-page__alert-close"
        onClick={() => setMessage({ type: '', text: '' })}
        aria-label="Dismiss"
      >
        x
      </Button>
    </div>
  ) : null;

  const sidebar = (
    <ProfileIdentityCard
      avatar={
        <div className="profile-page__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={t('profile_user_avatar')} className="profile-page__avatar-img" />
          ) : (
            <FaUser className="profile-page__avatar-icon" />
          )}
        </div>
      }
      name={displayName}
      role={roleName}
      email={user?.email}
      processingText={uploading ? t('profile_processing') : null}
      actions={
        <>
          <input
            accept="image/*"
            className="ds-hidden"
            id="avatar-upload"
            type="file"
            onChange={handleAvatarUpload}
            disabled={uploading}
          />
          <label htmlFor="avatar-upload">
            <Button
              variant="secondary"
              size="sm"
              startIcon={<FaCamera />}
              disabled={uploading}
              as="span"
              className="profile-page__identity-action"
            >
              {t('profile_upload_photo')}
            </Button>
          </label>
          {avatarUrl && (
            <Button
              variant="secondary"
              size="sm"
              startIcon={<FaTrash />}
              onClick={handleDeleteAvatar}
              disabled={uploading}
              className="profile-page__identity-action profile-page__identity-action--danger"
            >
              {t('profile_delete')}
            </Button>
          )}
        </>
      }
    />
  );

  return (
    <div className="profile-page">
      <ProfileLayout
        dir={isRTL ? 'rtl' : 'ltr'}
        sidebar={sidebar}
        alert={alert}
        header={
          <ProfilePageHeader
            title={t('profile_title')}
            subtitle={t('profile_subtitle', 'Manage your personal information, security and preferences')}
            backIcon={isRTL ? <FaArrowRight /> : <FaArrowLeft />}
            onBack={() => navigate(-1)}
          />
        }
      >
        <form onSubmit={handleSubmit}>
          <ProfilePanel
            icon={<FaUser />}
            title={t('profile_basic_information')}
            subtitle={t('profile_basic_information_description', 'Your account details and language preference')}
          >
            <FormGrid cols={2} gap="lg" className="profile-page__form-grid">
              <Field label={t('profile_email')}>
                <input
                  type="email"
                  className="input profile-page__input profile-page__input--disabled"
                  dir="ltr"
                  value={user?.email || ''}
                  disabled
                />
              </Field>
              <Field label={t('profile_username')}>
                <input
                  type="text"
                  name="username"
                  className="input profile-page__input"
                  dir="ltr"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder={t('profile_username_placeholder', 'Enter username')}
                />
              </Field>
              <Field label={t('profile_first_name')}>
                <input
                  type="text"
                  name="first_name"
                  className="input profile-page__input"
                  value={formData.first_name}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={t('profile_last_name')}>
                <input
                  type="text"
                  name="last_name"
                  className="input profile-page__input"
                  value={formData.last_name}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={t('profile_job_title')}>
                <input
                  type="text"
                  className="input profile-page__input profile-page__input--disabled"
                  value={roleName}
                  disabled
                />
              </Field>
              <Field label={t('profile_preferred_language')}>
                <Select
                  options={languageOptions}
                  value={currentLanguage}
                  onChange={handleLanguageChange}
                  placeholder={t('profile_select_language')}
                  isDisabled={changingLanguage}
                  isLoading={changingLanguage}
                  isClearable={false}
                />
              </Field>
            </FormGrid>
            {changingLanguage && (
              <div className="profile-page__hint">{t('profile_updating_language')}</div>
            )}
            <div className="profile-page__actions">
              <Button
                type="submit"
                variant="primary"
                size="md"
                startIcon={loading ? null : <FaRegSave />}
                disabled={loading}
                loading={loading}
                className="profile-page__primary-action"
              >
                {t('profile_save_changes')}
              </Button>
            </div>
          </ProfilePanel>
        </form>

        <form onSubmit={handlePasswordChange}>
          <ProfilePanel
            icon={<FaLock />}
            title={t('password_change_title')}
            subtitle={t('password_change_description', "Use a strong password you don't reuse elsewhere")}
          >
            <FormGrid cols={2} gap="lg" className="profile-page__form-grid">
              <Field label={t('password_current')}>
                {renderPasswordInput(
                  'old',
                  passwordData.old_password,
                  (e) => setPasswordData((prev) => ({ ...prev, old_password: e.target.value })),
                  'current-password'
                )}
              </Field>
              <Field label={t('password_new')}>
                {renderPasswordInput(
                  'new',
                  passwordData.new_password,
                  (e) => setPasswordData((prev) => ({ ...prev, new_password: e.target.value })),
                  'new-password'
                )}
              </Field>
              <Field label={t('password_confirm')} className="profile-page__field-span">
                {renderPasswordInput(
                  'confirm',
                  passwordData.confirm_password,
                  (e) => setPasswordData((prev) => ({ ...prev, confirm_password: e.target.value })),
                  'new-password'
                )}
              </Field>
            </FormGrid>
            <div className="profile-page__actions">
              <Button
                type="submit"
                variant="primary"
                size="md"
                startIcon={changingPassword ? null : <FaLock />}
                disabled={changingPassword}
                loading={changingPassword}
                className="profile-page__primary-action"
              >
                {t('password_change_button')}
              </Button>
            </div>
          </ProfilePanel>
        </form>

        <ProfilePanel
          icon={<FaCamera />}
          title={t('profile_signature_title', 'Signature')}
          subtitle={t('profile_signature_description', 'Your signature image will appear on approved documents')}
        >
          {user?.signature_url ? (
            <div style={{ marginBottom: 12 }}>
              <img
                src={buildFileUrl(user.signature_url)}
                alt={t('profile_signature_title', 'Signature')}
                style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', display: 'block', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 4, padding: 8, background: '#fff' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              accept="image/*"
              className="ds-hidden"
              id="signature-upload"
              type="file"
              onChange={handleSignatureUpload}
              disabled={uploadingSignature}
            />
            <label htmlFor="signature-upload">
              <Button
                variant="secondary"
                size="sm"
                startIcon={<FaCamera />}
                disabled={uploadingSignature}
                as="span"
                className="profile-page__identity-action"
              >
                {uploadingSignature ? t('profile_processing') : t('profile_upload_signature', 'Upload Signature')}
              </Button>
            </label>
            {user?.signature_url && (
              <Button
                variant="secondary"
                size="sm"
                startIcon={<FaTrash />}
                onClick={handleDeleteSignature}
                disabled={uploadingSignature}
                className="profile-page__identity-action profile-page__identity-action--danger"
              >
                {t('profile_delete')}
              </Button>
            )}
          </div>
        </ProfilePanel>

        {isWebAuthnSupported() && (
          <ProfilePanel
            icon={<FaFingerprint />}
            title={t('biometric_title')}
            subtitle={t('biometric_description')}
            className="profile-panel--compact"
            actions={
              <Button
                variant="primary"
                size="md"
                startIcon={registeringBiometric ? null : <FaFingerprint />}
                onClick={handleRegisterBiometric}
                disabled={registeringBiometric}
                loading={registeringBiometric}
                className="profile-page__primary-action"
              >
                {t('biometric_register_button')}
              </Button>
            }
          >
            {biometricCredentials.length > 0 && (
              <div className="profile-page__biometric-list">
                {biometricCredentials.map((cred) => (
                  <div key={cred.id} className="profile-page__biometric-item">
                    <div className="profile-page__biometric-info">
                      <FaFingerprint className="profile-page__biometric-item-icon" />
                      <div>
                        <div className="ds-font-medium">{cred.device_name || t('biometric_device')}</div>
                        <div className="ds-text-xs ds-text-secondary">
                          {new Date(cred.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      startIcon={<FaTrash />}
                      onClick={() => handleDeleteBiometric(cred.id)}
                    >
                      {t('profile_delete')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ProfilePanel>
        )}
      </ProfileLayout>
    </div>
  );
}
