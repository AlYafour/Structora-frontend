import {
  Document, Page, Text, View, Image, StyleSheet,
} from '@react-pdf/renderer';
import { registerPDFFonts } from '../../../components/pdf/registerFonts';

registerPDFFonts();

const DARK = '#111827';
const MUTED = '#4b5563';
const BORDER = '#6b7280';

// ─── Fixed header: cover + parties + project details (auto-filled from form) ──
const HEADER_PARAGRAPHS = [
  'بناء سكني',
  'إنشاء و إنجاز و صيانة',
  'عقـد مقاولة بالمقطوعية -',
  'مخصص لبرنامج مشاريع قروض الإسكان',
  'للمشروع رقم ({{PROJECT_REFERENCE}})',
  'إنه في يوم الموافق {{CONTRACT_DATE}} م حرر هذا العقد بين كل من-:',
  '.1 السيـد {{OWNER_NAME}}',
  'من مواطـني دولـة الإمـارات العـربية المتحـدة بصفـته مالـكا للعـقار و مدين راهن وعـنوانه/ أبوظبي',
  'هاتف {{OWNER_PHONE}} - البريد الإلكتروني/ {{OWNER_EMAIL}} - رقم الهوية/ {{OWNER_ID}}',
  '( الطرف الأول )',
  '( و )',
  '.2 المقاول/ {{CONTRACTOR_NAME}}',
  'رخصة تجارية رقم / {{CONTRACTOR_LICENSE}} - البريد الإلكتروني/ {{CONTRACTOR_EMAIL}} - هاتف/ {{CONTRACTOR_PHONE}}',
  'و يمثله في التوقيع على هذه الإتـفاقية السـيد/ {{CONTRACTOR_SIGNATORY}} المدير المفوض',
  '( الطرف الثاني )',
  'و يشار إليهما بطرفي العقد',
  'تفاصيل المشروع :',
  '.1 مكونات المشروع الكلية/ {{PROJECT_DESCRIPTION}}',
  '.2 موقع المشروع : {{PROJECT_LOCATION}}',
  '.3 قيمة المشروع و تفاصيل التمويل :',
  '.i قيمة أعمال المشروع إجمالي مقطوع. {{TOTAL_PROJECT_VALUE}} درهم غير شاملة الضريبة',
  '.ii قيمة الأعمال للقرض الحكومي هي مبلغ إجمالي مقطوع و قدره/ {{TOTAL_BANK_VALUE}} درهم غير شامل اتعاب الاستشاري وغير شامل الضريبة',
  '.iii قيمة التمويل الإضافي الممولة من قبل الطرف الأول {{TOTAL_OWNER_VALUE}} (غير شاملة اتعاب الاستشاري وغير شامل الضريبة)',
  '.4 مدة المشروع: ({{PROJECT_DURATION_MONTHS}}) شهرا',
  '.5 تاريخ مباشرة أعمال المشروع : حسب امر المباشرة الصادر من الاستشاري والمعتمد من الطرف الثاني',
  '.6 غرامة التأخير : تساوي %10 من قيمة المقاولة (الدرهم) على %25 من فترة التنفيذ (يوم).',
  '.7 أتعاب الإستشاري المستحقة بموجب هذا العقد و تسدد من قبل الطرف الأول خصما من قيمة العقد الإجمالية هي',
  'أ ـ إستشاري التصميم {{CONSULTANT_NAME}} - رسوم التصميم ({{DESIGN_FEE_PERCENT}})',
  'ب ـ إستشاري الإشراف {{CONSULTANT_NAME}} : بنسبة {{SUPERVISION_FEE_PERCENT}} رسوم الإشراف',
  'ج- أتعاب الإستشاري تحتسب طبقا للقاعدة التالية: نسبة تكلفة الإستشاري% على (100% + نسبة تكلفة الإستشاري%) × قيمة العقد الإجمالية',
];

// ─── Preamble: standard 2 paragraphs, same for all contracts ──────────────────
const PREAMBLE_PARAGRAPHS = [
  'تمهيد-:',
  '.1 إتفق طرفا هذه الإتفاقية على العمل بها و بموجب شروطها و بنودها و يعتبر أي إتفاق آخر قد يكون تم توقيعه بين الطرفين و يتعارض معها غير ساري من تاريخ التوقيع عليها.',
  '.2 نظرا لرغبـة الطرف الأول في إقامة المشـروع على قطعة الأرض المذكورة و المملوكة له و بما أن الطرف الأول قد وافق على ترسية المشروع على الطرف الثاني، لذا فقد تلاقت رغبة الطـرفين و إرادتهما على إتمام التعاقد، و هما مالكي التصرف لذلك، وفقا للشروط المتفق عليها في البنود التالية :',
];

