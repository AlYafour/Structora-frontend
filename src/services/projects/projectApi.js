/**
 * Project API Service
 * Handles all project-related API calls
 */
import { BaseService } from '../baseService';
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class ProjectService extends BaseService {
  constructor() {
    super('projects');
  }

  /**
   * Get project with related data (siteplan, license, contract, etc.)
   * @param {string|number} id - Project ID
   * @param {string[]} includes - Related data to include
   * @returns {Promise} Project data with includes
   */
  async getWithIncludes(id, includes = []) {
    try {
      const includeParam = includes.length > 0 ? includes.join(',') : '';
      const params = includeParam ? { include: includeParam } : {};
      const { data } = await api.get(`${this.basePath}${id}/`, { params });
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getWithIncludes');
    }
  }

  async getVariationContext(id) {
    try {
      const { data } = await api.get(`${this.basePath}${id}/variation-context/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getVariationContext');
    }
  }

  async getViewContext(id, config = {}) {
    try {
      const { data } = await api.get(`${this.basePath}${id}/view-context/`, config);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getViewContext');
    }
  }

  /**
   * Get lightweight project list for dropdowns/selectors.
   * Returns only id, name, display_name, internal_code — no heavy calculations.
   * ~100x faster than getAll().
   * @returns {Promise} Array of {id, name, display_name, internal_code}
   */
  async getSimpleList() {
    try {
      const { data } = await api.get(`${this.basePath}simple/`);
      return Array.isArray(data) ? data : (data?.results || []);
    } catch (error) {
      throw handleError(error, 'ProjectService.getSimpleList');
    }
  }

  /**
   * Submit project for approval
   * @param {string|number} id - Project ID
   * @returns {Promise} Response data
   */
  async submit(id) {
    try {
      const { data } = await api.post(`${this.basePath}${id}/submit/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.submit');
    }
  }

  /**
   * Approve project stage
   * @param {string|number} id - Project ID
   * @param {string} notes - Approval notes
   * @returns {Promise} Response data
   */
  async approve(id, notes = '') {
    try {
      const { data } = await api.post(`${this.basePath}${id}/approve/`, { notes });
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.approve');
    }
  }

  /**
   * Reject project
   * @param {string|number} id - Project ID
   * @param {string} notes - Rejection notes (required)
   * @returns {Promise} Response data
   */
  async reject(id, notes) {
    if (!notes || !notes.trim()) {
      throw handleError(new Error('Rejection notes are required'), 'ProjectService.reject');
    }
    try {
      const { data } = await api.post(`${this.basePath}${id}/reject/`, { notes });
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.reject');
    }
  }

  /**
   * Final approve project
   * @param {string|number} id - Project ID
   * @param {string} notes - Approval notes
   * @returns {Promise} Response data
   */
  async finalApprove(id, notes = '') {
    try {
      const { data } = await api.post(`${this.basePath}${id}/final_approve/`, { notes });
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.finalApprove');
    }
  }

  /**
   * Revoke final approval and return project to draft
   * @param {string|number} id - Project ID
   * @param {string} notes - Revocation notes
   * @returns {Promise} Response data
   */
  async revokeFinalApproval(id, notes = '') {
    try {
      const { data } = await api.post(`${this.basePath}${id}/revoke_final_approval/`, { notes });
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.revokeFinalApproval');
    }
  }

  // ===== Site Plan Operations =====

  /**
   * Get site plan for project
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Site plan data
   */
  async getSitePlan(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/siteplan/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getSitePlan');
    }
  }

  /**
   * Create site plan
   * @param {string|number} projectId - Project ID
   * @param {FormData|Object} payload - Site plan data
   * @returns {Promise} Created site plan data
   */
  async createSitePlan(projectId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData - axios adds it automatically with the boundary
      const { data } = await api.post(`${this.basePath}${projectId}/siteplan/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.createSitePlan');
    }
  }

  /**
   * Update site plan
   * @param {string|number} projectId - Project ID
   * @param {string|number} sitePlanId - Site plan ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated site plan data
   */
  async updateSitePlan(projectId, sitePlanId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(
        `${this.basePath}${projectId}/siteplan/${sitePlanId}/`,
        payload
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.updateSitePlan');
    }
  }

  // ===== License Operations =====

  /**
   * Get license for project
   * @param {string|number} projectId - Project ID
   * @returns {Promise} License data
   */
  async getLicense(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/license/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getLicense');
    }
  }

  /**
   * Create or update license
   * @param {string|number} projectId - Project ID
   * @param {FormData|Object} payload - License data
   * @returns {Promise} License data
   */
  async saveLicense(projectId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`${this.basePath}${projectId}/license/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.saveLicense');
    }
  }

  // ===== Contract Operations =====

  /**
   * Get contract for project
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Contract data
   */
  async getContract(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/contract/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getContract');
    }
  }

  /**
   * Create or update contract
   * @param {string|number} projectId - Project ID
   * @param {FormData|Object} payload - Contract data
   * @returns {Promise} Contract data
   */
  async saveContract(projectId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`${this.basePath}${projectId}/contract/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.saveContract');
    }
  }

  // ===== Payments =====

  /**
   * Get payments for project
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Payments array
   */
  async getPayments(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/payments/`);
      return Array.isArray(data) ? data : data?.results || [];
    } catch (error) {
      throw handleError(error, 'ProjectService.getPayments');
    }
  }

  // ===== Variations =====

  /**
   * Get variations for project
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Variations array
   */
  async getVariations(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/variations/`);
      return Array.isArray(data) ? data : data?.results || [];
    } catch (error) {
      throw handleError(error, 'ProjectService.getVariations');
    }
  }

  /**
   * Create variation
   * @param {string|number} projectId - Project ID
   * @param {FormData|Object} payload - Variation data
   * @returns {Promise} Created variation data
   */
  async createVariation(projectId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`${this.basePath}${projectId}/variations/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.createVariation');
    }
  }

  /**
   * Update variation
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated variation data
   */
  async updateVariation(projectId, variationId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(
        `${this.basePath}${projectId}/variations/${variationId}/`,
        payload
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.updateVariation');
    }
  }

  /**
   * Get variation by ID
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} Variation data
   */
  async getVariationById(projectId, variationId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/variations/${variationId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getVariationById');
    }
  }

  /**
   * Generate variation PDF
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} PDF blob
   */
  async generateVariationPDF(projectId, variationId) {
    try {
      const { data } = await api.get(
        `${this.basePath}${projectId}/variations/${variationId}/generate_pdf/`,
        { responseType: 'blob' }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.generateVariationPDF');
    }
  }

  async getExtensionLetterData(projectId, startOrderId, extIndex) {
    try {
      const { data } = await api.get(
        `${this.basePath}${projectId}/start-order/${startOrderId}/extension-letter/`,
        { params: { ext_index: extIndex } }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getExtensionLetterData');
    }
  }

  /**
   * Delete variation
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} Void
   */
  async deleteVariation(projectId, variationId) {
    try {
      await api.delete(`${this.basePath}${projectId}/variations/${variationId}/`);
    } catch (error) {
      throw handleError(error, 'ProjectService.deleteVariation');
    }
  }

  /**
   * Approve variation (project manager initial)
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} Response data
   */
  async approveVariationProjectManager(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/approve_project_manager_initial/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.approveVariationProjectManager');
    }
  }

  async submitVariationDraft(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/submit_draft/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.submitVariationDraft');
    }
  }

  /**
   * Approve variation (general manager initial)
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} Response data
   */
  async approveVariationGeneralManagerInitial(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/approve_general_manager_initial/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.approveVariationGeneralManagerInitial');
    }
  }

  async approveVariationGMInitial(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/approve_gm_initial/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.approveVariationGMInitial');
    }
  }

  async rejectVariationGMInitial(projectId, variationId, notes) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/reject_gm_initial/`,
        { rejection_reason: notes }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.rejectVariationGMInitial');
    }
  }

  /**
   * Approve variation (general manager final)
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} Response data
   */
  async approveVariation(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/approve_general_manager_final/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.approveVariation');
    }
  }

  async approveVariationHiddenFees(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/approve_hidden_fees/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.approveVariationHiddenFees');
    }
  }

  async rejectVariationHiddenFees(projectId, variationId, notes) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/reject_hidden_fees/`,
        { rejection_reason: notes }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.rejectVariationHiddenFees');
    }
  }

  /**
   * Confirm owner approval
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} Response data
   */
  async confirmOwnerApproval(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/confirm_owner_approval/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.confirmOwnerApproval');
    }
  }

  /**
   * Confirm consultant approval
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} Response data
   */
  async confirmConsultantApproval(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/confirm_consultant_approval/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.confirmConsultantApproval');
    }
  }

  /**
   * Reject variation (owner/consultant stage, recorded by project manager)
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @param {string} notes - Rejection notes
   * @returns {Promise} Response data
   */
  async rejectVariationOwnerConsultant(projectId, variationId, notes) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/reject_owner_consultant/`,
        { rejection_reason: notes }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.rejectVariationOwnerConsultant');
    }
  }

  /**
   * Reject variation (project manager)
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @param {string} notes - Rejection notes
   * @returns {Promise} Response data
   */
  async rejectVariationProjectManager(projectId, variationId, notes) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/reject_project_manager/`,
        { rejection_reason: notes }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.rejectVariationProjectManager');
    }
  }

  /**
   * Reject variation (general manager)
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @param {string} notes - Rejection notes
   * @returns {Promise} Response data
   */
  async rejectVariation(projectId, variationId, notes) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/reject_general_manager/`,
        { rejection_reason: notes }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.rejectVariation');
    }
  }

  async revokeVariationApproval(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/revoke_approval/`,
        {}
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.revokeVariationApproval');
    }
  }

  async unapproveVariationProjectManager(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/unapprove_project_manager_initial/`,
        {}
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.unapproveVariationProjectManager');
    }
  }

  async unapproveVariationSupervisor(projectId, variationId) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/unapprove_supervisor_initial/`,
        {}
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.unapproveVariationSupervisor');
    }
  }

  async createAlterationRequest(projectId, variationId, { request_type, reason }) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/alteration-requests/create/`,
        { request_type, reason }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.createAlterationRequest');
    }
  }

  async listAlterationRequests(projectId, variationId) {
    try {
      const { data } = await api.get(
        `${this.basePath}${projectId}/variations/${variationId}/alteration-requests/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.listAlterationRequests');
    }
  }

  async getAlterationRequest(projectId, variationId, requestId) {
    try {
      const { data } = await api.get(
        `${this.basePath}${projectId}/variations/${variationId}/alteration-requests/${requestId}/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getAlterationRequest');
    }
  }

  async respondToAlterationRequest(projectId, variationId, requestId, { status, response_reason }) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/variations/${variationId}/alteration-requests/${requestId}/respond/`,
        { status, response_reason }
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.respondToAlterationRequest');
    }
  }

  /**
   * Get audit log history for a variation
   * @param {string|number} projectId - Project ID
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} Audit log data
   */
  async getVariationAuditLog(projectId, variationId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/variations/${variationId}/audit_log/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getVariationAuditLog');
    }
  }

  // ===== Invoices =====

  /**
   * Find an invoice by ID directly (without looping through all projects).
   * @param {string|number} invoiceId - Invoice ID
   * @returns {Promise} { invoice, project_id }
   */
  async findInvoiceById(invoiceId) {
    try {
      const { data } = await api.get(`invoices/${invoiceId}/find/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.findInvoiceById');
    }
  }

  /**
   * Find a variation by ID directly (for edit mode).
   * Returns variation data + project_id without looping through all projects.
   * @param {string|number} variationId - Variation ID
   * @returns {Promise} { variation, project_id }
   */
  async findVariationById(variationId) {
    try {
      const { data } = await api.get(`variations/${variationId}/find/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.findVariationById');
    }
  }

  /**
   * Get all invoices across all projects (single request).
   * Replaces the N+1 pattern of loading all projects then fetching invoices for each.
   * @returns {Promise} Array of invoices with __project info attached
   */
  async getAllInvoices() {
    try {
      const { data } = await api.get('invoices/all/');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      throw handleError(error, 'ProjectService.getAllInvoices');
    }
  }

  /**
   * Get invoices for project
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Invoices array
   */
  async getInvoices(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/actual-invoices/`);
      return Array.isArray(data) ? data : data?.results || [];
    } catch (error) {
      throw handleError(error, 'ProjectService.getInvoices');
    }
  }

  /**
   * Create invoice for project
   * @param {string|number} projectId - Project ID
   * @param {FormData|Object} payload - Invoice data
   * @returns {Promise} Created invoice data
   */
  async createInvoice(projectId, payload) {
    // FIX: Don't set Content-Type for FormData
    const { data } = await api.post(`${this.basePath}${projectId}/actual-invoices/`, payload);
    return data;
  }

  /**
   * Update invoice for project
   * @param {string|number} projectId - Project ID
   * @param {string|number} invoiceId - Invoice ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated invoice data
   */
  async updateInvoice(projectId, invoiceId, payload) {
    // FIX: Don't set Content-Type for FormData
    const { data } = await api.patch(
      `${this.basePath}${projectId}/actual-invoices/${invoiceId}/`,
      payload
    );
    return data;
  }

  /**
   * Void an invoice (SAP/Oracle standard — no actual deletion)
   * @param {string|number} projectId - Project ID
   * @param {string|number} invoiceId - Invoice ID
   * @param {string} reason - Reason for voiding
   * @returns {Promise} Response data
   */
  async voidInvoice(projectId, invoiceId, reason = '') {
    const { data } = await api.post(
      `${this.basePath}${projectId}/actual-invoices/${invoiceId}/void/`,
      { reason }
    );
    return data;
  }

  async unvoidInvoice(projectId, invoiceId) {
    const { data } = await api.post(
      `${this.basePath}${projectId}/actual-invoices/${invoiceId}/unvoid/`
    );
    return data;
  }

  // ===== Project Schedule =====

  /**
   * Get project schedule
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Schedule data
   */
  async getProjectSchedule(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/project-schedule/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getProjectSchedule');
    }
  }

  /**
   * Save project schedule
   * @param {string|number} projectId - Project ID
   * @param {FormData|Object} payload - Schedule data
   * @returns {Promise} Schedule data
   */
  async saveProjectSchedule(projectId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`${this.basePath}${projectId}/project-schedule/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.saveProjectSchedule');
    }
  }

  /**
   * Update project schedule
   * @param {string|number} projectId - Project ID
   * @param {string|number} scheduleId - Schedule ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated schedule data
   */
  async updateProjectSchedule(projectId, scheduleId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(
        `${this.basePath}${projectId}/project-schedule/${scheduleId}/`,
        payload
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.updateProjectSchedule');
    }
  }

  // ===== Excavation Notice =====

  /**
   * Get excavation notice
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Excavation notice data
   */
  async getExcavationNotice(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/excavation-notice/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getExcavationNotice');
    }
  }

  /**
   * Save excavation notice
   * @param {string|number} projectId - Project ID
   * @param {FormData|Object} payload - Excavation notice data
   * @returns {Promise} Excavation notice data
   */
  async saveExcavationNotice(projectId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`${this.basePath}${projectId}/excavation-notice/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.saveExcavationNotice');
    }
  }

  /**
   * Update excavation notice
   * @param {string|number} projectId - Project ID
   * @param {string|number} noticeId - Excavation notice ID
   * @param {FormData|Object} payload - Update data
   * @returns {Promise} Updated excavation notice data
   */
  async updateExcavationNotice(projectId, noticeId, payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(
        `${this.basePath}${projectId}/excavation-notice/${noticeId}/`,
        payload
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.updateExcavationNotice');
    }
  }

  // ===== Start Order =====

  /**
   * Get start order
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Start order data
   */
  async getStartOrder(projectId) {
    const { data } = await api.get(`${this.basePath}${projectId}/start-order/`);
    return data;
  }

  /**
   * Create start order
   * @param {string|number} projectId - Project ID
   * @param {FormData} formData - Start order data including file
   * @returns {Promise} Created start order data
   */
  async createStartOrder(projectId, formData) {
    try {
      const { data } = await api.post(
        `${this.basePath}${projectId}/start-order/`,
        formData
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.createStartOrder');
    }
  }

  /**
   * Update start order (with extensions)
   * @param {string|number} projectId - Project ID
   * @param {string|number} startOrderId - Start order ID
   * @param {FormData} formData - Update data including extensions
   * @returns {Promise} Updated start order data
   */
  async updateStartOrder(projectId, startOrderId, formData) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch(
        `${this.basePath}${projectId}/start-order/${startOrderId}/`,
        formData
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.updateStartOrder');
    }
  }

  async deleteStartOrder(projectId, startOrderId) {
    try {
      await api.delete(`${this.basePath}${projectId}/start-order/${startOrderId}/`);
    } catch (error) {
      throw handleError(error, 'ProjectService.deleteStartOrder');
    }
  }

  // ===== Project Extensions (decoupled) =====

  async getExtensions(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/extensions/`);
      return Array.isArray(data) ? data : (data?.results ?? []);
    } catch (error) {
      throw handleError(error, 'ProjectService.getExtensions');
    }
  }

  async createExtension(projectId, formData) {
    try {
      const { data } = await api.post(`${this.basePath}${projectId}/extensions/`, formData);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.createExtension');
    }
  }

  async updateExtension(projectId, extensionId, formData) {
    try {
      const { data } = await api.patch(
        `${this.basePath}${projectId}/extensions/${extensionId}/`,
        formData
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.updateExtension');
    }
  }

  async deleteExtension(projectId, extensionId) {
    try {
      await api.delete(`${this.basePath}${projectId}/extensions/${extensionId}/`);
    } catch (error) {
      throw handleError(error, 'ProjectService.deleteExtension');
    }
  }

  async getProjectExtensionLetterData(projectId, extensionId) {
    try {
      const { data } = await api.get(
        `${this.basePath}${projectId}/extensions/${extensionId}/extension-letter/`
      );
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getProjectExtensionLetterData');
    }
  }

  // ===== Awarding =====

  /**
   * Get awarding data
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Awarding data
   */
  async getAwarding(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/awarding/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getAwarding');
    }
  }

  // ===== Permissions =====

  /**
   * Get project permissions
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Permissions data
   */
  /**
   * Get attachments for a model/object
   * @param {Object} params - Query parameters (model, object_id, type, etc.)
   * @returns {Promise} Attachments data
   */
  async getAttachments(params = {}) {
    try {
      const { data } = await api.get('attachments/', { params });
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getAttachments');
    }
  }

  async getPermissions(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/permissions/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getPermissions');
    }
  }

  // ===== Project Progress Operations =====

  /**
   * Get all progress entries for a project
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Progress entries array
   */
  async getProjectProgress(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/progress/`);
      return Array.isArray(data) ? data : (data?.results || data?.items || []);
    } catch (error) {
      throw handleError(error, 'ProjectService.getProjectProgress');
    }
  }

  /**
   * Get latest progress entry for a project
   * @param {string|number} projectId - Project ID
   * @returns {Promise} Latest progress entry
   */
  async getLatestProjectProgress(projectId) {
    try {
      const { data } = await api.get(`${this.basePath}${projectId}/progress/latest/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getLatestProjectProgress');
    }
  }

  /**
   * Get all invoice form data in a single request
   * Returns: contract, variations, latest_progress, existing_invoices,
   *          next_invoice_number, advance_summary, credit_summary
   * @param {string|number} projectId - Project ID
   * @param {number} [year] - Optional year for invoice number
   * @returns {Promise} Combined invoice form data
   */
  async getInvoiceFormData(projectId, year, options = {}) {
    try {
      const params = { ...(year ? { year } : {}), ...(options?.mode ? { mode: options.mode } : {}) };
      const config = Object.keys(params).length ? { params } : {};
      const { data } = await api.get(`${this.basePath}${projectId}/invoice-form-data/`, config);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getInvoiceFormData');
    }
  }

  /**
   * Create a new progress entry
   * @param {string|number} projectId - Project ID
   * @param {object} progressData - Progress entry data
   * @returns {Promise} Created progress entry
   */
  async createProjectProgress(projectId, progressData) {
    try {
      // ✅ Support FormData for file uploads
      const { data } = await api.post(`${this.basePath}${projectId}/progress/`, progressData, {
        headers: progressData instanceof FormData ? {} : { 'Content-Type': 'application/json' }
      });
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.createProjectProgress');
    }
  }

  /**
   * Update a progress entry
   * @param {string|number} projectId - Project ID
   * @param {string|number} progressId - Progress entry ID
   * @param {object|FormData} progressData - Updated progress entry data
   * @returns {Promise} Updated progress entry
   */
  async updateProjectProgress(projectId, progressId, progressData) {
    try {
      // ✅ Support FormData for file uploads
      const { data } = await api.patch(`${this.basePath}${projectId}/progress/${progressId}/`, progressData, {
        headers: progressData instanceof FormData ? {} : { 'Content-Type': 'application/json' }
      });
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.updateProjectProgress');
    }
  }

  /**
   * Delete a progress entry
   * @param {string|number} projectId - Project ID
   * @param {string|number} progressId - Progress entry ID
   * @returns {Promise} Response data
   */
  async deleteProjectProgress(projectId, progressId) {
    try {
      const { data } = await api.delete(`${this.basePath}${projectId}/progress/${progressId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.deleteProjectProgress');
    }
  }

  // ===== Draft Operations =====

  async getDrafts() {
    try {
      const { data } = await api.get('project-drafts/');
      return Array.isArray(data) ? data : (data?.results || []);
    } catch (error) {
      throw handleError(error, 'ProjectService.getDrafts');
    }
  }

  async getDraft(draftId) {
    try {
      const { data } = await api.get(`project-drafts/${draftId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.getDraft');
    }
  }

  async createDraft(payload) {
    try {
      const { data } = await api.post('project-drafts/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.createDraft');
    }
  }

  async updateDraft(draftId, payload) {
    try {
      const { data } = await api.patch(`project-drafts/${draftId}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'ProjectService.updateDraft');
    }
  }

  async deleteDraft(draftId) {
    try {
      await api.delete(`project-drafts/${draftId}/`);
    } catch (error) {
      throw handleError(error, 'ProjectService.deleteDraft');
    }
  }
}

export const projectApi = new ProjectService();
export default projectApi;
