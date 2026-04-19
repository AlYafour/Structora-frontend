// Format server errors for license step
export function formatLicenseServerErrors(errors) {
  if (!errors || typeof errors !== "object") return null;

  const messages = [];

  // Handle field-specific errors
  const fieldMap = {
    license_no: "رقم الرخصة",
    license_date: "تاريخ الرخصة",
    contractor_name: "اسم المقاول",
    consultant_name: "اسم الاستشاري",
    owner_name_ar: "اسم المالك (عربي)",
    owner_name_en: "اسم المالك (إنجليزي)",
    owner_nationality: "جنسية المالك",
    owner_emirates_id: "رقم الهوية الإماراتية",
    owner_phone: "رقم الهاتف",
    owner_email: "البريد الإلكتروني",
  };

  for (const [key, label] of Object.entries(fieldMap)) {
    if (errors[key]) {
      const err = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
      messages.push(`${label}: ${err}`);
    }
  }

  // Handle non-field errors
  if (errors.detail) {
    messages.push(Array.isArray(errors.detail) ? errors.detail[0] : errors.detail);
  }
  if (errors.non_field_errors) {
    messages.push(...(Array.isArray(errors.non_field_errors) ? errors.non_field_errors : [errors.non_field_errors]));
  }

  return messages.length > 0 ? messages.join("\n") : null;
}

