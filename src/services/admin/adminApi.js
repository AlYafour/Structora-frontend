/**
 * Admin API Service
 * Handles all admin-related API calls
 */
import { BaseService } from '../baseService';
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class AdminService extends BaseService {
  constructor() {
    super('auth/tenants');
  }
  /**
   * Get all tenants
   * @returns {Promise} Tenants array
   */
  async getTenants() {
    try {
      const { data } = await api.get('auth/tenants/');
      return Array.isArray(data) ? data : data?.results || [];
    } catch (error) {
      throw handleError(error, 'AdminService.getTenants');
    }
  }

  /**
   * Get tenant by ID
   * @param {string|number} id - Tenant ID
   * @returns {Promise} Tenant data
   */
  async getTenant(id) {
    try {
      const { data } = await api.get(`auth/admin/tenants/${id}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'AdminService.getTenant');
    }
  }

  /**
   * Create company (admin)
   * @param {FormData|Object} payload - Company data
   * @returns {Promise} Created company data
   */
  async createCompany(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post('auth/admin/create-company/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AdminService.createCompany');
    }
  }

  /**
   * Update tenant
   * @param {string|number} id - Tenant ID
   * @param {Object} payload - Update data
   * @returns {Promise} Updated tenant data
   */
  async updateTenant(id, payload) {
    try {
      const { data } = await api.patch(`auth/admin/tenants/${id}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AdminService.updateTenant');
    }
  }

  /**
   * Update tenant slug
   * @param {string|number} id - Tenant ID
   * @param {string} slug - New slug
   * @returns {Promise} Updated tenant data
   */
  async updateTenantSlug(id, slug) {
    try {
      const { data } = await api.patch(`auth/tenants/${id}/`, { slug });
      return data;
    } catch (error) {
      throw handleError(error, 'AdminService.updateTenantSlug');
    }
  }

  /**
   * Get all tenant settings
   * @returns {Promise} Tenant settings array
   */
  async getAllTenantSettings() {
    try {
      const { data } = await api.get('auth/tenant-settings/');
      return Array.isArray(data) ? data : data?.results || [];
    } catch (error) {
      throw handleError(error, 'AdminService.getAllTenantSettings');
    }
  }

  /**
   * Get tenant settings by tenant ID
   * @param {string|number} tenantId - Tenant ID
   * @returns {Promise} Tenant settings data
   */
  async getTenantSettings(tenantId) {
    try {
      const { data } = await api.get(`auth/tenant-settings/${tenantId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'AdminService.getTenantSettings');
    }
  }

  /**
   * Update tenant settings
   * @param {string|number} tenantId - Tenant ID
   * @param {FormData|Object} payload - Settings data
   * @returns {Promise} Updated settings data
   */
  async updateTenantSettings(tenantId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(`auth/tenant-settings/${tenantId}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AdminService.updateTenantSettings');
    }
  }

}

export const adminApi = new AdminService();
export default adminApi;
