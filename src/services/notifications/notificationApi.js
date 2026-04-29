import { api } from '../api';

export const notificationApi = {
  getAll: () => api.get('auth/notifications/'),
  getUnreadCount: () => api.get('auth/notifications/unread_count/'),
  markRead: (id) => api.patch(`auth/notifications/${id}/mark_read/`),
  markAllRead: () => api.patch('auth/notifications/mark_all_read/'),
  delete: (id) => api.delete(`auth/notifications/${id}/`),
  clearAll: () => api.delete('auth/notifications/clear_all/'),
};

export const invitationApi = {
  getAll: () => api.get('auth/invitations/'),
  create: (data) => api.post('auth/invitations/', data),
  resend: (id) => api.post(`auth/invitations/${id}/resend/`),
  cancel: (id) => api.post(`auth/invitations/${id}/cancel/`),
};
