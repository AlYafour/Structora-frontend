import {
  Document, Page, Text, View, Image, StyleSheet, Font,
} from '@react-pdf/renderer';
import { registerPDFFonts } from '../../../../components/pdf/registerFonts';

registerPDFFonts();

// Register Calibri for the extension letter only (does not affect other PDFs)
const ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';
let calibriRegistered = false;
function registerCalibri() {
  if (calibriRegistered) return;
  calibriRegistered = true;
  Font.register({
    family: 'Calibri',
    fonts: [
      { src: `${ORIGIN}/fonts/Calibri-Regular.ttf`, fontWeight: 400 },
      { src: `${ORIGIN}/fonts/Calibri-Bold.ttf`,    fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
}
registerCalibri();

const ORANGE    = '#E07B20';
const DARK      = '#1a1a1a';
const TEXT_GRAY = '#555';

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
    fontFamily: 'Calibri', fontSize: 10.5, color: DARK,
    backgroundColor: '#fff',
    paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0,
  },

  /* Full-page letterhead image (background) */
  lhBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },

  /* Content area inside the letterhead — padding keeps content away from header/footer */
  lhContent: {
    paddingTop: 138,
    paddingBottom: 0,
    paddingLeft: 56,
    paddingRight: 44,
  },
  /* Signature pinned to bottom of the physical page */
  sigFixed: {
    position: 'absolute',
    bottom: 74,   /* sits just above the letterhead footer graphic */
    left: 56,
    right: 44,
  },


  /* Letter fields */
  metaBlock:     { marginBottom: 10 },
  metaLine:      { fontSize: 10, marginBottom: 2 },
  bold:          { fontFamily: 'Calibri', fontWeight: 700 },
  recipientBlock:{ marginBottom: 10 },
  recipientName: { fontFamily: 'Calibri', fontWeight: 700, fontSize: 10 },
  recipientSub:  { fontSize: 10 },
  projectBlock:  { marginBottom: 10 },
  projectLine:   { fontSize: 10, marginBottom: 2 },
  subjectRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  subjectLbl:    { fontFamily: 'Calibri', fontWeight: 700, fontSize: 10, marginRight: 4 },
  subjectVal: {
    fontFamily: 'Calibri', fontWeight: 700, fontSize: 10,
    textDecoration: 'underline', flex: 1, flexWrap: 'wrap',
  },
  greeting:      { fontFamily: 'Calibri', fontWeight: 700, fontSize: 10, marginBottom: 6 },
  para: {
    fontSize: 10, lineHeight: 1.5, textAlign: 'justify',
    marginBottom: 6, flexWrap: 'wrap',
  },
  noteBox: {
    borderLeft: '2.5pt solid #E07B20', paddingLeft: 8, marginBottom: 6,
  },
  thankYou: {
    fontFamily: 'Calibri', fontWeight: 700, fontSize: 10,
    marginTop: 6, marginBottom: 6,
  },

  /* Signature table */
  sigTable:     { border: '1pt solid #bbb', backgroundColor: '#fff' },
  sigRow:       { flexDirection: 'row' },
  sigCell:      { flex: 1, borderRight: '1pt solid #bbb', padding: 6 },
  sigLast:      { flex: 1, padding: 6 },
  sigCellSm:    { flex: 1, borderRight: '1pt solid #bbb', paddingHorizontal: 6, paddingVertical: 0.5 },
  sigLastSm:    { flex: 1, paddingHorizontal: 6, paddingVertical: 0.5 },
  sigBorderTop: { borderTop: '1pt solid #bbb' },
  sigStampH:    { height: 55 },
  sigLbl:       { fontFamily: 'Calibri', fontWeight: 700, fontSize: 8.5, textAlign: 'center', color: DARK },
  sigName:      { fontSize: 8.5, textAlign: 'center', color: TEXT_GRAY, flexWrap: 'wrap', marginTop: 2 },
  sigDate:      { fontSize: 8.5, color: TEXT_GRAY },


});

/* ──────────────────────────────────────────────── */
/*  Shared letter content (works in both modes)   */
/* ──────────────────────────────────────────────── */
function LetterContent({ d, letterDateFmt, durationText, hasDuration, hasPeriod, subjectText }) {
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
    </>
  );
}

