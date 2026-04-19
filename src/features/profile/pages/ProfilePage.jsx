import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Field from '../../../components/forms/Field';
import FormSection from '../../../components/forms/FormSection';
import FormGrid from '../../../components/forms/FormGrid';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import Select from '../../../components/common/Select';
import { FaCamera, FaTrash, FaSave, FaUser, FaGlobe, FaLock, FaEye, FaEyeSlash, FaFingerprint, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { logger } from '../../../utils/logger';
import { buildFileUrl } from "../../../utils/helpers/file";
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
 const [changingLanguage, setChangingLanguage] = useState(false);
 const [changingPassword, setChangingPassword] = useState(false);
 const [message, setMessage] = useState({ type: '', text: '' });
 const [passwordData, setPasswordData] = useState({
 old_password: '',
 new_password: '',
 confirm_password: '',
 });
 const [showPasswords, setShowPasswords] = useState({
 old: false, new: false, confirm: false,
 });
 const [biometricCredentials, setBiometricCredentials] = useState([]);
 const [registeringBiometric, setRegisteringBiometric] = useState(false);

 const [formData, setFormData] = useState({
 first_name: '',
 last_name: '',
 username: '',
 });

 const languageOptions = [
 { value: 'ar', label: 'العربية' },
 { value: 'en', label: 'English' },
 ];

 const currentLanguage = user?.preferred_language || i18n.language || 'ar';

 const loadBiometricCredentials = async () => {
 if (!isWebAuthnSupported()) return;
 try {
 const data = await authApi.listBiometricCredentials();
 setBiometricCredentials(data.credentials || []);
 } catch { setBiometricCredentials([]); }
 };

 useEffect(() => {
 loadBiometricCredentials();
 }, []);

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
 setFormData(prev => ({
 ...prev,
 [name]: value
 }));
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
 const formData = new FormData();
 formData.append('avatar', file);

 await apiClient.post('auth/users/upload_avatar/', formData, {
 headers: {
 'Content-Type': 'multipart/form-data',
 },
 });

 setMessage({ type: 'success', text: t('profile_avatar_uploaded') });
 await refreshUser();
 } catch (error) {
 setMessage({
 type: 'error',
 text: error.response?.data?.error || error.response?.data?.detail || t('profile_upload_failed')
 });
 } finally {
 setUploading(false);
 }
 };

 const handleDeleteAvatar = async () => {
 if (!window.confirm(t('profile_confirm_delete_avatar'))) {
 return;
 }

 setUploading(true);
 setMessage({ type: '', text: '' });

 try {
 await apiClient.delete('auth/users/delete_avatar/');
 setMessage({ type: 'success', text: t('profile_avatar_deleted') });
 await refreshUser();
 } catch (error) {
 setMessage({
 type: 'error',
 text: error.response?.data?.error || error.response?.data?.detail || t('profile_delete_avatar_failed')
 });
 } finally {
 setUploading(false);
 }
 };

 const handleLanguageChange = async (newLanguage) => {
 if (newLanguage === currentLanguage) return;

 setChangingLanguage(true);
 setMessage({ type: '', text: '' });

 try {
 const response = await apiClient.post('auth/users/set_language/', {
 language: newLanguage,
 });

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

 const avatarUrl = user?.avatar_url || (user?.avatar ? buildFileUrl(user.avatar) : null);

 return (
 <div className="container ds-page-narrow">
 <Card>
 <div className="card-header ds-flex ds-items-center ds-gap-3">
 <Button
   variant="ghost"
   size="sm"
   startIcon={isRTL ? <FaArrowRight /> : <FaArrowLeft />}
   onClick={() => navigate(-1)}
 />
 <h1 className="card-title ds-page-title" style={{ margin: 0 }}>
   {t('profile_title')}
 </h1>
 </div>

 {message.text && (
 <div
 className={`profile-page__alert profile-page__alert--${message.type} ds-flex ds-items-center ds-justify-between ds-gap-2`}
 >
 <span>{message.text}</span>
 <Button
 variant="ghost"
 size="sm"
 className="profile-page__alert-close"
 onClick={() => setMessage({ type: '', text: '' })}
 >
 ×
 </Button>
 </div>
 )}

 <form onSubmit={handleSubmit} className="flex flex-col gap-8">
 {/* Avatar Section */}
 <div className="ds-flex ds-flex-col ds-items-center ds-gap-4">
 <div className="profile-page__avatar ds-flex ds-flex-center">
 {avatarUrl ? (
 <img
 src={avatarUrl}
 alt={t('profile_user_avatar')}
 className="profile-page__avatar-img ds-w-full"
 />
 ) : (
 <FaUser className="profile-page__avatar-icon" />
 )}
 </div>
 <div className="ds-flex ds-gap-2">
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
 style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
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
 >
 {t('profile_delete')}
 </Button>
 )}
 </div>
 {uploading && (
 <div className="ds-text-sm ds-text-secondary">
 {t('profile_processing')}
 </div>
 )}
 </div>

 {/* Basic Information */}
 <FormSection
   title={t('profile_basic_information')}
   icon={<FaUser />}
   noBorder
 >
   <FormGrid cols={2}>
     <Field label={t('profile_email')}>
       <input
         type="email"
         className="input ds-bg-disabled"
         dir="ltr"
         value={user?.email || ''}
         disabled
       />
     </Field>
     <Field label={t('profile_username')}>
       <input
         type="text"
         name="username"
         className="input"
         dir="ltr"
         value={formData.username}
         onChange={handleInputChange}
       />
     </Field>
     <Field label={t('profile_first_name')}>
       <input
         type="text"
         name="first_name"
         className="input"
         value={formData.first_name}
         onChange={handleInputChange}
       />
     </Field>
     <Field label={t('profile_last_name')}>
       <input
         type="text"
         name="last_name"
         className="input"
         value={formData.last_name}
         onChange={handleInputChange}
       />
     </Field>
     <Field label={t('profile_job_title')}>
       <input
         type="text"
         className="input ds-bg-disabled"
         value={user?.role?.name ? t(`nav_role_${user.role.name.toLowerCase()}`, user.role.name) : ''}
         disabled
       />
     </Field>
   </FormGrid>
 </FormSection>

 {/* Language Preferences */}
 <FormSection
   title={t('profile_language_preferences')}
   icon={<FaGlobe />}
   noBorder
 >
   <FormGrid cols={2}>
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
     <div className="ds-text-sm ds-mt-2 ds-text-secondary">
       {t('profile_updating_language')}
     </div>
   )}
 </FormSection>

 <div className="ds-flex ds-gap-3 ds-mt-4 ds-justify-end">
 <Button
 type="submit"
 variant="primary"
 size="lg"
 startIcon={loading ? null : <FaSave />}
 disabled={loading}
 loading={loading}
 >
 {t('profile_save_changes')}
 </Button>
 </div>
 </form>

 <div className="ds-w-full ds-divider" style={{ margin: '24px 0' }} />

 {/* Password Change Section */}
 <form onSubmit={handlePasswordChange}>
 <FormSection
   title={t('password_change_title')}
   icon={<FaLock />}
   noBorder
 >
   <FormGrid cols={2}>
     <Field label={t('password_current')}>
       <div className="profile-page__password-wrap">
         <input
           type={showPasswords.old ? 'text' : 'password'}
           className="input"
           value={passwordData.old_password}
           onChange={(e) => setPasswordData(prev => ({ ...prev, old_password: e.target.value }))}
           autoComplete="current-password"
         />
         <Button
           type="button"
           variant="ghost"
           size="sm"
           className="profile-page__password-toggle"
           onClick={() => setShowPasswords(p => ({ ...p, old: !p.old }))}
         >
           {showPasswords.old ? <FaEyeSlash /> : <FaEye />}
         </Button>
       </div>
     </Field>
     <Field label={t('password_new')}>
       <div className="profile-page__password-wrap">
         <input
           type={showPasswords.new ? 'text' : 'password'}
           className="input"
           value={passwordData.new_password}
           onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
           autoComplete="new-password"
           minLength={6}
         />
         <Button
           type="button"
           variant="ghost"
           size="sm"
           className="profile-page__password-toggle"
           onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
         >
           {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
         </Button>
       </div>
     </Field>
     <Field label={t('password_confirm')}>
       <div className="profile-page__password-wrap">
         <input
           type={showPasswords.confirm ? 'text' : 'password'}
           className="input"
           value={passwordData.confirm_password}
           onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
           autoComplete="new-password"
           minLength={6}
         />
         <Button
           type="button"
           variant="ghost"
           size="sm"
           className="profile-page__password-toggle"
           onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
         >
           {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
         </Button>
       </div>
     </Field>
   </FormGrid>
 </FormSection>
 <div className="ds-flex ds-gap-3 ds-mt-4 ds-justify-end">
 <Button
 type="submit"
 variant="primary"
 size="lg"
 startIcon={changingPassword ? null : <FaLock />}
 disabled={changingPassword}
 loading={changingPassword}
 >
 {t('password_change_button')}
 </Button>
 </div>
 </form>

 {/* Biometric Section */}
 {isWebAuthnSupported() && (
 <>
 <div className="ds-w-full ds-divider" style={{ margin: '24px 0' }} />
 <FormSection
   title={t('biometric_title')}
   icon={<FaFingerprint />}
   noBorder
 >
   <p className="ds-text-sm ds-text-secondary ds-mb-4">
     {t('biometric_description')}
   </p>

   {biometricCredentials.length > 0 && (
     <div className="profile-page__biometric-list">
       {biometricCredentials.map((cred) => (
         <div key={cred.id} className="profile-page__biometric-item">
           <div className="profile-page__biometric-info">
             <FaFingerprint className="profile-page__biometric-item-icon" />
             <div>
               <div className="ds-font-medium">{cred.device_name || t('biometric_device')}</div>
               <div className="ds-text-xs ds-text-secondary">
                 {new Date(cred.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
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

   <div className="ds-mt-4">
     <Button
       variant="primary"
       size="lg"
       startIcon={registeringBiometric ? null : <FaFingerprint />}
       onClick={handleRegisterBiometric}
       disabled={registeringBiometric}
       loading={registeringBiometric}
     >
       {t('biometric_register_button')}
     </Button>
   </div>
 </FormSection>
 </>
 )}
 </Card>
 </div>
 );
}
