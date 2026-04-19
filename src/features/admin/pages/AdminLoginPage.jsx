import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import Field from '../../../components/forms/Field';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import BrandLogo from '../../../components/common/BrandLogo';
import BRAND from '../../../config/brand';
import {
  FaSun,
  FaMoon,
  FaGlobe,
  FaShieldAlt,
  FaArrowLeft,
  FaArrowRight,
} from 'react-icons/fa';
import './AdminLoginPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, logout } = useAuth();
  const navigate = useTenantNavigate();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isRTL = i18n.language === 'ar';
  const isDark = theme === 'dark';

  const toggleLanguage = () => {
    i18n.changeLanguage(isRTL ? 'en' : 'ar');
  };

  // If already authenticated as superuser, redirect to admin dashboard
  useEffect(() => {
    if (user?.is_superuser) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // Only clear if not already authenticated (prevents clearing on back-button)
    if (!user) {
      localStorage.removeItem('tenant_theme');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('tenant_slug');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('permissions');
      localStorage.removeItem('is_super_admin');
      localStorage.removeItem('user_role');
      document.documentElement.style.removeProperty('--color-primary');
      document.documentElement.style.removeProperty('--color-secondary');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.is_super_admin) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          setError(t('admin_not_super_admin_account'));
          setLoading(false);
        }
      } else {
        setError(result.error || t('admin_login_failed'));
        setLoading(false);
      }
    } catch (err) {
      setError(t('admin_login_error'));
      setLoading(false);
    }
  };

  const ArrowIcon = isRTL ? FaArrowLeft : FaArrowRight;

  return (
    <div className={`admin-login ${isDark ? 'admin-login--dark' : 'admin-login--light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Animated Background — same as Landing Page */}
      <div className="admin-login__bg">
        <div className="admin-login__bg-mesh" />
        <div className="admin-login__bg-grid" />
        <div className="admin-login__bg-orb admin-login__bg-orb--1" />
        <div className="admin-login__bg-orb admin-login__bg-orb--2" />
      </div>

      {/* Top Nav */}
      <nav className="admin-login__nav">
        <button className="admin-login__nav-btn" onClick={() => navigate('/')}>
          <ArrowIcon style={{ transform: isRTL ? 'none' : 'rotate(180deg)' }} />
          {t('landing_back') || 'Back'}
        </button>
        <div className="admin-login__nav-actions">
          <button className="admin-login__nav-btn" onClick={toggleTheme}>
            {isDark ? <FaSun /> : <FaMoon />}
          </button>
          <button className="admin-login__nav-btn" onClick={toggleLanguage}>
            <FaGlobe />
            <span>{t('landing_language_name')}</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="admin-login__content">
        {/* Brand */}
        <div className="admin-login__brand">
          <BrandLogo type="structora" size={64} className="admin-login__logo-svg" />
          <h1 className="admin-login__brand-name">{BRAND.name}</h1>
          <div className="admin-login__brand-badge">
            <FaShieldAlt />
            <span>{t('admin_system_panel')}</span>
          </div>
          <p className="admin-login__brand-sub">{t('admin_super_admin_login')}</p>
        </div>

        {/* Login Card */}
        <Card className="admin-login__card">
          <div className="admin-login__card-header">
            <h2 className="admin-login__card-title">{t('admin_login')}</h2>
            <p className="admin-login__card-sub">{t('admin_sign_in_to_panel')}</p>
          </div>

          {error && (
            <div className="admin-login__error">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="admin-login__form">
            <Field label={t('admin_email')} required>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                placeholder={t('admin_enter_email')}
              />
            </Field>

            <Field label={t('admin_password')} required>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder={t('admin_enter_password')}
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
              loading={loading}
              className="admin-login__submit"
            >
              {t('admin_login')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
