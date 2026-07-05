import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "./Button";

/**
 * ActionMenu — Unified three-dot dropdown for table row actions.
 *
 * Generic usage:
 *   <ActionMenu items={[
 *     { label: "View", to: "/items/1", type: "link" },
 *     { label: "Edit", to: "/items/1/edit", type: "link" },
 *     { label: "Delete", onClick: () => {}, type: "button", variant: "danger" },
 *   ]} />
 *
 * Legacy usage (ProjectsPage):
 *   <ActionMenu project={project} onDelete={fn} ... />
 */
export default function ActionMenu({ items, project, onApprove, onReject, onFinalApprove, onDelete, showApprove, showReject, showFinalApprove, showDelete = true, processingAction }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isRtl = document.documentElement.dir === "rtl";
    const dropdownWidth = 160;
    const dropdownHeight = dropdownRef.current?.offsetHeight || 200;

    let left = isRtl ? rect.left : rect.right - dropdownWidth;

    // Keep within viewport horizontally
    if (left < 8) left = 8;
    if (left + dropdownWidth > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8;

    // Prefer opening below the trigger; flip above it if there isn't room
    let top = rect.bottom + 4;
    if (top + dropdownHeight > window.innerHeight - 8) {
      top = rect.top - dropdownHeight - 4;
    }
    if (top < 8) top = 8;

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleScroll = () => setOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePosition]);

  // Build menu items — generic `items` prop takes priority, else legacy project props
  let menuItems = [];

  if (items) {
    menuItems = items;
  } else if (project) {
    menuItems.push({ label: t("view"), to: `/projects/${project?.id}`, type: "link" });
    menuItems.push({ label: t("edit"), to: `/projects/${project?.id}/wizard`, type: "link" });
    if (showApprove) {
      menuItems.push({ label: t("approve"), onClick: () => { setOpen(false); onApprove?.(); }, type: "button", variant: "success" });
    }
    if (showReject) {
      menuItems.push({ label: t("reject"), onClick: () => { setOpen(false); onReject?.(); }, type: "button", variant: "danger" });
    }
    if (showFinalApprove) {
      menuItems.push({ label: t("final_approve"), onClick: () => { setOpen(false); onFinalApprove?.(); }, type: "button", variant: "success" });
    }
    if (showDelete) {
      menuItems.push({ label: t("delete"), onClick: () => { setOpen(false); onDelete?.(); }, type: "button", variant: "danger" });
    }
  }

  if (menuItems.length === 0) return null;

  return (
    <div className="action-menu">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="action-menu__trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={processingAction}
        aria-label={t("actions")}
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </Button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="action-menu__dropdown"
          style={{ top: pos.top, left: pos.left }}
        >
          {menuItems.map((item, index) => {
            const itemKey = item.label || item.to || index;
            if (item.type === "link") {
              return (
                <Link
                  key={itemKey}
                  to={item.to}
                  className={`action-menu__item ${item.variant ? `action-menu__item--${item.variant}` : ""}`}
                  onClick={() => setOpen(false)}
                  target={item.target}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <Button
                key={itemKey}
                variant={item.variant === "danger" ? "danger" : item.variant === "success" ? "primary" : "ghost"}
                className={`action-menu__item`}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                disabled={item.disabled || processingAction}
              >
                {item.label}
              </Button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
