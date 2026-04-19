import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { adminApi } from '../../../services/admin';
import { logger } from '../../../utils/logger';
import { formatDate } from '../../../utils/formatters';
import Card from '../../../components/common/Card';
import {
  FaBuilding,
  FaUsers,
  FaProjectDiagram,
  FaChartBar,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';
import './AdminAnalyticsPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const isRTL = i18n.language === 'ar';

  const [tenants, setTenants] = useState([]);
  const [tenantSettings, setTenantSettings] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const [tenantsRes, settingsRes, usersRes, logsRes] = await Promise.all([
        adminApi.getTenants(),
        adminApi.getAllTenantSettings(),
        api.get('auth/users/'),
        api.get('auth/audit-logs/'),
      ]);
      setTenants(Array.isArray(tenantsRes) ? tenantsRes : []);
      setTenantSettings(Array.isArray(settingsRes) ? settingsRes : []);
      const usersData = usersRes.data;
      setUsers(Array.isArray(usersData) ? usersData : usersData?.results || []);
      const logsData = logsRes.data;
      setAuditLogs(Array.isArray(logsData) ? logsData : logsData?.results || []);
    } catch (error) {
      logger.error('Error loading analytics data', error);
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const stats = useMemo(() => {
    const activeCompanies = tenants.filter(t => t.is_active).length;
    const trialCompanies = tenants.filter(t => t.is_trial).length;
    const activeUsers = users.filter(u => u.is_active).length;
    const recentLogins = auditLogs.filter(l => l.action === 'login').slice(0, 10);

    // Subscription status breakdown
    const subStatus = { active: 0, trial: 0, suspended: 0, expired: 0 };
    tenantSettings.forEach(ts => {
      const status = ts.subscription_status || 'trial';
      if (subStatus[status] !== undefined) subStatus[status]++;
    });

    // Top companies by user count
    const companyUsers = {};
    users.forEach(u => {
      const name = u.tenant_name || 'No Company';
      companyUsers[name] = (companyUsers[name] || 0) + 1;
    });
    const topCompanies = Object.entries(companyUsers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Usage per company
    const companyUsage = tenantSettings.map(ts => ({
      name: ts.company_name || ts.tenant?.name || '—',
      users: ts.current_users_count || 0,
      maxUsers: ts.max_users || 0,
      projects: ts.current_projects_count || 0,
      maxProjects: ts.max_projects || 0,
      status: ts.subscription_status || 'trial',
    })).sort((a, b) => b.users - a.users);

    return {
      totalCompanies: tenants.length,
      activeCompanies,
      trialCompanies,
      totalUsers: users.length,
      activeUsers,
      subStatus,
      topCompanies,
      companyUsage,
      recentLogins,
    };
  }, [tenants, tenantSettings, users, auditLogs]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <FaCheckCircle style={{ color: 'var(--success-500)' }} />;
      case 'suspended': return <FaExclamationTriangle style={{ color: 'var(--warning-500)' }} />;
      case 'expired': return <FaTimesCircle style={{ color: 'var(--danger-500)' }} />;
      default: return <FaClock style={{ color: 'var(--accent)' }} />;
    }
  };

  if (!user?.is_superuser) return null;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="admin-analytics">
      <div className="admin-analytics__header">
        <h1 className="admin-analytics__title">{t('admin_analytics_title')}</h1>
        <p className="admin-analytics__subtitle">{t('admin_analytics_subtitle')}</p>
      </div>

      {loading ? (
        <div className="admin-analytics__loading">{t('admin_loading')}</div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="admin-analytics__stats-grid">
            <Card className="admin-analytics__stat-card">
              <FaBuilding className="admin-analytics__stat-icon" />
              <div className="admin-analytics__stat-value">{stats.totalCompanies}</div>
              <div className="admin-analytics__stat-label">{t('admin_total_companies')}</div>
              <div className="admin-analytics__stat-sub">
                {stats.activeCompanies} {t('admin_status_active')} · {stats.trialCompanies} {t('admin_status_trial')}
              </div>
            </Card>
            <Card className="admin-analytics__stat-card">
              <FaUsers className="admin-analytics__stat-icon" />
              <div className="admin-analytics__stat-value">{stats.totalUsers}</div>
              <div className="admin-analytics__stat-label">{t('admin_total_users')}</div>
              <div className="admin-analytics__stat-sub">
                {stats.activeUsers} {t('admin_status_active')}
              </div>
            </Card>
            <Card className="admin-analytics__stat-card">
              <FaChartBar className="admin-analytics__stat-icon" />
              <div className="admin-analytics__stat-value">{stats.subStatus.active}</div>
              <div className="admin-analytics__stat-label">{t('admin_active_subscriptions')}</div>
              <div className="admin-analytics__stat-sub">
                {stats.subStatus.suspended} {t('admin_status_suspended')} · {stats.subStatus.expired} {t('admin_status_expired')}
              </div>
            </Card>
            <Card className="admin-analytics__stat-card">
              <FaClock className="admin-analytics__stat-icon" />
              <div className="admin-analytics__stat-value">{stats.subStatus.trial}</div>
              <div className="admin-analytics__stat-label">{t('admin_trial_companies')}</div>
              <div className="admin-analytics__stat-sub">{t('admin_trial_sub_info')}</div>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="admin-analytics__grid-2col">
            {/* Company Usage Table */}
            <Card>
              <h2 className="admin-analytics__section-title">
                <FaProjectDiagram className="ds-icon-gap" />
                {t('admin_company_usage')}
              </h2>
              <div className="admin-analytics__table-wrap">
                <table className="admin-analytics__table">
                  <thead>
                    <tr>
                      <th>{t('admin_company')}</th>
                      <th>{t('admin_users')}</th>
                      <th>{t('admin_projects')}</th>
                      <th>{t('admin_subscription_status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.companyUsage.map((c, i) => (
                      <tr key={i}>
                        <td className="admin-analytics__company-cell">{c.name}</td>
                        <td>
                          <div className="admin-analytics__usage-bar-wrap">
                            <span>{c.users}/{c.maxUsers}</span>
                            <div className="admin-analytics__usage-bar">
                              <div
                                className="admin-analytics__usage-fill"
                                style={{
                                  width: `${c.maxUsers > 0 ? Math.min((c.users / c.maxUsers) * 100, 100) : 0}%`,
                                  background: c.maxUsers > 0 && (c.users / c.maxUsers) > 0.8
                                    ? 'var(--danger-500)' : 'var(--accent)',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="admin-analytics__usage-bar-wrap">
                            <span>{c.projects}/{c.maxProjects}</span>
                            <div className="admin-analytics__usage-bar">
                              <div
                                className="admin-analytics__usage-fill"
                                style={{
                                  width: `${c.maxProjects > 0 ? Math.min((c.projects / c.maxProjects) * 100, 100) : 0}%`,
                                  background: c.maxProjects > 0 && (c.projects / c.maxProjects) > 0.8
                                    ? 'var(--danger-500)' : 'var(--accent)',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="admin-analytics__status-badge">
                            {getStatusIcon(c.status)} {t(`admin_status_${c.status}`)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {stats.companyUsage.length === 0 && (
                      <tr><td colSpan={4} className="admin-analytics__empty">{t('admin_no_data')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Recent Logins */}
            <Card>
              <h2 className="admin-analytics__section-title">
                <FaClock className="ds-icon-gap" />
                {t('admin_recent_logins')}
              </h2>
              <div className="admin-analytics__login-list">
                {stats.recentLogins.length === 0 ? (
                  <div className="admin-analytics__empty">{t('admin_no_data')}</div>
                ) : (
                  stats.recentLogins.map((log, i) => (
                    <div key={i} className="admin-analytics__login-item">
                      <div className="admin-analytics__login-user">
                        {log.user_email || log.description || '—'}
                      </div>
                      <div className="admin-analytics__login-meta">
                        <span>{formatDate(log.created_at, i18n.language)}</span>
                        {log.ip_address && <span>{log.ip_address}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Top Companies Bar */}
          <Card>
            <h2 className="admin-analytics__section-title">
              <FaBuilding className="ds-icon-gap" />
              {t('admin_top_companies_by_users')}
            </h2>
            <div className="admin-analytics__bar-chart">
              {stats.topCompanies.map(([name, count], i) => (
                <div key={i} className="admin-analytics__bar-row">
                  <span className="admin-analytics__bar-label">{name}</span>
                  <div className="admin-analytics__bar-track">
                    <div
                      className="admin-analytics__bar-fill"
                      style={{
                        width: `${stats.topCompanies[0] ? (count / stats.topCompanies[0][1]) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="admin-analytics__bar-value">{count}</span>
                </div>
              ))}
              {stats.topCompanies.length === 0 && (
                <div className="admin-analytics__empty">{t('admin_no_data')}</div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
