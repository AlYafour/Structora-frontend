/**
 * Auth API Service
 * Handles all authentication-related API calls
 */
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class AuthService {
  async login(email, password) {
    try {
      const { data } = await api.post('auth/login/', { email, password });
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.login');
    }
  }

  async registerCompany(payload) {
    try {
      const { data } = await api.post('auth/register/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.registerCompany');
    }
  }

  async registerCompanyAlt(payload) {
    try {
      const { data } = await api.post('auth/register-company/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.registerCompanyAlt');
    }
  }

  async getPublicCompanyInfo(slug) {
    try {
      const { data } = await api.get(`public/company-info/${slug}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.getPublicCompanyInfo');
    }
  }

  async refreshToken(refreshToken) {
    try {
      const { data } = await api.post('auth/token/refresh/', { refresh: refreshToken });
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.refreshToken');
    }
  }

  async logout() {
    try {
      await api.post('auth/users/logout/');
      return true;
    } catch (error) {
      throw handleError(error, 'AuthService.logout');
    }
  }

  async getCurrentUser() {
    try {
      const { data } = await api.get('auth/users/profile/');
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.getCurrentUser');
    }
  }

  async updateProfile(payload) {
    try {
      const { data } = await api.patch('auth/users/update_profile/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.updateProfile');
    }
  }

  async createUser(payload) {
    try {
      const { data } = await api.post('auth/users/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.createUser');
    }
  }

  async updateUser(id, payload) {
    try {
      const { data } = await api.patch(`auth/users/${id}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.updateUser');
    }
  }

  async deleteUser(id) {
    try {
      await api.delete(`auth/users/${id}/`);
      return true;
    } catch (error) {
      throw handleError(error, 'AuthService.deleteUser');
    }
  }

  async toggleUserStatus(id) {
    try {
      const { data } = await api.post(`auth/users/${id}/toggle-status/`);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.toggleUserStatus');
    }
  }

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

  async requestPasswordReset(email) {
    try {
      const { data } = await api.post('auth/password-reset/request/', { email });
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.requestPasswordReset');
    }
  }

  async confirmPasswordReset(payload) {
    try {
      const { data } = await api.post('auth/password-reset/confirm/', payload);
      return data;
    } catch (error) {
      throw handleError(error, 'AuthService.confirmPasswordReset');
    }
  }

  async checkBiometric(email) {
    try {
      const { data } = await api.post('auth/webauthn/check/', { email });
      return data;
    } catch {
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