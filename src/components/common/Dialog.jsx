import PropTypes from "prop-types";
import { useEffect, useRef } from "react";
import Button from "./Button";

import { useTranslation } from "react-i18next";

// Unified dialog component
export default function Dialog({
  title,
  desc,
  children,
  confirmLabel,
  cancelLabel,
  onClose,
  onConfirm,
  danger = false,
  busy = false,
  open = false,
  size = "medium", // small, medium, large
  style = {},
  className = "",
}) {
  const { t } = useTranslation();
  const defaultConfirmLabel = confirmLabel ?? t("confirm_default");
  const defaultCancelLabel = cancelLabel ?? t("cancel_default");
  const dialogRef = useRef(null);
  
  // Size classes
  const sizeClass = `dlg-${size}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const onBackdrop = (e) => {
    if (e.target === dialogRef.current && !busy) onClose?.();
  };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="dlg-backdrop"
      onMouseDown={onBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className={`dlg ${sizeClass} ${className}`} style={style}>
        {title && (
          <div className="dlg-hd">
            <span id="dlg-title" className="dlg-title">
              {title}
            </span>
          </div>
        )}
        <div id="dlg-desc" className="dlg-body">
          {children || desc}
        </div>
        {(onConfirm || onClose) && (
          <div className="dlg-ft">
            {onClose && (
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                {defaultCancelLabel}
              </Button>
            )}
            {onConfirm && (
              <Button
                variant={danger ? "danger" : "primary"}
                onClick={onConfirm}
                disabled={busy}
              >
                {defaultConfirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

Dialog.propTypes = {
  /** Dialog title */
  title: PropTypes.node,
  /** Dialog description (used if children not provided) */
  desc: PropTypes.node,
  /** Dialog content */
  children: PropTypes.node,
  /** Custom confirm button label */
  confirmLabel: PropTypes.string,
  /** Custom cancel button label */
  cancelLabel: PropTypes.string,
  /** Close handler function */
  onClose: PropTypes.func,
  /** Confirm handler function */
  onConfirm: PropTypes.func,
  /** Whether confirm button should be styled as danger */
  danger: PropTypes.bool,
  /** Whether dialog is in busy/loading state */
  busy: PropTypes.bool,
  /** Whether dialog is open */
  open: PropTypes.bool,
  /** Dialog size */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  /** Inline styles */
  style: PropTypes.object,
  /** Additional CSS classes */
  className: PropTypes.string,
};
