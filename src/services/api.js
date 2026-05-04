// frontend/src/services/api.js
import axios from "axios";
import { getCsrfToken } from "../utils/cookies";

const isDev = import.meta.env.DEV;
// In development, use proxy => /api/
// In production, use VITE_API_URL
const ROOT = isDev
  ? ""
  : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const API_BASE_URL = isDev ? "/api/" : `${ROOT}/api/`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 300000, // 5 minutes for uploads (especially large files)
});

let csrfReady = false;
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Queue failed requests while a token refresh is in progress.
 * When refresh succeeds, all queued requests are retried.
 * When refresh fails, all queued requests are rejected.
 */
function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshSuccess() {
  refreshSubscribers.forEach((cb) => cb(null));
  refreshSubscribers = [];
}

function onRefreshFailure(error) {
  refreshSubscribers.forEach((cb) => cb(error));
  refreshSubscribers = [];
}

async function ensureCsrf() {
  if (csrfReady && getCsrfToken()) return;
  try {
    // Always use the api instance so requests go through the Vite proxy in dev
    // and through the correct VITE_API_URL in production — never hit 127.0.0.1 directly
    await api.get('csrf/', {
      withCredentials: true,
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    csrfReady = true;
  } catch { /* CSRF cookie fetch may fail before auth - expected */ }
}

// Request interceptor: add CSRF token for mutating requests
// JWT tokens are sent automatically via httpOnly cookies (withCredentials: true)
api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();

  if (["post", "put", "patch", "delete"].includes(method)) {
    let csrftoken = getCsrfToken();

    if (!csrftoken) {
      try {
        await ensureCsrf();
        csrftoken = getCsrfToken();
      } catch (err) {
        console.warn('CSRF token fetch failed, mutating request may be rejected:', err?.message);
      }
    }

    if (csrftoken) {
      config.headers["X-CSRFToken"] = csrftoken;
    }
  }

  return config;
});

// Response interceptor: handle 401 by attempting cookie-based token refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const originalRequest = err.config;

    // Handle 401 - attempt token refresh via cookie
    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint = requestUrl.includes('auth/login') || requestUrl.includes('auth/register') || requestUrl.includes('auth/token');
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // If a refresh is already in progress, queue this request to retry after refresh completes
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((error) => {
            if (error) {
              return reject(error);
            }
            // Fix file upload issue on retry
            if (originalRequest.data instanceof FormData) {
              delete originalRequest.headers['Content-Type'];
            }
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        // Refresh token is sent automatically via httpOnly cookie
        await axios.post(
          `${API_BASE_URL}auth/token/refresh/`,
          {},
          { withCredentials: true }
        );

        // Notify all queued requests that refresh succeeded
        onRefreshSuccess();
        isRefreshing = false;

        // Fix file upload issue on retry
        if (originalRequest.data instanceof FormData) {
          delete originalRequest.headers['Content-Type'];
        }

        return api(originalRequest);
      } catch (refreshError) {
        // Notify all queued requests that refresh failed
        onRefreshFailure(refreshError);
        isRefreshing = false;

        // If caller opted out of redirect (non-critical calls), just reject
        if (originalRequest._skipAuthRedirect) {
          return Promise.reject(refreshError);
        }
        // If refresh fails, clear auth state and redirect to tenant login
        const tenantSlug = localStorage.getItem('tenant_slug');
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
        localStorage.removeItem('tenant_theme');
        // Redirect to tenant-specific login page (preserving tenant context)
        // so user doesn't have to re-enter the company code
        window.location.href = tenantSlug ? `/login/${tenantSlug}` : '/';
        return Promise.reject(refreshError);
      }
    }

    // Handle HTML errors - convert them to a proper error message
    if (data && typeof data === "string" && (data.trim().startsWith("<!DOCTYPE") || data.trim().startsWith("<html"))) {
      const titleMatch = data.match(/<title>(.*?)<\/title>/i);
      const h1Match = data.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const errorMatch = data.match(/OperationalError|DatabaseError|IntegrityError|(\w+Error)/i);

      let errorMessage = "Server Error";
      if (titleMatch) {
        errorMessage = titleMatch[1];
      } else if (h1Match) {
        errorMessage = h1Match[1];
      } else if (errorMatch) {
        errorMessage = errorMatch[0];
      }

      err.response.data = {
        detail: errorMessage,
        html_error: true,
        status: status || 500
      };
    }

    return Promise.reject(err);
  }
);

/**
 * Upload a file with progress tracking
 * @param {string} url - Upload URL
 * @param {FormData} formData - Data to upload
 * @param {Function} onUploadProgress - Progress tracking callback (progress: number) => void
 * @param {Object} config - Additional configuration
 * @returns {Promise} - Promise with the response
 */
export function uploadFile(url, formData, onUploadProgress, config = {}) {
  return api.post(url, formData, {
    ...config,
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onUploadProgress(percentCompleted);
      }
    },
  });
}

/**
 * Update a file with progress tracking
 * @param {string} url - Update URL
 * @param {FormData} formData - Data to upload
 * @param {Function} onUploadProgress - Progress tracking callback (progress: number) => void
 * @param {Object} config - Additional configuration
 * @returns {Promise} - Promise with the response
 */
export function updateFile(url, formData, onUploadProgress, config = {}) {
  return api.patch(url, formData, {
    ...config,
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onUploadProgress(percentCompleted);
      }
    },
  });
}

export { api };
export default api;
