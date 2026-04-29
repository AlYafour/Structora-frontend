/**
 * Company API Service
 * Handles all company/tenant-related API calls
 */
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class CompanyService {
  /**
   * Get current tenant settings
   * @returns {Promise} Current tenant settings data
   */
  async getCurrentSettings() {
    try {
      const { data } = await api.get('auth/tenant-settings/current/');
      return data;
    } catch (error) {
      throw handleError(error, 'CompanyService.getCurrentSettings');
    }
  }

  /**
   * Update current tenant settings
   * @param {FormData|Object} payload - Settings data
   * @returns {Promise} Updated settings data
   */
  async updateCurrentSettings(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch('auth/tenant-settings/current/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'CompanyService.updateCurrentSettings');
    }
  }

  /**
   * Update company settings
   * @param {FormData|Object} payload - Settings data
   * @returns {Promise} Updated settings data
   */
  async updateSettings(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch('auth/tenant/settings/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'CompanyService.updateSettings');
    }
  }

  /**
   * Get company theme
   * @returns {Promise} Theme data
   */
  async getTheme() {
    try {
      const { data } = await api.get('auth/tenant/theme/');
      return data;
    } catch (error) {
      throw handleError(error, 'CompanyService.getTheme');
    }
  }

  /**
   * Update company theme
   * @param {FormData|Object} payload - Theme data
   * @returns {Promise} Updated theme data
   */
  async updateTheme(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch('auth/tenant/theme/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'CompanyService.updateTheme');
    }
  }

  /**
   * Get company users
   * @returns {Promise} Users array
   */
  async getUsers() {
    try {
      const { data } = await api.get('auth/users/');
      return Array.isArray(data) ? data : data?.results || [];
    } catch (error) {
      throw handleError(error, 'CompanyService.getUsers');
    }
  }

  /**
   * Get company roles
   * @returns {Promise} Roles array
   */
  async getRoles() {
    try {
      const { data } = await api.get('auth/roles/');
      return Array.isArray(data) ? data : data?.results || [];
    } catch (error) {
      throw handleError(error, 'CompanyService.getRoles');
    }
  }

  /**
   * Get all permissions grouped by category
   * @returns {Promise} Object keyed by category, each with label_ar, label_en, permissions[]
   */
  async getPermissionsByCategory() {
    try {
      const { data } = await api.get('auth/permissions/by_category/');
      return data;
    } catch (error) {
      throw handleError(error, 'CompanyService.getPermissionsByCategory');
    }
  }
}

export const companyApi = new CompanyService();
export default companyApi;
