import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../../contexts/NotificationContext';
import { api } from '../../../services/api';
import { adminApi } from '../../../services/admin/adminApi';
import { logger } from '../../../utils/logger';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import {
  FaSearch,
  FaUserShield,
  FaUserTie,
  FaUser,
  FaToggleOn,
  FaToggleOff,
  FaKey,
  FaBuilding,
  FaEnvelope,
  FaChevronDown,
  FaChevronUp,
  FaUsers,
  FaPhone,
} from 'react-icons/fa';
import './AdminUsersPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const { success, error: showError } = useNotifications();
  const isRTL = i18n.language === 'ar';

  const [users, setUsers] = useState([]);
  const [totalTenantsCount, setTotalTenantsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTenant, setExpandedTenant] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [{ data }, tenantsData] = await Promise.all([
        api.get('auth/users/'),
        adminApi.getTenants(),
      ]);
      setUsers(Array.isArray(data) ? data : data?.results || []);
      const tenantsList = Array.isArray(tenantsData) ? tenantsData : [];
      setTotalTenantsCount(tenantsList.length);
    } catch (error) {
      logger.error('Error loading users', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.patch(`auth/users/${userId}/`, { is_active: !currentStatus });
      success(t('admin_user_status_updated'));
      await loadUsers();
    } catch (error) {
      logger.error('Error toggling user status', error);
      showError(t('admin_user_status_update_error'));
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      showError(t('admin_password_min_length'));
      return;
    }
    try {
      setSavingPassword(true);
      await api.patch(`auth/users/${resetPasswordUser.id}/`, { password: newPassword });
      success(t('admin_password_reset_success'));
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error) {
      logger.error('Error resetting password', error);
      showError(t('admin_password_reset_error'));
    } finally {
      setSavingPassword(false);
    }
  };

  // Helper: get role name from user object
  const getUserRole = (u) => u.role?.name || '';

  // Group users by tenant
  const groupedData = useMemo(() => {
    const superAdmins = [];
    const tenantMap = {};

    users.forEach(u => {
      // Super admins — separate group
      if (u.is_superuser) {
        superAdmins.push(u);
        return;
      }

      // Skip users without a tenant (orphan users)
      if (!u.tenant?.id) return;

      const tenantName = u.tenant.name;
      const tenantId = u.tenant.id;
      if (!tenantMap[tenantId]) {
        tenantMap[tenantId] = { id: tenantId, name: tenantName, admins: [], staff: [] };
      }

      const roleName = getUserRole(u);
      if (['company_super_admin', 'Admin'].includes(roleName)) {
        tenantMap[tenantId].admins.push(u);
      } else {
        tenantMap[tenantId].staff.push(u);
      }
    });

    // Sort tenants by name
    const tenantList = Object.values(tenantMap).sort((a, b) => a.name.localeCompare(b.name));

    // Apply search filter
    const filtered = searchQuery
      ? tenantList.filter(tenant =>
          tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tenant.admins.some(a =>
            (a.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.first_name || '').toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          tenant.staff.some(s =>
            (s.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.first_name || '').toLowerCase().includes(searchQuery.toLowerCase())
          )
        )
      : tenantList;

    return { superAdmins, tenants: filtered };
  }, [users, searchQuery, t]);

  // Stats
  const stats = useMemo(() => {
    const admins = users.filter(u => {
      const r = getUserRole(u);
      return ['company_super_admin', 'Admin'].includes(r);
    });
    return {
      totalCompanies: totalTenantsCount,
      totalUsers: users.length,
      companyAdmins: admins.length,
      superAdmins: users.filter(u => u.is_superuser).length,
    };
  }, [users, totalTenantsCount, groupedData]);

  const getRoleLabel = (u) => {
    if (u.is_superuser) return t('admin_role_super_admin');
    const roleName = getUserRole(u);
    if (roleName === 'company_super_admin') return t('admin_role_company_admin');
    if (roleName === 'Admin') return t('admin_role_admin');
    if (roleName === 'Manager') return t('admin_role_manager');
    if (roleName === 'staff_user') return t('admin_role_staff');
    return roleName || '—';
  };

  const getRoleBadgeClass = (u) => {
    if (u.is_superuser) return 'admin-users__role-badge--super';
    const roleName = getUserRole(u);
    if (['company_super_admin', 'Admin'].includes(roleName)) return 'admin-users__role-badge--admin';
    if (roleName === 'Manager') return 'admin-users__role-badge--manager';
    return 'admin-users__role-badge--staff';
  };

  const getRoleIcon = (u) => {
    if (u.is_superuser) return <FaUserShield />;
    const roleName = getUserRole(u);
    if (['company_super_admin', 'Admin'].includes(roleName)) return <FaUserTie />;
    return <FaUser />;
  };

  const renderUserRow = (u, showActions = true) => (
    <div key={u.id} className={`admin-users__user-row ${!u.is_active ? 'admin-users__user-row--inactive' : ''}`}>
      <div className="admin-users__user-main">
        <div className="admin-users__avatar">
          {u.avatar ? (
            <img src={u.avatar} alt={u.first_name || u.email || 'User avatar'} className="admin-users__avatar-img" />
          ) : (
            <span className="admin-users__avatar-placeholder">
              {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
            </span>
          )}
        </div>
        <div className="admin-users__user-info">
          <div className="admin-users__user-name">
            {u.first_name || u.last_name
              ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
              : u.email}
          </div>
          <div className="admin-users__user-meta">
            <span><FaEnvelope /> {u.email}</span>
            {u.phone && <span><FaPhone /> {u.phone}</span>}
          </div>
        </div>
      </div>
      <div className="admin-users__user-badges">
        <span className={`admin-users__role-badge ${getRoleBadgeClass(u)}`}>
          {getRoleIcon(u)} {getRoleLabel(u)}
        </span>
        <span className={`admin-users__status-dot ${u.is_active ? 'admin-users__status-dot--active' : 'admin-users__status-dot--inactive'}`}>
          {u.is_active ? t('admin_status_active') : t('admin_status_inactive')}
        </span>
      </div>
      {showActions && !u.is_superuser && (
        <div className="admin-users__user-actions">
          <Button
            variant={u.is_active ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => toggleUserStatus(u.id, u.is_active)}
          >
            {u.is_active ? <FaToggleOff className="ds-icon-gap-sm" /> : <FaToggleOn className="ds-icon-gap-sm" />}
            {u.is_active ? t('admin_deactivate') : t('admin_activate')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setResetPasswordUser(u); setNewPassword(''); }}
          >
            <FaKey className="ds-icon-gap-sm" />
            {t('admin_reset_password')}
          </Button>
        </div>
      )}
    </div>
  );

  if (!user?.is_superuser) return null;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="admin-users">
      {/* Header */}
      <div className="admin-users__header">
        <div>
          <h1 className="admin-users__title">{t('admin_users_title')}</h1>
          <p className="admin-users__subtitle">{t('admin_users_subtitle_v2')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-users__stats">
        <div className="admin-users__stat">
          <div className="admin-users__stat-value">{stats.totalCompanies}</div>
          <div className="admin-users__stat-label">{t('admin_total_companies')}</div>
        </div>
        <div className="admin-users__stat">
          <div className="admin-users__stat-value">{stats.totalUsers}</div>
          <div className="admin-users__stat-label">{t('admin_total_users')}</div>
        </div>
        <div className="admin-users__stat">
          <div className="admin-users__stat-value">{stats.companyAdmins}</div>
          <div className="admin-users__stat-label">{t('admin_company_admins')}</div>
        </div>
        <div className="admin-users__stat">
          <div className="admin-users__stat-value">{stats.superAdmins}</div>
          <div className="admin-users__stat-label">{t('admin_super_admins')}</div>
        </div>
      </div>

      {/* Search */}
      <Card className="admin-users__filters-card">
        <div className="admin-users__search">
          <FaSearch className="admin-users__search-icon" />
          <input
            type="text"
            className="admin-users__search-input"
            placeholder={t('admin_search_companies_users')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <Card><div className="admin-users__loading">{t('admin_loading')}</div></Card>
      ) : (
        <>
          {/* Super Admins Section */}
          {groupedData.superAdmins.length > 0 && (
            <Card className="admin-users__section">
              <div className="admin-users__section-header admin-users__section-header--super">
                <FaUserShield className="admin-users__section-icon" />
                <div>
                  <h2 className="admin-users__section-title">{t('admin_system_admins')}</h2>
                  <p className="admin-users__section-sub">{t('admin_system_admins_desc')}</p>
                </div>
              </div>
              {groupedData.superAdmins.map(u => renderUserRow(u, false))}
            </Card>
          )}

          {/* Companies Section */}
          {groupedData.tenants.length === 0 ? (
            <Card><div className="admin-users__empty">{t('admin_no_companies_found')}</div></Card>
          ) : (
            groupedData.tenants.map(tenant => {
              const isExpanded = expandedTenant === tenant.id;
              const totalMembers = tenant.admins.length + tenant.staff.length;

              return (
                <Card key={tenant.id} className="admin-users__company-card">
                  {/* Company Header */}
                  <div
                    className="admin-users__company-header"
                    onClick={() => setExpandedTenant(isExpanded ? null : tenant.id)}
                  >
                    <div className="admin-users__company-info">
                      <div className="admin-users__company-icon">
                        <FaBuilding />
                      </div>
                      <div>
                        <h3 className="admin-users__company-name">{tenant.name}</h3>
                        <div className="admin-users__company-meta">
                          <span><FaUserTie /> {tenant.admins.length} {t('admin_admins')}</span>
                          <span><FaUsers /> {tenant.staff.length} {t('admin_staff_members')}</span>
                          <span className="admin-users__company-total">
                            {t('admin_total')}: {totalMembers}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="admin-users__company-toggle">
                      <span className="admin-users__expand-label">
                        {isExpanded ? t('admin_hide_staff') : t('admin_show_staff')}
                      </span>
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                  </div>

                  {/* Company Admins — always visible */}
                  <div className="admin-users__admins-section">
                    <div className="admin-users__section-label">{t('admin_company_administrators')}</div>
                    {tenant.admins.length === 0 ? (
                      <div className="admin-users__no-admin">{t('admin_no_admin_assigned')}</div>
                    ) : (
                      tenant.admins.map(a => renderUserRow(a))
                    )}
                  </div>

                  {/* Staff — expandable */}
                  {isExpanded && tenant.staff.length > 0 && (
                    <div className="admin-users__staff-section">
                      <div className="admin-users__section-label">
                        {t('admin_staff_members')} ({tenant.staff.length})
                      </div>
                      {tenant.staff.map(s => renderUserRow(s))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="admin-users__modal-overlay" role="dialog" aria-modal="true" onClick={() => setResetPasswordUser(null)} onKeyDown={(e) => { if (e.key === 'Escape') setResetPasswordUser(null); }}>
          <Card className="admin-users__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-users__modal-title">{t('admin_reset_password')}</h2>
            <p className="admin-users__modal-sub">{resetPasswordUser.email}</p>
            <div className="admin-users__modal-field">
              <label>{t('admin_new_password')}</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('admin_enter_new_password')}
                minLength={8}
                autoFocus
              />
              <span className="admin-users__modal-hint">{t('admin_password_min_length')}</span>
            </div>
            <div className="admin-users__modal-actions">
              <Button variant="secondary" onClick={() => setResetPasswordUser(null)}>
                {t('admin_cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleResetPassword}
                disabled={savingPassword || !newPassword || newPassword.length < 8}
                loading={savingPassword}
              >
                {t('admin_reset_password')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