// ─── Signature block: standard for all contracts ──────────────────────────────
const SIGNATURE_PARAGRAPHS = [
  'البند (28) تحرير العقد',
  'حرر هذا العقد من أربعة (4) نسخ موقعة من الطرفين بعد إرفاق هوية الطرف الاول الحاملة لتوقيعه و كذلك صورة إعتماد التوقيع للطرف الثاني و هويته، و قد تسلم كل من الطرف الاول و الطرف الثاني نسخة للعمل بها.',
  '(الطرف الأول) - الـمالك',
  '(الطرف الثاني) - مـمثل المـقاول',
  'الإسم : ........................................',
  'الإسم : ........................................',
  'هوية رقم : ........................................',
  'هوية رقم : ........................................',
  'التوقيع : ........................................',
  'التوقيع : ........................................',
  'التاريخ : ........................................',
  'التاريخ : ........................................',
  'الختم : ........................................',
  'بحضور المعتمد توقيعه عن مكتب الإستشاري',
  'الإستشاري : ........................................',
  'الإسم : ........................................',
  'التوقيع : ........................................',
  'التاريخ : ........................................',
  'الختم : ........................................',
  'مرفقات-:',
  '-1 صورة عن هوية المالك الحاملة لتوقيعه، و في حال كان القرض مخصصا لأكثر من فرد يتم توقيع الملاك جميعا إلا إذا كان سبق إرفاق توكيلاتهم.',
  '-2 صورة عن هوية الطرف الثاني الموقع بالعقد.',
];

function safe(value, fallback = '-') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function fmtDate(value) {
  if (!value) return '-';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
}

function fmtMoney(value) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return safe(value);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function firstOwner(data) {
  const owners = Array.isArray(data.owners) ? data.owners : [];
  return owners.find((owner) => owner.is_authorized) || owners[0] || {};
}

function getOwnerName(data) {
  const owner = firstOwner(data);
  return safe(owner.owner_name_ar || owner.owner_name_en, '');
}

function getOwnerPhone(data) {
  const owner = firstOwner(data);
  return safe(owner.phone, '');
}

function getOwnerEmail(data) {
  const owner = firstOwner(data);
  return safe(owner.email, '');
}

function getOwnerId(data) {
  const owner = firstOwner(data);
  return safe(owner.id_number, '');
}

function getSignerName(data) {
  if (data.signer_type === 'authorized_person') {
    const person = data.authorized_person || {};
    return safe(person.name_ar || person.name || person.name_en, '');
  }
  return getOwnerName(data);
}

function getProjectLocation(data) {
  const sp = data.siteplan_data || data.license_snapshot?.siteplan || {};
  return safe(
    data.project_location ||
      sp.plot_address ||
      [sp.municipality, sp.zone, sp.sector, sp.land_no].filter(Boolean).join(' '),
    '',
  );
}

function getConsultantName(data) {
  const comm = data.official_communication || {};
  const consultant = comm.consultant || {};
  const consultantData = data.consultant_data || {};
  return safe(
    consultantData.name_ar || consultantData.name_en ||
      consultant.company_name || consultant.company_name_en ||
      consultant.name || consultant.name_en,
    '',
  );
}

function fmtPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  return `${number.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function getConsultantFeePercent(data, feeType) {
  const ownerValue = data[`owner_fee_${feeType}_percent`];
  const bankValue = data[`bank_fee_${feeType}_percent`];
  const ownerEnabled = data.owner_includes_consultant || Number(ownerValue) > 0;
  const bankEnabled = data.bank_includes_consultant || Number(bankValue) > 0;

  if (ownerEnabled && bankEnabled && Number(ownerValue) !== Number(bankValue)) {
    return `المالك ${fmtPercent(ownerValue)} / البنك ${fmtPercent(bankValue)}`;
  }
  if (ownerEnabled) return fmtPercent(ownerValue);
  if (bankEnabled) return fmtPercent(bankValue);
  return '0%';
}

function buildValues(data) {
  return {
    PROJECT_REFERENCE: safe(data.tender_no || data.project_number || data.id, ''),
    CONTRACT_DATE: fmtDate(data.contract_date),
    OWNER_NAME: getOwnerName(data),
    OWNER_PHONE: getOwnerPhone(data),
    OWNER_EMAIL: getOwnerEmail(data),
    OWNER_ID: getOwnerId(data),
    CONTRACTOR_NAME: safe(data.contractor_name || data.contractor_name_en, ''),
    CONTRACTOR_LICENSE: safe(data.contractor_trade_license, ''),
    CONTRACTOR_EMAIL: safe(data.contractor_email, ''),
    CONTRACTOR_PHONE: safe(data.contractor_phone, ''),
    CONTRACTOR_SIGNATORY: safe(data.contractor_signatory || data.contractor_representative || data.contractor_name || data.contractor_name_en, ''),
    PROJECT_DESCRIPTION: safe(data.project_description, ''),
    PROJECT_LOCATION: getProjectLocation(data),
    TOTAL_PROJECT_VALUE: fmtMoney(data.total_project_value),
    TOTAL_BANK_VALUE: fmtMoney(data.total_bank_value),
    TOTAL_OWNER_VALUE: fmtMoney(data.total_owner_value),
    PROJECT_DURATION_MONTHS: safe(data.project_duration_months, ''),
    CONSULTANT_NAME: getConsultantName(data),
    DESIGN_FEE_PERCENT: getConsultantFeePercent(data, 'design'),
    SUPERVISION_FEE_PERCENT: getConsultantFeePercent(data, 'supervision'),
    SIGNER_NAME: getSignerName(data),
  };
}

function applyValues(text, values) {
  return String(text).replace(/{{([A-Z0-9_]+)}}/g, (_match, key) => safe(values[key], ''));
}

function isHeading(text) {
  const clean = String(text).trim();
  if (!clean) return false;
  if (clean.endsWith('-:')) return true;
  return /^البند\s*[:(/]/.test(clean);
}

function isClause(text) {
  return /^\s*(?:\.?\d+(?:\.\d+)?|\.?[ivx]+|[أ-ي]\s*[-ـ])[\s.)]/i.test(String(text));
}

function splitClause(text) {
  const match = String(text).match(
    /^\s*\.?(\d+(?:\.\d+)?|[ivx]+|[أ-ي])\s*(?:[.)]|[-ـ])?\s*(.*)$/i,
  );
  if (!match) return null;
  return { number: `${match[1]}.`, text: match[2] };
}

function isSignatureLine(text) {
  return /^(?:\)?الطرف|الإسم|هوية رقم|التوقيع|التاريخ|الختم|بحضور المعتمد|الإستشاري\s*:|\.{8,})/.test(
    String(text).trim(),
  );
}

// Sanitize user-entered text: strip chars that crash textkit bidi reorderLine.
// Uses split/join to avoid regex-literal line-terminator restrictions.
function sanitize(text) {
  if (!text) return '';
  return String(text)
    // Convert Arabic Presentation Forms (FE70-FEFF) from pasted/PDF text
    // into standard Arabic code points before textkit shapes and reorders it.
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u00AD\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
    .replace(/[\u2028\u2029\r\n\t]/g, ' ')
    // Drop unpaired UTF-16 surrogates; they create missing glyph entries in textkit.
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanList(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

// ─── Dynamic block builder (replaces hardcoded template) ─────────────────────
function buildDynamicBlocks(data, values) {
  const blocks = [];

  // 1. Fixed header: cover titles + parties + project details
  HEADER_PARAGRAPHS.forEach((text, index) => {
    const resolved = applyValues(text, values);
    if (index < 4) blocks.push({ type: 'coverTitle', text: resolved });
    else if (isHeading(text)) blocks.push({ type: 'heading', text: resolved });
    else if (isClause(text)) blocks.push({ type: 'clause', text: resolved });
    else blocks.push({ type: 'paragraph', text: resolved });
  });

  // 2. General clauses (بنود عامة) — user-entered
  const generalClauses = cleanList(data.general_clauses);
  if (generalClauses.length > 0) {
    blocks.push({ type: 'heading', text: 'بنود عامة-:' });
    generalClauses.forEach((clause, i) => {
      const txt = sanitize(clause.text);
      if (txt) blocks.push({ type: 'clause', text: `${i + 1}. ${txt}` });
    });
  }

  // 3. Preamble (تمهيد) — fixed 2 paragraphs
  PREAMBLE_PARAGRAPHS.forEach((text) => {
    if (isHeading(text)) blocks.push({ type: 'heading', text });
    else if (isClause(text)) blocks.push({ type: 'clause', text });
    else blocks.push({ type: 'paragraph', text });
  });

  // 4. Definitions (تعريفات) — user-entered
  const definitions = cleanList(data.definitions);
  if (definitions.length > 0) {
    blocks.push({ type: 'heading', text: 'تعريفات-:' });
    definitions.forEach((def) => {
      const term = sanitize(def.term);
      const desc = sanitize(def.definition);
      if (term || desc) {
        blocks.push({ type: 'definitionRow', term, description: desc });
      }
    });
  }

  // 5. Table of Contents — auto-generated from contract_sections titles
  const sections = cleanList(data.contract_sections);
  if (sections.length > 0) {
    blocks.push({ type: 'contentsTitle', text: 'المحتـويـات' });
    const tocCells = ['الصفحة', 'الموضوع', 'رقم البند'];
    sections.forEach((sec, i) => {
      tocCells.push('-');                                              // page placeholder
      tocCells.push(sanitize(sec.title) || `البند ${i + 1}`);        // subject
      tocCells.push(String(i + 1));                                   // number
    });
    blocks.push({ type: 'contentsTable', cells: tocCells });
  }

  // 6. Numbered sections (البنود) — user-entered
  sections.forEach((section, i) => {
    const title = sanitize(section.title);
    blocks.push({ type: 'heading', text: `البند : ${i + 1} / ${title}` });
    const subClauses = cleanList(section.sub_clauses);
    subClauses.forEach((sub, j) => {
      const txt = sanitize(sub.text);
      if (txt) blocks.push({ type: 'clause', text: `${j + 1}. ${txt}` });
    });
  });

  // 7. Signature block — fixed
  SIGNATURE_PARAGRAPHS.forEach((text) => {
    if (isHeading(text)) blocks.push({ type: 'heading', text });
    else if (isSignatureLine(text)) blocks.push({ type: 'signatureLine', text });
    else if (isClause(text)) blocks.push({ type: 'clause', text });
    else blocks.push({ type: 'paragraph', text });
  });

  return blocks;
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Cairo',
    fontSize: 9.2,
    color: DARK,
    backgroundColor: '#ffffff',
  },
  pageWithLh: {
    paddingTop: 144,
    paddingBottom: 108,
    paddingLeft: 76,
    paddingRight: 76,
    direction: 'rtl',
    textAlign: 'right',
  },
  pageNoLh: {
    paddingTop: 58,
    paddingBottom: 82,
    paddingLeft: 68,
    paddingRight: 34,
    direction: 'rtl',
    textAlign: 'right',
  },
  lhBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 595.28,
    height: 841.89,
  },
  paragraph: {
    fontSize: 9.2,
    lineHeight: 1.58,
    marginBottom: 1.8,
  },
  clause: {
    fontSize: 9.2,
    lineHeight: 1.58,
    marginBottom: 2.2,
  },
  clauseRow: {
    position: 'relative',
    paddingRight: 24,
    marginBottom: 2.2,
  },
  clauseNumber: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    fontSize: 9.2,
    lineHeight: 1.58,
    textAlign: 'right',
  },
  clauseText: {
    fontSize: 9.2,
    lineHeight: 1.58,
    textAlign: 'right',
  },
  heading: {
    fontSize: 10.2,
    fontWeight: 700,
    lineHeight: 1.45,
    marginTop: 7,
    marginBottom: 4,
    textDecoration: 'underline',
  },
  coverTitle: {
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.7,
    marginBottom: 5,
  },
  contentsTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 6,
    marginBottom: 8,
  },
  table: {
    borderTopWidth: 0.6,
    borderLeftWidth: 0.6,
    borderColor: BORDER,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 0.6,
    borderColor: BORDER,
    minHeight: 20,
  },
  tableCell: {
    borderRightWidth: 0.6,
    borderColor: BORDER,
    paddingVertical: 3,
    paddingHorizontal: 5,
    fontSize: 8.7,
    lineHeight: 1.45,
  },
  definitionTerm: {
    width: '25%',
    fontWeight: 700,
  },
  definitionDescription: {
    width: '75%',
  },
  contentsNumber: { width: '15%', textAlign: 'center' },
  contentsSubject: { width: '65%' },
  contentsPage: { width: '20%', textAlign: 'center' },
  signatureLine: {
    fontSize: 9,
    lineHeight: 1.55,
    marginBottom: 1,
    fontWeight: 700,
  },
  footer: {
    position: 'absolute',
    left: 34,
    right: 34,
    bottom: 27,
    color: DARK,
  },
  footerParties: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    borderTopWidth: 0.6,
    borderColor: BORDER,
    paddingTop: 4,
    fontSize: 8.5,
    fontWeight: 700,
  },
  footerMeta: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 7.5,
    color: MUTED,
  },
});

function ContentsTable({ cells, values }) {
  const resolved = cells.map((cell) => sanitize(applyValues(cell, values)));
  const rows = [];
  for (let index = 0; index < resolved.length; index += 3) {
    rows.push(resolved.slice(index, index + 3));
  }
  return (
    <View style={S.table}>
      {rows.map((row, index) => (
        <View key={`${index}-${row.join('')}`} style={S.tableRow}>
          <Text style={[S.tableCell, S.contentsNumber]}>{row[2] || '-'}</Text>
          <Text style={[S.tableCell, S.contentsSubject]}>{row[1] || '-'}</Text>
          <Text style={[S.tableCell, S.contentsPage]}>{row[0] || '-'}</Text>
        </View>
      ))}
    </View>
  );
}

function ContractBlock({ block, values }) {
  if (block.type === 'definitionRow') {
    const term = sanitize(applyValues(block.term, values));
    const desc = sanitize(applyValues(block.description, values));
    if (!term && !desc) return null;
    return (
      <View style={S.tableRow}>
        <Text style={[S.tableCell, S.definitionTerm]}>{term || '-'}</Text>
        <Text style={[S.tableCell, S.definitionDescription]}>{desc || '-'}</Text>
      </View>
    );
  }
  if (block.type === 'contentsTable') {
    return <ContentsTable cells={block.cells} values={values} />;
  }
  const styles = {
    coverTitle: S.coverTitle,
    contentsTitle: S.contentsTitle,
    heading: S.heading,
    clause: S.clause,
    signatureLine: S.signatureLine,
    paragraph: S.paragraph,
  };
  const text = sanitize(applyValues(block.text, values));
  if (!text) return null;
  if (block.type === 'clause') {
    const clause = splitClause(text);
    if (clause) {
      return (
        <View style={S.clauseRow}>
          <Text style={S.clauseNumber}>{clause.number}</Text>
          <Text style={S.clauseText}>{clause.text}</Text>
        </View>
      );
    }
  }
  return <Text style={styles[block.type] || S.paragraph}>{text}</Text>;
}

function LhBackground({ lhUrl }) {
  return <Image style={S.lhBg} src={lhUrl} fixed />;
}

function ContractFooter() {
  return (
    <View style={S.footer} fixed>
      <View style={S.footerParties}>
        <Text>الطرف الأول</Text>
        <Text>الإستشاري (شاهد)</Text>
        <Text>الطرف الثاني</Text>
      </View>
      <Text
        style={S.footerMeta}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function ContractPage({ hasLh, lhUrl, children }) {
  return (
    <Page size="A4" style={[S.page, hasLh ? S.pageWithLh : S.pageNoLh]}>
      {hasLh && <LhBackground lhUrl={lhUrl} />}
      {children}
      {!hasLh && <ContractFooter />}
    </Page>
  );
}

export default function ContractPdfDocument({ data }) {
  const d = data || {};
  const hasLh = !!d.letterhead_url;
  const values = buildValues(d);
  const blocks = buildDynamicBlocks(d, values);

  return (
    <Document>
      <ContractPage hasLh={hasLh} lhUrl={d.letterhead_url}>
        {blocks.map((block, index) => (
          <View
            key={`${index}-${block.type}`}
            style={block.type === 'definitionRow' ? S.table : undefined}
          >
            <ContractBlock block={block} values={values} />
          </View>
        ))}
      </ContractPage>
    </Document>
  );
}




