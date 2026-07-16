export const ATTACHMENT_SECTIONS = [
  'BOQ PAGE',
  'QUOTATION',
  'SHOP DRAWING',
  'SAMPLE APPROVAL',
  'REFERENCE PLAN',
  'CALCULATION',
  'EXTENSION OF TIME',
  'ARCHITECTURAL DRAWING',
  'STRUCTURAL DRAWING',
];

// Arabic display labels, keyed by the canonical English section (the stored
// value) — same convention as VARIATION_CAUSE_OPTIONS_AR/BOQ_OPTIONS_AR.
export const ATTACHMENT_SECTIONS_AR = {
  'BOQ PAGE': 'صفحة جدول الكميات',
  'QUOTATION': 'عرض سعر',
  'SHOP DRAWING': 'مخطط تنفيذي (ورشة)',
  'SAMPLE APPROVAL': 'اعتماد عينة',
  'REFERENCE PLAN': 'مخطط مرجعي',
  'CALCULATION': 'حسابات',
  'EXTENSION OF TIME': 'تمديد الوقت',
  'ARCHITECTURAL DRAWING': 'مخطط معماري',
  'STRUCTURAL DRAWING': 'مخطط إنشائي',
};

// Catch-all display bucket for attachments saved before this feature existed
// (blank section) or with a section value that no longer matches the fixed
// list above — never a value stored on an attachment itself.
export const OTHER_ATTACHMENT_SECTION = 'Other';
