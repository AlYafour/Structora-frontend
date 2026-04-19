import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class TaxInvoiceApiService {
  async list(projectId, includeVoided = false) {
    try {
      const url = includeVoided
        ? `projects/${projectId}/tax-invoices/?include_voided=true`
        : `projects/${projectId}/tax-invoices/`;
      const { data } = await api.get(url);
      return data;
    } catch (error) {
      throw handleError(error, 'TaxInvoiceApi.list');
    }
  }

  async getById(projectId, invoiceId) {
    try {
      const { data } = await api.get(`projects/${projectId}/tax-invoices/${invoiceId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'TaxInvoiceApi.getById');
    }
  }

  async backfill(projectId) {
    try {
      const { data } = await api.post(`projects/${projectId}/tax-invoices/backfill/`);
      return data;
    } catch (error) {
      throw handleError(error, 'TaxInvoiceApi.backfill');
    }
  }
}

export const taxInvoiceApi = new TaxInvoiceApiService();
export default taxInvoiceApi;
