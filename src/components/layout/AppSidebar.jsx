import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './SidebarContext';
import { useTheme } from '../../hooks/useTheme';
import useTenantNavigate, { useTenantPath, useTenantSlug, stripTenantSlug } from '../../hooks/useTenantNavigate';
import {
  FaHome, FaFolderOpen, FaUsers, FaUserTie, FaMoneyBillWave,
  FaUserCog, FaCog, FaEdit, FaFileInvoice, FaCheckCircle,
  FaClock, FaPlus, FaList, FaReceipt, FaChevronRight,
  FaFileImport, FaBuilding, FaChartLine, FaBox, FaShieldAlt,
  FaTruck, FaSun, FaMoon, FaGlobe, FaSignOutAlt,
  FaChevronLeft,
} from 'react-icons/fa';
import Button from '../common/Button';
import BrandLogo from '../common/BrandLogo';
import './AppSidebar.css';

// ─── Menu configuration ──────────────────────────────────────

function useCompanyMenuItems() {
  const { t } = useTranslation();
  const { hasPermission, isAdmin, canManageUsers, canManageRoles } = useAuth();

  // company_super_admin and Admin see everything — only check permissions for other roles
  const canViewProjects = isAdmin || hasPermission('project.view');
  const canCreateProjects = isAdmin || hasPermission('project.create');
  const canApproveProjects = isAdmin || hasPermission('project.approve');
  const canViewPayments = isAdmin || hasPermission('payment.view') || hasPermission('project.view');
  const canViewInvoices = isAdmin || hasPermission('invoice.view') || hasPermission('project.view');
  const canViewVariations = isAdmin || hasPermission('variation.view') || hasPermission('project.view');
  const canViewOwners = isAdmin || hasPermission('owner.view') || hasPermission('project.view');
  const canViewConsultants = isAdmin || hasPermission('consultant.view') || hasPermission('project.view');
  const canViewSettings = isAdmin || hasPermission('role.view');

  // Build project submenu dynamically
  const projectChildren = [
    ...(canViewProjects ? [{ key: 'projects-list', icon: <FaList />, label: t('projects_list') }] : []),
    ...(canCreateProjects ? [{ key: 'add-project', icon: <FaPlus />, label: t('add_project') }] : []),
    ...(canViewProjects ? [{ key: 'divider-1', type: 'divider' }] : []),
    ...(canViewProjects ? [{ key: 'add-start-order', icon: <FaFileInvoice />, label: t('add_start_order') }] : []),
    ...(canViewVariations ? [{ key: 'add-variation', icon: <FaEdit />, label: t('add_variation') }] : []),
    ...(canViewProjects ? [{ key: 'add-awarding', icon: <FaCheckCircle />, label: t('add_awarding') }] : []),
    ...(canViewProjects ? [{ key: 'add-extensions', icon: <FaClock />, label: t('add_extensions') }] : []),
    ...(canViewProjects ? [{ key: 'add-project-schedule', icon: <FaClock />, label: t('add_project_schedule') }] : []),
    ...(canViewProjects ? [{ key: 'add-excavation-notice', icon: <FaFileInvoice />, label: t('add_excavation_notice') }] : []),
    ...(canViewProjects ? [{ key: 'add-progress', icon: <FaEdit />, label: t('sidebar_add_progress') }] : []),
    ...(canViewPayments || canViewInvoices ? [{ key: 'divider-2', type: 'divider' }] : []),
    ...(canViewPayments ? [{ key: 'add-payment', icon: <FaMoneyBillWave />, label: t('add_payment') }] : []),
    ...(canViewInvoices ? [{ key: 'add-invoice', icon: <FaReceipt />, label: t('add_invoice') }] : []),
    ...(canViewPayments ? [{ key: 'add-payment-claim', icon: <FaFileInvoice />, label: t('add_payment_claim') }] : []),
    ...(canViewProjects ? [{ key: 'divider-3', type: 'divider' }] : []),
    ...(canViewProjects ? [{ key: 'import-data', icon: <FaFileImport />, label: t('import_data') }] : []),
  ];

  return [
    { key: 'home', icon: <FaHome />, label: t('sidebar_home') },

    ...(canViewProjects ? [{
      key: 'projects', icon: <FaFolderOpen />, label: t('sidebar_projects'),
      children: projectChildren,
    }] : []),

    ...(canViewOwners ? [{ key: 'owners', icon: <FaUsers />, label: t('sidebar_owners') }] : []),
    ...(canViewConsultants ? [{ key: 'consultants', icon: <FaUserTie />, label: t('sidebar_consultants') }] : []),
    ...(canApproveProjects ? [{ key: 'pending-approvals', icon: <FaClock />, label: t('sidebar_pending_approvals') }] : []),

    // Management section (admin / roles.manage)
    ...(canManageUsers ? [{ key: 'company-users', icon: <FaUserCog />, label: t('sidebar_manage_users') }] : []),
    ...(canManageRoles ? [{ key: 'company-roles', icon: <FaShieldAlt />, label: t('sidebar_manage_roles') }] : []),
    ...(canViewSettings ? [{ key: 'company-settings', icon: <FaCog />, label: t('sidebar_company_settings') }] : []),
  ];
}

