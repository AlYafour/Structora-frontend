export const DEFAULT_INDEX_DISCREPANCY_NOTE_EN =
  'In case of any discrepancy between the main Variation Order page and the attachments, the approved amount, scope, exclusions, and conditions stated in the main Variation Order shall prevail, unless expressly agreed otherwise in writing by the authorized signatories.';

export const DEFAULT_INDEX_DISCREPANCY_NOTE_AR =
  'في حال وجود أي تعارض بين صفحة أمر التغيير الرئيسية والمرفقات، فإن المبلغ المعتمد والنطاق والاستثناءات والشروط المذكورة في أمر التغيير الرئيسي هي التي تسود، ما لم يتم الاتفاق صراحةً على خلاف ذلك كتابةً من قبل المفوضين بالتوقيع.';

export const getIndexDiscrepancyNote = (noticeData = {}) => ({
  en: noticeData.index_discrepancy_note ?? DEFAULT_INDEX_DISCREPANCY_NOTE_EN,
  ar: noticeData.index_discrepancy_note_ar ?? DEFAULT_INDEX_DISCREPANCY_NOTE_AR,
});
