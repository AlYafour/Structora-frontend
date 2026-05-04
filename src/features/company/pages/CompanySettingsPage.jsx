import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { companyApi, authApi } from '../../../services';
import { logger } from '../../../utils/logger';
import PageLayout from '../../../components/layout/PageLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import BRAND from '../../../config/brand';
import {
  FaBuilding, FaUser, FaInfoCircle, FaSave, FaUpload,
  FaPalette, FaFileContract, FaCheckCircle, FaCalendarAlt,
  FaUsers, FaProjectDiagram, FaPhone, FaEnvelope,
  FaMapMarkerAlt, FaIdCard, FaGlobe, FaLock,
} from 'react-icons/fa';
import { useNotifications } from '../../../contexts/NotificationContext';
import BrandLogo from '../../../components/common/BrandLogo';
import { buildFileUrl } from '../../../utils/helpers/file';
import PhoneInput from '../../../components/forms/PhoneInput';
import RtlSelect from '../../../components/forms/RtlSelect';
import { UAE_CITIES } from '../../../utils/constants';
import './CompanySettingsPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function CompanySettingsPage() {
  const { user, tenantTheme, refreshUser, loadTenantTheme } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const lang = i18n.language;
  const navigate = useTenantNavigate();
  const { success, error: showError } = useNotifications();

  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [settingsData, setSettingsData] = useState(null);

  const [companyData, setCompanyData] = useState({
    company_name: '',
    company_license_number: '',
    company_phone: '',
    company_address: '',
    company_country: '',
    company_city: '',
    company_description: '',
    company_activity_type: 'construction',
    company_logo: null,
    background_image: null,
    primary_color: BRAND.primaryColor,
    secondary_color: BRAND.secondaryColor,
    contractor_name: '',
    contractor_name_en: '',
    contractor_license_no: '',
    contractor_phone: '',
    contractor_email: '',
    contractor_address: '',
    contractor_registration_number: '',
  });

  const [ownerData, setOwnerData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    avatar: null,
  });

  const [subscriptionData, setSubscriptionData] = useState({
    max_users: 0,
    max_projects: 0,
    subscription_status: '',
    subscription_start_date: '',
    subscription_end_date: '',
  });

  const isCompanySuperAdmin = user?.role?.name === 'company_super_admin';

  useEffect(() => {
    if (!isCompanySuperAdmin) return;
    loadData();
  }, [user]);


  const loadData = async () => {
    setLoadingData(true);
    try {
      const settings = await companyApi.getCurrentSettings();
      setSettingsData(settings);
      setCompanyData({
        company_name: settings.company_name || '',
        company_license_number: settings.company_license_number || '',
        company_phone: settings.company_phone || '',
        company_address: settings.company_address || '',
        company_country: settings.company_country || '',
        company_city: settings.company_city || '',
        company_description: settings.company_description || '',
        company_activity_type: settings.company_activity_type || 'construction',
        company_logo: null,
        background_image: null,
        primary_color: settings.primary_color || BRAND.primaryColor,
        secondary_color: settings.secondary_color || BRAND.secondaryColor,
        contractor_name: settings.contractor_name || '',
        contractor_name_en: settings.contractor_name_en || '',
        contractor_license_no: settings.contractor_license_no || '',
        contractor_phone: settings.contractor_phone || '',
        contractor_email: settings.contractor_email || '',
        contractor_address: settings.contractor_address || '',
        contractor_registration_number: settings.contractor_registration_number || '',
      });
      setSubscriptionData({
        max_users: settings.max_users || 0,
        max_projects: settings.max_projects || 0,
        subscription_status: settings.subscription_status || '',
        subscription_start_date: settings.subscription_start_date || '',
        subscription_end_date: settings.subscription_end_date || '',
      });
      let profile = user;
      if (!profile || !profile.email) profile = await authApi.getCurrentUser();
      setOwnerData({
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        phone: (profile?.phone || '').replace(/^\+971/, ''),
        email: profile?.email || '',
        avatar: null,
      });
    } catch (err) {
      logger.error('Error loading data', err);
      showError(err.response?.data?.error || t('company_error_loading_data'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleCompanyChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) setCompanyData(prev => ({ ...prev, [name]: files[0] }));
    else setCompanyData(prev => ({ ...prev, [name]: value }));
  };

  const handleOwnerChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) setOwnerData(prev => ({ ...prev, [name]: files[0] }));
    else setOwnerData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCompany = async () => {
    setLoading(true);
    try {
      const textFields = [
        'company_name','company_license_number','company_phone','company_address',
        'company_country','company_city','company_description','company_activity_type',
        'primary_color','secondary_color','contractor_name','contractor_name_en',
        'contractor_license_no','contractor_phone','contractor_email','contractor_address',
        'contractor_registration_number',
      ];
      const fileFields = ['company_logo','background_image','contractor_signature'];
      const hasFiles = fileFields.some(f => companyData[f] instanceof File);

      let payload;
      const isValidValue = (v) => v !== undefined && v !== null && v !== '' && v !== 'undefined';
      if (hasFiles) {
        payload = new FormData();
        textFields.forEach(f => { if (isValidValue(companyData[f])) payload.append(f, companyData[f]); });
        fileFields.forEach(f => { if (companyData[f] instanceof File) payload.append(f, companyData[f]); });
      } else {
        payload = {};
        textFields.forEach(f => { if (isValidValue(companyData[f])) payload[f] = companyData[f]; });
      }
      await companyApi.updateCurrentSettings(payload);
      await loadTenantTheme(false);
      success(t('company_data_saved_success'));
    } catch (err) {
      logger.error('Error saving company data', err);
      showError(err.response?.data?.error || t('company_error_saving_data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOwner = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (ownerData.first_name) formData.append('first_name', ownerData.first_name);
      if (ownerData.last_name) formData.append('last_name', ownerData.last_name);
      if (ownerData.phone) formData.append('phone', `+971${ownerData.phone}`);
      if (ownerData.avatar) formData.append('avatar', ownerData.avatar);
      await authApi.updateProfile(formData);
      await refreshUser();
      success(t('company_owner_data_saved_success'));
    } catch (err) {
      logger.error('Error saving owner data', err);
      showError(err.response?.data?.error || t('company_error_saving_data'));
    } finally {
      setLoading(false);
    }
  };

  if (!isCompanySuperAdmin) {
    return (
      <div className="prj-alert" style={{ margin: 40 }}>
        <div className="prj-alert__title">{t('company_unauthorized')}</div>
        <p>{t('company_no_permission')}</p>
      </div>
    );
  }

  const companyNameAr = companyData.company_name || tenantTheme?.company_name || '';
  const companyNameEn = companyData.contractor_name_en || tenantTheme?.contractor_name_en || '';

  const cityOptions = useMemo(() =>
    UAE_CITIES.map(c => ({ value: c.value, label: c.label[lang] || c.label.en })),
    [lang]
  );

  const tabConfig = [
    { key: 'company',       icon: <FaBuilding />,     label: t('company_information') },
    { key: 'appearance',    icon: <FaPalette />,       label: t('company_appearance') },
    { key: 'owner',         icon: <FaUser />,          label: t('company_owner_account') },
    { key: 'subscription',  icon: <FaInfoCircle />,    label: t('company_subscription_details') },
  ];

  return (
    <PageLayout loading={loadingData} loadingText={t('loading')}>
      <div className="list-page">
        <PageHeader
          onBack={() => navigate(-1)}
          title={t('company_settings_title')}
          subtitle={t('company_settings_subtitle')}
        />

        {/* ── Company Profile Card ── */}
        <div className="cs-profile" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="cs-profile__logo-wrap">
            <BrandLogo type="tenant" size={64} companyName={companyNameAr || companyNameEn} />
          </div>
          <div className="cs-profile__info">
            <h2 className="cs-profile__name">
              {lang === 'ar' ? (companyNameAr || companyNameEn) : (companyNameEn || companyNameAr)}
            </h2>
            {companyNameAr && companyNameEn && (
              <p className="cs-profile__name-secondary">
                {lang === 'ar' ? companyNameEn : companyNameAr}
              </p>
            )}
            <div className="cs-profile__meta">
              {companyData.company_city && (
                <span className="cs-profile__meta-item">
                  <FaMapMarkerAlt /> {companyData.company_city}{companyData.company_country ? `, ${companyData.company_country}` : ''}
                </span>
              )}
              {companyData.company_phone && (
                <span className="cs-profile__meta-item">
                  <FaPhone /> {companyData.company_phone}
                </span>
              )}
              {companyData.company_license_number && (
                <span className="cs-profile__meta-item">
                  <FaIdCard /> {companyData.company_license_number}
                </span>
              )}
            </div>
          </div>
          {subscriptionData.subscription_status && (
            <div className="cs-profile__badge-wrap">
              <span className={`cs-sub-badge ${subscriptionData.subscription_status === 'active' ? 'cs-sub-badge--active' : 'cs-sub-badge--inactive'}`}>
                <FaCheckCircle style={{ fontSize: '0.7rem' }} />
                {subscriptionData.subscription_status === 'active' ? t('company_status_active') || 'Active' : t('company_status_inactive') || 'Inactive'}
              </span>
            </div>
          )}
        </div>

        <div className="cs-layout" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* ── Sidebar Tabs ── */}
          <nav className="cs-sidebar">
            {tabConfig.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`cs-sidebar__item ${activeTab === tab.key ? 'cs-sidebar__item--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="cs-sidebar__icon">{tab.icon}</span>
                <span className="cs-sidebar__label">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* ── Content Panel ── */}
          <div className="cs-panel">

            {/* ─── Tab: Company Info (unified — company = contractor) ─── */}
            {activeTab === 'company' && (
              <div className="cs-section">
                <div className="cs-section__header">
                  <div className="cs-section__icon-wrap"><FaBuilding /></div>
                  <div>
                    <h2 className="cs-section__title">{t('company_information')}</h2>
                    <p className="cs-section__subtitle">{t('company_unified_info_hint')}</p>
                  </div>
                </div>

                <div className="cs-grid">
                  {/* Admin-set: read-only */}
                  <Field label={<>{t('company_name')} <FaLock className="cs-readonly-icon" /></>}>
                    <input type="text" className="input cs-readonly" value={companyData.company_name} disabled />
                  </Field>
                  <Field label={<>{t('company_name_en')} <FaLock className="cs-readonly-icon" /></>}>
                    <input type="text" className="input cs-readonly" value={companyData.contractor_name_en} disabled />
                  </Field>

                  {/* Admin-set: read-only */}
                  <Field label={<>{t('company_license_number')} <FaLock className="cs-readonly-icon" /></>}>
                    <input type="text" className="input cs-readonly" value={companyData.company_license_number} disabled />
                  </Field>
                  <Field label={t('company_registration_number')}>
                    <input type="text" name="contractor_registration_number" className="input"
                      value={companyData.contractor_registration_number} onChange={handleCompanyChange} />
                  </Field>

                  {/* Admin-set: read-only */}
                  <Field label={<>{t('company_phone')} <FaLock className="cs-readonly-icon" /></>}>
                    <input type="tel" className="input cs-readonly" value={companyData.company_phone} disabled dir="ltr" />
                  </Field>
                  {/* Admin-set: read-only */}
                  <Field label={<>{t('company_email_label')} <FaLock className="cs-readonly-icon" /></>}>
                    <input type="email" className="input cs-readonly" value={settingsData?.company_email || ''} disabled dir="ltr" />
                  </Field>

                  {/* Admin-set: read-only */}
                  <Field label={<>{t('company_country')} <FaLock className="cs-readonly-icon" /></>}>
                    <input type="text" className="input cs-readonly"
                      value={lang === 'ar' ? 'الإمارات العربية المتحدة' : 'United Arab Emirates'} disabled />
                  </Field>
                  <Field label={t('company_city')}>
                    <RtlSelect
                      options={cityOptions}
                      value={companyData.company_city}
                      onChange={(val) => handleCompanyChange({ target: { name: 'company_city', value: val } })}
                      placeholder={t('select_placeholder')}
                    />
                  </Field>

                  {/* Admin-set: read-only */}
                  <Field label={<>{t('company_address')} <FaLock className="cs-readonly-icon" /></>} className="cs-grid__full">
                    <textarea className="input cs-readonly" rows="2"
                      value={companyData.company_address} disabled />
                  </Field>
                </div>

                <p className="cs-readonly-note"><FaLock /> {t('company_admin_readonly_note')}</p>

                {/* Company Signature */}
                <div className="cs-divider" />
                <div className="cs-upload-card">
                  <div className="cs-upload-card__preview">
                    {companyData.contractor_signature instanceof File ? (
                      <img src={URL.createObjectURL(companyData.contractor_signature)} alt="New signature" className="cs-upload-card__img" />
                    ) : settingsData?.contractor_signature_url ? (
                      <img src={buildFileUrl(settingsData.contractor_signature_url)} alt="Signature" className="cs-upload-card__img" />
                    ) : (
                      <div className="cs-upload-card__placeholder"><FaFileContract /></div>
                    )}
                  </div>
                  <div className="cs-upload-card__body">
                    <p className="cs-upload-card__title">{t('company_signature')}</p>
                    <p className="cs-upload-card__hint">{t('company_signature_hint')}</p>
                    <input type="file" name="contractor_signature" accept="image/*"
                      onChange={handleCompanyChange} className="ds-hidden" id="signature-upload" />
                    <label htmlFor="signature-upload">
                      <Button type="button" variant="secondary" size="sm" as="span" startIcon={<FaUpload />}>
                        {t('company_choose_signature')}
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="cs-actions">
                  <Button variant="primary" onClick={handleSaveCompany} disabled={loading} loading={loading} startIcon={<FaSave />}>
                    {t('company_save_company_data')}
                  </Button>
                </div>
              </div>
            )}

            {/* ─── Tab: Appearance ─── */}
            {activeTab === 'appearance' && (
              <div className="cs-section">
                <div className="cs-section__header">
                  <div className="cs-section__icon-wrap">
                    <FaPalette />
                  </div>
                  <div>
                    <h2 className="cs-section__title">{t('company_appearance')}</h2>
                    <p className="cs-section__subtitle">{t('company_appearance_hint')}</p>
                  </div>
                </div>

                {/* Logo */}
                <div className="cs-upload-card">
                  <div className="cs-upload-card__preview">
                    {companyData.company_logo ? (
                      <img src={URL.createObjectURL(companyData.company_logo)} alt="New logo" className="cs-upload-card__img" />
                    ) : tenantTheme?.logo_url ? (
                      <img src={tenantTheme.logo_url} alt="Logo" className="cs-upload-card__img" />
                    ) : (
                      <div className="cs-upload-card__placeholder"><FaBuilding /></div>
                    )}
                  </div>
                  <div className="cs-upload-card__body">
                    <p className="cs-upload-card__title">{t('company_logo')}</p>
                    <p className="cs-upload-card__hint">{t('company_logo_hint')}</p>
                    <input type="file" name="company_logo" accept="image/*"
                      onChange={handleCompanyChange} className="ds-hidden" id="logo-upload" />
                    <label htmlFor="logo-upload">
                      <Button type="button" variant="secondary" size="sm" as="span" startIcon={<FaUpload />}>
                        {t('company_choose_logo')}
                      </Button>
                    </label>
                  </div>
                </div>

                {/* Background */}
                <div className="cs-upload-card cs-upload-card--bg">
                  <div className="cs-upload-card__preview cs-upload-card__preview--wide">
                    {companyData.background_image ? (
                      <img src={URL.createObjectURL(companyData.background_image)} alt="New bg" className="cs-upload-card__img cs-upload-card__img--cover" />
                    ) : settingsData?.background_image_url ? (
                      <img src={buildFileUrl(settingsData.background_image_url)} alt="Background" className="cs-upload-card__img cs-upload-card__img--cover" />
                    ) : (
                      <div className="cs-upload-card__placeholder"><FaGlobe /></div>
                    )}
                  </div>
                  <div className="cs-upload-card__body">
                    <p className="cs-upload-card__title">{t('company_login_background_image')}</p>
                    <p className="cs-upload-card__hint">{t('company_background_image_hint')}</p>
                    <input type="file" name="background_image" accept="image/*"
                      onChange={handleCompanyChange} className="ds-hidden" id="background-upload" />
                    <label htmlFor="background-upload">
                      <Button type="button" variant="secondary" size="sm" as="span" startIcon={<FaUpload />}>
                        {t('company_choose_background_image')}
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="cs-divider" />

                {/* Colors */}
                <div className="cs-colors-row">
                  <div className="cs-color-field">
                    <label className="cs-color-field__label">{t('company_primary_color')}</label>
                    <div className="cs-color-field__control">
                      <input type="color" name="primary_color"
                        value={companyData.primary_color} onChange={handleCompanyChange}
                        className="cs-color-field__input" />
                      <div className="cs-color-field__preview" style={{ background: companyData.primary_color }} />
                      <span className="cs-color-field__value">{companyData.primary_color}</span>
                    </div>
                  </div>
                  <div className="cs-color-field">
                    <label className="cs-color-field__label">{t('company_secondary_color')}</label>
                    <div className="cs-color-field__control">
                      <input type="color" name="secondary_color"
                        value={companyData.secondary_color} onChange={handleCompanyChange}
                        className="cs-color-field__input" />
                      <div className="cs-color-field__preview" style={{ background: companyData.secondary_color }} />
                      <span className="cs-color-field__value">{companyData.secondary_color}</span>
                    </div>
                  </div>
                </div>

                <div className="cs-actions">
                  <Button variant="primary" onClick={handleSaveCompany} disabled={loading} loading={loading} startIcon={<FaSave />}>
                    {t('company_save_company_data')}
                  </Button>
                </div>
              </div>
            )}

            {/* ─── Tab: Owner ─── */}
            {activeTab === 'owner' && (
              <div className="cs-section">
                <div className="cs-section__header">
                  <div className="cs-section__icon-wrap">
                    <FaUser />
                  </div>
                  <div>
                    <h2 className="cs-section__title">{t('company_owner_account')}</h2>
                    <p className="cs-section__subtitle">{t('company_owner_account_hint')}</p>
                  </div>
                </div>

                {/* Owner avatar card */}
                <div className="cs-upload-card cs-upload-card--avatar">
                  <div className="cs-upload-card__preview cs-upload-card__preview--circle">
                    {ownerData.avatar ? (
                      <img src={URL.createObjectURL(ownerData.avatar)} alt="New avatar" className="cs-upload-card__img cs-upload-card__img--cover" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" crossOrigin="anonymous" className="cs-upload-card__img cs-upload-card__img--cover" />
                    ) : (
                      <div className="cs-upload-card__placeholder"><FaUser /></div>
                    )}
                  </div>
                  <div className="cs-upload-card__body">
                    <p className="cs-upload-card__title">{t('company_profile_picture')}</p>
                    <input type="file" name="avatar" accept="image/*"
                      onChange={handleOwnerChange} className="ds-hidden" id="avatar-upload" />
                    <label htmlFor="avatar-upload">
                      <Button type="button" variant="secondary" size="sm" as="span" startIcon={<FaUpload />}>
                        {t('company_choose_image')}
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="cs-divider" />

                <div className="cs-grid">
                  <Field label={t('company_first_name')}>
                    <input type="text" name="first_name" className="input"
                      value={ownerData.first_name} onChange={handleOwnerChange} />
                  </Field>

                  <Field label={t('company_last_name')}>
                    <input type="text" name="last_name" className="input"
                      value={ownerData.last_name} onChange={handleOwnerChange} />
                  </Field>

                  <Field label={t('company_phone_label')}>
                    <PhoneInput
                      value={ownerData.phone}
                      onChange={(val) => setOwnerData(prev => ({ ...prev, phone: val }))}
                      excludeType="user"
                    />
                  </Field>

                  <Field label={t('company_email_label')}>
                    <input type="email" className="input" value={ownerData.email} disabled />
                    <small className="prj-muted">{t('company_email_cannot_modify')}</small>
                  </Field>
                </div>

                <div className="cs-actions">
                  <Button variant="primary" onClick={handleSaveOwner} disabled={loading} loading={loading} startIcon={<FaSave />}>
                    {t('company_save_owner_data')}
                  </Button>
                </div>
              </div>
            )}

            {/* ─── Tab: Subscription ─── */}
            {activeTab === 'subscription' && (
              <div className="cs-section">
                <div className="cs-section__header">
                  <div className="cs-section__icon-wrap">
                    <FaInfoCircle />
                  </div>
                  <div>
                    <h2 className="cs-section__title">{t('company_subscription_details')}</h2>
                    <p className="cs-section__subtitle">{t('company_subscription_readonly_note')}</p>
                  </div>
                </div>

                <div className="cs-subscription-grid">
                  <div className="cs-sub-card">
                    <div className="cs-sub-card__icon"><FaUsers /></div>
                    <span className="cs-sub-card__label">{t('company_max_users')}</span>
                    <span className="cs-sub-card__value">{subscriptionData.max_users}</span>
                  </div>
                  <div className="cs-sub-card">
                    <div className="cs-sub-card__icon"><FaProjectDiagram /></div>
                    <span className="cs-sub-card__label">{t('company_max_projects')}</span>
                    <span className="cs-sub-card__value">{subscriptionData.max_projects}</span>
                  </div>
                  <div className="cs-sub-card cs-sub-card--status">
                    <div className="cs-sub-card__icon"><FaCheckCircle /></div>
                    <span className="cs-sub-card__label">{t('company_subscription_status')}</span>
                    <span className={`cs-sub-badge ${subscriptionData.subscription_status === 'active' ? 'cs-sub-badge--active' : 'cs-sub-badge--inactive'}`}>
                      {subscriptionData.subscription_status || '-'}
                    </span>
                  </div>
                  <div className="cs-sub-card">
                    <div className="cs-sub-card__icon"><FaCalendarAlt /></div>
                    <span className="cs-sub-card__label">{t('company_start_date')}</span>
                    <span className="cs-sub-card__value">{subscriptionData.subscription_start_date || '-'}</span>
                  </div>
                  <div className="cs-sub-card">
                    <div className="cs-sub-card__icon"><FaCalendarAlt /></div>
                    <span className="cs-sub-card__label">{t('company_end_date')}</span>
                    <span className="cs-sub-card__value">{subscriptionData.subscription_end_date || '-'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </PageLayout>
  );
}
