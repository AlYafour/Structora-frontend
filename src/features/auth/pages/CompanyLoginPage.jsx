import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { authApi } from '../../../services';
import Button from '../../../components/common/Button';
import {
  FaGlobe,
  FaMoon,
  FaSun,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaExclamationCircle,
  FaFingerprint,
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
} from 'react-icons/fa';
import { logger } from '../../../utils/logger';
import BRAND from '../../../config/brand';
import { isWebAuthnSupported, getAssertion } from '../../../utils/webauthn';
import './CompanyLoginPage.css';

export default function CompanyLoginPage() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const isRTL = i18n.language === 'ar';

  const authMode = searchParams.get('mode');
  const resetUid = searchParams.get('uid');
  const resetToken = searchParams.get('token');

  const isForgotMode = authMode === 'forgot';
  const isResetMode = authMode === 'reset' || Boolean(resetUid && resetToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(true);

  const [companyInfo, setCompanyInfo] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    localStorage.removeItem('tenant_theme');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('tenant_slug');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('permissions');
    localStorage.removeItem('is_super_admin');
    localStorage.removeItem('user_role');

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applyTheme = useCallback(() => {
    // Colors come from tokens.css — no runtime overrides needed
  }, []);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    const loadCompanyInfo = async () => {
      if (!tenantSlug) {
        setError(t('auth_company_identifier_not_found'));
        setLoadingCompany(false);
        return;
      }

      try {
        const data = await authApi.getPublicCompanyInfo(tenantSlug);

        if (!isMountedRef.current) return;

        setCompanyInfo(data);
        applyTheme(data);

        if (data.logo) {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.onload = () => {
            if (isMountedRef.current) setLogoLoaded(true);
          };
          logoImg.onerror = () => {
            if (isMountedRef.current) setLogoLoaded(false);
          };
          logoImg.src = data.logo;
        }

        if (data.background_image) {
          const bgImg = new Image();
          bgImg.crossOrigin = 'anonymous';
          bgImg.onload = () => {
            if (isMountedRef.current) setBackgroundLoaded(true);
          };
          bgImg.onerror = () => {
            if (isMountedRef.current) setBackgroundLoaded(false);
          };
          bgImg.src = data.background_image;
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') return;
        if (!isMountedRef.current) return;

        logger.error('Error loading company info', err);
        setError(err.response?.data?.error || t('auth_company_not_found'));
      } finally {
        if (isMountedRef.current) setLoadingCompany(false);
      }
    };

    loadCompanyInfo();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tenantSlug, isRTL, applyTheme, t]);

  const goToLoginMode = () => {
    setError('');
    setMessage('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
  navigate(`/login/${tenantSlug}`, { replace: true });
  };

  const goToForgotMode = () => {
    setError('');
    setMessage('');
  navigate(`/login/${tenantSlug}?mode=forgot`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        if (result.is_super_admin) {
          setError(t('auth_login_from_admin_page'));
          setLoading(false);
          localStorage.removeItem('user');
          localStorage.removeItem('permissions');
          localStorage.removeItem('tenant_theme');
          localStorage.removeItem('tenant_id');
          localStorage.removeItem('tenant_slug');
          return;
        }

        if (tenantSlug && result.user?.tenant) {
          const userTenantSlug = result.tenant_slug || result.user.tenant.slug;

          if (!userTenantSlug || userTenantSlug.toLowerCase() !== tenantSlug.toLowerCase()) {
            setError(t('auth_account_not_belong_to_company'));
            setLoading(false);
            localStorage.removeItem('user');
            localStorage.removeItem('permissions');
            localStorage.removeItem('tenant_id');
            localStorage.removeItem('tenant_slug');
            return;
          }
        }

        const isCompanySuperAdmin = result.user?.role?.name === 'company_super_admin';
        const slug = result.tenant_slug || result.user?.tenant?.slug || tenantSlug;

        if (isCompanySuperAdmin && !result.user?.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else if (slug) {
          navigate(`/${slug}/dashboard`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(result.error || t('auth_login_failed'));
        setLoading(false);
      }
    } catch (err) {
      setError(t('auth_login_error'));
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!email) {
      setError(t('auth_enter_email_first'));
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.requestPasswordReset(email);
      setMessage(data?.detail || t('auth_password_reset_link_sent'));
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.email?.[0] ||
        t('auth_password_reset_request_failed');

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetConfirm = async (e) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (!resetUid || !resetToken) {
      setError(t('auth_password_reset_invalid_link'));
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError(t('auth_password_required'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth_passwords_do_not_match'));
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.confirmPasswordReset({
        uid: resetUid,
        token: resetToken,
        new_password: newPassword,
      });

      setMessage(data?.detail || t('auth_password_reset_success'));

      setTimeout(() => {
        goToLoginMode();
      }, 1500);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.new_password?.[0] ||
        t('auth_password_reset_failed');

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!email || !isWebAuthnSupported() || isForgotMode || isResetMode) {
      setBiometricAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { has_biometric } = await authApi.checkBiometric(email);
        setBiometricAvailable(has_biometric);
      } catch {
        setBiometricAvailable(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, isForgotMode, isResetMode]);

  const handleBiometricLogin = async () => {
    if (!email) {
      setError(t('auth_enter_email_first'));
      return;
    }

    setError('');
    setMessage('');
    setBiometricLoading(true);

    try {
      const beginData = await authApi.webauthnLoginBegin(email);
      const credential = await getAssertion(beginData.publicKey);

      const result = await authApi.webauthnLoginComplete({
        state: beginData.state,
        credential,
        user_id: beginData.user_id,
      });

      if (result.is_super_admin) {
        setError(t('auth_login_from_admin_page'));
        return;
      }

      if (tenantSlug && result.tenant_slug) {
        if (result.tenant_slug.toLowerCase() !== tenantSlug.toLowerCase()) {
          setError(t('auth_account_not_belong_to_company'));
          return;
        }
      }

      localStorage.setItem('user_role', result.role);
      localStorage.setItem('is_super_admin', result.is_super_admin);

      if (result.tenant_id) {
        localStorage.setItem('tenant_id', result.tenant_id);
      }

      if (result.tenant_slug) {
        localStorage.setItem('tenant_slug', result.tenant_slug);
      }

      const slug = result.tenant_slug || tenantSlug;

      if (slug) {
        navigate(`/${slug}/dashboard`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || t('auth_biometric_failed');
      setError(msg);
    } finally {
      setBiometricLoading(false);
    }
  };

  const getHeroStyle = useCallback(() => {
    if (companyInfo?.background_image && backgroundLoaded) {
      return { backgroundImage: `url(${companyInfo.background_image})` };
    }

    return {
      background: `linear-gradient(135deg, ${BRAND.secondaryColor} 0%, #060D1B 100%)`,
    };
  }, [companyInfo, backgroundLoaded]);

  const toggleLanguage = () => i18n.changeLanguage(isRTL ? 'en' : 'ar');
  const primaryColor = BRAND.primaryColor;

  if (loadingCompany) {
    return (
      <div className="cl-page">
        <div className="cl-loading">
          <div className="cl-loading__spinner" />
          <p className="cl-loading__text">{t('auth_loading')}</p>
        </div>
      </div>
    );
  }

  if (!companyInfo) {
    return (
      <div className="cl-page">
        <div className="cl-not-found">
          <div className="cl-not-found__icon">!</div>
          <h2 className="cl-not-found__title">{t('auth_company_not_found_title')}</h2>
          <p className="cl-not-found__desc">
            {error || t('auth_company_not_found_description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cl-page ${theme === 'dark' ? 'cl-page--dark' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="cl-hero" style={getHeroStyle()}>
        <div className="cl-hero__overlay" />
        <div className="cl-hero__content">
          {companyInfo.logo && logoLoaded ? (
            <img
              src={companyInfo.logo}
              alt={companyInfo.company_name}
              crossOrigin="anonymous"
              className="cl-hero__logo"
              onError={() => setLogoLoaded(false)}
            />
          ) : (
            <div className="cl-hero__logo-fallback" style={{ background: primaryColor }}>
              {companyInfo.company_name?.charAt(0) || 'C'}
            </div>
          )}

          <h1 className="cl-hero__company">{companyInfo.company_name}</h1>
          <p className="cl-hero__tagline">{t('auth_manage_projects')}</p>
        </div>
      </div>

      <div className="cl-form-panel">
        <div className="cl-form-toolbar">
          <Button variant="secondary" onClick={() => navigate('/')} className="navbar-btn">
            {isRTL ? <FaArrowRight className="ds-me-2" /> : <FaArrowLeft className="ds-me-2" />}
            {t('landing_back')}
          </Button>

          <div className="cl-form-toolbar__actions">
            <Button
              variant="secondary"
              onClick={toggleLanguage}
              title={t('auth_toggle_language')}
              className="navbar-btn"
            >
              <FaGlobe className="ds-me-2" />
              {t('auth_language_switch_label')}
            </Button>

            <Button
              variant="secondary"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('auth_light_mode') : t('auth_dark_mode')}
              className="navbar-btn"
            >
              {theme === 'dark' ? <FaSun /> : <FaMoon />}
            </Button>
          </div>
        </div>

        <div className="cl-form-wrapper">
          <div className="cl-form-header">
            <h2 className="cl-form-header__title">
              {isForgotMode
                ? t('auth_forgot_password')
                : isResetMode
                  ? t('auth_reset_password')
                  : t('auth_welcome_back')}
            </h2>

            <p className="cl-form-header__subtitle">
              {isForgotMode
                ? t('auth_enter_email_for_reset')
                : isResetMode
                  ? t('auth_enter_new_password')
                  : t('auth_sign_in_to_access')}
            </p>
          </div>

          {error && (
            <div className="cl-error">
              <FaExclamationCircle className="cl-error__icon" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="cl-success">
              <FaCheckCircle className="cl-success__icon" />
              <span>{message}</span>
            </div>
          )}

          {!isForgotMode && !isResetMode && (
            <form onSubmit={handleSubmit} className="cl-form">
              <div className="cl-field">
                <label className="cl-field__label">{t('auth_email')}</label>
                <input
                  type="email"
                  className="cl-field__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder={t('auth_enter_email')}
                />
              </div>

              <div className="cl-field">
                <label className="cl-field__label">{t('auth_password')}</label>

                <div className="cl-field__password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="cl-field__input cl-field__input--has-toggle"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder={t('auth_enter_password')}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cl-field__toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? t('auth_hide_password') : t('auth_show_password')}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </div>
              </div>

              <button type="button" className="cl-forgot-link" onClick={goToForgotMode}>
                {t('auth_forgot_password')}
              </button>

              <Button
                type="submit"
                variant="primary"
                className="cl-submit"
                disabled={loading}
                loading={loading}
                style={{ '--btn-color': primaryColor }}
              >
                {t('auth_login')}
              </Button>
            </form>
          )}

          {isForgotMode && (
            <form onSubmit={handlePasswordResetRequest} className="cl-form">
              <div className="cl-field">
                <label className="cl-field__label">{t('auth_email')}</label>
                <input
                  type="email"
                  className="cl-field__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder={t('auth_enter_email')}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="cl-submit"
                disabled={loading}
                loading={loading}
                style={{ '--btn-color': primaryColor }}
              >
                {t('auth_send_reset_link')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="cl-back-login"
                onClick={goToLoginMode}
              >
                {t('auth_back_to_login')}
              </Button>
            </form>
          )}

          {isResetMode && (
            <form onSubmit={handlePasswordResetConfirm} className="cl-form">
              <div className="cl-field">
                <label className="cl-field__label">{t('auth_new_password')}</label>

                <div className="cl-field__password-wrap">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="cl-field__input cl-field__input--has-toggle"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder={t('auth_enter_new_password')}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cl-field__toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? t('auth_hide_password') : t('auth_show_password')}
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </div>
              </div>

              <div className="cl-field">
                <label className="cl-field__label">{t('auth_confirm_password')}</label>

                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="cl-field__input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder={t('auth_confirm_new_password')}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="cl-submit"
                disabled={loading}
                loading={loading}
                style={{ '--btn-color': primaryColor }}
              >
                {t('auth_reset_password')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="cl-back-login"
                onClick={goToLoginMode}
              >
                {t('auth_back_to_login')}
              </Button>
            </form>
          )}

          {!isForgotMode && !isResetMode && isWebAuthnSupported() && biometricAvailable && (
            <div className="cl-biometric">
              <div className="cl-biometric__divider">
                <span>{t('auth_or')}</span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="cl-biometric__btn"
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                loading={biometricLoading}
                startIcon={!biometricLoading ? <FaFingerprint className="cl-biometric__icon" /> : null}
                style={{ '--btn-color': primaryColor }}
              >
                {t('auth_login_biometric')}
              </Button>
            </div>
          )}

          <div className="cl-secure">
            <FaShieldAlt className="cl-secure__icon" />
            <span>{t('auth_secure_login')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}