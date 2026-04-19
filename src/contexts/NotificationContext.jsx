/**
 * 🔔 Notification Context
 * Centralized notification management system
 *
 * Features:
 * - Toast notifications (success, error, warning, info)
 * - Persistent notifications (stored in state)
 * - Read/unread status
 * - Notification bell with badge count
 *
 * @version 2.0.0
 *
 * Usage:
 * const { showToast, notifications, markAsRead } = useNotifications();
 * showToast({ type: 'success', message: 'Saved successfully' });
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Snackbar, Alert, Slide, Badge, IconButton, Menu, MenuItem, Typography, Box, Divider } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { notificationApi } from '../services/notifications';

const NotificationContext = createContext(null);

// Slide transition for snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

// Generate unique ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Notification Provider Component
 */
export function NotificationProvider({ children }) {
  const { t } = useTranslation();

  // Toast state
  const [toast, setToast] = useState({
    open: false,
    message: '',
    type: 'info', // success, error, warning, info
    duration: 5000,
  });

  // Persistent notifications
  const [notifications, setNotifications] = useState([]);

  // Toast queue for multiple toasts
  const toastQueue = useRef([]);
  const isProcessing = useRef(false);

  // Fetch notifications from backend on mount and poll every 60s
  useEffect(() => {
    let interval;
    const fetchNotifications = async () => {
      try {
        const { isLoggedIn } = await import('../utils/cookies');
        if (!isLoggedIn()) return;
        const { data } = await notificationApi.getAll();
        const items = Array.isArray(data) ? data : (data?.results || []);
        setNotifications(items.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.notification_type || 'info',
          link: n.link,
          read: n.is_read,
          createdAt: n.created_at,
        })));
      } catch { /* silent - user may not be logged in */ }
    };
    fetchNotifications();
    interval = setInterval(fetchNotifications, 15000);

    // SSE for real-time unread-count updates — only open when logged in
    let sse = null;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const sseBase = import.meta.env.DEV
          ? ''
          : (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
        sse = new EventSource(`${sseBase}/api/auth/notifications/stream/`, { withCredentials: true });
        sse.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (typeof payload.unread_count === 'number') {
              fetchNotifications();
            }
          } catch { /* ignore parse errors */ }
        };
        sse.onerror = () => { sse.close(); sse = null; };
      } catch { /* SSE not available */ }
    }

    return () => {
      clearInterval(interval);
      if (sse) sse.close();
    };
  }, []);

  /**
   * Process toast queue
   */
  const processQueue = useCallback(() => {
    if (toastQueue.current.length > 0 && !isProcessing.current) {
      isProcessing.current = true;
      const nextToast = toastQueue.current.shift();
      setToast({ ...nextToast, open: true });
    }
  }, []);

  /**
   * Show toast notification
   * @param {Object} options - Toast options
   * @param {string} options.type - Toast type (success, error, warning, info)
   * @param {string} options.message - Toast message
   * @param {number} options.duration - Auto-hide duration in ms (default: 5000)
   */
  const showToast = useCallback(
    ({ type = 'info', message, duration = 5000 }) => {
      const newToast = {
        id: generateId(),
        type,
        message,
        duration,
        open: false,
      };

      toastQueue.current.push(newToast);
      processQueue();
    },
    [processQueue]
  );

  /**
   * Close current toast
   */
  const closeToast = useCallback(
    (event, reason) => {
      if (reason === 'clickaway') return;
      setToast((prev) => ({ ...prev, open: false }));
    },
    []
  );

  /**
   * Handle toast exit - process next in queue
   */
  const handleToastExit = useCallback(() => {
    isProcessing.current = false;
    processQueue();
  }, [processQueue]);

  /**
   * Add a persistent notification
   * @param {Object} notification - Notification data
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message
   * @param {string} notification.type - Notification type
   * @param {string} notification.link - Optional link
   */
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: generateId(),
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      link: notification.link,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep max 50
  }, []);

  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   */
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    notificationApi.markRead(id).catch(() => { /* optimistic update — server sync non-critical */ });
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    notificationApi.markAllRead().catch(() => { /* optimistic update — server sync non-critical */ });
  }, []);

  /**
   * Remove notification
   * @param {string} id - Notification ID
   */
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Get unread count
   */
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Convenience methods
  const success = useCallback(
    (message) => showToast({ type: 'success', message }),
    [showToast]
  );

  const error = useCallback(
    (message) => showToast({ type: 'error', message, duration: 7000 }),
    [showToast]
  );

  const warning = useCallback(
    (message) => showToast({ type: 'warning', message }),
    [showToast]
  );

  const info = useCallback(
    (message) => showToast({ type: 'info', message }),
    [showToast]
  );

  const value = {
    // Toast methods
    showToast,
    success,
    error,
    warning,
    info,

    // Notification methods
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Toast Snackbar */}
      <Snackbar
        open={toast.open}
        autoHideDuration={toast.duration}
        onClose={closeToast}
        TransitionComponent={SlideTransition}
        TransitionProps={{ onExited: handleToastExit }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ maxWidth: '420px', mb: 1 }}
      >
        <Alert
          onClose={closeToast}
          severity={toast.type}
          variant="standard"
          sx={{
            width: '100%',
            alignItems: 'center',
            borderRadius: '10px',
            backdropFilter: 'blur(8px)',
            backgroundColor: toast.type === 'success' ? 'rgba(16,185,129,0.1)'
              : toast.type === 'error' ? 'rgba(220,38,38,0.1)'
              : toast.type === 'warning' ? 'rgba(245,158,11,0.1)'
              : 'rgba(59,130,246,0.1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid',
            borderColor: toast.type === 'success' ? 'rgba(16,185,129,0.25)'
              : toast.type === 'error' ? 'rgba(220,38,38,0.25)'
              : toast.type === 'warning' ? 'rgba(245,158,11,0.25)'
              : 'rgba(59,130,246,0.25)',
            '& .MuiAlert-message': {
              fontSize: '0.85rem',
              fontWeight: 500,
            },
            '& .MuiAlert-action': {
              pt: 0,
            },
          }}
          iconMapping={{
            success: <CheckCircleIcon fontSize="inherit" />,
            error: <ErrorIcon fontSize="inherit" />,
            warning: <WarningIcon fontSize="inherit" />,
            info: <InfoIcon fontSize="inherit" />,
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

/**
 * Notification Bell Component
 * Shows notification icon with badge and dropdown
 */
export function NotificationBell() {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      try {
        const url = new URL(notification.link, window.location.origin);
        if (url.origin === window.location.origin) {
          window.location.href = url.href;
        }
      } catch { /* invalid URL — ignore */ }
    }
    handleClose();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      default:
        return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="large"
        sx={{ color: 'inherit' }}
        aria-label={t('notifications', 'الإشعارات')}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 400,
            overflow: 'auto',
          } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider' }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {t('notifications', 'الإشعارات')}
            {unreadCount > 0 && (
              <Typography component="span" color="error.main" sx={{ ml: 1 }}>
                ({unreadCount})
              </Typography>
            )}
          </Typography>
          {notifications.length > 0 && (
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              onClick={markAllAsRead}
            >
              {t('mark_all_read', 'تحديد الكل كمقروء')}
            </Typography>
          )}
        </Box>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {t('no_notifications', 'لا توجد إشعارات')}
            </Typography>
          </Box>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                py: 1.5,
                px: 2,
                backgroundColor: notification.read ? 'transparent' : 'action.hover',
                borderBottom: 1,
                borderColor: 'divider' }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                {getIcon(notification.type)}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={notification.read ? 400 : 600}
                    noWrap
                  >
                    {notification.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {notification.message}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography
                variant="body2"
                color="error"
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => {
                  clearAll();
                  handleClose();
                }}
              >
                {t('clear_all', 'مسح الكل')}
              </Typography>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}

/**
 * Hook to use notifications
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export default NotificationContext;
