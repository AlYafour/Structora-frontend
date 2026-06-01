import {
  Document, Page, Text, View, Image, StyleSheet,
} from '@react-pdf/renderer';
import { registerPDFFonts } from '../../../../components/pdf/registerFonts';

registerPDFFonts();

const ORANGE    = '#E07B20';
const GRAY_SIDE = '#aaa';
const DARK      = '#1a1a1a';
const TEXT_GRAY = '#555';
const FOOTER_BG = '#3a3a3a';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function fmtDate(str) {
  if (!str) return '';
  const p = str.split('-');
  if (p.length === 3) {
    const mi = parseInt(p[1], 10);
    if (mi >= 1 && mi <= 12)
      return `${MONTHS[mi - 1]} ${p[2].padStart(2, '0')}, ${p[0]}`;
  }
  return str;
}
function ddmmyyyy(str) {
  if (!str) return '';
  const p = str.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : str;
}
const safe = (v) => (v !== null && v !== undefined) ? String(v) : '';

/* ──────────────────────────────────────────────── */
/*  Styles                                         */
/* ──────────────────────────────────────────────── */
const S = StyleSheet.create({
  page: {
    fontFamily: 'Cairo', fontSize: 10, color: DARK,
    backgroundColor: '#fff',
    paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0,
  },

  /* Full-page letterhead image (background) */
  lhBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },

  /* Content positioned inside the uploaded letterhead PNG.
     These values push content below the header frame and above the footer frame.
     Fine-tune if your specific PNG has different header/footer heights. */
  lhContent: {
    paddingTop: 138,    /* ~16% of 842pt — clears the letterhead header + orange divider */
    paddingBottom: 78,  /* ~9% of 842pt  — clears the letterhead footer bar */
    paddingLeft: 56,    /* clears the left orange bar of the letterhead */
    paddingRight: 44,
    flex: 1,
  },

  /* ── Coded header (fallback) ── */
  header: { flexDirection: 'row', height: 100, backgroundColor: '#fff' },
  leftStrip:  { width: 50, flexDirection: 'row' },
  leftOrange: { width: 36, backgroundColor: ORANGE },
  leftGray:   { width: 14, backgroundColor: GRAY_SIDE },
  centerBlock: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  nameAr: {
    fontFamily: 'Cairo', fontWeight: 700, fontSize: 17,
    color: ORANGE, marginBottom: 5, textAlign: 'center',
  },
  nameEn: {
    fontFamily: 'Cairo', fontWeight: 700, fontSize: 13,
    color: TEXT_GRAY, textAlign: 'center', letterSpacing: 0.8,
  },
  rightBlock: { width: 100, position: 'relative' },
  rightGray:   { position: 'absolute', top: 0, left: 0,  width: 14, bottom: 0, backgroundColor: GRAY_SIDE },
  rightOrange: { position: 'absolute', top: 0, left: 14, right: 0,  bottom: 0, backgroundColor: ORANGE },
  logoWrap: {
    position: 'absolute', top: 6, left: 10, right: 4, bottom: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  logoImg: { width: 78, height: 84, objectFit: 'contain' },

  divider: { height: 3, backgroundColor: ORANGE },

  /* Watermark */
  watermark: {
    position: 'absolute', top: 160, left: 90, right: 90, bottom: 100, opacity: 0.06,
  },
  watermarkImg: { width: '100%', height: '100%', objectFit: 'contain' },

  /* Body row (coded mode) */
  bodyRow: { flexDirection: 'row', flex: 1 },
  leftBar:  { width: 8, backgroundColor: ORANGE },
  content: {
    flex: 1, paddingLeft: 42, paddingRight: 42,
    paddingTop: 18, paddingBottom: 14,
  },

  /* Letter fields */
  metaBlock:     { marginBottom: 16 },
  metaLine:      { fontSize: 10, marginBottom: 3 },
  bold:          { fontFamily: 'Cairo', fontWeight: 700 },
  recipientBlock:{ marginBottom: 16 },
  recipientName: { fontFamily: 'Cairo', fontWeight: 700, fontSize: 10 },
  recipientSub:  { fontSize: 10 },
  projectBlock:  { marginBottom: 16 },
  projectLine:   { fontSize: 10, marginBottom: 3 },
  subjectRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  subjectLbl:    { fontFamily: 'Cairo', fontWeight: 700, fontSize: 10, marginRight: 4 },
  subjectVal: {
    fontFamily: 'Cairo', fontWeight: 700, fontSize: 10,
    textDecoration: 'underline', flex: 1, flexWrap: 'wrap',
  },
  greeting:      { fontFamily: 'Cairo', fontWeight: 700, fontSize: 10, marginBottom: 12 },
  para: {
    fontSize: 10, lineHeight: 1.7, textAlign: 'justify',
    marginBottom: 12, flexWrap: 'wrap',
  },
  noteBox: {
    borderLeft: '2.5pt solid #E07B20', paddingLeft: 8, marginBottom: 12,
  },
  thankYou: {
    fontFamily: 'Cairo', fontWeight: 700, fontSize: 10,
    marginTop: 14, marginBottom: 22,
  },

  /* Signature table */
  sigTable:     { border: '1pt solid #bbb' },
  sigRow:       { flexDirection: 'row' },
  sigCell:      { flex: 1, borderRight: '1pt solid #bbb', padding: 6 },
  sigLast:      { flex: 1, padding: 6 },
  sigBorderTop: { borderTop: '1pt solid #bbb' },
  sigStampH:    { height: 55 },
  sigLbl:       { fontFamily: 'Cairo', fontWeight: 700, fontSize: 8.5, textAlign: 'center', color: DARK },
  sigName:      { fontSize: 8.5, textAlign: 'center', color: TEXT_GRAY, flexWrap: 'wrap', marginTop: 2 },
  sigDate:      { fontSize: 8.5, color: TEXT_GRAY },

  /* Footer (coded mode) */
  footer:      { flexDirection: 'row', backgroundColor: FOOTER_BG, minHeight: 50 },
  footerLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  footerItem:  { color: '#ddd', fontSize: 8, marginRight: 20 },
  footerPageBox: { backgroundColor: ORANGE, width: 72, alignItems: 'center', justifyContent: 'center' },
  footerPageTxt: { color: '#fff', fontSize: 8.5, fontFamily: 'Cairo', fontWeight: 700 },

  /* Attachment */
  attachTitle: {
    fontFamily: 'Cairo', fontWeight: 700, fontSize: 11,
    borderBottom: '2pt solid #E07B20', paddingBottom: 5, marginBottom: 14,
  },
  attachImg: { width: '100%', objectFit: 'contain' },
});

