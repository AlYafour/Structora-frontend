/**
 * Auth API Service
 * Handles all authentication-related API calls
 */
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class AuthService {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Auth tokens and user data
   */
  async login(email, password) {
    try {
      const { data } = await api.post('auth/login/', { email, password });
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.login');
    }
  }

  /**
   * Register company
   * @param {FormData|Object} payload - Registration data
   * @returns {Promise} Registration response
   */
  async registerCompany(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post('auth/register/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.registerCompany');
    }
  }

  /**
   * Register company (alternative endpoint)
   * @param {FormData|Object} payload - Registration data
   * @returns {Promise} Registration response
   */
  async registerCompanyAlt(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post('auth/register-company/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.registerCompanyAlt');
    }
  }

  /**
   * Get public company info by slug
   * @param {string} slug - Company slug
   * @returns {Promise} Company info
   */
  async getPublicCompanyInfo(slug) {
    try {
      const { data } = await api.get(`public/company-info/${slug}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.getPublicCompanyInfo');
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise} New access token
   */
  async refreshToken(refreshToken) {
    try {
      const { data } = await api.post('auth/token/refresh/', { refresh: refreshToken });
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.refreshToken');
    }
  }

  /**
   * Logout user
   * @returns {Promise} Void
   */
  async logout() {
    try {
      await api.post('auth/users/logout/');
      return true;
    } catch (error) {
      throw handleError(error, 'AuthService.logout');
    }
  }

  /**
   * Get current user
   * @returns {Promise} User data
   */
  async getCurrentUser() {
    try {
      const { data } = await api.get('auth/users/profile/');
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.getCurrentUser');
    }
  }

  /**
   * Update user profile
   * @param {FormData|Object} payload - User data
   * @returns {Promise} Updated user data
   */
  async updateProfile(payload) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.patch('auth/users/update_profile/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.updateProfile');
    }
  }

  /**
   * Create company user
   * @param {Object} payload - User data
   * @returns {Promise} Created user data
   */
  async createUser(payload) {
    try {
      const { data } = await api.post('auth/users/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.createUser');
    }
  }

  /**
   * Update company user
   * @param {string|number} id - User ID
   * @param {Object} payload - User data
   * @returns {Promise} Updated user data
   */
  async updateUser(id, payload) {
    try {
      const { data } = await api.patch(`auth/users/${id}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.updateUser');
    }
  }

  /**
   * Delete company user
   * @param {string|number} id - User ID
   * @returns {Promise} Void
   */
  async deleteUser(id) {
    try {
      await api.delete(`auth/users/${id}/`);
      return true;
    } catch (error) {
      throw handleError(error, 'AuthService.deleteUser');
    }
  }

  /**
   * Toggle user active status
   * @param {string|number} id - User ID
   * @returns {Promise} Updated user data
   */
  async toggleUserStatus(id) {
    try {
      const { data } = await api.post(`auth/users/${id}/toggle-status/`);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.toggleUserStatus');
    }
  }

  /**
   * Change password (requires old password)
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} confirmPassword - Confirm new password
   * @returns {Promise} Success message
   */
  async changePassword(oldPassword, newPassword, confirmPassword) {
    try {
      const { data } = await api.post('auth/users/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.changePassword');
    }
  }

  // ============ WebAuthn / Biometric ============

  async checkBiometric(email) {
    try {
      const { data } = await api.post('auth/webauthn/check/', { email });
      return data;
    } catch {
      /* biometric check is best-effort; return false if unavailable */
      return { has_biometric: false };
    }
  }

  async webauthnRegisterBegin() {
    const { data } = await api.post('auth/webauthn/register/begin/');
    return data;
  }

  async webauthnRegisterComplete(payload) {
    const { data } = await api.post('auth/webauthn/register/complete/', payload);
    return data;
  }

  async webauthnLoginBegin(email) {
    const { data } = await api.post('auth/webauthn/login/begin/', { email });
    return data;
  }

  async webauthnLoginComplete(payload) {
    const { data } = await api.post('auth/webauthn/login/complete/', payload);
    return data;
  }

  async listBiometricCredentials() {
    const { data } = await api.get('auth/webauthn/credentials/');
    return data;
  }

  async deleteBiometricCredential(credentialId) {
    const { data } = await api.delete(`auth/webauthn/credentials/${credentialId}/`);
    return data;
  }
}

export const authApi = new AuthService();
export default authApi;
