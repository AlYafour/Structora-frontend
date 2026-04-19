/**
 * Payment Claim API Service
 */
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class PaymentClaimService {
  constructor() {
    this.basePath = '';
  }

  /**
   * Get all payment claims for a project
   */
  async getPaymentClaims(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/payment-claims/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.getPaymentClaims');
    }
  }

  /**
   * Get payment claim by ID
   */
  async getPaymentClaim(projectId, claimId) {
    try {
      const { data } = await api.get(`projects/${projectId}/payment-claims/${claimId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.getPaymentClaim');
    }
  }

  /**
   * Create payment claim
   */
  async createPaymentClaim(projectId, payload) {
    try {
      const { data } = await api.post(`projects/${projectId}/payment-claims/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.createPaymentClaim');
    }
  }

  /**
   * Update payment claim
   */
  async updatePaymentClaim(projectId, claimId, payload) {
    try {
      const { data } = await api.patch(`projects/${projectId}/payment-claims/${claimId}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.updatePaymentClaim');
    }
  }

  /**
   * Delete payment claim
   */
  async deletePaymentClaim(projectId, claimId) {
    try {
      await api.delete(`projects/${projectId}/payment-claims/${claimId}/`);
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.deletePaymentClaim');
    }
  }

  /**
   * Get payment claim items
   */
  async getPaymentClaimItems(projectId, claimId) {
    try {
      const { data } = await api.get(`projects/${projectId}/payment-claims/${claimId}/items/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.getPaymentClaimItems');
    }
  }

  /**
   * Get next Interim Payment number for a project
   */
  async getNextNumber(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/payment-claims/next-number/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.getNextNumber');
    }
  }

  /**
   * Get BOQItems (Yafour form) for a project (when creating new payment claim)
   */
  async getProjectBOQItems(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/payment-claims/project-boq-items/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.getProjectBOQItems');
    }
  }

  /**
   * Get BOQItems (Yafour form) for payment claim
   * This is what users see and interact with
   */
  async getBOQItems(projectId, claimId) {
    try {
      const { data } = await api.get(`projects/${projectId}/payment-claims/${claimId}/boq-items/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.getBOQItems');
    }
  }

  /**
   * Update percentages for BOQItems in payment claim
   */
  async updatePercentages(projectId, claimId, items) {
    try {
      const { data } = await api.post(
        `projects/${projectId}/payment-claims/${claimId}/update-percentages/`,
        { items }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.updatePercentages');
    }
  }

  /**
   * Update payment claim item
   */
  async updatePaymentClaimItem(projectId, claimId, itemId, payload) {
    try {
      const { data } = await api.patch(
        `projects/${projectId}/payment-claims/${claimId}/items/${itemId}/`,
        payload
      );
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.updatePaymentClaimItem');
    }
  }

  /**
   * Import Excel file and get preview
   */
  async importExcel(file, projectId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);

      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`payment-claims/import-excel/`, formData);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.importExcel');
    }
  }

  /**
   * Import data directly from Excel file
   */
  async importDataWithFile(formData, projectId) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`payment-claims/import-data/`, formData);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.importDataWithFile');
    }
  }

  /**
   * Submit payment claim for approval
   */
  async submitPaymentClaim(projectId, claimId) {
    try {
      const { data } = await api.post(`projects/${projectId}/payment-claims/${claimId}/submit/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.submitPaymentClaim');
    }
  }

  /**
   * Approve payment claim
   */
  async approvePaymentClaim(projectId, claimId) {
    try {
      const { data } = await api.post(`projects/${projectId}/payment-claims/${claimId}/approve/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.approvePaymentClaim');
    }
  }

  /**
   * Reject payment claim
   */
  async rejectPaymentClaim(projectId, claimId) {
    try {
      const { data } = await api.post(`projects/${projectId}/payment-claims/${claimId}/reject/`);
      return data;
    } catch (error) {
      throw handleError(error, 'PaymentClaimService.rejectPaymentClaim');
    }
  }
}

export default new PaymentClaimService();
