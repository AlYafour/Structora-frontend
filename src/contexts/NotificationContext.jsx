import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { notificationApi } from '../services/notifications';
import { toastEmitter } from '../utils/toastEmitter';

const NotificationContext = createContext(null);

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function NotificationProvider({ children }) {
  const { t } = useTranslation();

  const [toast, setToast] = useState({
    open: false,
    message: '',
    type: 'info',
    duration: 5000,
  });

  const [notifications, setNotifications] = useState([]);

  const toastQueue = useRef([]);
  const isProcessing = useRef(false);

  useEffect(() => {
    let interval;

    const fetchNotifications = async () => {
      try {
        if (!localStorage.getItem('user')) return;

        const { data } = await notificationApi.getAll();
        const items = Array.isArray(data) ? data : data?.results || [];

        setNotifications(
          items.map((n) => ({
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
          }))
        );
      } catch {
        // silent
      }
    };

    fetchNotifications();
    interval = setInterval(fetchNotifications, 15000);

    let sse = null;
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
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
          sse.close();
          sse = null;
        };
      } catch {
        // ignore
      }
    }

    return () => {
      clearInterval(interval);
      if (sse) sse.close();
    };
  }, []);

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

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
  }, []);

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