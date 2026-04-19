import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { adminApi } from '../../../services/admin/adminApi';
import Card from '../../../components/common/Card';
import {
  FaBuilding,
  FaUsers,
  FaChartLine,
  FaUserShield,
  FaCog,
  FaHistory,
  FaPlus,
  FaArrowRight,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
} from 'react-icons/fa';
import { formatDate } from '../../../utils/formatters';
import { logger } from '../../../utils/logger';
import './AdminDashboardPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const isRTL = i18n.language === 'ar';
  const ArrowIcon = isRTL ? FaArrowLeft : FaArrowRight;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_tenants: 0,
    active_tenants: 0,
    trial_tenants: 0,
    total_users: 0,
    active_users: 0,
  });
  const [recentCompanies, setRecentCompanies] = useState([]);

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const tenantsData = await adminApi.getTenants();
      const tenantsList = Array.isArray(tenantsData) ? tenantsData : [];

      // Recent 5 companies
      const sorted = [...tenantsList].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
      setRecentCompanies(sorted.slice(0, 5));

      // Stats
      try {
        const { data: statsData } = await api.get('auth/admin/dashboard/stats/');
        setStats({
          total_tenants: statsData.total_tenants || tenantsList.length,
          active_tenants: statsData.active_tenants || tenantsList.filter(t => t.is_active).length,
          trial_tenants: statsData.trial_tenants || tenantsList.filter(t => t.is_trial).length,
          total_users: statsData.total_users || 0,
          active_users: statsData.active_users || 0,
        });
      } catch {
        setStats({
          total_tenants: tenantsList.length,
          active_tenants: tenantsList.filter(t => t.is_active).length,
          trial_tenants: tenantsList.filter(t => t.is_trial).length,
          total_users: 0,
          active_users: 0,
        });
      }
    } catch (error) {
      logger.error('Error loading admin data', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.is_superuser) return null;

  const quickActions = [
    { icon: <FaPlus />, label: t('admin_create_new_company_btn'), to: '/admin/create-company', primary: true },
    { icon: <FaBuilding />, label: t('admin_manage_companies_limits'), to: '/admin/tenants' },
    { icon: <FaUsers />, label: t('admin_manage_users_btn'), to: '/admin/users' },
    { icon: <FaChartLine />, label: t('admin_analytics_btn'), to: '/admin/analytics' },
    { icon: <FaHistory />, label: t('admin_audit_log_btn'), to: '/admin/audit-log' },
    { icon: <FaCog />, label: t('admin_settings_btn'), to: '/admin/settings' },
  ];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="admin-dash">
      {/* Header */}
      <div className="admin-dash__header">
        <div>
          <h1 className="admin-dash__title">{t('admin_dashboard_title')}</h1>
          <p className="admin-dash__subtitle">{t('admin_dashboard_subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <Card><div className="admin-dash__loading">{t('admin_loading')}</div></Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="admin-dash__stats">
            <Card className="admin-dash__stat-card" onClick={() => navigate('/admin/tenants')}>
              <div className="admin-dash__stat-icon admin-dash__stat-icon--navy">
                <FaBuilding />
              </div>
              <div className="admin-dash__stat-value">{stats.total_tenants}</div>
              <div className="admin-dash__stat-label">{t('admin_total_companies')}</div>
            </Card>

            <Card className="admin-dash__stat-card" onClick={() => navigate('/admin/tenants')}>
              <div className="admin-dash__stat-icon admin-dash__stat-icon--green">
                <FaCheckCircle />
              </div>
              <div className="admin-dash__stat-value">{stats.active_tenants}</div>
              <div className="admin-dash__stat-label">{t('admin_active_companies')}</div>
            </Card>

            <Card className="admin-dash__stat-card" onClick={() => navigate('/admin/tenants')}>
              <div className="admin-dash__stat-icon admin-dash__stat-icon--gold">
                <FaClock />
              </div>
              <div className="admin-dash__stat-value">{stats.trial_tenants}</div>
              <div className="admin-dash__stat-label">{t('admin_trial_companies')}</div>
            </Card>

            <Card className="admin-dash__stat-card" onClick={() => navigate('/admin/users')}>
              <div className="admin-dash__stat-icon admin-dash__stat-icon--blue">
                <FaUsers />
              </div>
              <div className="admin-dash__stat-value">{stats.total_users}</div>
              <div className="admin-dash__stat-label">{t('admin_total_users')}</div>
            </Card>
          </div>

          {/* Two-column layout */}
          <div className="admin-dash__grid">
            {/* Recent Companies */}
            <Card className="admin-dash__section">
              <div className="admin-dash__section-header">
                <h2 className="admin-dash__section-title">
                  <FaBuilding className="admin-dash__section-icon" />
                  {t('admin_recent_companies')}
                </h2>
                <button
                  className="admin-dash__view-all"
                  onClick={() => navigate('/admin/tenants')}
                >
                  {t('admin_view_all')} <ArrowIcon />
                </button>
              </div>

              {recentCompanies.length === 0 ? (
                <div className="admin-dash__empty">{t('admin_no_registered_companies')}</div>
              ) : (
                <div className="admin-dash__company-list">
                  {recentCompanies.map(tenant => (
                    <div
                      key={tenant.id}
                      className="admin-dash__company-item"
                      onClick={() => navigate('/admin/tenants')}
                    >
                      <div className="admin-dash__company-icon">
                        <FaBuilding />
                      </div>
                      <div className="admin-dash__company-info">
                        <div className="admin-dash__company-name">{tenant.name}</div>
                        <div className="admin-dash__company-date">
                          {formatDate(tenant.created_at, i18n.language)}
                        </div>
                      </div>
                      <div className="admin-dash__company-badges">
                        <span className={`admin-dash__badge ${tenant.is_active ? 'admin-dash__badge--active' : 'admin-dash__badge--inactive'}`}>
                          {tenant.is_active ? t('admin_status_active') : t('admin_status_inactive')}
                        </span>
                        {tenant.is_trial && (
                          <span className="admin-dash__badge admin-dash__badge--trial">
                            {t('admin_status_trial')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="admin-dash__section">
              <div className="admin-dash__section-header">
                <h2 className="admin-dash__section-title">
                  <FaUserShield className="admin-dash__section-icon" />
                  {t('admin_quick_actions')}
                </h2>
              </div>

              <div className="admin-dash__actions-list">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    className={`admin-dash__action-item ${action.primary ? 'admin-dash__action-item--primary' : ''}`}
                    onClick={() => navigate(action.to)}
                  >
                    <span className="admin-dash__action-icon">{action.icon}</span>
                    <span className="admin-dash__action-label">{action.label}</span>
                    <ArrowIcon className="admin-dash__action-arrow" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* System Info */}
          <Card className="admin-dash__system-info">
            <div className="admin-dash__info-row">
              <span className="admin-dash__info-label">{t('admin_active_users')}</span>
              <span className="admin-dash__info-value">{stats.active_users} / {stats.total_users}</span>
            </div>
            <div className="admin-dash__info-row">
              <span className="admin-dash__info-label">{t('admin_system_status')}</span>
              <span className="admin-dash__info-status">
                <span className="admin-dash__status-dot" /> {t('admin_system_online')}
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
