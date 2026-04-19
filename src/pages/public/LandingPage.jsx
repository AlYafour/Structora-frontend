import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import BrandLogo from '../../components/common/BrandLogo';
import BRAND from '../../config/brand';
import {
  FaArrowRight,
  FaArrowLeft,
  FaSun,
  FaMoon,
  FaGlobe,
  FaLock,
  FaChartBar,
  FaMoneyBillWave,
  FaFileContract,
  FaClock,
  FaBell,
  FaFolderOpen,
  FaShieldAlt,
  FaFingerprint,
  FaCloudUploadAlt,
  FaUserLock,
} from 'react-icons/fa';
import './LandingPage.css';
import useTenantNavigate from '../../hooks/useTenantNavigate';

export default function LandingPage() {
  const navigate = useTenantNavigate();
  const { i18n, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isRTL = i18n.language === 'ar';
  const isDark = theme === 'dark';

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyCode, setCompanyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginRole, setLoginRole] = useState(''); // 'contractor' | 'consultant'
  const [modalStep, setModalStep] = useState(1); // 1 = role selection, 2 = company code

  useEffect(() => {
    localStorage.removeItem('tenant_theme');
    localStorage.removeItem('tenant_id');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-secondary');
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(isRTL ? 'en' : 'ar');
  };

  const handleCompanyLogin = async (e) => {
    e?.preventDefault();
    setError('');
    if (!companyCode.trim()) {
      setError(t('landing_enter_company_code_error'));
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(`public/company-info/${companyCode.trim().toLowerCase()}/`);
      if (response.data) {
        navigate(`/login/${companyCode.trim().toLowerCase()}`, { state: { loginRole } });
      }
    } catch (err) {
      setError(err.response?.data?.error || t('landing_company_not_found'));
    } finally {
      setLoading(false);
    }
  };

  const ArrowIcon = isRTL ? FaArrowLeft : FaArrowRight;

  const features = [
    { icon: FaChartBar, titleKey: 'landing_feat_dashboard', descKey: 'landing_feat_dashboard_desc' },
    { icon: FaMoneyBillWave, titleKey: 'landing_feat_finance', descKey: 'landing_feat_finance_desc' },
    { icon: FaFileContract, titleKey: 'landing_feat_contracts', descKey: 'landing_feat_contracts_desc' },
    { icon: FaClock, titleKey: 'landing_feat_schedule', descKey: 'landing_feat_schedule_desc' },
    { icon: FaBell, titleKey: 'landing_feat_alerts', descKey: 'landing_feat_alerts_desc' },
    { icon: FaFolderOpen, titleKey: 'landing_feat_archive', descKey: 'landing_feat_archive_desc' },
  ];

  const securityBadges = [
    { icon: FaShieldAlt, labelKey: 'landing_sec_encryption', sub: 'AES-256 / TLS 1.3' },
    { icon: FaFingerprint, labelKey: 'landing_sec_2fa', sub: 'TOTP / SMS / Email' },
    { icon: FaUserLock, labelKey: 'landing_sec_rbac', sub: 'RBAC / Audit Logs' },
    { icon: FaCloudUploadAlt, labelKey: 'landing_sec_cloud', sub: 'Cloud Backup' },
  ];

  return (
    <div className={`lp ${isDark ? 'lp--dark' : 'lp--light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Animated Background */}
      <div className="lp-bg">
        <div className="lp-bg__mesh" />
        <div className="lp-bg__grid" />
        <div className="lp-bg__orb lp-bg__orb--1" />
        <div className="lp-bg__orb lp-bg__orb--2" />
        <div className="lp-bg__particles">
          {[...Array(6)].map((_, i) => <div key={i} className="lp-bg__dot" />)}
        </div>
      </div>

      {/* Navigation */}
      <nav className="lp-nav">
        <div className="lp-nav__inner">
          <div className="lp-nav__logo">
            <BrandLogo type="structora" size={40} className="lp-nav__logo-svg" />
            <div className="lp-nav__brand">
              <span className="lp-nav__brand-name">{BRAND.name}</span>
              <span className="lp-nav__brand-sub">{t('landing_brand_sub')}</span>
            </div>
          </div>

          <div className="lp-nav__actions">
            <button className="lp-nav__btn" onClick={toggleTheme} title={isDark ? t('landing_light_mode') : t('landing_dark_mode')}>
              {isDark ? <FaSun /> : <FaMoon />}
            </button>
            <button className="lp-nav__btn" onClick={toggleLanguage}>
              <FaGlobe />
              <span>{t('landing_language_name')}</span>
            </button>
            <button className="lp-nav__btn lp-nav__btn--admin" onClick={() => navigate('/admin/login')}>
              <FaLock />
              {t('landing_admin_login')}
            </button>
            <button className="lp-nav__btn lp-nav__btn--primary" onClick={() => setShowCompanyModal(true)}>
              {t('landing_company_login')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero__inner">
          <div className="lp-hero__chip">
            <span className="lp-hero__chip-dot" />
            <span>{t('landing_hero_chip')}</span>
          </div>
          <h1 className="lp-hero__title">{t('landing_hero_title')}</h1>
          <div className="lp-hero__subtitle">{t('landing_hero_subtitle')}</div>
          <p className="lp-hero__desc">{t('landing_hero_description')}</p>
          <div className="lp-hero__btns">
            <button className="lp-btn lp-btn--primary" onClick={() => setShowCompanyModal(true)}>
              {t('landing_company_login')}
              <ArrowIcon style={{ marginInlineStart: 8 }} />
            </button>
            <button className="lp-btn lp-btn--secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              {t('landing_explore_features')}
            </button>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="lp-stats">
        {[
          { num: '100%', label: t('landing_stat_control') },
          { num: '24/7', label: t('landing_stat_monitoring') },
          { num: '\u221E', label: t('landing_stat_projects') },
          { num: '2FA', label: t('landing_stat_security') },
        ].map((s, i) => (
          <div key={i} className="lp-stats__item">
            <div className="lp-stats__num">{s.num}</div>
            <div className="lp-stats__label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="lp-features" id="features">
        <div className="lp-section-head">
          <div className="lp-section-head__tag">{t('landing_features_tag')}</div>
          <h2 className="lp-section-head__title">{t('landing_features_title')}</h2>
          <p className="lp-section-head__sub">{t('landing_features_sub')}</p>
        </div>
        <div className="lp-features__grid">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="lp-feat">
                <div className="lp-feat__icon"><Icon /></div>
                <div className="lp-feat__title">{t(f.titleKey)}</div>
                <div className="lp-feat__desc">{t(f.descKey)}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Security */}
      <section className="lp-security">
        <div className="lp-section-head">
          <div className="lp-section-head__tag">{t('landing_security_tag')}</div>
          <h2 className="lp-section-head__title">{t('landing_security_title')}</h2>
        </div>
        <div className="lp-security__badges">
          {securityBadges.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="lp-sec-badge">
                <span className="lp-sec-badge__icon"><Icon /></span>
                <div className="lp-sec-badge__text">
                  <span className="lp-sec-badge__label">{t(b.labelKey)}</span>
                  <span className="lp-sec-badge__sub">{b.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-cta__box">
          <h2 className="lp-cta__title">{t('landing_cta_title')}</h2>
          <p className="lp-cta__desc">{t('landing_cta_desc')}</p>
          <button className="lp-btn lp-btn--primary" onClick={() => setShowCompanyModal(true)}>
            {t('landing_company_login')}
            <ArrowIcon style={{ marginInlineStart: 8 }} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer__copy">
          &copy; {new Date().getFullYear()} {t('landing_project_management_system')}
        </div>
        <div className="lp-footer__links" />
      </footer>

      {/* Company Login Modal */}
      {showCompanyModal && (
        <div className="lp-modal-overlay" role="dialog" aria-modal="true" onClick={() => { setShowCompanyModal(false); setCompanyCode(''); setError(''); setModalStep(1); setLoginRole(''); }} onKeyDown={(e) => { if (e.key === 'Escape') { setShowCompanyModal(false); setCompanyCode(''); setError(''); setModalStep(1); setLoginRole(''); } }}>
          <Card className="lp-modal" onClick={(e) => e.stopPropagation()}>
            {modalStep === 1 ? (
              <>
                <div className="lp-modal__header">
                  <h2>{t('landing_select_role')}</h2>
                  <p>{t('landing_select_role_prompt')}</p>
                </div>
                <div className="lp-role-selector">
                  <button
                    type="button"
                    className={`lp-role-card ${loginRole === 'contractor' ? 'lp-role-card--active' : ''}`}
                    onClick={() => setLoginRole('contractor')}
                  >
                    <div className="lp-role-card__icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 20h20" /><path d="M5 20V7l7-4 7 4v13" /><path d="M9 20v-4h6v4" /><path d="M9 12h.01" /><path d="M15 12h.01" />
                      </svg>
                    </div>
                    <div className="lp-role-card__title">{t('landing_role_contractor')}</div>
                    <div className="lp-role-card__desc">{t('landing_role_contractor_desc')}</div>
                  </button>
                  <button
                    type="button"
                    className={`lp-role-card ${loginRole === 'consultant' ? 'lp-role-card--active' : ''}`}
                    onClick={() => setLoginRole('consultant')}
                  >
                    <div className="lp-role-card__icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 5H2v7l6.29 6.29a1 1 0 0 0 1.42 0l4.58-4.58a1 1 0 0 0 0-1.42L9 5Z" /><path d="M6 9.01V9" /><path d="M22 8l-5.5 5.5" /><path d="M16 2l6 6" />
                      </svg>
                    </div>
                    <div className="lp-role-card__title">{t('landing_role_consultant')}</div>
                    <div className="lp-role-card__desc">{t('landing_role_consultant_desc')}</div>
                  </button>
                </div>
                <div className="lp-modal__actions">
                  <Button type="button" variant="secondary" onClick={() => { setShowCompanyModal(false); setLoginRole(''); }}>
                    {t('landing_cancel')}
                  </Button>
                  <Button type="button" variant="primary" disabled={!loginRole} onClick={() => setModalStep(2)}>
                    {t('landing_continue')}
                    <FaArrowRight className="ds-icon-gap" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="lp-modal__header">
                  <h2>{t('landing_company_login')}</h2>
                  <p>{t('landing_enter_company_code_prompt')}</p>
                  <div className="lp-modal__role-badge">
                    {loginRole === 'contractor' ? t('landing_role_contractor') : t('landing_role_consultant')}
                  </div>
                </div>
                {error && <div className="lp-modal__error">{error}</div>}
                <form onSubmit={handleCompanyLogin}>
                  <div className="lp-modal__field">
                    <label>{t('landing_company_code')}</label>
                    <input
                      type="text"
                      value={companyCode}
                      onChange={(e) => { setCompanyCode(e.target.value); setError(''); }}
                      placeholder={t('landing_enter_company_code')}
                      autoFocus
                      className="lp-modal__input"
                    />
                  </div>
                  <div className="lp-modal__actions">
                    <Button type="button" variant="secondary" onClick={() => { setModalStep(1); setCompanyCode(''); setError(''); }}>
                      {t('landing_back')}
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading || !companyCode.trim()}>
                      {t('landing_continue')}
                      <FaArrowRight className="ds-icon-gap" />
                    </Button>
                  </div>
                </form>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
