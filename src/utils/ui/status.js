/**
 * Status Display Utilities
 * Consolidated from: projectStatus.js, approvalStatus.js
 *
 * @module ui/status
 */

// ===== Project Status =====

export const PROJECT_STATUS_CONFIG = {
  // New statuses based on payments
  not_started: {
    label: {
      ar: "لم يبدأ بعد",
      en: "Not Yet Started",
    },
    color: "#6b7280", // gray
    bgColor: "#f3f4f6",
  },
  execution_started: {
    label: {
      ar: "بدأ التنفيذ",
      en: "Execution Started",
    },
    color: "#10b981", // green
    bgColor: "#d1fae5",
  },
  under_execution: {
    label: {
      ar: "قيد التنفيذ",
      en: "Under Execution",
    },
    color: "#eab308", // yellow
    bgColor: "#fef9c3",
  },
  temporarily_suspended: {
    label: {
      ar: "متوقف مؤقتا",
      en: "Temporarily Suspended",
    },
    color: "#ef4444", // red
    bgColor: "#fee2e2",
  },
  handover_stage: {
    label: {
      ar: "في مرحلة التسليم",
      en: "In Handover Stage",
    },
    color: "#a855f7", // purple
    bgColor: "#f3e8ff",
  },
  pending_financial_closure: {
    label: {
      ar: "قيد الإغلاق المالي",
      en: "Pending Financial Closure",
    },
    color: "#92400e", // brown
    bgColor: "#fef3c7",
  },
  completed: {
    label: {
      ar: "تم الانتهاء من التنفيذ",
      en: "Completed",
    },
    color: "#059669", // darker green
    bgColor: "#d1fae5",
  },
  // Legacy statuses (for compatibility)
  draft: {
    label: {
      ar: "مسودة",
      en: "Draft",
    },
    color: "#6b7280", // gray
    bgColor: "#f3f4f6",
  },
  in_progress: {
    label: {
      ar: "قيد التنفيذ",
      en: "In Progress",
    },
    color: "#3D5A80", // prussian blue
    bgColor: "#D1DEE9",
  },
};

/**
 * Get project status configuration
 * @param {string} status - Status key
 * @returns {Object} Status configuration
 */
export function getProjectStatusConfig(status) {
  return PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.draft;
}

/**
 * Get project status label
 * @param {string} status - Status key
 * @param {string} [language="ar"] - Language ("ar" or "en")
 * @returns {string} Status label
 */
export function getProjectStatusLabel(status, language = "ar") {
  const config = getProjectStatusConfig(status);
  return config.label[language] || config.label.ar;
}

/**
 * Get project status color
 * @param {string} status - Status key
 * @returns {string} Color hex code
 */
export function getProjectStatusColor(status) {
  const config = getProjectStatusConfig(status);
  return config.color;
}

/**
 * Get project status background color
 * @param {string} status - Status key
 * @returns {string} Background color hex code
 */
export function getProjectStatusBgColor(status) {
  const config = getProjectStatusConfig(status);
  return config.bgColor;
}

// ===== Approval Status =====

