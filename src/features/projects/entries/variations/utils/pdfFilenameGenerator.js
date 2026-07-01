/**
 * PDF Filename Generator Utility
 *
 * Generates standardized filenames for variation PDFs
 */

/**
 * Generates a PDF filename from variation and notice data
 * @param {Object} variation - Variation object
 * @param {Object} noticeData - Parsed notice data from variation description
 * @returns {string} Generated filename
 */
export const generatePDFFilename = (variation, noticeData) => {
  const varNo = `VAR${variation?.variation_number || variation?.id || ""}`;

  const description = (
    noticeData.variation_description ||
    noticeData.item_description ||
    "VARIATION"
  )
    .toUpperCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 50);

  return `${varNo} - ${description}.pdf`;
};

/**
 * Generates a document title for printing from variation and notice data
 * @param {Object} variation - Variation object
 * @param {Object} noticeData - Parsed notice data from variation description
 * @returns {string} Generated document title (without .pdf extension)
 */
export const generateDocumentTitle = (variation, noticeData) => {
  const varNo = `VAR${variation?.variation_number || variation?.id || ""}`;

  const description = (
    noticeData.variation_description ||
    noticeData.item_description ||
    "VARIATION"
  )
    .toUpperCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 50);

  return `${varNo} - ${description}`;
};
