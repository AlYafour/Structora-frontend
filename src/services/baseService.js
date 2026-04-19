/**
 * Base Service Class
 * Provides common CRUD operations for all services
 */
import { api } from './api';
import { handleError } from '../utils/errorHandler';

export class BaseService {
  constructor(basePath) {
    // Ensure basePath ends with / for Django REST Framework compatibility
    this.basePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  }

  /**
   * Get all items
   * @param {Object} params - Query parameters
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise} Response data
   */
  async getAll(params = {}, signal = null) {
    try {
      const config = { params };
      if (signal) {
        config.signal = signal;
      }
      const { data } = await api.get(this.basePath, config);
      return data;
    } catch (error) {
      throw handleError(error, `${this.basePath}.getAll`);
    }
  }

  /**
   * Get item by ID
   * @param {string|number} id - Item ID
   * @param {Object} params - Query parameters
   * @returns {Promise} Response data
   */
  async getById(id, params = {}) {
    if (!id) {
      throw new Error('ID is required');
    }
    try {
      const { data } = await api.get(`${this.basePath}${id}/`, { params });
      return data;
    } catch (error) {
      throw handleError(error, `${this.basePath}.getById`);
    }
  }

  /**
   * Create new item
   * @param {Object} payload - Item data
   * @returns {Promise} Created item data
   */
  async create(payload) {
    try {
      const { data } = await api.post(this.basePath, payload);
      return data;
    } catch (error) {
      throw handleError(error, `${this.basePath}.create`);
    }
  }

  /**
   * Update item
   * @param {string|number} id - Item ID
   * @param {Object} payload - Update data
   * @returns {Promise} Updated item data
   */
  async update(id, payload) {
    if (!id) {
      throw new Error('ID is required');
    }
    try {
      const { data } = await api.patch(`${this.basePath}${id}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, `${this.basePath}.update`);
    }
  }

  /**
   * Delete item
   * @param {string|number} id - Item ID
   * @returns {Promise} Void
   */
  async delete(id) {
    if (!id) {
      throw new Error('ID is required');
    }
    try {
      await api.delete(`${this.basePath}${id}/`);
      return true;
    } catch (error) {
      throw handleError(error, `${this.basePath}.delete`);
    }
  }

  /**
   * Create with FormData (for file uploads)
   * @param {FormData} formData - Form data
   * @param {Object} config - Additional axios config
   * @returns {Promise} Response data
   */
  async createWithFormData(formData, config = {}) {
    try {
      // FIX: Don't set Content-Type - axios adds it automatically with the boundary
      const { data } = await api.post(this.basePath, formData, config);
      return data;
    } catch (error) {
      throw handleError(error, `${this.basePath}.createWithFormData`);
    }
  }

  /**
   * Update with FormData (for file uploads)
   * @param {string|number} id - Item ID
   * @param {FormData} formData - Form data
   * @param {Object} config - Additional axios config
   * @returns {Promise} Response data
   */
  async updateWithFormData(id, formData, config = {}) {
    if (!id) {
      throw new Error('ID is required');
    }
    try {
      // FIX: Don't set Content-Type - axios adds it automatically with the boundary
      const { data } = await api.patch(`${this.basePath}${id}/`, formData, config);
      return data;
    } catch (error) {
      throw handleError(error, `${this.basePath}.updateWithFormData`);
    }
  }
}

export default BaseService;
