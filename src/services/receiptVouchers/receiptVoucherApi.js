/**
 * Receipt Voucher API Service
 * Handles receipt voucher (سند قبض) API calls
 */
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class ReceiptVoucherApiService {
  /**
   * List all receipt vouchers for a project
   */
  async list(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/receipt-vouchers/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ReceiptVoucherApi.list');
    }
  }

  /**
   * Get a single receipt voucher
   */
  async getById(projectId, voucherId) {
    try {
      const { data } = await api.get(`projects/${projectId}/receipt-vouchers/${voucherId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ReceiptVoucherApi.getById');
    }
  }

  /**
   * Update a receipt voucher (editable fields: date, received_from, purpose, notes)
   */
  async update(projectId, voucherId, updateData) {
    try {
      const { data } = await api.patch(`projects/${projectId}/receipt-vouchers/${voucherId}/`, updateData);
      return data;
    } catch (error) {
      throw handleError(error, 'ReceiptVoucherApi.update');
    }
  }

  /**
   * Delete a receipt voucher (only allowed if not linked to invoice-covered payment)
   */
  async delete(projectId, voucherId) {
    try {
      await api.delete(`projects/${projectId}/receipt-vouchers/${voucherId}/`);
    } catch (error) {
      throw handleError(error, 'ReceiptVoucherApi.delete');
    }
  }

  /**
   * Backfill: create receipt vouchers for existing payments that don't have one
   */
  async backfill(projectId) {
    try {
      const { data } = await api.post(`projects/${projectId}/receipt-vouchers/backfill/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ReceiptVoucherApi.backfill');
    }
  }

  /**
   * Get the next voucher number
   */
  async getNextNumber(year) {
    try {
      const params = year ? { year } : {};
      const { data } = await api.get('receipt-vouchers/next-number/', { params });
      return data;
    } catch (error) {
      throw handleError(error, 'ReceiptVoucherApi.getNextNumber');
    }
  }
}

export const receiptVoucherApi = new ReceiptVoucherApiService();
export default receiptVoucherApi;
