import { useTranslation } from "react-i18next";

const SpinnerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    style={{ animation: "spin 1s linear infinite" }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

/**
 * Reusable "Download All PDFs" button used across financial tabs.
 * Renders nothing when count is 0.
 */
export default function DownloadAllButton({ onClick, loading, count, className }) {
  const { t } = useTranslation();
  if (!count) return null;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`financial-tab-action-btn financial-tab-action-btn--zip${loading ? " financial-tab-action-btn--loading" : ""}${className ? ` ${className}` : ""}`}
    >
      {loading ? <SpinnerIcon /> : <DownloadIcon />}
      {loading
        ? t("generating_zip", "Generating…")
        : t("download_all_pdfs", "Download All PDFs")}
    </button>
  );
}
