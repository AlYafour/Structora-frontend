import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../../contexts/NotificationContext';
import { adminApi } from '../../../services/admin';
import { logger } from '../../../utils/logger';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import {
  FaBuilding,
  FaEdit,
  FaUsers,
  FaProjectDiagram,
  FaCalendarAlt,
  FaSearch,
  FaToggleOn,
  FaToggleOff,
  FaSave,
  FaTimes,
  FaLink,
  FaExclamationTriangle,
  FaTrash,
} from 'react-icons/fa';
import { formatDate } from '../../../utils/formatters';
import { buildFileUrl } from '../../../utils/helpers/file';
import { api } from '../../../services/api';
import './AdminTenantsPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function AdminTenantsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const { success, error: showError } = useNotifications();
  const isRTL = i18n.language === 'ar';

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingSlugId, setEditingSlugId] = useState(null);
  const [slugValue, setSlugValue] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [formData, setFormData] = useState({
    max_users: 10,
    max_projects: 50,
    subscription_start_date: '',
    subscription_end_date: '',
    subscription_status: 'trial',
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadTenants();
  }, [user]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      // Fetch both tenants and tenant settings to merge data
      const [tenantsData, settingsData] = await Promise.all([
        adminApi.getTenants(),
        adminApi.getAllTenantSettings(),
      ]);

      // Create a map of settings by tenant ID
      const settingsMap = {};
      settingsData.forEach(s => {
        if (s.tenant?.id) {
          settingsMap[s.tenant.id] = s;
        }
      });

      // Merge: every Tenant gets its settings (if any)
      const merged = tenantsData.map(tenant => ({
        tenant,
        settings: settingsMap[tenant.id] || null,
        // Use company_name from settings, fallback to tenant.name
        displayName: settingsMap[tenant.id]?.company_name || tenant.name,
        logoUrl: settingsMap[tenant.id]?.logo_url
          ? buildFileUrl(settingsMap[tenant.id].logo_url)
          : null,
        // Subscription info from settings
        subscription_status: settingsMap[tenant.id]?.subscription_status || (tenant.is_trial ? 'trial' : 'active'),
        max_users: settingsMap[tenant.id]?.max_users || 10,
        max_projects: settingsMap[tenant.id]?.max_projects || 50,
        current_users_count: settingsMap[tenant.id]?.current_users_count || 0,
        current_projects_count: settingsMap[tenant.id]?.current_projects_count || 0,
        subscription_start_date: settingsMap[tenant.id]?.subscription_start_date || '',
        subscription_end_date: settingsMap[tenant.id]?.subscription_end_date || '',
        hasSettings: !!settingsMap[tenant.id],
      }));

      setTenants(merged);
    } catch (error) {
      logger.error('Error loading tenants', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTenantStatus = async (item) => {
    const newActive = !item.tenant.is_active;
    try {
      // 1. Update Tenant is_active
      await api.patch(`auth/tenants/${item.tenant.id}/`, { is_active: newActive });

      // 2. Sync subscription_status in TenantSettings
      if (item.hasSettings) {
        const newSubStatus = newActive
          ? (item.subscription_status === 'suspended' ? 'active' : item.subscription_status)
          : 'suspended';
        await adminApi.updateTenantSettings(item.tenant.id, {
          subscription_status: newSubStatus,
        });
      }

      success(newActive ? t('admin_company_activated') : t('admin_company_deactivated'));
      await loadTenants();
    } catch (error) {
      logger.error('Error toggling tenant status', error);
      showError(t('admin_company_status_error'));
    }
  };

  const handleDeleteTenant = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`auth/tenants/${deleteTarget.tenant.id}/`);
      success(t('admin_company_deleted'));
      setDeleteTarget(null);
      setDeleteConfirmName('');
      await loadTenants();
    } catch (error) {
      logger.error('Error deleting tenant', error);
      showError(t('admin_company_delete_error'));
    } finally {
      setDeleting(false);
    }
  };

  const handleEditLimits = (item) => {
    setEditingId(item.tenant.id);
    setFormData({
      max_users: item.max_users,
      max_projects: item.max_projects,
      subscription_start_date: item.subscription_start_date || '',
      subscription_end_date: item.subscription_end_date || '',
      subscription_status: item.subscription_status || 'trial',
    });
  };

  const handleSaveLimits = async (tenantId) => {
    try {
      setSavingLimits(true);
      // Remove empty date fields to avoid backend validation errors
      const payload = { ...formData };
      if (!payload.subscription_start_date) delete payload.subscription_start_date;
      if (!payload.subscription_end_date) delete payload.subscription_end_date;
      await adminApi.updateTenantSettings(tenantId, payload);
      await loadTenants();
      setEditingId(null);
      success(t('admin_limits_updated'));
    } catch (error) {
      logger.error('Error updating tenant limits', error);
      showError(t('admin_limits_update_error'));
    } finally {
      setSavingLimits(false);
    }
  };

  const handleEditSlug = (item) => {
    setEditingSlugId(item.tenant.id);
    setSlugValue(item.tenant.slug || '');
  };

  const handleSaveSlug = async (tenantId) => {
    if (!slugValue?.trim()) {
      showError(t('admin_enter_company_code'));
      return;
    }
    const cleanedSlug = slugValue.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(cleanedSlug)) {
      showError(t('admin_company_code_invalid'));
      return;
    }
    try {
      setSavingSlug(true);
      await adminApi.updateTenantSlug(tenantId, cleanedSlug);
      await loadTenants();
      setEditingSlugId(null);
      success(t('admin_company_code_updated'));
    } catch (error) {
      logger.error('Error updating slug', error);
      let errorMsg = t('admin_company_code_update_error');
      if (error.response?.data?.slug?.[0]) {
        errorMsg = error.response.data.slug[0];
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      showError(errorMsg);
    } finally {
      setSavingSlug(false);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter(t => t.tenant.is_active).length,
    trial: tenants.filter(t => t.subscription_status === 'trial').length,
    suspended: tenants.filter(t => t.subscription_status === 'suspended' || t.subscription_status === 'expired').length,
  }), [tenants]);

  // Filter
  const filtered = useMemo(() => {
    if (!searchQuery) return tenants;
    const q = searchQuery.toLowerCase();
    return tenants.filter(item =>
      item.displayName.toLowerCase().includes(q) ||
      item.tenant.name.toLowerCase().includes(q) ||
      (item.tenant.slug || '').toLowerCase().includes(q)
    );
  }, [tenants, searchQuery]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'admin-tenants__badge--active';
      case 'trial': return 'admin-tenants__badge--trial';
      case 'suspended': return 'admin-tenants__badge--suspended';
      case 'expired': return 'admin-tenants__badge--expired';
      default: return 'admin-tenants__badge--trial';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: t('admin_status_active'),
      suspended: t('admin_status_suspended'),
      expired: t('admin_status_expired'),
      trial: t('admin_status_trial'),
    };
    return labels[status] || status;
  };

  const getUsagePercent = (current, max) => {
    if (!max) return 0;
    return Math.min(Math.round((current / max) * 100), 100);
  };

  const getUsageClass = (percent) => {
    if (percent >= 90) return 'admin-tenants__usage-bar--danger';
    if (percent >= 70) return 'admin-tenants__usage-bar--warning';
    return 'admin-tenants__usage-bar--ok';
  };

  if (!user?.is_superuser) return null;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="admin-tenants">
      {/* Header */}
      <div className="admin-tenants__header">
        <div>
          <h1 className="admin-tenants__title">{t('admin_manage_companies_and_limits')}</h1>
          <p className="admin-tenants__subtitle">{t('admin_set_limits_per_company')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-tenants__stats">
        <div className="admin-tenants__stat">
          <div className="admin-tenants__stat-value">{stats.total}</div>
          <div className="admin-tenants__stat-label">{t('admin_total_companies')}</div>
        </div>
        <div className="admin-tenants__stat">
          <div className="admin-tenants__stat-value admin-tenants__stat-value--active">{stats.active}</div>
          <div className="admin-tenants__stat-label">{t('admin_active_companies')}</div>
        </div>
        <div className="admin-tenants__stat">
          <div className="admin-tenants__stat-value admin-tenants__stat-value--trial">{stats.trial}</div>
          <div className="admin-tenants__stat-label">{t('admin_trial_companies')}</div>
        </div>
        <div className="admin-tenants__stat">
          <div className="admin-tenants__stat-value admin-tenants__stat-value--suspended">{stats.suspended}</div>
          <div className="admin-tenants__stat-label">{t('admin_suspended_expired')}</div>
        </div>
      </div>

      {/* Search */}
      <Card className="admin-tenants__search-card">
        <div className="admin-tenants__search">
          <FaSearch className="admin-tenants__search-icon" />
          <input
            type="text"
            className="admin-tenants__search-input"
            placeholder={t('admin_search_companies_users')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <Card><div className="admin-tenants__loading">{t('admin_loading')}</div></Card>
      ) : filtered.length === 0 ? (
        <Card><div className="admin-tenants__empty">{t('admin_no_companies_found')}</div></Card>
      ) : (
        filtered.map(item => {
          const isEditing = editingId === item.tenant.id;
          const isEditingSlug = editingSlugId === item.tenant.id;
          const usersPercent = getUsagePercent(item.current_users_count, item.max_users);
          const projectsPercent = getUsagePercent(item.current_projects_count, item.max_projects);

          return (
            <Card key={item.tenant.id} className="admin-tenants__company-card">
              {/* Company Header Row */}
              <div className="admin-tenants__company-header">
                <div className="admin-tenants__company-info">
                  <div className="admin-tenants__company-icon">
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt={item.displayName}
                        className="admin-tenants__company-logo"
                      />
                    ) : (
                      <FaBuilding />
                    )}
                  </div>
                  <div>
                    <h3
                      className="admin-tenants__company-name admin-tenants__company-name--link"
                      onClick={() => navigate(`/admin/tenants/${item.tenant.id}/edit`)}
                      title={t('admin_edit_company')}
                    >
                      {item.displayName}
                    </h3>
                    {item.displayName !== item.tenant.name && (
                      <div className="admin-tenants__tenant-name">{item.tenant.name}</div>
                    )}
                    <div className="admin-tenants__company-meta">
                      <span><FaCalendarAlt /> {formatDate(item.tenant.created_at, i18n.language)}</span>
                    </div>
                  </div>
                </div>

                <div className="admin-tenants__header-actions">
                  <span className={`admin-tenants__badge ${getStatusColor(item.subscription_status)}`}>
                    {getStatusLabel(item.subscription_status)}
                  </span>
                  <Button
                    variant={item.tenant.is_active ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => toggleTenantStatus(item)}
                  >
                    {item.tenant.is_active ? <FaToggleOn className="ds-icon-gap-sm" /> : <FaToggleOff className="ds-icon-gap-sm" />}
                    {item.tenant.is_active ? t('admin_deactivate') : t('admin_activate')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => { setDeleteTarget(item); setDeleteConfirmName(''); }}
                  >
                    <FaTrash className="ds-icon-gap-sm" />
                    {t('admin_delete')}
                  </Button>
                </div>
              </div>

              {/* Company Code */}
              <div className="admin-tenants__slug-section">
                <div className="admin-tenants__slug-label">
                  <FaLink /> {t('admin_company_code_label')}
                </div>
                {isEditingSlug ? (
                  <div className="admin-tenants__slug-edit">
                    <input
                      type="text"
                      value={slugValue}
                      onChange={(e) => setSlugValue(e.target.value.toLowerCase())}
                      placeholder={t('admin_company_code_placeholder')}
                      className="admin-tenants__slug-input"
                    />
                    <Button variant="primary" size="sm" onClick={() => handleSaveSlug(item.tenant.id)} loading={savingSlug}>
                      <FaSave className="ds-icon-gap-sm" /> {t('admin_save')}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingSlugId(null)}>
                      <FaTimes className="ds-icon-gap-sm" /> {t('admin_cancel')}
                    </Button>
                  </div>
                ) : (
                  <div className="admin-tenants__slug-display">
                    {item.tenant.slug ? (
                      <>
                        <code className="admin-tenants__slug-value">{item.tenant.slug}</code>
                        <span className="admin-tenants__slug-hint">{t('admin_use_for_login')}</span>
                      </>
                    ) : (
                      <span className="admin-tenants__slug-missing">
                        <FaExclamationTriangle /> {t('admin_company_code_missing')}
                      </span>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => handleEditSlug(item)}>
                      <FaEdit className="ds-icon-gap-sm" />
                      {item.tenant.slug ? t('admin_edit_code') : t('admin_add_code')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Usage & Limits */}
              {!item.hasSettings && (
                <div className="admin-tenants__no-settings">
                  <FaExclamationTriangle /> {t('admin_no_settings_warning')}
                </div>
              )}

              {isEditing ? (
                /* Edit Mode */
                <div className="admin-tenants__edit-form">
                  <div className="admin-tenants__edit-grid">
                    <div className="admin-tenants__field">
                      <label>{t('admin_max_users')}</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.max_users}
                        onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 0 })}
                        min="1"
                      />
                    </div>
                    <div className="admin-tenants__field">
                      <label>{t('admin_max_projects')}</label>
                      <input
                        type="number"
                        className="input"
                        value={formData.max_projects}
                        onChange={(e) => setFormData({ ...formData, max_projects: parseInt(e.target.value) || 0 })}
                        min="1"
                      />
                    </div>
                    <div className="admin-tenants__field">
                      <label>{t('admin_subscription_status')}</label>
                      <select
                        className="input"
                        value={formData.subscription_status}
                        onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value })}
                      >
                        <option value="trial">{t('admin_status_trial')}</option>
                        <option value="active">{t('admin_status_active')}</option>
                        <option value="suspended">{t('admin_status_suspended')}</option>
                        <option value="expired">{t('admin_status_expired')}</option>
                      </select>
                    </div>
                    <div className="admin-tenants__field">
                      <label>{t('admin_subscription_start_date')}</label>
                      <input
                        type="date"
                        className="input"
                        value={formData.subscription_start_date}
                        onChange={(e) => setFormData({ ...formData, subscription_start_date: e.target.value })}
                      />
                    </div>
                    <div className="admin-tenants__field">
                      <label>{t('admin_subscription_end_date')}</label>
                      <input
                        type="date"
                        className="input"
                        value={formData.subscription_end_date}
                        onChange={(e) => setFormData({ ...formData, subscription_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="admin-tenants__edit-actions">
                    <Button variant="primary" size="sm" onClick={() => handleSaveLimits(item.tenant.id)} loading={savingLimits}>
                      <FaSave className="ds-icon-gap-sm" /> {t('admin_save')}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                      <FaTimes className="ds-icon-gap-sm" /> {t('admin_cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode — Usage bars */
                <div className="admin-tenants__usage-section">
                  <div className="admin-tenants__usage-row">
                    <div className="admin-tenants__usage-info">
                      <FaUsers className="admin-tenants__usage-icon" />
                      <span className="admin-tenants__usage-label">{t('admin_users')}</span>
                      <span className="admin-tenants__usage-count">
                        {item.current_users_count} / {item.max_users}
                      </span>
                    </div>
                    <div className="admin-tenants__usage-bar-track">
                      <div
                        className={`admin-tenants__usage-bar-fill ${getUsageClass(usersPercent)}`}
                        style={{ width: `${usersPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="admin-tenants__usage-row">
                    <div className="admin-tenants__usage-info">
                      <FaProjectDiagram className="admin-tenants__usage-icon" />
                      <span className="admin-tenants__usage-label">{t('admin_projects')}</span>
                      <span className="admin-tenants__usage-count">
                        {item.current_projects_count} / {item.max_projects}
                      </span>
                    </div>
                    <div className="admin-tenants__usage-bar-track">
                      <div
                        className={`admin-tenants__usage-bar-fill ${getUsageClass(projectsPercent)}`}
                        style={{ width: `${projectsPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Subscription dates */}
                  {(item.subscription_start_date || item.subscription_end_date) && (
                    <div className="admin-tenants__dates">
                      {item.subscription_start_date && (
                        <span>
                          <FaCalendarAlt /> {t('admin_start_date')}: {formatDate(item.subscription_start_date, i18n.language)}
                        </span>
                      )}
                      {item.subscription_end_date && (
                        <span>
                          <FaCalendarAlt /> {t('admin_end_date')}: {formatDate(item.subscription_end_date, i18n.language)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="admin-tenants__card-actions">
                    <Button variant="secondary" size="sm" onClick={() => handleEditLimits(item)}>
                      <FaEdit className="ds-icon-gap-sm" /> {t('admin_edit_limits')}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="admin-tenants__modal-overlay" role="dialog" aria-modal="true" onClick={() => setDeleteTarget(null)} onKeyDown={(e) => { if (e.key === 'Escape') setDeleteTarget(null); }}>
          <Card className="admin-tenants__modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-tenants__modal-icon">
              <FaExclamationTriangle />
            </div>
            <h2 className="admin-tenants__modal-title">{t('admin_delete_company_title')}</h2>
            <p className="admin-tenants__modal-desc">
              {t('admin_delete_company_warning')}
            </p>
            <div className="admin-tenants__modal-company">
              <FaBuilding /> <strong>{deleteTarget.displayName}</strong>
            </div>
            <div className="admin-tenants__modal-stats">
              <span><FaUsers /> {deleteTarget.current_users_count} {t('admin_users')}</span>
              <span><FaProjectDiagram /> {deleteTarget.current_projects_count} {t('admin_projects')}</span>
            </div>
            <div className="admin-tenants__modal-field">
              <label>{t('admin_delete_confirm_label', { name: deleteTarget.displayName })}</label>
              <input
                type="text"
                className="input"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={deleteTarget.displayName}
                autoFocus
              />
            </div>
            <div className="admin-tenants__modal-actions">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                {t('admin_cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteTenant}
                disabled={deleting || deleteConfirmName !== deleteTarget.displayName}
                loading={deleting}
              >
                <FaTrash className="ds-icon-gap-sm" />
                {t('admin_confirm_delete')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
