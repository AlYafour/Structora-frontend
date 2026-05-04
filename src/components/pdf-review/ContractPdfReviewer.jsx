import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import * as pdfjsLib from "pdfjs-dist";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { buildFileUrl } from "../../utils/helpers/file";
import "./contract-pdf-reviewer.css";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/* ── Zoom controls toolbar (rendered inside TransformWrapper context) ── */
function ZoomControls({ onReset }) {
  const { zoomIn, zoomOut, resetTransform, instance } = useControls();
  const { t } = useTranslation();
  const [pct, setPct] = useState(100);

  // Listen for scale changes
  useEffect(() => {
    const update = () => {
      const scale = instance.transformState?.scale ?? 1;
      setPct(Math.round(scale * 100));
    };
    const unsub = instance.onChange?.(update);
    return () => unsub?.();
  }, [instance]);

  const handleReset = () => {
    resetTransform();
    setPct(100);
    onReset?.();
  };

  return (
    <div className="cpdf-zoom-bar">
      <button type="button" className="cpdf-zoom-btn" onClick={() => zoomOut()} title={t('zoom_out')}>−</button>
      <button type="button" className="cpdf-zoom-reset" onClick={handleReset} title={t('zoom_reset')}>
        {pct !== 100 ? `${pct}%` : t('zoom_fit')}
      </button>
      <button type="button" className="cpdf-zoom-btn" onClick={() => zoomIn()} title={t('zoom_in')}>+</button>
    </div>
  );
}

/**
 * ContractPdfReviewer — Opens a fullscreen modal overlay for page-by-page PDF review.
 * Uses react-zoom-pan-pinch for reliable cross-device zoom/pan/pinch.
 */
