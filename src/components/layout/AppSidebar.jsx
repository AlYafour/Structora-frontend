import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  FaSun, FaMoon, FaGlobe, FaSignOutAlt,
  FaChevronLeft,
} from 'react-icons/fa';
import Button from '../common/Button';
import BrandLogo from '../common/BrandLogo';
import './AppSidebar.css';

function useCompanyMenuItems() {
  const { t } = useTranslation();
  const {
    hasPermission,
    hasAnyPermission,
    isAdmin,
    canManageUsers,
    canManageRoles,
  } = useAuth();

  const canViewProjects    = isAdmin || hasPermission('projects.view');
  const canCreateProjects  = isAdmin || hasPermission('projects.create');
  const canEditProjects    = isAdmin || hasPermission('projects.edit') || hasPermission('projects.create');
  const canApproveProjects = isAdmin || hasPermission('projects.approve');
  const canAddAwarding = isAdmin || hasPermission('projects.add_awarding');
  const canAddStartOrder = isAdmin || hasPermission('projects.add_start_order');
  const canAddProjectSchedule = isAdmin || hasPermission('projects.add_project_schedule');
  const canAddExcavationNotice = isAdmin || hasPermission('projects.add_excavation_notice');
  const canAddPaymentClaim = isAdmin || hasPermission('projects.add_payment_claim');

  const canCreateVariations = isAdmin || hasPermission('variations.create');
  const canViewVariations   = isAdmin || hasPermission('variations.view') || canCreateVariations;

  const canViewOwners =
    isAdmin ||
    hasPermission('owners.view') ||
    hasPermission('owners.create');

  const canViewConsultants =
    isAdmin ||
    hasPermission('consultants.view') ||
    hasPermission('consultants.create');

  const canViewSettings = isAdmin || hasPermission('roles.manage');

  // Financial is now independent from Projects
  const canAccessFinancial =
    isAdmin ||
    canAddPaymentClaim ||
    hasAnyPermission([
      'financial.view',
      'financial.create',
      'financial.edit',
      'financial.approve',
      'payments.view',
      'payments.create',
      'payments.edit',
      'payments.approve',
      'invoices.view',
      'invoices.create',
      'invoices.edit',
      'invoices.approve',
    ]);

  const canAccessPayments =
    isAdmin ||
    hasAnyPermission([
      'financial.view',
      'financial.create',
      'financial.edit',
      'financial.approve',
      'payments.view',
      'payments.create',
      'payments.edit',
      'payments.approve',
    ]);

  const canAccessInvoices =
    isAdmin ||
    hasAnyPermission([
      'financial.view',
      'financial.create',
      'financial.edit',
      'financial.approve',
      'invoices.view',
      'invoices.create',
      'invoices.edit',
      'invoices.approve',
    ]);

  const canAccessBoq = isAdmin || hasPermission('boq.view') || hasPermission('boq.edit');

  const projectChildren = [
    ...(canViewProjects ? [{ key: 'projects-list', icon: <FaList />, label: t('projects_list') }] : []),
    ...(canCreateProjects ? [{ key: 'add-project', icon: <FaPlus />, label: t('add_project') }] : []),
    ...((canCreateProjects || canEditProjects) ? [{ key: 'divider-1', type: 'divider' }] : []),
    ...(canAddStartOrder ? [{ key: 'add-start-order', icon: <FaFileInvoice />, label: t('add_start_order') }] : []),
    ...(canCreateVariations ? [{ key: 'add-variation', icon: <FaEdit />, label: t('add_variation') }] : []),
    ...(canAddAwarding ? [{ key: 'add-awarding', icon: <FaCheckCircle />, label: t('add_awarding') }] : []),
    ...(canEditProjects ? [{ key: 'add-extensions', icon: <FaClock />, label: t('add_extensions') }] : []),
    ...(canAddProjectSchedule ? [{ key: 'add-project-schedule', icon: <FaClock />, label: t('add_project_schedule') }] : []),
    ...(canAddExcavationNotice ? [{ key: 'add-excavation-notice', icon: <FaFileInvoice />, label: t('add_excavation_notice') }] : []),
    ...(canEditProjects ? [{ key: 'add-progress', icon: <FaEdit />, label: t('sidebar_add_progress') }] : []),
    ...(canAccessBoq ? [{ key: 'divider-3', type: 'divider' }] : []),
    ...(canAccessBoq ? [{ key: 'import-data', icon: <FaFileImport />, label: t('import_data') }] : []),
  ];

  const financialChildren = [
    ...(canAccessPayments ? [{ key: 'add-payment', icon: <FaMoneyBillWave />, label: t('add_payment') }] : []),
    ...(canAccessInvoices ? [{ key: 'add-invoice', icon: <FaReceipt />, label: t('add_invoice') }] : []),
    ...(canAddPaymentClaim ? [{ key: 'add-payment-claim', icon: <FaFileInvoice />, label: t('add_payment_claim') }] : []),
  ];

  return [
    { key: 'home', icon: <FaHome />, label: t('sidebar_home') },

    ...(projectChildren.length > 0 ? [{
      key: 'projects',
      icon: <FaFolderOpen />,
      label: t('sidebar_projects'),
      children: projectChildren,
    }] : []),

    ...(canAccessFinancial ? [{
      key: 'financial',
      icon: <FaMoneyBillWave />,
      label: t('sidebar_financial', { defaultValue: 'Financial' }),
      children: financialChildren,
    }] : []),

    ...(canViewOwners ? [{ key: 'owners', icon: <FaUsers />, label: t('sidebar_owners') }] : []),
    ...(canViewConsultants ? [{ key: 'consultants', icon: <FaUserTie />, label: t('sidebar_consultants') }] : []),
    ...(canApproveProjects ? [{ key: 'pending-approvals', icon: <FaClock />, label: t('sidebar_pending_approvals') }] : []),

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

const COMPANY_NAV_MAP = {
  home: '/dashboard',
  'projects-list': '/projects',
  'add-project': '/wizard',
  'import-data': '/boq',
  owners: '/owners',
  consultants: '/consultants',
  'pending-approvals': '/projects/pending-approvals',
  'company-users': '/company/users',
  'company-roles': '/company/roles',
  'company-settings': '/company/settings',
};

function getCompanyActiveKey(pathname) {
  if (pathname === '/dashboard' || pathname === '/' || pathname === '/home') return 'home';
  if (pathname === '/projects' || pathname === '/projects/') return 'projects-list';
  if (pathname.startsWith('/wizard')) return 'add-project';

  const selectMatch = pathname.match(/^\/projects\/select\/(.+)$/);
  if (selectMatch) return `add-${selectMatch[1]}`;

  if (pathname.startsWith('/payment-claims')) return 'add-payment-claim';
  if (pathname.startsWith('/projects/') && pathname.includes('/progress')) return 'add-progress';
  if (pathname === '/projects/pending-approvals') return 'pending-approvals';
  if (pathname.startsWith('/boq') || pathname.startsWith('/import-data')) return 'import-data';
  if (pathname.startsWith('/projects')) return 'projects-list';
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

  if (key?.startsWith('add-')) {
    navigate(`/projects/select/${key.replace('add-', '')}`);
  }
}

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

function FlyoutMenu({ flyout, onMouseEnter, onMouseLeave, onNavigate, activeKey, isRTL }) {
  if (!flyout) return null;

  return createPortal(
    <div
      className={`sidebar-flyout${isRTL ? ' sidebar-flyout--rtl' : ''}`}
      style={{ top: `${flyout.top}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="sidebar-flyout__header">{flyout.label}</div>
      {flyout.children.map(child => {
        if (child.type === 'divider') {
          return <div key={child.key} className="app-sidebar__divider sidebar-flyout__divider" />;
        }
        const isActive = activeKey === child.key;
        return (
          <div
            key={child.key}
            className={`sidebar-flyout__item${isActive ? ' sidebar-flyout__item--active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onNavigate(child.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate(child.key);
              }
            }}
          >
            <span className="sidebar-flyout__item-icon">{child.icon}</span>
            <span className="sidebar-flyout__item-label">{child.label}</span>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

function MenuItem({ item, activeKey, collapsed, openKeys, onToggle, onNavigate, onHoverItem, onLeaveItem }) {
  const itemRef = useRef(null);

  if (item.type === 'divider') {
    return <div className="app-sidebar__divider" />;
  }

  const hasChildren = item.children?.length > 0;
  const isChildActive =
    hasChildren && item.children.some(c => c.type !== 'divider' && activeKey === c.key);

  const isActive = activeKey === item.key || isChildActive;
  const isOpen = openKeys.includes(item.key) || isChildActive;

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

  if (hasChildren) {
    if (collapsed) {
      return (
        <div
          ref={itemRef}
          className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
          title={item.label}
          onMouseEnter={() => {
            if (itemRef.current) {
              const rect = itemRef.current.getBoundingClientRect();
              onHoverItem?.(item.key, rect.top, item.children, item.label);
            }
          }}
          onMouseLeave={onLeaveItem}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle(item.key);
            }
          }}
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

  return (
    <div
      className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(item.key)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(item.key);
        }
      }}
      title={collapsed ? item.label : undefined}
    >
      <span className="app-sidebar__item-icon">{item.icon}</span>
      {!collapsed && <span className="app-sidebar__item-label">{item.label}</span>}
    </div>
  );
}

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

  const companyItems = useCompanyMenuItems();
  const adminItems = useAdminMenuItems();
  const menuItems = isAdmin ? adminItems : companyItems;

  const logicalPath = isAdmin ? pathname : stripTenantSlug(pathname, slug);
  const activeKey = isAdmin ? pathname : getCompanyActiveKey(logicalPath);

  const [openKeys, setOpenKeys] = useState(['projects', 'financial']);
  const [hoveredFlyout, setHoveredFlyout] = useState(null);
  const closeTimerRef = useRef(null);

  const openFlyout = useCallback((key, top, children, label) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setHoveredFlyout({ key, top, children, label });
  }, []);

  const scheduleFlyoutClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setHoveredFlyout(null), 150);
  }, []);

  const cancelFlyoutClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setOpenKeys(prev => {
        const next = [...prev];
        if (!next.includes('projects')) next.push('projects');
        if (!next.includes('financial')) next.push('financial');
        return next;
      });
    }
  }, [pathname, isAdmin]);

  const toggleOpenKey = (key) => {
    setOpenKeys(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  useEffect(() => {
    if (!collapsed) setHoveredFlyout(null);
  }, [collapsed]);

  const handleNav = (key) => {
    setHoveredFlyout(null);
    if (isAdmin) {
      navigate(key);
    } else {
      handleCompanyNav(key, navigate);
    }
  };

  const logoUrl = isAdmin ? null : tenantTheme?.logo_url;

  const tenantName = user?.tenant?.name || '';
  const companyNameAr = isAdmin ? '' : (tenantName || tenantTheme?.company_name || '');
  const companyNameEn = isAdmin ? '' : (tenantTheme?.contractor_name_en || '');

  let brandName;
  let brandNameSecondary;

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

  const currentUser = user?.email || user?.get_full_name || t('nav_user');

  const getUserRoleDisplay = (roleName) => {
    if (!roleName) return t('nav_user');

    const map = {
      company_super_admin: t('nav_role_company_super_admin'),
      Manager: t('nav_role_manager'),
      Admin: t('nav_role_admin'),
      User: t('nav_user'),
      user: t('nav_user'),
    };

    return map[roleName] || roleName;
  };

  const userRole = isAdmin
    ? t('nav_super_admin')
    : getUserRoleDisplay(user?.role?.name);

  const userInitial =
    user?.first_name?.[0] ||
    user?.email?.[0]?.toUpperCase() ||
    'U';

  const handleLanguageChange = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  const isAdminActive = (to) =>
    pathname === to || pathname.startsWith(to + '/');

  return (
    <aside
      className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="app-sidebar__header">
        <SidebarLogo
          isAdmin={isAdmin}
          logoUrl={logoUrl}
          companyName={brandName}
        />

        {!collapsed && (
          <div className="app-sidebar__brand">
            <div className="app-sidebar__brand-name">{brandName}</div>

            {brandNameSecondary && (
              <div className="app-sidebar__brand-name-secondary">
                {brandNameSecondary}
              </div>
            )}

            <div className="app-sidebar__brand-tagline">
              {brandTagline}
            </div>
          </div>
        )}
      </div>

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
            onHoverItem={openFlyout}
            onLeaveItem={scheduleFlyoutClose}
          />
        ))}
      </nav>

      <FlyoutMenu
        flyout={hoveredFlyout}
        onMouseEnter={cancelFlyoutClose}
        onMouseLeave={scheduleFlyoutClose}
        onNavigate={handleNav}
        activeKey={activeKey}
        isRTL={isRTL}
      />

      <div className="app-sidebar__footer">
        <Link
          to={isAdmin ? '/admin/profile' : tp('/profile')}
          className="app-sidebar__user"
        >
          <div className="app-sidebar__user-avatar">
            {user?.avatar_url ? (
              <Avatar
                src={user.avatar_url}
                sx={{ width: 36, height: 36, fontSize: '0.875rem' }}
              >
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
              {/* <div className="app-sidebar__user-role">{userRole}</div> */}
            </div>
          )}
        </Link>

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
              {!collapsed && (
                <span className="app-sidebar__action-label">
                  {lang.toUpperCase()}
                </span>
              )}
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
            : (isRTL ? <FaChevronRight /> : <FaChevronLeft />)}
        </Button>
      </div>
    </aside>
  );
}