/* ──────────────────────────────────────────────── */
/*  Sub-views (letterhead mode only)               */
/* ──────────────────────────────────────────────── */
function CodedHeader({ d }) {
  return (
    <View style={S.header} fixed>
      <View style={S.leftStrip}>
        <View style={S.leftOrange} />
        <View style={S.leftGray} />
      </View>
      <View style={S.centerBlock}>
        {d.company_name
          ? <Text style={S.nameAr}>{safe(d.company_name)}</Text> : null}
        {d.company_name_en
          ? <Text style={S.nameEn}>{safe(d.company_name_en).toUpperCase()}</Text> : null}
      </View>
      <View style={S.rightBlock}>
        <View style={S.rightGray} />
        <View style={S.rightOrange} />
        {d.logo_url
          ? <View style={S.logoWrap}><Image style={S.logoImg} src={d.logo_url} /></View>
          : null}
      </View>
    </View>
  );
}

function CodedFooter({ d }) {
  return (
    <View style={S.footer} fixed>
      <View style={S.footerLeft}>
        {d.company_phone  ? <Text style={S.footerItem}>{safe(d.company_phone)}</Text>  : null}
        {d.company_email  ? <Text style={S.footerItem}>{safe(d.company_email)}</Text>  : null}
        {d.company_website? <Text style={S.footerItem}>{safe(d.company_website)}</Text>: null}
      </View>
      <View style={S.footerPageBox}>
        <Text style={S.footerPageTxt}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────── */
/*  Shared letter content (works in both modes)   */
/* ──────────────────────────────────────────────── */
function LetterContent({ d, letterDateFmt, sigDateFmt, durationText, hasDuration, hasPeriod, subjectText }) {
  return (
    <>
      {/* Date + Reference */}
      <View style={S.metaBlock}>
        {letterDateFmt
          ? <Text style={S.metaLine}><Text style={S.bold}>Date: </Text>{letterDateFmt}</Text>
          : null}
        {d.approval_number
          ? <Text style={S.metaLine}><Text style={S.bold}>Reference No.: </Text>{safe(d.approval_number)}</Text>
          : null}
      </View>

      {/* Recipient */}
      {d.consultant_name ? (
        <View style={S.recipientBlock}>
          <Text style={S.recipientName}>M/s {safe(d.consultant_name)}</Text>
          {d.consultant_phone   ? <Text style={S.recipientSub}>Tel: {safe(d.consultant_phone)}</Text> : null}
          {d.consultant_address ? <Text style={S.recipientSub}>{safe(d.consultant_address)}</Text> : null}
        </View>
      ) : null}

      {/* Project */}
      <View style={S.projectBlock}>
        {d.project_name
          ? <Text style={S.projectLine}><Text style={S.bold}>Project: </Text>{safe(d.project_name)}</Text>
          : null}
        {d.project_location
          ? <Text style={S.projectLine}><Text style={S.bold}>Location: </Text>{safe(d.project_location)}</Text>
          : null}
      </View>

      {/* Subject */}
      <View style={S.subjectRow}>
        <Text style={S.subjectLbl}>Subject:  </Text>
        <Text style={S.subjectVal}>{subjectText}</Text>
      </View>

      {/* Greeting */}
      <Text style={S.greeting}>
        Greeting from {safe(d.company_name_en || d.company_name)};
      </Text>

      {/* Paragraph 1 */}
      <Text style={S.para}>
        {'    We would like to request'}
        {hasPeriod ? (
          <Text>
            {' time extension from '}
            <Text style={S.bold}>{safe(d.period_from)}</Text>
            {' to '}
            <Text style={S.bold}>{safe(d.period_to)}</Text>
          </Text>
        ) : hasDuration ? (
          <Text>{' an Extension of time of '}<Text style={S.bold}>{durationText}</Text></Text>
        ) : (
          <Text>{' an Extension of Time'}</Text>
        )}
        {d.reason ? <Text>{' for the '}{safe(d.reason)}</Text> : null}
        {'.'}
        {hasDuration ? (
          <Text>
            {' Total of '}
            <Text style={S.bold}>{durationText}</Text>
            {' time extension to be added in the current extended total project duration which will result in a revised project completion date.'}
          </Text>
        ) : (
          <Text>{' This time extension will be added to the current total project duration which will result in a revised project completion date.'}</Text>
        )}
      </Text>

      {/* Optional note — plain paragraph, same style as body content */}
      {d.note ? (
        <Text style={S.para}>{'    '}{safe(d.note)}</Text>
      ) : null}

      {/* Paragraph 2 */}
      <Text style={S.para}>
        {'    We hereby request that you honestly evaluate and accept the extension of time request. We remain, grateful for your complete cooperation. Please take this information into your consideration and your rapid action shall be greatly appreciated.'}
      </Text>

      {/* Thank you */}
      <Text style={S.thankYou}>Thank you.</Text>

      {/* Signatures */}
      <View style={S.sigTable}>
        <View style={S.sigRow}>
          <View style={[S.sigCell, S.sigStampH]} />
          <View style={[S.sigCell, S.sigStampH]} />
          <View style={[S.sigLast, S.sigStampH]} />
        </View>
        <View style={[S.sigRow, S.sigBorderTop]}>
          <View style={S.sigCell}><Text style={S.sigLbl}>Main Contractor</Text></View>
          <View style={S.sigCell}><Text style={S.sigLbl}>Consultant Engineer</Text></View>
          <View style={S.sigLast}><Text style={S.sigLbl}>Client</Text></View>
        </View>
        <View style={[S.sigRow, S.sigBorderTop]}>
          <View style={S.sigCell}><Text style={S.sigName}>{safe(d.company_name_en || d.company_name)}</Text></View>
          <View style={S.sigCell}><Text style={S.sigName}>{safe(d.consultant_name)}</Text></View>
          <View style={S.sigLast}><Text style={S.sigName}>{safe(d.owner_name)}</Text></View>
        </View>
        <View style={[S.sigRow, S.sigBorderTop]}>
          <View style={S.sigCell}><Text style={S.sigDate}>Date : {sigDateFmt}</Text></View>
          <View style={S.sigCell}><Text style={S.sigDate}>Date :</Text></View>
          <View style={S.sigLast}><Text style={S.sigDate}>Date :</Text></View>
        </View>
      </View>
    </>
  );
}

/* ──────────────────────────────────────────────── */
/*  Main document export                           */
/* ──────────────────────────────────────────────── */
export default function ExtensionLetterDocument({ data }) {
  const d = data || {};

  const days   = Number(d.days   || 0);
  const months = Number(d.months || 0);
  const dParts = [];
  if (months) dParts.push(`${months} Month${months !== 1 ? 's' : ''}`);
  if (days)   dParts.push(`${days} Day${days !== 1 ? 's' : ''}`);
  const durationText = dParts.join(' and ');
  const hasDuration  = durationText.length > 0;
  const hasPeriod    = !!(d.period_from && d.period_to);
  const subjectText  = d.reason
    ? `EXTENSION OF TIME DUE TO ${safe(d.reason).toUpperCase()}`
    : 'EXTENSION OF TIME';
  const letterDateFmt = fmtDate(d.extension_date);
  const sigDateFmt    = ddmmyyyy(d.extension_date);

  /* Common props for LetterContent */
  const lc = { d, letterDateFmt, sigDateFmt, durationText, hasDuration, hasPeriod, subjectText };

  /* If the company has uploaded a Word/PNG letterhead template, use it as the page background.
     The content area padding (lhContent) is tuned to match the template's margins.
     If no letterhead is uploaded, fall back to the coded header/footer design. */
  const hasLetterhead = !!d.letterhead_url;

  return (
    <Document>

      {/* ══════════ MAIN PAGE ══════════ */}
      <Page size="A4" style={S.page}>

        {hasLetterhead ? (
          /* ── LETTERHEAD MODE: Word template as full-page background ── */
          <>
            {/* Background: the full A4 letterhead PNG */}
            <Image style={S.lhBg} src={d.letterhead_url} fixed />

            {/* Content floats on top, padded to sit inside the template's content area */}
            <View style={S.lhContent}>
              <LetterContent {...lc} />
            </View>
          </>
        ) : (
          /* ── NO LETTERHEAD: plain white page, no design ── */
          <View style={{ paddingHorizontal: 56, paddingTop: 50, paddingBottom: 50, flex: 1 }}>
            <LetterContent {...lc} />
          </View>
        )}
      </Page>

      {/* ══════════ ATTACHMENT PAGE ══════════ */}
      {d.attachment_url && d.attachment_is_image ? (
        <Page size="A4" style={S.page}>
          {hasLetterhead ? (
            <>
              <Image style={S.lhBg} src={d.letterhead_url} fixed />
              <View style={S.lhContent}>
                <Image style={S.attachImg} src={d.attachment_url} />
              </View>
            </>
          ) : (
            <View style={{ paddingHorizontal: 56, paddingTop: 50, paddingBottom: 50, flex: 1 }}>
              <Text style={S.attachTitle}>
                Attachment – {safe(d.attachment_name || 'Document')}
              </Text>
              <Image style={S.attachImg} src={d.attachment_url} />
            </View>
          )}
        </Page>
      ) : null}

    </Document>
  );
}
