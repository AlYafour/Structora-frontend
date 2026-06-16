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

  async unvoid(id) {
    try {
      const { data } = await api.post(`${this.basePath}${id}/unvoid/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentService.unvoid');
    }
  }

  /**
   * Honor a pending promissory note — marks it as cashed, creates receipt voucher,
   * and the note's amount now reduces the invoice's remaining balance.
   * @param {string|number} id - Payment ID
   * @param {string} honoredDate - ISO date string (YYYY-MM-DD), defaults to today
   * @returns {Promise} Updated payment data
   */
  async honorPromissoryNote(id, honoredDate = null) {
    try {
      const payload = honoredDate ? { honored_date: honoredDate } : {};
      const { data } = await api.post(`${this.basePath}${id}/honor-promissory-note/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentService.honorPromissoryNote');
    }
  }

  /**
   * Dishonor a pending promissory note — removes allocations, recalculates tax invoice.
   * The balance returns to the state before the note was recorded.
   * @param {string|number} id - Payment ID
   * @param {string} reason - Reason for dishonoring
   * @returns {Promise} Updated payment data
   */
  async dishonorPromissoryNote(id, reason = '') {
    try {
      const { data } = await api.post(`${this.basePath}${id}/dishonor-promissory-note/`, { reason });
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentService.dishonorPromissoryNote');
    }
  }
}

export const paymentApi = new PaymentService();
export default paymentApi;