function useAdminMenuItems() {
  const { t } = useTranslation();
  return [
    { key: '/admin/dashboard', icon: <FaHome />, label: t('admin_dashboard'), to: '/admin/dashboard' },
    { key: '/admin/tenants', icon: <FaBuilding />, label: t('admin_companies'), to: '/admin/tenants' },
    { key: '/admin/users', icon: <FaUsers />, label: t('admin_users'), to: '/admin/users' },
    { key: '/admin/analytics', icon: <FaChartLine />, label: t('admin_analytics'), to: '/admin/analytics' },
    { key: '/admin/audit-log', icon: <FaBox />, label: t('admin_audit_log_btn'), to: '/admin/audit-log' },
    { key: '/admin/settings', icon: <FaCog />, label: t('admin_settings'), to: '/admin/settings' },
  ];
}

// ─── Navigation helpers ──────────────────────────────────────

const COMPANY_NAV_MAP = {
  'home': '/dashboard',
  'projects-list': '/projects',
  'add-project': '/wizard/new',
  'import-data': '/boq',
  'owners': '/owners',
  'consultants': '/consultants',
  'pending-approvals': '/projects/pending-approvals',
  'company-users': '/company/users',
  'company-roles': '/company/roles',
  'company-settings': '/company/settings',
};

function getCompanyActiveKey(pathname) {
  if (pathname === '/dashboard' || pathname === '/' || pathname === '/home') return 'home';
  if (pathname === '/projects' || pathname === '/projects/') return 'projects-list';
  if (pathname === '/wizard/new') return 'add-project';
  const selectMatch = pathname.match(/^\/projects\/select\/(.+)$/);
  if (selectMatch) return `add-${selectMatch[1]}`;
  if (pathname.startsWith('/payment-claims')) return 'add-payment-claim';
  if (pathname.startsWith('/projects/') && pathname.includes('/progress')) return 'add-progress';
  if (pathname === '/projects/pending-approvals') return 'pending-approvals';
  if (pathname.startsWith('/boq') || pathname.startsWith('/import-data')) return 'import-data';
  if (pathname.startsWith('/projects') || pathname.startsWith('/wizard')) return 'projects-list';
  if (pathname === '/owners') return 'owners';
  if (pathname === '/consultants') return 'consultants';
  if (pathname === '/company/users') return 'company-users';
  if (pathname === '/company/roles') return 'company-roles';
  if (pathname === '/company/settings') return 'company-settings';
  return 'home';
}

function handleCompanyNav(key, navigate) {
  if (key?.includes('divider')) return;
  const path = COMPANY_NAV_MAP[key];
  if (path) {
    navigate(path);
    return;
  }
  // Project operations: add-start-order, add-variation, etc.
  if (key?.startsWith('add-')) {
    navigate(`/projects/select/${key.replace('add-', '')}`);
  }
}

// ─── Logo component ──────────────────────────────────────────

function SidebarLogo({ isAdmin, logoUrl, companyName }) {
  return (
    <div className="app-sidebar__logo-wrap">
      <BrandLogo
        type={isAdmin ? 'structora' : 'tenant'}
        size={40}
        logoUrl={isAdmin ? undefined : logoUrl}
        companyName={companyName}
        className="app-sidebar__logo"
      />
    </div>
  );
}

