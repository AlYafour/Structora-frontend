/**
 * Payment API Service
 * Handles all payment-related API calls
 */
import { BaseService } from '../baseService';
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class PaymentService extends BaseService {
  constructor() {
    super('payments');
  }

  /**
   * Get payment by ID
   * @param {string|number} id - Payment ID
   * @returns {Promise} Payment data
   */
  async getById(id) {
    try {
      // this.basePath already ends with a trailing slash from BaseService
      const { data } = await api.get(`${this.basePath}${id}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentService.getById');
    }
  }

  /**
   * Create payment
   * @param {FormData|Object} payload - Payment data
   * @returns {Promise} Created payment data
   */
  async create(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      // this.basePath already ends with a slash from BaseService, so don't add another
      const { data } = await api.post(this.basePath, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentService.create');
    }
  }

  /**
   * Update payment
   * @param {string|number} id - Payment ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated payment data
   */
  async update(id, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(`${this.basePath}${id}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentService.update');
    }
  }

  /**
   * Void a payment (SAP/Oracle standard — no actual deletion)
   * @param {string|number} id - Payment ID
   * @param {string} reason - Reason for voiding
   * @returns {Promise} Response data
   */
  async void(id, reason = '') {
    try {
      const { data } = await api.post(`${this.basePath}${id}/void/`, { reason });
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentService.void');
    }
  }
}

export const paymentApi = new PaymentService();
export default paymentApi;