export default function ContractPdfReviewer({
  file,
  fileUrl,
  isSuperAdmin = false,
  onReviewComplete,
  reviewState,
  onReviewStateChange,
  signatures = [],
  label = "",
  reviewerName = "",
}) {
  const { t, i18n } = useTranslation();
  const canvasRef = useRef(null);
  const transformRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const showSignatures = true;

  const confirmedPages = reviewState?.confirmedPages || new Set();
  const allConfirmed = totalPages > 0 && confirmedPages.size === totalPages;

  // Load signature images with authentication
  const [sigBlobUrls, setSigBlobUrls] = useState({});
  useEffect(() => {
    if (!signatures.length) return;
    let cancelled = false;
    const urls = {};
    (async () => {
      for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i];
        if (!sig.url) continue;
        try {
          const apiUrl = buildFileUrl(sig.url);
          if (!apiUrl) continue;
          const fullUrl = apiUrl.startsWith("http") ? apiUrl : `${window.location.origin}${apiUrl}`;
          const parsedUrl = new URL(fullUrl);
          const fetchOpts = parsedUrl.origin === window.location.origin ? { credentials: "include" } : {};
          const res = await fetch(fullUrl, fetchOpts);
          if (!res.ok || cancelled) continue;
          const blob = await res.blob();
          if (cancelled) continue;
          urls[i] = URL.createObjectURL(blob);
        } catch { /* signature fetch skipped */ }
      }
      if (!cancelled) setSigBlobUrls(urls);
    })();
    return () => {
      cancelled = true;
      Object.values(urls).forEach(u => URL.revokeObjectURL(u));
    };
  }, [signatures]);

  // Load PDF when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    const loadPdf = async () => {
      try {
        let source;
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          source = { data: arrayBuffer };
        } else if (fileUrl) {
          const apiUrl = buildFileUrl(fileUrl);
          const fullUrl = apiUrl?.startsWith("http") ? apiUrl : `${window.location.origin}${apiUrl}`;
          const parsedPdfUrl = new URL(fullUrl);
          const pdfFetchOpts = parsedPdfUrl.origin === window.location.origin ? { credentials: "include" } : {};
          const response = await fetch(fullUrl, pdfFetchOpts);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          source = { data: arrayBuffer };
        } else {
          setPdfDoc(null); setTotalPages(0); return;
        }
        const doc = await pdfjsLib.getDocument(source).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        if (currentPage > doc.numPages) setCurrentPage(1);
        if (!reviewState?.totalPages) {
          onReviewStateChange?.({ confirmedPages: new Set(), totalPages: doc.numPages });
        }
      } catch (err) {
        if (!cancelled) { setError(t("contract_review.pdf_load_error")); }
      }
    };
    loadPdf();
    return () => { cancelled = true; };
  }, [isOpen, file, fileUrl]);

  // Render current page onto canvas
  useEffect(() => {
    if (!isOpen || !pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const containerWidth = (canvas.parentElement?.clientWidth || 860) - 40;
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / viewport.width, 2.5);
        const scaledViewport = page.getViewport({ scale });
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        // Reset zoom/pan when switching pages
        transformRef.current?.resetTransform();
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      } catch (err) {
        // page render failed silently — user sees blank canvas
      } finally {
        if (!cancelled) setRendering(false);
      }
    };
    renderPage();
    return () => { cancelled = true; };
  }, [isOpen, pdfDoc, currentPage]);

  // Notify parent about completion
  const onReviewCompleteRef = useRef(onReviewComplete);
  onReviewCompleteRef.current = onReviewComplete;
  const prevAllConfirmedRef = useRef(allConfirmed);
  useEffect(() => {
    if (prevAllConfirmedRef.current !== allConfirmed) {
      prevAllConfirmedRef.current = allConfirmed;
      onReviewCompleteRef.current?.(allConfirmed);
    }
  }, [allConfirmed]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const buildReviewMeta = useCallback((nextConfirmed) => {
    const isNowComplete = totalPages > 0 && nextConfirmed.size === totalPages;
    if (isNowComplete) return { reviewedBy: reviewerName || "", reviewedAt: new Date().toISOString() };
    return { reviewedBy: null, reviewedAt: null };
  }, [totalPages, reviewerName]);

  const togglePageConfirm = useCallback(() => {
    const next = new Set(confirmedPages);
    if (next.has(currentPage)) next.delete(currentPage); else next.add(currentPage);
    const meta = buildReviewMeta(next);
    onReviewStateChange?.({ confirmedPages: next, totalPages, ...meta });
  }, [confirmedPages, currentPage, totalPages, onReviewStateChange, buildReviewMeta]);

  const approveAll = useCallback(() => {
    const all = new Set();
    for (let i = 1; i <= totalPages; i++) all.add(i);
    const meta = buildReviewMeta(all);
    onReviewStateChange?.({ confirmedPages: all, totalPages, ...meta });
  }, [totalPages, onReviewStateChange, buildReviewMeta]);

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) setCurrentPage(pageNum);
  };

  const getVisiblePages = () => {
    if (totalPages <= 11) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    const start = Math.max(1, currentPage - 4);
    const end = Math.min(totalPages, currentPage + 4);
    if (start > 1) { pages.push(1); if (start > 2) pages.push("..."); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) { if (end < totalPages - 1) pages.push("..."); pages.push(totalPages); }
    return pages;
  };

  if (!file && !fileUrl) return null;

  const isCurrentConfirmed = confirmedPages.has(currentPage);
  const reviewedCount = confirmedPages.size;
  const displayLabel = label || t("contract_review.review_document");

  // ─── Trigger Button ───
  const triggerButton = (
    <div className="cpdf-trigger">
      <button
        type="button"
        className={`cpdf-trigger__btn ${allConfirmed ? "cpdf-trigger__btn--done" : ""}`}
        onClick={() => setIsOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cpdf-trigger__icon">
          {allConfirmed
            ? <><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></>
            : <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>
          }
        </svg>
        <div className="cpdf-trigger__info">
          <span className="cpdf-trigger__label">{displayLabel}</span>
          <span className="cpdf-trigger__status">
            {allConfirmed ? (
              <>
                {t("contract_review.all_pages_confirmed")}
                {reviewState?.reviewedBy && (
                  <span className="cpdf-trigger__reviewer">
                    {" · "}{t("contract_review.reviewed_by", { name: reviewState.reviewedBy })}
                    {reviewState.reviewedAt && (" — " + new Date(reviewState.reviewedAt).toLocaleString(
                      i18n.language === "ar" ? "ar-AE" : "en-US", { dateStyle: "short", timeStyle: "short" }
                    ))}
                  </span>
                )}
              </>
            ) : totalPages > 0
              ? t("contract_review.review_progress", { confirmed: reviewedCount, total: totalPages })
              : t("contract_review.click_to_review")
            }
          </span>
        </div>
        <span className={`cpdf-trigger__badge ${allConfirmed ? "cpdf-trigger__badge--done" : reviewedCount > 0 ? "cpdf-trigger__badge--partial" : ""}`}>
          {allConfirmed ? "✓" : totalPages > 0 ? `${reviewedCount}/${totalPages}` : "..."}
        </span>
      </button>
    </div>
  );

  // ─── Modal ───
  const modal = isOpen ? createPortal(
    <div
      className="cpdf-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
      onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
    >
      <div className="cpdf-modal">
        {/* Header */}
        <div className="cpdf-modal__header">
          <div className="cpdf-modal__title-area">
            <h3 className="cpdf-modal__title">{displayLabel}</h3>
            <div className="cpdf-modal__progress">
              <div className="cpdf-progress__bar">
                <div className="cpdf-progress__fill" style={{ width: `${totalPages > 0 ? (confirmedPages.size / totalPages) * 100 : 0}%` }} />
              </div>
              <span className="cpdf-progress__text">
                {totalPages > 0
                  ? t("contract_review.review_progress", { confirmed: confirmedPages.size, total: totalPages })
                  : t("contract_review.loading")
                }
              </span>
            </div>
          </div>
          <div className="cpdf-modal__actions">
            {isSuperAdmin && !allConfirmed && (
              <button type="button" className="cpdf-approve-all-btn" onClick={approveAll}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cpdf-approve-all-btn__icon">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
                {t("contract_review.approve_all_pages")}
              </button>
            )}
            <button type="button" className="cpdf-modal__close" onClick={() => setIsOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="cpdf-modal__body">
          {/* Signatures panel */}
          {showSignatures && signatures.length > 0 && (
            <div className="cpdf-sig-panel">
              <h4 className="cpdf-sig-panel__title">{t("contract_review.signatures_reference")}</h4>
              <div className="cpdf-sig-panel__list">
                {signatures.map((sig, i) => (
                  <div key={i} className="cpdf-sig-panel__item">
                    <div className="cpdf-sig-panel__img-wrap">
                      {(sigBlobUrls[i] || sig.url)
                        ? <img src={sigBlobUrls[i] || sig.url} alt={sig.label} crossOrigin="anonymous" className="cpdf-sig-panel__img" />
                        : <span className="cpdf-sig-panel__no-img">{t("no_signature")}</span>
                      }
                    </div>
                    <span className="cpdf-sig-panel__label">{sig.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="cpdf-modal__main">
            {/* Page nav */}
            <div className="cpdf-nav">
              <button type="button" className="cpdf-nav__btn" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>‹</button>
              <div className="cpdf-nav__pages">
                {getVisiblePages().map((pageNum, i) =>
                  pageNum === "..." ? (
                    <span key={`dots-${i}`} className="cpdf-nav__dots">…</span>
                  ) : (
                    <button
                      key={pageNum}
                      type="button"
                      className={`cpdf-nav__page ${pageNum === currentPage ? "cpdf-nav__page--active" : ""} ${confirmedPages.has(pageNum) ? "cpdf-nav__page--confirmed" : ""}`}
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                      {confirmedPages.has(pageNum) && <span className="cpdf-nav__check">✓</span>}
                    </button>
                  )
                )}
              </div>
              <button type="button" className="cpdf-nav__btn" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>›</button>
              <div className="cpdf-nav__jump">
                <input
                  type="number" min={1} max={totalPages} value={currentPage}
                  onChange={(e) => { const v = parseInt(e.target.value, 10); if (v >= 1 && v <= totalPages) goToPage(v); }}
                  className="cpdf-nav__jump-input"
                />
                <span className="cpdf-nav__jump-label">/ {totalPages}</span>
              </div>
            </div>

            {/* PDF Canvas with zoom/pan */}
            {error ? (
              <div className="cpdf-error">
                <span className="cpdf-error__icon">⚠</span>
                {error}
              </div>
            ) : !pdfDoc ? (
              <div className="cpdf-loading">{t("contract_review.loading")}</div>
            ) : (
              <TransformWrapper
                ref={transformRef}
                initialScale={1}
                minScale={0.3}
                maxScale={5}
                wheel={{ step: 0.1 }}
                pinch={{ step: 5 }}
                doubleClick={{ disabled: false, step: 0.7 }}
                limitToBounds={false}
                centerOnInit={true}
              >
                {() => (
                  <>
                    <ZoomControls onReset={() => transformRef.current?.resetTransform()} />
                    <div className="cpdf-canvas-wrapper">
                      {rendering && <div className="cpdf-canvas-loading" />}
                      <TransformComponent
                        wrapperStyle={{ width: "100%", height: "100%", overflow: "hidden" }}
                        contentStyle={{ display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "20px" }}
                      >
                        <canvas ref={canvasRef} className="cpdf-canvas" />
                      </TransformComponent>
                    </div>
                  </>
                )}
              </TransformWrapper>
            )}

            {/* Confirm checkbox */}
            {pdfDoc && (!isSuperAdmin || !allConfirmed) && (
              <div className={`cpdf-confirm ${isCurrentConfirmed ? "cpdf-confirm--done" : ""}`}>
                <label className="cpdf-confirm__label">
                  <input type="checkbox" checked={isCurrentConfirmed} onChange={togglePageConfirm} className="cpdf-confirm__checkbox" />
                  <span className="cpdf-confirm__text">
                    {t("contract_review.confirm_stamps_page", { page: currentPage })}
                  </span>
                </label>
                {isCurrentConfirmed && currentPage < totalPages && (
                  <button type="button" className="cpdf-confirm__next" onClick={() => {
                    for (let i = currentPage + 1; i <= totalPages; i++) {
                      if (!confirmedPages.has(i)) { goToPage(i); return; }
                    }
                    goToPage(currentPage + 1);
                  }}>
                    {t("contract_review.next_page")} →
                  </button>
                )}
              </div>
            )}

            {/* All confirmed */}
            {allConfirmed && (
              <div className="cpdf-all-confirmed">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cpdf-all-confirmed__icon">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
                <div className="cpdf-all-confirmed__info">
                  <span>{t("contract_review.all_pages_confirmed")}</span>
                  {reviewState?.reviewedBy && (
                    <span className="cpdf-all-confirmed__reviewer">
                      {t("contract_review.reviewed_by", { name: reviewState.reviewedBy })}
                      {reviewState.reviewedAt && (" — " + new Date(reviewState.reviewedAt).toLocaleString(
                        i18n.language === "ar" ? "ar-AE" : "en-US", { dateStyle: "medium", timeStyle: "short" }
                      ))}
                    </span>
                  )}
                </div>
                <button type="button" className="cpdf-all-confirmed__close" onClick={() => setIsOpen(false)}>
                  {t("contract_review.close_review")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {triggerButton}
      {modal}
    </>
  );
}