export const APPROVAL_STATUS_CONFIG = {
  draft: {
    label: {
      ar: "مسودة",
      en: "Draft",
    },
    color: "#6b7280", // gray
    bgColor: "#f3f4f6",
    badge: "مسودة",
  },
  pending: {
    label: {
      ar: "في انتظار الموافقة",
      en: "Pending Approval",
    },
    color: "#f59e0b", // amber
    bgColor: "#fef3c7",
    badge: "⏳ في انتظار الموافقة",
  },
  approved: {
    label: {
      ar: "معتمدة (تحتاج اعتماد نهائي)",
      en: "Approved",
    },
    color: "#3D5A80", // prussian blue
    bgColor: "#dbeafe",
    badge: "✅ معتمدة",
  },
  rejected: {
    label: {
      ar: "مرفوضة",
      en: "Rejected",
    },
    color: "#ef4444", // red
    bgColor: "#fee2e2",
    badge: "❌ مرفوضة",
  },
  rejected_by_general_manager: {
    label: {
      ar: "تم الرفض من قبل المشرف",
      en: "Rejected by Supervisor",
    },
    color: "#ef4444",
    bgColor: "#fee2e2",
    badge: "❌ مرفوض من المشرف",
  },
  rejected_by_supervisor: {
    label: {
      ar: "تم الرفض من قبل المشرف",
      en: "Rejected by Supervisor",
    },
    color: "#ef4444",
    bgColor: "#fee2e2",
    badge: "❌ مرفوض من المشرف",
  },
  rejected_by_gm_initial: {
    label: {
      ar: "مرفوض من المدير العام (مبدئي)",
      en: "Rejected by General Manager (Initial)",
    },
    color: "#ef4444",
    bgColor: "#fee2e2",
    badge: "❌ مرفوض من المدير العام",
  },
  rejected_by_project_manager: {
    label: {
      ar: "تم الرفض من قبل مدير المشروع",
      en: "Rejected by Project Manager",
    },
    color: "#ef4444", // red
    bgColor: "#fee2e2",
    badge: "❌ مرفوض من مدير المشروع",
  },
  pending_project_manager: {
    label: {
      ar: "في انتظار موافقة مدير المشروع",
      en: "Pending Project Manager Approval",
    },
    color: "#f59e0b", // amber
    bgColor: "#fef3c7",
    badge: "⏳ في انتظار مدير المشروع",
  },
  pending_general_manager_initial: {
    label: {
      ar: "في انتظار موافقة المشرف",
      en: "Pending Supervisor Approval",
    },
    color: "#f59e0b",
    bgColor: "#fef3c7",
    badge: "⏳ في انتظار المشرف",
  },
  pending_gm_initial: {
    label: {
      ar: "في انتظار الاعتماد المبدئي من المدير العام",
      en: "Pending GM Initial Approval",
    },
    color: "#f59e0b",
    bgColor: "#fef3c7",
    badge: "⏳ في انتظار المدير العام",
  },
  pending_supervisor: {
    label: {
      ar: "في انتظار موافقة المشرف",
      en: "Pending Supervisor Approval",
    },
    color: "#f59e0b",
    bgColor: "#fef3c7",
    badge: "⏳ في انتظار المشرف",
  },
  pending_owner_consultant: {
    label: {
      ar: "في انتظار موافقة المالك والاستشاري",
      en: "Pending Owner & Consultant Approval",
    },
    color: "#f59e0b", // amber
    bgColor: "#fef3c7",
    badge: "⏳ في انتظار المالك والاستشاري",
  },
  pending_general_manager_final: {
    label: {
      ar: "في انتظار الاعتماد النهائي من المدير العام",
      en: "Pending General Manager Final Approval",
    },
    color: "#3D5A80", // prussian blue
    bgColor: "#dbeafe",
    badge: "⏳ في انتظار الاعتماد النهائي",
  },
  final_approved: {
    label: {
      ar: "معتمدة نهائياً",
      en: "Final Approved",
    },
    color: "#10b981", // green
    bgColor: "#d1fae5",
    badge: "✅ معتمدة نهائياً",
  },
  delete_requested: {
    label: {
      ar: "طلب حذف",
      en: "Delete Requested",
    },
    color: "#ef4444",
    bgColor: "#fee2e2",
    badge: "🗑️ طلب حذف",
  },
  delete_approved: {
    label: {
      ar: "تم الموافقة على الحذف",
      en: "Delete Approved",
    },
    color: "#ef4444",
    bgColor: "#fee2e2",
    badge: "🗑️ حذف معتمد",
  },
};

/**
 * Get approval status configuration
 * @param {string} status - Status key
 * @returns {Object} Status configuration
 */
export function getApprovalStatusConfig(status) {
  return APPROVAL_STATUS_CONFIG[status] || APPROVAL_STATUS_CONFIG.draft;
}

/**
 * Get approval status label
 * @param {string} status - Status key
 * @param {string} [language="ar"] - Language ("ar" or "en")
 * @returns {string} Status label
 */
export function getApprovalStatusLabel(status, language = "ar") {
  const config = getApprovalStatusConfig(status);
  return config.label[language] || config.label.ar;
}

/**
 * Get approval status color
 * @param {string} status - Status key
 * @returns {string} Color hex code
 */
export function getApprovalStatusColor(status) {
  const config = getApprovalStatusConfig(status);
  return config.color;
}

/**
 * Get approval status badge text
 * @param {string} status - Status key
 * @returns {string} Badge text
 */
export function getApprovalStatusBadge(status) {
  const config = getApprovalStatusConfig(status);
  return config.badge;
}
