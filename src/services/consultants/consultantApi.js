/**
 * Consultant API Service
 * Handles all consultant-related API calls
 */
import { BaseService } from '../baseService';
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class ConsultantService extends BaseService {
  constructor() {
    super('consultants');
  }

  /**
   * Get consultant by ID
   * @param {string|number} id - Consultant ID
   * @returns {Promise} Consultant data
   */
  async getById(id) {
    try {
      const { data } = await api.get(`${this.basePath}${id}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ConsultantService.getById');
    }
  }

  /**
   * Create consultant
   * @param {FormData|Object} payload - Consultant data
   * @returns {Promise} Created consultant data
   */
  async create(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`${this.basePath}`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ConsultantService.create');
    }
  }

  /**
   * Update consultant
   * @param {string|number} id - Consultant ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated consultant data
   */
  async update(id, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(`${this.basePath}${id}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ConsultantService.update');
    }
  }

  /**
   * Delete consultant
   * @param {string|number} id - Consultant ID
   * @returns {Promise} Void
   */
  async delete(id) {
    try {
      await api.delete(`${this.basePath}${id}/`);
      return true;
    } catch (error) {
      throw handleError(error, 'ConsultantService.delete');
    }
  }

  /**
   * Bulk delete consultants
   * @param {string[]|number[]} ids - Array of consultant IDs
   * @returns {Promise} Void
   */
  async bulkDelete(ids) {
    try {
      await api.post(`${this.basePath}bulk-delete/`, { ids });
      return true;
    } catch (error) {
      throw handleError(error, 'ConsultantService.bulkDelete');
    }
  }
}

export const consultantApi = new ConsultantService();
export default consultantApi;
