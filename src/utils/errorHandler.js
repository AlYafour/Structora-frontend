// Unified error handling system
import i18n from "../config/i18n";
import { logger } from "./logger";

/**
 * Convert HTTP status code to a clear error message
 */
function getHttpErrorMessage(status, context = "") {
  const contextPrefix = context ? `[${context}] ` : "";
  
  const errorMessages = {
    400: `${contextPrefix}طلب غير صحيح - يرجى التحقق من البيانات المدخلة`,
    401: `${contextPrefix}غير مصرح - يرجى تسجيل الدخول`,
    403: `${contextPrefix}غير مسموح - ليس لديك صلاحية للوصول`,
    404: `${contextPrefix}غير موجود - لم يتم العثور على المورد المطلوب`,
    405: `${contextPrefix}طريقة غير مسموحة`,
    408: `${contextPrefix}انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى`,
    409: `${contextPrefix}تعارض - البيانات موجودة بالفعل`,
    413: `${contextPrefix}الملف كبير جداً - يرجى اختيار ملف أصغر`,
    422: `${contextPrefix}بيانات غير صحيحة - يرجى التحقق من الحقول`,
    429: `${contextPrefix}عدد الطلبات كبير جداً - يرجى الانتظار قليلاً`,
    500: `${contextPrefix}خطأ في الخادم - يرجى المحاولة لاحقاً`,
    502: `${contextPrefix}خطأ في الاتصال بالخادم`,
    503: `${contextPrefix}الخدمة غير متاحة - يرجى المحاولة لاحقاً`,
    504: `${contextPrefix}انتهت مهلة الاتصال بالخادم`,
  };

  return errorMessages[status] || `${contextPrefix}خطأ غير معروف (${status})`;
}

/**
 * Convert error type to a clear message
 */
function getErrorTypeMessage(error, context = "") {
  const contextPrefix = context ? `[${context}] ` : "";
  
  if (!error) return `${contextPrefix}حدث خطأ غير معروف`;

  // Network errors
  if (error.message?.includes("Network Error") || error.code === "NETWORK_ERROR") {
    return `${contextPrefix}خطأ في الاتصال بالشبكة - يرجى التحقق من اتصال الإنترنت`;
  }

  // Timeout errors
  if (error.message?.includes("timeout") || error.code === "ECONNABORTED") {
    return `${contextPrefix}انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى`;
  }

  // Not found errors
  if (error.response?.status === 404) {
    const resource = context || "المورد";
    return `${contextPrefix}${resource} غير موجود - يرجى التحقق من المعرف`;
  }

  // Server errors
  if (error.response?.status >= 500) {
    return `${contextPrefix}خطأ في الخادم - يرجى المحاولة لاحقاً أو الاتصال بالدعم الفني`;
  }

  // Validation errors
  if (error.response?.status === 422 || error.response?.status === 400) {
    return `${contextPrefix}بيانات غير صحيحة - يرجى التحقق من الحقول المميزة`;
  }

  // Default
  return error.message || `${contextPrefix}حدث خطأ غير متوقع`;
}

/**
 * Try to translate a string as an i18n key; returns original string if no translation exists.
 */
function tryTranslate(key) {
  if (!key || typeof key !== 'string') return key;
  try {
    const translated = i18n.t(key);
    return translated !== key ? translated : key;
  } catch {
    return key;
  }
}

/**
 * Format server errors with context information
 */
export function formatError(error, context = "") {
  if (!error) return "حدث خطأ غير معروف";

  // If the error is from the server (response exists)
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Base HTTP message
    const httpMessage = getHttpErrorMessage(status, context);
    
    // If there is error data from the server
    if (data) {
      // Try formatting field errors first
      const fieldErrors = formatFieldErrors(data, context);
      if (fieldErrors) {
        return `${httpMessage}\n\n${fieldErrors}`;
      }
      
      // Extract detail from debug object if it exists
      let detailMessage = null;
      if (data.debug && data.debug.data) {
        const debugData = data.debug.data;
        if (debugData.detail) {
          detailMessage = Array.isArray(debugData.detail) ? debugData.detail[0] : debugData.detail;
        } else if (debugData.message) {
          detailMessage = Array.isArray(debugData.message) ? debugData.message[0] : debugData.message;
        }
      }
      
      // General message from the server
      if (data.detail) {
        const detail = Array.isArray(data.detail) ? data.detail[0] : data.detail;
        const translated = tryTranslate(String(detail));
        // If a real translation was found, show only that (no generic HTTP prefix)
        if (translated !== String(detail)) return translated;
        return `${httpMessage}\n\n${detail}`;
      }
      
      if (detailMessage) {
        return `${httpMessage}\n\n${detailMessage}`;
      }
      
      if (data.message) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        return `${httpMessage}\n\n${message}`;
      }
      
      // In development mode, show additional info from debug
      if (data.debug && import.meta.env.DEV) {
        const debugInfo = data.debug;
        let debugText = '';
        if (debugInfo.message) {
          debugText += `\n\nتفاصيل الخطأ: ${debugInfo.message}`;
        }
        if (debugInfo.exception_type) {
          debugText += `\nنوع الخطأ: ${debugInfo.exception_type}`;
        }
        if (debugText) {
          return `${httpMessage}${debugText}`;
        }
      }
    }
    
    return httpMessage;
  }

  // Network errors or other errors
  return getErrorTypeMessage(error, context);
}

/**
 * Format field errors clearly
 */
function formatFieldErrors(data, context = "") {
  if (!data || typeof data !== "object") return null;

  const messages = [];
  const fieldLabels = getFieldLabels();

  // Extract errors from debug object if it exists
  let errorData = data;
  if (data.debug && data.debug.data) {
    // If there is a debug object, use its data
    errorData = data.debug.data;
  }

  // Process field errors
  for (const [key, value] of Object.entries(errorData)) {
    // Skip special fields
    if (key === "detail" || key === "non_field_errors" || key === "message" || key === "error" || key === "status_code" || key === "debug") continue;
    
    const label = fieldLabels[key] || key;
    
    // Process different value types
    let errorMsg = null;
    if (Array.isArray(value)) {
      errorMsg = value[0];
    } else if (typeof value === "object" && value !== null) {
      // If it's an object, try to extract the message
      if (value.message) {
        errorMsg = value.message;
      } else if (value.detail) {
        errorMsg = value.detail;
      } else {
        // Convert object to string
        errorMsg = JSON.stringify(value);
      }
    } else {
      errorMsg = value;
    }
    
    if (errorMsg && String(errorMsg).trim()) {
      messages.push(`• ${label}: ${errorMsg}`);
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
            messages.push(`• المالك ${idx + 1} - ${label}: ${errorMsg}`);
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
      const translated = tryTranslate(String(err));
      messages.push(`• ${translated}`);
    });
  }

  // If no errors found in errorData, try data directly
  if (messages.length === 0 && data !== errorData) {
    for (const [key, value] of Object.entries(data)) {
      if (key === "detail" || key === "non_field_errors" || key === "message" || key === "error" || key === "status_code" || key === "debug") continue;
      
      const label = fieldLabels[key] || key;
      const errorMsg = Array.isArray(value) ? value[0] : value;
      
      if (errorMsg && String(errorMsg).trim()) {
        messages.push(`• ${label}: ${errorMsg}`);
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
  } catch { /* i18n bundle access fallback */
    return {};
  }
}

/**
 * Comprehensive error handler with context information
 */
export function handleError(error, context = "") {
  logger.error(`[Error Handler] ${context}:`, error);
  
  // Format the message
  const message = formatError(error, context);
  
  // Return a structured error object
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