// ─── Menu item renderer ──────────────────────────────────────

function MenuItem({ item, activeKey, collapsed, openKeys, onToggle, onNavigate }) {
  if (item.type === 'divider') {
    return <div className="app-sidebar__divider" />;
  }

  const hasChildren = item.children?.length > 0;
  const isChildActive = hasChildren && item.children.some(c => c.type !== 'divider' && activeKey === c.key);
  const isActive = activeKey === item.key || isChildActive;
  const isOpen = openKeys.includes(item.key) || isChildActive;

  // Admin mode: items have `to` prop for Link
  if (item.to) {
    return (
      <Link
        to={item.to}
        className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
        title={collapsed ? item.label : undefined}
      >
        <span className="app-sidebar__item-icon">{item.icon}</span>
        {!collapsed && <span className="app-sidebar__item-label">{item.label}</span>}
      </Link>
    );
  }

  // Expandable item with children
  if (hasChildren) {
    if (collapsed) {
      return (
        <div
          className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
          title={item.label}
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          onClick={() => onToggle(item.key)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(item.key); } }}
        >
          <span className="app-sidebar__item-icon">{item.icon}</span>
        </div>
      );
    }

    return (
      <div>
        <div
          className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          onClick={() => onToggle(item.key)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(item.key); } }}
        >
          <span className="app-sidebar__item-icon">{item.icon}</span>
          <span className="app-sidebar__item-label">{item.label}</span>
          <span className={`app-sidebar__submenu-arrow ${isOpen ? 'app-sidebar__submenu-arrow--open' : ''}`}>
            <FaChevronRight />
          </span>
        </div>
        {isOpen && (
          <div className="app-sidebar__submenu">
            {item.children.map(child => (
              <MenuItem
                key={child.key}
                item={child}
                activeKey={activeKey}
                collapsed={false}
                openKeys={openKeys}
                onToggle={onToggle}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Simple item
  return (
    <div
      className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(item.key)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(item.key); } }}
      title={collapsed ? item.label : undefined}
    >
      <span className="app-sidebar__item-icon">{item.icon}</span>
      {!collapsed && <span className="app-sidebar__item-label">{item.label}</span>}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

export default function AppSidebar({ mode = 'company' }) {
  const { pathname } = useLocation();
  const navigate = useTenantNavigate();
  const tp = useTenantPath();
  const slug = useTenantSlug();
  const { t, i18n } = useTranslation();
  const { user, logout, tenantTheme } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const lang = i18n.language;
  const isRTL = lang === 'ar';

  const isAdmin = mode === 'admin';

  // Menu items
  const companyItems = useCompanyMenuItems();
  const adminItems = useAdminMenuItems();
  const menuItems = isAdmin ? adminItems : companyItems;

  // Active key — strip tenant slug from pathname for matching
  const logicalPath = isAdmin ? pathname : stripTenantSlug(pathname, slug);
  const activeKey = isAdmin
    ? pathname
    : getCompanyActiveKey(logicalPath);

  // Open submenus — projects always open by default
  const [openKeys, setOpenKeys] = useState(['projects']);

  useEffect(() => {
    if (!isAdmin) {
      setOpenKeys(prev => prev.includes('projects') ? prev : [...prev, 'projects']);
    }
  }, [pathname, isAdmin]);

  const toggleOpenKey = (key) => {
    setOpenKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Navigation handler
  const handleNav = (key) => {
    if (isAdmin) {
      navigate(key);
    } else {
      handleCompanyNav(key, navigate);
    }
  };

  // Logo config — admin uses STRUCTORA bars, company uses tenant logo
  const logoUrl = isAdmin ? null : tenantTheme?.logo_url;

  // Bilingual company name — primary follows current language
  // For tenant users: use tenant name from theme OR from user object, NEVER "STRUCTORA"
  const tenantName = user?.tenant?.name || '';
  const companyNameAr = isAdmin ? '' : (tenantTheme?.company_name || tenantName || '');
  const companyNameEn = isAdmin ? '' : (tenantTheme?.contractor_name_en || '');

  let brandName, brandNameSecondary;
  if (isAdmin) {
    brandName = t('super_admin_panel');
    brandNameSecondary = '';
  } else if (lang === 'ar') {
    brandName = companyNameAr || t('nav_company');
    brandNameSecondary = companyNameEn;
  } else {
    brandName = companyNameEn || companyNameAr || t('nav_company');
    brandNameSecondary = companyNameEn ? companyNameAr : '';
  }
  const brandTagline = isAdmin
    ? t('system_administration')
    : t('nav_control_panel');

  // User info
  const currentUser = user?.email || user?.get_full_name || t('nav_user');
  const getUserRoleDisplay = (roleName) => {
    if (!roleName) return t('nav_user');
    const map = {
      'company_super_admin': t('nav_role_company_super_admin'),
      'Manager': t('nav_role_manager'),
      'Admin': t('nav_role_admin'),
      'User': t('nav_user'),
      'user': t('nav_user'),
    };
    return map[roleName] || roleName;
  };
  const userRole = isAdmin ? t('nav_super_admin') : getUserRoleDisplay(user?.role?.name);
  const userInitial = user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';

  // Language switcher
  const handleLanguageChange = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.preferred_language = newLang;
        localStorage.setItem('user', JSON.stringify(u));
      }
    } catch (_) { /* silent */ }
    i18n.changeLanguage(newLang);
  };

  // Admin active check
  const isAdminActive = (to) => pathname === to || pathname.startsWith(to + '/');

  return (
    <aside
      className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Header: Logo + Brand ── */}
      <div className="app-sidebar__header">
        <SidebarLogo isAdmin={isAdmin} logoUrl={logoUrl} companyName={brandName} />
        {!collapsed && (
          <div className="app-sidebar__brand">
            <div className="app-sidebar__brand-name">{brandName}</div>
            {brandNameSecondary && (
              <div className="app-sidebar__brand-name-secondary">{brandNameSecondary}</div>
            )}
            <div className="app-sidebar__brand-tagline">{brandTagline}</div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="app-sidebar__nav">
        {menuItems.map(item => (
          <MenuItem
            key={item.key}
            item={item}
            activeKey={isAdmin ? (isAdminActive(item.to) ? item.to : '') : activeKey}
            collapsed={collapsed}
            openKeys={openKeys}
            onToggle={toggleOpenKey}
            onNavigate={handleNav}
          />
        ))}
      </nav>

      {/* ── Footer: User + Actions ── */}
      <div className="app-sidebar__footer">
        {/* User info */}
        <Link to={isAdmin ? "/admin/profile" : tp("/profile")} className="app-sidebar__user">
          <div className="app-sidebar__user-avatar">
            {user?.avatar_url ? (
              <Avatar src={user.avatar_url} sx={{ width: 36, height: 36, fontSize: '0.875rem' }}>
                {userInitial}
              </Avatar>
            ) : (
              <div className="app-sidebar__user-avatar app-sidebar__user-avatar--fallback">
                {userInitial}
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="app-sidebar__user-info">
              <div className="app-sidebar__user-name">{currentUser}</div>
              <div className="app-sidebar__user-role">{userRole}</div>
            </div>
          )}
        </Link>

        {/* Action buttons */}
        <div className="app-sidebar__actions">
          <Button
            variant="ghost"
            size="sm"
            className="app-sidebar__action-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('nav_light_mode') : t('nav_dark_mode')}
            type="button"
          >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="app-sidebar__action-btn"
            onClick={handleLanguageChange}
            title={t('nav_change_language')}
            type="button"
          >
            <span className="app-sidebar__action-content">
              <FaGlobe />
              {!collapsed && <span className="app-sidebar__action-label">{lang.toUpperCase()}</span>}
            </span>
          </Button>

          <Button
            variant="danger"
            size="sm"
            className="app-sidebar__action-btn"
            onClick={logout}
            title={t('nav_sign_out')}
            type="button"
          >
            <FaSignOutAlt />
          </Button>
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="app-sidebar__collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? t('nav_expand_sidebar') : t('nav_collapse_sidebar')}
          type="button"
        >
          {collapsed
            ? (isRTL ? <FaChevronLeft /> : <FaChevronRight />)
            : (isRTL ? <FaChevronRight /> : <FaChevronLeft />)
          }
        </Button>
      </div>
    </aside>
  );
}
