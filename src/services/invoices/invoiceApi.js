/**
 * Invoice API Service
 * Handles all invoice-related API calls
 */
import { BaseService } from '../baseService';
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class InvoiceService extends BaseService {
  constructor() {
    super('actual-invoices');
  }

  /**
   * Get invoice by ID
   * @param {string|number} id - Invoice ID
   * @returns {Promise} Invoice data
   */
  async getById(id) {
    try {
      const { data } = await api.get(`${this.basePath}${id}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'InvoiceService.getById');
    }
  }

  /**
   * Create invoice
   * @param {FormData|Object} payload - Invoice data
   * @returns {Promise} Created invoice data
   */
  async create(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`${this.basePath}`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'InvoiceService.create');
    }
  }

  /**
   * Update invoice
   * @param {string|number} id - Invoice ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated invoice data
   */
  async update(id, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(`${this.basePath}${id}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'InvoiceService.update');
    }
  }

  /**
   * Delete invoice
   * @param {string|number} id - Invoice ID
   * @returns {Promise} Void
   */
  async delete(id) {
    try {
      await api.delete(`${this.basePath}${id}/`);
      return true;
    } catch (error) {
      throw handleError(error, 'InvoiceService.delete');
    }
  }
}

export const invoiceApi = new InvoiceService();
export default invoiceApi;
