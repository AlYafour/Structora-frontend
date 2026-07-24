import { useEffect, useState } from 'react';
import { FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import './IncomingNotificationPopup.css';

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

export default function IncomingNotificationPopup({
  notification,
  isArabic,
  onClose,
  onNavigate,
  duration = 3000,
}) {
  const [leaving, setLeaving] = useState(false);
  const type = notification?.type || 'info';
  const color = TYPE_COLOR[type] || TYPE_COLOR.info;
  const background = TYPE_BG[type] || TYPE_BG.info;
  const title = isArabic
    ? notification?.title
    : notification?.titleEn || notification?.title;
  const message = isArabic
    ? notification?.message
    : notification?.messageEn || notification?.message;

  useEffect(() => {
    const exitTimer = setTimeout(() => setLeaving(true), Math.max(0, duration - 250));
    const closeTimer = setTimeout(onClose, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const closeNow = (event) => {
    event?.stopPropagation();
    setLeaving(true);
    setTimeout(onClose, 200);
  };

  const openNotification = () => {
    if (notification?.link) {
      onNavigate?.(notification);
    }
  };

  const handleKeyDown = (event) => {
    if (notification?.link && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openNotification();
    }
  };

  return (
    <aside
      className={`incoming-ntf ${notification?.link ? 'incoming-ntf--clickable' : ''} ${leaving ? 'incoming-ntf--leaving' : ''}`}
      style={{ borderInlineEndColor: color }}
      role={notification?.link ? 'button' : 'status'}
      tabIndex={notification?.link ? 0 : undefined}
      onClick={openNotification}
      onKeyDown={handleKeyDown}
      aria-live="polite"
      dir={isArabic ? 'rtl' : 'ltr'}
      data-testid="notification-popup"
      data-duration={duration}
      data-position="top-right"
    >
      <div className="incoming-ntf__dot" style={{ background }} aria-hidden="true">
        <span style={{ color }}>●</span>
      </div>

      <div className="incoming-ntf__body">
        <p className="incoming-ntf__title">{title}</p>
        <p className="incoming-ntf__message">{message}</p>
        <p className="incoming-ntf__time">{isArabic ? 'الآن' : 'Just now'}</p>
      </div>

      <div className="incoming-ntf__meta">
        <button
          className="incoming-ntf__close"
          type="button"
          onClick={closeNow}
          aria-label={isArabic ? 'إغلاق الإشعار' : 'Close notification'}
        >
          <FaTimes />
        </button>
        <span className="incoming-ntf__unread-dot" aria-hidden="true" />
        {notification?.link && (
          <FaExternalLinkAlt className="incoming-ntf__link" aria-hidden="true" />
        )}
      </div>
    </aside>
  );
}
