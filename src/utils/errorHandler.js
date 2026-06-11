// Unified error handling system
import i18n from "../config/i18n";
import { logger } from "./logger";

/**
 * Convert HTTP status code to a translated error message
 */
function getHttpErrorMessage(status) {
  const key = `errors.http_${status}`;
  const translated = i18n.t(key);
  const message = translated !== key
    ? translated
    : i18n.t("errors.http_unknown", { status });
  return message;
}

/**
 * Convert error type to a translated message
 */
function getErrorTypeMessage(error) {
  if (!error) return i18n.t("errors.unknown");

  // Network errors
  if (error.message?.includes("Network Error") || error.code === "NETWORK_ERROR") {
    return i18n.t("errors.network");
  }

  // Timeout errors
  if (error.message?.includes("timeout") || error.code === "ECONNABORTED") {
    return i18n.t("errors.timeout");
  }

  // Not found errors
  if (error.response?.status === 404) {
    return i18n.t("errors.http_404");
  }

  // Server errors
  if (error.response?.status >= 500) {
    return i18n.t("errors.server_support");
  }

  // Validation errors
  if (error.response?.status === 422 || error.response?.status === 400) {
    return i18n.t("errors.validation");
  }

  // Default
  return i18n.t("errors.unexpected");
}

const BACKEND_MESSAGE_KEYS = {
  "project_delete_not_allowed": "errors.project_delete_not_allowed",
  "project_edit_not_allowed": "errors.project_edit_not_allowed",
  "project_not_found": "errors.project_not_found",
  "project_create_failed": "errors.project_create_failed",
  "you do not have permission to delete projects.": "errors.project_delete_not_allowed",
  "you do not have permission to edit this project.": "errors.project_edit_not_allowed",
  "project not found or error loading data.": "errors.project_not_found",
  "failed to create project": "errors.project_create_failed",
  "rejection notes are required": "errors.rejection_notes_required",
  "this field is required.": "errors.field_required",
  "this field may not be blank.": "errors.field_blank",
  "this field may not be null.": "errors.field_null",
  "ensure this field has no more than 255 characters.": "errors.field_too_long",
  "a valid number is required.": "errors.invalid_number",
  "enter a valid email address.": "errors.invalid_email",
  "not found.": "errors.http_404",
  "permission denied.": "errors.http_403",
  "authentication credentials were not provided.": "errors.http_401",
};

