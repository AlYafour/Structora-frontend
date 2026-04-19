/**
 * Advance Payment API Service
 * Handles all advance payment (دفعة مقدمة) API calls
 */
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class AdvancePaymentApiService {
  /**
   * Get all advance payments for a project
   */
  async getAll(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/advance-payments/`);
      return data;
    } catch (error) {
      throw handleError(error, 'AdvancePaymentApi.getAll');
    }
  }

  /**
   * Get advance payment summary for a project (all advances + deductions)
   */
  async getSummary(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/advance-payments/summary/`);
      return data;
    } catch (error) {
      throw handleError(error, 'AdvancePaymentApi.getSummary');
    }
  }

  /**
   * Create a new advance payment
   */
  async create(projectId, payload) {
    try {
      const { data } = await api.post(`projects/${projectId}/advance-payments/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AdvancePaymentApi.create');
    }
  }

  /**
   * Preview deduction amount for a given invoice amount
   */
  async calculateDeduction(projectId, amount) {
    try {
      const { data } = await api.get(
        `projects/${projectId}/advance-payments/calculate-deduction/`,
        { params: { amount } }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'AdvancePaymentApi.calculateDeduction');
    }
  }

  /**
   * Void an advance payment (SAP/Oracle standard — no actual deletion)
   */
  async void(projectId, id, reason = '') {
    try {
      const { data } = await api.post(
        `projects/${projectId}/advance-payments/${id}/void/`,
        { reason }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'AdvancePaymentApi.void');
    }
  }
}

export const advancePaymentApi = new AdvancePaymentApiService();
export default advancePaymentApi;
