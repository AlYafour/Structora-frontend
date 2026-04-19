/**
 * Owner API Service
 * Handles all owner-related API calls
 */
import { BaseService } from '../baseService';
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class OwnerService extends BaseService {
  constructor() {
    super('owners');
  }

  /**
   * Get owner by ID
   * @param {string|number} id - Owner ID
   * @returns {Promise} Owner data
   */
  async getById(id) {
    try {
      const { data } = await api.get(`${this.basePath}${id}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'OwnerService.getById');
    }
  }

  /**
   * Create owner
   * @param {FormData|Object} payload - Owner data
   * @returns {Promise} Created owner data
   */
  async create(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`${this.basePath}`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'OwnerService.create');
    }
  }

  /**
   * Update owner
   * @param {string|number} id - Owner ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated owner data
   */
  async update(id, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(`${this.basePath}${id}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'OwnerService.update');
    }
  }

  /**
   * Delete owner
   * @param {string|number} id - Owner ID
   * @returns {Promise} Void
   */
  async delete(id) {
    try {
      await api.delete(`${this.basePath}${id}/`);
      return true;
    } catch (error) {
      throw handleError(error, 'OwnerService.delete');
    }
  }

  /**
   * Bulk delete owners
   * @param {string[]|number[]} ids - Array of owner IDs
   * @returns {Promise} Void
   */
  async bulkDelete(ids) {
    try {
      await api.post(`${this.basePath}bulk-delete/`, { ids });
      return true;
    } catch (error) {
      throw handleError(error, 'OwnerService.bulkDelete');
    }
  }
}

export const ownerApi = new OwnerService();
export default ownerApi;
