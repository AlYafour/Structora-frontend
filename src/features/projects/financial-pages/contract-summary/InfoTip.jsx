// src/pages/wizard/components/InfoTip.jsx
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Lightweight info icon that opens an elegant popover on hover.
 * props:
 * - text: tooltip content
 * - align: "start" | "center" | "end"
 * - wide: expand tooltip width
 * - title: optional title
 * - inline: if true, renders as a small transparent icon suitable for embedding in headings
 */
export default function InfoTip({ text, align = "center", wide = false, title, inline = true }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const isRTL = typeof document !== "undefined" && document?.dir === "rtl";

  return (
    <span
      ref={ref}
      className="infotip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        aria-label={t("info_tooltip")}
        title={t("info_tooltip")}
        className={`infotip__trigger ${inline ? "" : "infotip__trigger--md"}`}
      >
        <svg
          className="infotip__icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 8V7M12 17V12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </span>

      {open && (
        <div
          role="tooltip"
          className={`infotip__tooltip infotip__tooltip--${align}`}
        >
          <div className="infotip__arrow" />
          {title ? (
            <div className="infotip__title">{title}</div>
          ) : null}
          <div className="infotip__text">{text}</div>
        </div>
      )}
    </span>
  );
}
