import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTabManager } from '../../contexts/TabManagerContext';
import { useNotifications } from '../../contexts/NotificationContext';
import useTenantNavigate, { useTenantSlug } from '../../hooks/useTenantNavigate';

export default function AppTabBar() {
  const { tabs, activeTabId, switchTab, closeTab, openTabWithLimit } = useTabManager();
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === 'ar';
  const activeTabRef = useRef(null);
  const slug = useTenantSlug();
  const { showToast } = useNotifications();

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  function handleAddTab() {
    const homePath = slug ? `/${slug}/dashboard` : '/dashboard';
    const homeTitle = t('nav_home', 'Home');
    const homeTitleAr = 'الرئيسية';
    openTabWithLimit(homePath, homeTitle, homeTitleAr, () => {
      showToast({ type: 'warning', message: t('tab_limit_reached', 'Maximum of 10 tabs reached') });
    });
  }

  if (tabs.length === 0) return null;

  return (
    <div className="app-tab-bar" role="tablist" aria-label={t('app_tabs', 'Open tabs')}>
      <div className="app-tab-bar__tabs">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const label = isAr ? (tab.titleAr || tab.title) : tab.title;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              role="tab"
              aria-selected={isActive}
              className={`app-tab${isActive ? ' app-tab--active' : ''}`}
              onClick={() => switchTab(tab.id)}
              title={label}
            >
              <span className="app-tab__title">{label}</span>
              {tabs.length > 1 && (
                <span
                  className="app-tab__close"
                  role="button"
                  aria-label={t('close_tab', 'Close tab')}
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                >
                  ×
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        className="app-tab-bar__add"
        onClick={handleAddTab}
        aria-label={t('new_tab', 'New tab')}
        title={t('new_tab', 'New tab')}
      >
        +
      </button>
    </div>
  );
}
