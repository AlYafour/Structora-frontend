/**
 * Roles & Permissions API Service
 */
import { api } from '../api';

// ─── Permissions ─────────────────────────────────────────────

export const permissionsApi = {
  /** All permissions grouped by category (for role editor UI) */
  byCategory: () => api.get('auth/permissions/by_category/'),

  /** Flat list of all permissions */
  list: () => api.get('auth/permissions/'),
};

// ─── Roles ───────────────────────────────────────────────────

export const rolesApi = {
  /** List all roles (with permission codes) */
  list: () => api.get('auth/roles/'),

  /** List roles with full permission details */
  withPermissions: () => api.get('auth/roles/with_permissions/'),

  /** Get single role */
  get: (id) => api.get(`auth/roles/${id}/`),

  /**
   * Create a new role
   * @param {{ name, name_en, description, permission_codes_write: string[] }} data
   */
  create: (data) => api.post('auth/roles/', data),

  /**
   * Update role (full)
   * @param {number} id
   * @param {{ name, name_en, description, is_active, permission_codes_write: string[] }} data
   */
  update: (id, data) => api.put(`auth/roles/${id}/`, data),

  /**
   * Partial update (PATCH)
   */
  patch: (id, data) => api.patch(`auth/roles/${id}/`, data),

  /** Delete a role */
  delete: (id) => api.delete(`auth/roles/${id}/`),
};

// ─── Users (company-scoped) ───────────────────────────────────

export const usersApi = {
  /** List all users in the company */
  list: () => api.get('auth/users/'),

  /** Get single user */
  get: (id) => api.get(`auth/users/${id}/`),

  /**
   * Create a new user
   * @param {{ email, first_name, last_name, password, role_id, phone?, job_title? }} data
   */
  create: (data) => api.post('auth/users/', data),

  /**
   * Update user
   */
  update: (id, data) => api.patch(`auth/users/${id}/`, data),

  /** Deactivate user */
  deactivate: (id) => api.patch(`auth/users/${id}/`, { is_active: false }),

  /** Activate user */
  activate: (id) => api.patch(`auth/users/${id}/`, { is_active: true }),

  /** Reset password */
  resetPassword: (id, newPassword) =>
    api.patch(`auth/users/${id}/`, { password: newPassword }),
};
