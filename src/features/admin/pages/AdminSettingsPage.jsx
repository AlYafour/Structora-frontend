import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../../contexts/NotificationContext';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import {
  FaCog,
  FaShieldAlt,
  FaDatabase,
  FaPalette,
  FaGlobe,
  FaBell,
  FaKey,
  FaServer,
} from 'react-icons/fa';
import './AdminSettingsPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const { success } = useNotifications();
  const isRTL = i18n.language === 'ar';

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [defaultTrialDays, setDefaultTrialDays] = useState(14);
  const [defaultMaxUsers, setDefaultMaxUsers] = useState(10);
  const [defaultMaxProjects, setDefaultMaxProjects] = useState(50);
  const [defaultLanguage, setDefaultLanguage] = useState('ar');
  const [defaultCurrency, setDefaultCurrency] = useState('SAR');

  if (!user?.is_superuser) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const settingSections = [
    {
      icon: FaServer,
      titleKey: 'admin_settings_system',
      descKey: 'admin_settings_system_desc',
      content: (
        <div className="admin-settings__fields">
          <div className="admin-settings__toggle-row">
            <div>
              <div className="admin-settings__field-label">{t('admin_maintenance_mode')}</div>
              <div className="admin-settings__field-hint">{t('admin_maintenance_mode_desc')}</div>
            </div>
            <button
              className={`admin-settings__toggle ${maintenanceMode ? 'admin-settings__toggle--on' : ''}`}
              onClick={() => setMaintenanceMode(!maintenanceMode)}
            >
              <span className="admin-settings__toggle-knob" />
            </button>
          </div>
          <div className="admin-settings__toggle-row">
            <div>
              <div className="admin-settings__field-label">{t('admin_registration_open')}</div>
              <div className="admin-settings__field-hint">{t('admin_registration_open_desc')}</div>
            </div>
            <button
              className={`admin-settings__toggle ${registrationOpen ? 'admin-settings__toggle--on' : ''}`}
              onClick={() => setRegistrationOpen(!registrationOpen)}
            >
              <span className="admin-settings__toggle-knob" />
            </button>
          </div>
        </div>
      ),
    },
    {
      icon: FaDatabase,
      titleKey: 'admin_settings_defaults',
      descKey: 'admin_settings_defaults_desc',
      content: (
        <div className="admin-settings__fields">
          <div className="admin-settings__field">
            <label>{t('admin_default_trial_days')}</label>
            <input
              type="number"
              className="input admin-settings__input"
              value={defaultTrialDays}
              onChange={(e) => setDefaultTrialDays(parseInt(e.target.value) || 0)}
              min="1"
              max="365"
            />
          </div>
          <div className="admin-settings__field">
            <label>{t('admin_default_max_users')}</label>
            <input
              type="number"
              className="input admin-settings__input"
              value={defaultMaxUsers}
              onChange={(e) => setDefaultMaxUsers(parseInt(e.target.value) || 0)}
              min="1"
            />
          </div>
          <div className="admin-settings__field">
            <label>{t('admin_default_max_projects')}</label>
            <input
              type="number"
              className="input admin-settings__input"
              value={defaultMaxProjects}
              onChange={(e) => setDefaultMaxProjects(parseInt(e.target.value) || 0)}
              min="1"
            />
          </div>
        </div>
      ),
    },
    {
      icon: FaGlobe,
      titleKey: 'admin_settings_localization',
      descKey: 'admin_settings_localization_desc',
      content: (
        <div className="admin-settings__fields">
          <div className="admin-settings__field">
            <label>{t('admin_default_language')}</label>
            <select
              className="input admin-settings__input"
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="admin-settings__field">
            <label>{t('admin_default_currency')}</label>
            <select
              className="input admin-settings__input"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
            >
              <option value="SAR">SAR — {t('admin_currency_sar')}</option>
              <option value="USD">USD — {t('admin_currency_usd')}</option>
              <option value="EUR">EUR — {t('admin_currency_eur')}</option>
              <option value="AED">AED — {t('admin_currency_aed')}</option>
              <option value="QAR">QAR — {t('admin_currency_qar')}</option>
              <option value="KWD">KWD — {t('admin_currency_kwd')}</option>
              <option value="BHD">BHD — {t('admin_currency_bhd')}</option>
              <option value="OMR">OMR — {t('admin_currency_omr')}</option>
              <option value="EGP">EGP — {t('admin_currency_egp')}</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      icon: FaShieldAlt,
      titleKey: 'admin_settings_security',
      descKey: 'admin_settings_security_desc',
      content: (
        <div className="admin-settings__fields">
          <div className="admin-settings__info-row">
            <FaKey className="admin-settings__info-icon" />
            <div>
              <div className="admin-settings__field-label">{t('admin_jwt_auth')}</div>
              <div className="admin-settings__field-hint">{t('admin_jwt_auth_desc')}</div>
            </div>
            <span className="admin-settings__badge admin-settings__badge--active">{t('admin_enabled')}</span>
          </div>
          <div className="admin-settings__info-row">
            <FaShieldAlt className="admin-settings__info-icon" />
            <div>
              <div className="admin-settings__field-label">{t('admin_csrf_protection')}</div>
              <div className="admin-settings__field-hint">{t('admin_csrf_protection_desc')}</div>
            </div>
            <span className="admin-settings__badge admin-settings__badge--active">{t('admin_enabled')}</span>
          </div>
          <div className="admin-settings__info-row">
            <FaBell className="admin-settings__info-icon" />
            <div>
              <div className="admin-settings__field-label">{t('admin_rate_limiting')}</div>
              <div className="admin-settings__field-hint">{t('admin_rate_limiting_desc')}</div>
            </div>
            <span className="admin-settings__badge admin-settings__badge--active">{t('admin_enabled')}</span>
          </div>
        </div>
      ),
    },
  ];

  const handleSave = () => {
    // TODO: Connect to backend settings API when available
    success(t('admin_settings_saved'));
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="admin-settings">
      <div className="admin-settings__header">
        <div>
          <h1 className="admin-settings__title">{t('admin_settings_title')}</h1>
          <p className="admin-settings__subtitle">{t('admin_settings_subtitle')}</p>
        </div>
        <Button variant="primary" onClick={handleSave}>
          <FaCog className="ds-icon-gap" />
          {t('admin_save_settings')}
        </Button>
      </div>

      <div className="admin-settings__sections">
        {settingSections.map((section, i) => {
          const Icon = section.icon;
          return (
            <Card key={i} className="admin-settings__section">
              <div className="admin-settings__section-header">
                <Icon className="admin-settings__section-icon" />
                <div>
                  <h2 className="admin-settings__section-title">{t(section.titleKey)}</h2>
                  <p className="admin-settings__section-desc">{t(section.descKey)}</p>
                </div>
              </div>
              {section.content}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