/* Signature block */
function SignatureBlock({ d, sigDateFmt }) {
  return (
    <View style={S.sigTable}>
        <View style={S.sigRow}>
          <View style={[S.sigCell, S.sigStampH]} />
          <View style={[S.sigCell, S.sigStampH]} />
          <View style={[S.sigLast, S.sigStampH]} />
        </View>
        <View style={[S.sigRow, S.sigBorderTop]}>
          <View style={S.sigCellSm}><Text style={S.sigLbl}>Main Contractor</Text></View>
          <View style={S.sigCellSm}><Text style={S.sigLbl}>Consultant Engineer</Text></View>
          <View style={S.sigLastSm}><Text style={S.sigLbl}>Client</Text></View>
        </View>
        <View style={[S.sigRow, S.sigBorderTop]}>
          <View style={S.sigCellSm}><Text style={S.sigName}>{safe(d.company_name_en || d.company_name)}</Text></View>
          <View style={S.sigCellSm}><Text style={S.sigName}>{safe(d.consultant_name)}</Text></View>
          <View style={S.sigLastSm}><Text style={S.sigName}>{safe(d.owner_name)}</Text></View>
        </View>
        <View style={[S.sigRow, S.sigBorderTop]}>
          <View style={S.sigCellSm}><Text style={S.sigDate}>Date : {sigDateFmt}</Text></View>
          <View style={S.sigCellSm}><Text style={S.sigDate}>Date :</Text></View>
          <View style={S.sigLastSm}><Text style={S.sigDate}>Date :</Text></View>
        </View>
    </View>
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

  /* Build attachment groups before render */
  const imgAtts = (d.attachments || []).filter(a => a.is_image && a.url);
  const attGroups = [];
  let _ai = 0;
  while (_ai < imgAtts.length) {
    const curr = imgAtts[_ai];
    const next = imgAtts[_ai + 1];
    if (curr.isPortrait && next && next.isPortrait) {
      attGroups.push({ layout: 'side-by-side', images: [curr, next] });
      _ai += 2;
    } else {
      const canStack = next && !next.isPortrait;
      attGroups.push({ layout: 'stacked', images: canStack ? [curr, next] : [curr] });
      _ai += canStack ? 2 : 1;
    }
  }

  const renderAttGroup = (group) => {
    if (group.layout === 'side-by-side') {
      return (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {group.images.map((att, ai) => (
            <View key={ai} style={{ flex: 1 }}>
              <Image src={att.url} style={{ width: '100%', maxHeight: 480, objectFit: 'contain' }} />
            </View>
          ))}
        </View>
      );
    }
    return (
      <View>
        {group.images.map((att, ai) => (
          <View key={ai} style={{ marginBottom: ai < group.images.length - 1 ? 10 : 0 }}>
            <Image src={att.url} style={{ width: '100%', maxHeight: 340, objectFit: 'contain' }} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <Document>
      {/*
        ══ ALL CONTENT IN ONE <Page> — this eliminates the empty-page-2 problem ══

        Previously: letter content on <Page 1>, attachments on separate <Page 2/3>.
        If letter content overflowed page 1, react-pdf created page 2 for the overflow
        (often with just the signature table), leaving a mostly-empty page, and
        attachments ended up on page 3.

        Now: everything is in ONE <Page> element. react-pdf flows content naturally
        across as many pages as needed. Each attachment group uses `break` (page-break-before)
        to start on its own page. The letterhead background is `fixed` so it appears on
        every page automatically. No empty intermediate pages possible.
      */}
      {/* ── Main letter page ── */}
      <Page size="A4" style={S.page}>
        {hasLetterhead ? (
          <>
            <Image style={S.lhBg} src={d.letterhead_url} fixed />
            {/* Body — paddingBottom:200 stops body text before the signature zone */}
            <View style={S.lhContent}>
              <LetterContent {...lc} />
            </View>
            {/* Signature always at bottom of page, above the footer graphic */}
            <View style={S.sigFixed}>
              <SignatureBlock d={d} sigDateFmt={sigDateFmt} />
            </View>
          </>
        ) : (
          /* No letterhead: body + signature in normal flow */
          <View style={{ paddingTop: 50, paddingBottom: 50, paddingLeft: 56, paddingRight: 56 }}>
            <LetterContent {...lc} />
            <SignatureBlock d={d} sigDateFmt={sigDateFmt} />
          </View>
        )}
      </Page>

      {/* ── Attachment pages — each is a fresh Page so paddingTop is re-applied correctly ── */}
      {attGroups.map((group, pi) => (
        <Page key={pi} size="A4" style={S.page}>
          {hasLetterhead ? (
            <>
              <Image style={S.lhBg} src={d.letterhead_url} fixed />
              <View style={S.lhContent}>
                {renderAttGroup(group)}
              </View>
            </>
          ) : (
            <View style={{ paddingTop: 50, paddingBottom: 50, paddingLeft: 56, paddingRight: 56 }}>
              {renderAttGroup(group)}
            </View>
          )}
        </Page>
      ))}

    </Document>
  );
}
