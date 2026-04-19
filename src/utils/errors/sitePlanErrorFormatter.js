// Format server errors for site plan step
export function formatSitePlanServerErrors(errors) {
  if (!errors || typeof errors !== "object") return null;

  const messages = [];

  // Handle field-specific errors
  const fieldMap = {
    municipality: "البلدية",
    zone: "المنطقة",
    land_no: "رقم الأرض",
    area_sqm: "المساحة (متر مربع)",
    area_sqft: "المساحة (قدم مربع)",
    owner_name_ar: "اسم المالك (عربي)",
    owner_name_en: "اسم المالك (إنجليزي)",
    owner_nationality: "جنسية المالك",
    owner_emirates_id: "رقم الهوية الإماراتية",
    owner_phone: "رقم الهاتف",
    owner_email: "البريد الإلكتروني",
    owner_birth_date: "تاريخ الميلاد",
  };

  for (const [key, label] of Object.entries(fieldMap)) {
    if (errors[key]) {
      const err = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
      messages.push(`${label}: ${err}`);
    }
  }

  // Handle owners array errors
  if (errors.owners && Array.isArray(errors.owners)) {
    errors.owners.forEach((ownerErr, idx) => {
      if (ownerErr && typeof ownerErr === "object") {
        for (const [key, value] of Object.entries(ownerErr)) {
          const label = fieldMap[key] || key;
          const err = Array.isArray(value) ? value[0] : value;
          messages.push(`المالك ${idx + 1} - ${label}: ${err}`);
        }
      }
    });
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

