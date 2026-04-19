import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaSearch, FaBars, FaBell, FaCheck, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';
import { useSidebar } from './SidebarContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../common/Button';
import './AppTopBar.css';

// ── Notification type → colour ───────────────────────────────────────────────
const TYPE_COLOR = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  approval: '#8b5cf6',
  status_change: '#3b82f6',
  info: '#3b82f6',
};

const TYPE_BG = {
  success: 'rgba(16,185,129,0.1)',
  error: 'rgba(239,68,68,0.1)',
  warning: 'rgba(245,158,11,0.1)',
  approval: 'rgba(139,92,246,0.1)',
  status_change: 'rgba(59,130,246,0.1)',
  info: 'rgba(59,130,246,0.1)',
};

// Relative time formatter
function timeAgo(iso, isAr) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (isAr) {
    if (diff < 60) return `منذ ${diff} ث`;
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  } else {
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}

export default function AppTopBar({ showSearch = true }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const navigate = useNavigate();
  const { collapsed, setCollapsed } = useSidebar();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const [searchFocused, setSearchFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    if (n.link) {
      try {
        const url = new URL(n.link, window.location.origin);
        if (url.origin === window.location.origin) {
          navigate(url.pathname + url.search);
          setOpen(false);
          return;
        }
      } catch { /* invalid URL */ }
    }
  };

  return (
    <div className="app-topbar">
      {/* Left: Hamburger */}
      <div className="app-topbar__left">
        <Button
          variant="ghost"
          size="sm"
          className="app-topbar__hamburger"
          onClick={() => setCollapsed(!collapsed)}
          type="button"
          aria-label={t('nav_toggle_sidebar')}
        >
          <FaBars />
        </Button>
      </div>

      {/* Center: Search */}
      {showSearch && (
        <div className="app-topbar__center">
          <div className={`app-topbar__search ${searchFocused ? 'app-topbar__search--focused' : ''}`}>
            <FaSearch className="app-topbar__search-icon" />
            <input
              type="text"
              placeholder={t('nav_search_placeholder')}
              className="app-topbar__search-input"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <div className="app-topbar__search-shortcut">
              <span>⌘</span><span>K</span>
            </div>
          </div>
        </div>
      )}

      {/* Right: Notification Bell */}
      <div className="app-topbar__right" ref={panelRef}>
        <div className="app-topbar__notifications">
          <button
            className="app-topbar__action-btn"
            onClick={() => setOpen((v) => !v)}
            aria-label={t('nav_notifications')}
            aria-expanded={open}
            type="button"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="app-topbar__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {open && (
            <div className="app-topbar__dropdown app-topbar__dropdown--notifications ntf-panel">
              {/* Header */}
              <div className="ntf-panel__header">
                <span className="ntf-panel__title">
                  {t('nav_notifications', 'الإشعارات')}
                  {unreadCount > 0 && (
                    <span className="ntf-panel__badge">{unreadCount}</span>
                  )}
                </span>
                <div className="ntf-panel__actions">
                  {unreadCount > 0 && (
                    <button
                      className="ntf-panel__action-btn"
                      onClick={markAllAsRead}
                      title={t('mark_all_read', 'تحديد الكل كمقروء')}
                    >
                      <FaCheck />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      className="ntf-panel__action-btn ntf-panel__action-btn--danger"
                      onClick={() => { clearAll(); setOpen(false); }}
                      title={t('clear_all', 'مسح الكل')}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="ntf-panel__list">
                {notifications.length === 0 ? (
                  <div className="ntf-panel__empty">
                    <FaBell className="ntf-panel__empty-icon" />
                    <p>{t('no_notifications', 'لا توجد إشعارات')}</p>
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n) => (
                    <div
                      key={n.id}
                      className={`ntf-item ${!n.read ? 'ntf-item--unread' : ''}`}
                      style={{ borderRightColor: TYPE_COLOR[n.type] || TYPE_COLOR.info }}
                      onClick={() => handleNotificationClick(n)}
                      role="button"
                      tabIndex={0}
                    >
                      <div
                        className="ntf-item__dot"
                        style={{ background: TYPE_BG[n.type] || TYPE_BG.info }}
                      >
                        <span style={{ color: TYPE_COLOR[n.type] || TYPE_COLOR.info }}>●</span>
                      </div>
                      <div className="ntf-item__body">
                        <p className="ntf-item__title">{n.title}</p>
                        <p className="ntf-item__msg">{n.message}</p>
                        <p className="ntf-item__time">{timeAgo(n.createdAt, isAr)}</p>
                      </div>
                      <div className="ntf-item__meta">
                        {!n.read && <span className="ntf-item__unread-dot" />}
                        {n.link && <FaExternalLinkAlt className="ntf-item__link-icon" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