function normalizeMessage(message) {
  return String(message || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function translateLiteralKey(key, options) {
  if (!key || typeof key !== "string") return null;

  try {
    const translated = i18n.t(key, options);
    if (translated !== key) return translated;

    const bundle = i18n.getResourceBundle(i18n.language, "translation") || {};
    const parts = key.split(".");
    let value = bundle;
    for (const part of parts) {
      value = value?.[part];
    }

    if (typeof value === "string") {
      return i18n.t(key, options);
    }

    if (typeof bundle[key] === "string") {
      return bundle[key];
    }
  } catch {
    // Ignore translation lookup errors and fall back.
  }

  return null;
}

function isTechnicalMessage(message) {
  const text = String(message || "");
  return (
    /axioserror|traceback|stack trace|operationalerror|databaseerror|integrityerror|typeerror|referenceerror|syntaxerror/i.test(text) ||
    /<html|<!doctype|<\/?[a-z][\s\S]*>/i.test(text) ||
    /^(?:\{|\[)/.test(text.trim())
  );
}

function translateBackendMessage(message) {
  if (!message) return null;

  const text = String(message).trim();
  const directTranslation = translateLiteralKey(text);
  if (directTranslation) return directTranslation;

  const mappedKey = BACKEND_MESSAGE_KEYS[normalizeMessage(text)];
  if (mappedKey) {
    return translateLiteralKey(mappedKey) || i18n.t(mappedKey);
  }

  return null;
}

function formatValidationMessage(message) {
  const translated = translateBackendMessage(message);
  if (translated) return translated;
  if (message && !isTechnicalMessage(message)) return String(message).trim();
  return i18n.t("errors.invalid_field_value");
}

function extractServerMessage(data) {
  if (!data || typeof data !== "object") return null;

  const source = data.debug?.data && typeof data.debug.data === "object"
    ? data.debug.data
    : data;

  const candidates = [
    source.code,
    source.error_code,
    source.detail,
    source.message,
    source.error,
    Array.isArray(source.non_field_errors) ? source.non_field_errors[0] : source.non_field_errors,
  ];

  for (const candidate of candidates) {
    const value = Array.isArray(candidate) ? candidate[0] : candidate;
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getGenericStatusMessage(status) {
  if (status >= 500) return i18n.t("errors.server_support");
  if (status === 400 || status === 422) return i18n.t("errors.validation");
  return getHttpErrorMessage(status);
}

/**
 * Format server errors with context information
 */
export function formatError(error) {
  if (!error) return i18n.t("errors.unknown");

  // If the error is from the server (response exists)
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status >= 500) {
      return i18n.t("errors.server_support");
    }

    // If there is error data from the server
    if (data) {
      // Try formatting field errors first
      const fieldErrors = formatFieldErrors(data);
      if (fieldErrors) {
        return fieldErrors;
      }

      const serverMessage = extractServerMessage(data);
      if (serverMessage && !isTechnicalMessage(serverMessage)) {
        const translated = translateBackendMessage(serverMessage);
        if (translated) {
          return translated;
        }

        if (status === 400 || status === 403 || status === 404 || status === 409 || status === 422) {
          return getGenericStatusMessage(status);
        }
      }
    }

    return getGenericStatusMessage(status);
  }

  // Network errors or other errors
  return getErrorTypeMessage(error);
}

/**
 * Format field errors clearly
 */
function formatFieldErrors(data) {
  if (!data || typeof data !== "object") return null;

  const messages = [];
  const fieldLabels = getFieldLabels();

  // Extract errors from debug object if it exists
  let errorData = data;
  if (data.debug && data.debug.data) {
    errorData = data.debug.data;
  }

  // Process field errors
  for (const [key, value] of Object.entries(errorData)) {
    // Skip special fields
    if (key === "detail" || key === "non_field_errors" || key === "message" || key === "error" || key === "status_code" || key === "debug") continue;

    const label = fieldLabels[key] || key;

    let errorMsg = null;
    if (Array.isArray(value)) {
      errorMsg = value[0];
    } else if (typeof value === "object" && value !== null) {
      if (value.message) {
        errorMsg = value.message;
      } else if (value.detail) {
        errorMsg = value.detail;
      } else {
        errorMsg = JSON.stringify(value);
      }
    } else {
      errorMsg = value;
    }

    if (errorMsg && String(errorMsg).trim()) {
      messages.push(`- ${label}: ${formatValidationMessage(errorMsg)}`);
    }
  }

  // Process array errors (e.g., owners)
  if (errorData.owners && Array.isArray(errorData.owners)) {
    errorData.owners.forEach((ownerErr, idx) => {
      if (ownerErr && typeof ownerErr === "object") {
        for (const [key, value] of Object.entries(ownerErr)) {
          const label = fieldLabels[key] || key;
          const errorMsg = Array.isArray(value) ? value[0] : value;
          if (errorMsg) {
            messages.push(`- ${i18n.t("errors.owner_field", { idx: idx + 1, field: label })}: ${formatValidationMessage(errorMsg)}`);
          }
        }
      }
    });
  }

  // Process general errors
  if (errorData.non_field_errors) {
    const generalErrors = Array.isArray(errorData.non_field_errors)
      ? errorData.non_field_errors
      : [errorData.non_field_errors];
    generalErrors.forEach(err => {
      messages.push(`- ${formatValidationMessage(err)}`);
    });
  }

  // If no errors found in errorData, try data directly
  if (messages.length === 0 && data !== errorData) {
    for (const [key, value] of Object.entries(data)) {
      if (key === "detail" || key === "non_field_errors" || key === "message" || key === "error" || key === "status_code" || key === "debug") continue;

      const label = fieldLabels[key] || key;
      const errorMsg = Array.isArray(value) ? value[0] : value;

      if (errorMsg && String(errorMsg).trim()) {
        messages.push(`- ${label}: ${formatValidationMessage(errorMsg)}`);
      }
    }
  }

  return messages.length > 0 ? messages.join("\n") : null;
}

/**
 * Get field labels from i18n resources
 */
function getFieldLabels() {
  try {
    return i18n.getResourceBundle(i18n.language, "translation")?.errors || {};
  } catch {
    return {};
  }
}

/**
 * Comprehensive error handler with context information
 */
export function handleError(error, context = "") {
  logger.error(`[Error Handler] ${context}:`, error);

  const message = formatError(error);

  return {
    message,
    originalError: error,
    context,
    status: error?.response?.status,
    data: error?.response?.data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simplified error handler for direct usage
 */
export function getErrorMessage(error, context = "") {
  const handled = handleError(error, context);
  return handled.message;
}
