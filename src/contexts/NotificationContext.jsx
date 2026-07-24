import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/notifications';
import { toastEmitter } from '../utils/toastEmitter';
import { useAuth } from './AuthContext';
import useNotificationSound from '../hooks/useNotificationSound';
import useVisibilityPolling from '../hooks/useVisibilityPolling';
import IncomingNotificationPopup from '../components/notifications/IncomingNotificationPopup';

const NotificationContext = createContext(null);

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function NotificationProvider({ children }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith('ar');
  const { user } = useAuth();
  const authenticatedUserId = user?.id;
  const {
    soundEnabled,
    soundVolume,
    playNotificationSound,
    toggleNotificationSound,
    setNotificationVolume,
  } = useNotificationSound();

  const [toast, setToast] = useState({
    open: false,
    message: '',
    type: 'info',
    duration: 5000,
  });

  const [notifications, setNotifications] = useState([]);
  const [incomingPopup, setIncomingPopup] = useState({
    open: false,
    notification: null,
  });

  const toastQueue = useRef([]);
  const isProcessing = useRef(false);
  const incomingPopupQueue = useRef([]);
  const isProcessingIncomingPopup = useRef(false);
  const seenNotificationIds = useRef(new Set());
  const notificationsInitialized = useRef(false);
  const fetchInFlight = useRef(false);
  const cancelledRef = useRef(false);

  const processIncomingPopupQueue = useCallback(() => {
    if (incomingPopupQueue.current.length > 0 && !isProcessingIncomingPopup.current) {
      isProcessingIncomingPopup.current = true;
      const notification = incomingPopupQueue.current.shift();
      setIncomingPopup({ open: true, notification });
    }
  }, []);

  const enqueueIncomingPopup = useCallback((notification) => {
    incomingPopupQueue.current.push(notification);
    processIncomingPopupQueue();
  }, [processIncomingPopupQueue]);

  const handleCloseIncomingPopup = useCallback(() => {
    setIncomingPopup((current) => ({ ...current, open: false }));
    setTimeout(() => {
      isProcessingIncomingPopup.current = false;
      processIncomingPopupQueue();
    }, 300);
  }, [processIncomingPopupQueue]);

  const fetchNotifications = useCallback(async () => {
    if (!authenticatedUserId || fetchInFlight.current) return;
    fetchInFlight.current = true;

    try {
      const { data } = await notificationApi.getAll();
      if (cancelledRef.current) return;
      const items = Array.isArray(data) ? data : data?.results || [];

      const normalized = items.map((n) => ({
        id: n.id,

        // Arabic
        title: n.title,
        message: n.message,

        // English
        titleEn: n.title_en || n.title,
        messageEn: n.message_en || n.message,

        type: n.notification_type || n.type || 'info',
        link: n.link,
        read: n.is_read,
        createdAt: n.created_at,
      }));

      if (notificationsInitialized.current) {
        const newUnreadNotifications = normalized.filter(
          (notification) => !notification.read && !seenNotificationIds.current.has(notification.id)
        );
        if (newUnreadNotifications.length > 0) {
          playNotificationSound();
          newUnreadNotifications
            .slice()
            .reverse()
            .forEach(enqueueIncomingPopup);
        }
      } else {
        notificationsInitialized.current = true;
      }

      normalized.forEach((notification) => seenNotificationIds.current.add(notification.id));
      setNotifications(normalized);
    } catch {
      // silent
    } finally {
      fetchInFlight.current = false;
    }
  }, [authenticatedUserId, enqueueIncomingPopup, playNotificationSound]);

  // Pauses while the tab is hidden and stops entirely when logged out —
  // reduces background 401 traffic that used to race token refreshes
  // against the active tab.
  useVisibilityPolling(fetchNotifications, 15000, Boolean(authenticatedUserId));

  useEffect(() => {
    cancelledRef.current = false;
    let sse = null;

    seenNotificationIds.current = new Set();
    notificationsInitialized.current = false;

    if (!authenticatedUserId) {
      setNotifications([]);
      return undefined;
    }

    fetchNotifications();

    if (typeof EventSource !== 'undefined') {
      try {
        const sseBase = import.meta.env.DEV
          ? ''
          : (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

        sse = new EventSource(`${sseBase}/api/auth/notifications/stream/`, {
          withCredentials: true,
        });

        sse.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (typeof payload.unread_count === 'number') {
              fetchNotifications();
            }
          } catch {
            // ignore
          }
        };

        sse.onerror = () => {
          // EventSource reconnects automatically. Closing here permanently
          // disabled real-time updates after a transient error or server recycle.
        };
      } catch {
        // ignore
      }
    }

    return () => {
      cancelledRef.current = true;
      if (sse) sse.close();
      fetchInFlight.current = false;
      incomingPopupQueue.current = [];
      isProcessingIncomingPopup.current = false;
      setIncomingPopup({ open: false, notification: null });
    };
  }, [authenticatedUserId, fetchNotifications]);

  const processQueue = useCallback(() => {
    if (toastQueue.current.length > 0 && !isProcessing.current) {
      isProcessing.current = true;
      const nextToast = toastQueue.current.shift();
      setToast({ ...nextToast, open: true });
    }
  }, []);

  const showToast = useCallback(
    ({ type = 'info', message, duration = 5000 }) => {
      const toastData = {
        id: generateId(),
        type,
        message,
        duration,
      };

      toastQueue.current.push(toastData);
      processQueue();
    },
    [processQueue]
  );

  useEffect(() => {
    return toastEmitter.subscribe(({ type, message }) => {
      showToast({ type, message });
    });
  }, [showToast]);

  const handleCloseToast = useCallback((event, reason) => {
    if (reason === 'clickaway') return;

    setToast((prev) => ({ ...prev, open: false }));

    setTimeout(() => {
      isProcessing.current = false;
      processQueue();
    }, 300);
  }, [processQueue]);

  const clearToastQueue = useCallback(() => {
    toastQueue.current = [];
    isProcessing.current = false;
    setToast((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: notification.id || generateId(),

      title: notification.title || '',
      message: notification.message || '',

      titleEn: notification.title_en || notification.titleEn || notification.title || '',
      messageEn: notification.message_en || notification.messageEn || notification.message || '',

      type: notification.type || notification.notification_type || 'info',
      link: notification.link || '',
      read: notification.read ?? notification.is_read ?? false,
      createdAt: notification.createdAt || notification.created_at || new Date().toISOString(),
    };

    const isNew = !seenNotificationIds.current.has(newNotification.id);
    seenNotificationIds.current.add(newNotification.id);
    if (notificationsInitialized.current && isNew && !newNotification.read) {
      playNotificationSound();
      enqueueIncomingPopup(newNotification);
    }
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
  }, [enqueueIncomingPopup, playNotificationSound]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await notificationApi.markRead(id);
    } catch {
      // ignore
    }
  }, []);

  const handleNavigateFromPopup = useCallback((notification) => {
    if (!notification?.link) return;

    try {
      const url = new URL(notification.link, window.location.origin);
      if (url.origin !== window.location.origin) return;

      markAsRead(notification.id);
      handleCloseIncomingPopup();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Ignore malformed notification links.
    }
  }, [handleCloseIncomingPopup, markAsRead, navigate]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await notificationApi.markAllRead();
    } catch {
      // ignore
    }
  }, []);

  const removeNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationApi.delete(id);
    } catch {
      // ignore
    }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    try {
      await notificationApi.clearAll();
    } catch {
      // ignore
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const success = useCallback(
    (message) => showToast({ type: 'success', message }),
    [showToast]
  );

  const error = useCallback(
    (message) => showToast({ type: 'error', message }),
    [showToast]
  );

  const value = {
    toast,
    notifications,
    unreadCount,
    showToast,
    clearToastQueue,
    success,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    soundEnabled,
    soundVolume,
    toggleNotificationSound,
    setNotificationVolume,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <Snackbar
        open={toast.open}
        autoHideDuration={toast.duration}
        onClose={handleCloseToast}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: 99999 }} 
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.type}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {incomingPopup.open && incomingPopup.notification && (
        <IncomingNotificationPopup
          key={incomingPopup.notification.id}
          notification={incomingPopup.notification}
          isArabic={isArabic}
          duration={3000}
          onClose={handleCloseIncomingPopup}
          onNavigate={handleNavigateFromPopup}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
}
