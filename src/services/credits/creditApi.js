/**
 * Credit API Service
 * Handles overpayment credit (رصيد زائد) API calls
 */
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class CreditApiService {
  /**
   * Get credit summary for a project (available overpayment credits)
   */
  async getSummary(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/credit-summary/`);
      return data;
    } catch (error) {
      throw handleError(error, 'CreditApi.getSummary');
    }
  }

  /**
   * Get credit application records for a project (grouped by operation)
   */
  async getApplications(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/credit-applications/`);
      return data;
    } catch (error) {
      throw handleError(error, 'CreditApi.getApplications');
    }
  }
}

export const creditApi = new CreditApiService();
export default creditApi;
