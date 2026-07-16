// "m²"/"m³" use the real Unicode superscript characters (U+00B2/U+00B3), not
// a plain "2"/"3" — this way the superscript renders correctly everywhere the
// stored value is shown as plain text (this table, the print document, the
// PDF attachment header), with no per-surface special-casing needed.
export const UNIT_OPTIONS = [
  'L.S',
  'm²',
  'm³',
  'L.M',
  'NOS',
  'PCS',
  'Per Day',
  'P.S',
  'Trailer',
];
