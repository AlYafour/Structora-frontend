import { useState } from "react";
import "./CopyIconButton.css";

export default function CopyIconButton({ value, title = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <button
      type="button"
      className={`copy-icon-btn ${copied ? "is-copied" : ""}`}
      onClick={handleCopy}
      title={copied ? "Copied!" : title}
      aria-label={copied ? "Copied" : title}
    >
      {copied ? (
        /* Check icon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        /* Copy icon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}