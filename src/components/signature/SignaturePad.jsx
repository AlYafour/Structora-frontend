import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./SignaturePad.css";

/**
 * SignaturePad — Draw or upload a signature image.
 *
 * Props:
 *   value        File | null          current signature file
 *   onChange     (file | null) => void
 *   existingUrl  string | null        URL of already-saved signature
 *   disabled     boolean
 */
export default function SignaturePad({
  value,
  onChange,
  existingUrl,
  disabled = false,
}) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [mode, setMode] = useState("upload"); // "draw" | "upload"
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPoint = useRef(null);

  // Preview URL for file value
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    if (value instanceof File && value.type.startsWith("image/")) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [value]);

  // Init canvas
  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1a1a1a";
    // Clear
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  }, [mode]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const startDraw = useCallback(
    (e) => {
      if (disabled) return;
      e.preventDefault();
      setDrawing(true);
      lastPoint.current = getPos(e);
    },
    [disabled]
  );

  const draw = useCallback(
    (e) => {
      if (!drawing || disabled) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPoint.current = pos;
      setHasDrawn(true);
    },
    [drawing, disabled]
  );

  const endDraw = useCallback(() => {
    setDrawing(false);
    lastPoint.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    onChange(null);
  }, [onChange]);

  const saveDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "signature.png", { type: "image/png" });
          onChange(file);
        }
      },
      "image/png",
      1
    );
  }, [hasDrawn, onChange]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onChange(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const showPreview = previewUrl || existingUrl;
  const displayUrl = previewUrl || existingUrl;

  if (disabled && !showPreview) {
    return (
      <div className="sig-pad sig-pad--empty">
        <span className="sig-pad__no-sig">{t("user_no_signature")}</span>
      </div>
    );
  }

  return (
    <div className="sig-pad">
      {/* Mode tabs */}
      {!disabled && !showPreview && (
        <div className="sig-pad__tabs">
          <button
            type="button"
            className={`sig-pad__tab ${mode === "upload" ? "sig-pad__tab--active" : ""}`}
            onClick={() => setMode("upload")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t("user_sig_upload")}
          </button>
          <button
            type="button"
            className={`sig-pad__tab ${mode === "draw" ? "sig-pad__tab--active" : ""}`}
            onClick={() => setMode("draw")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
            {t("user_sig_draw")}
          </button>
        </div>
      )}

      {/* Preview existing/selected */}
      {showPreview && (
        <div className="sig-pad__preview">
          <img src={displayUrl} alt="Signature" className="sig-pad__img" />
          {!disabled && (
            <button type="button" className="sig-pad__remove" onClick={handleRemove} title={t("remove")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Upload mode */}
      {!showPreview && mode === "upload" && !disabled && (
        <div
          className="sig-pad__dropzone"
          onClick={() => fileRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>{t("user_sig_upload_hint")}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
            hidden
          />
        </div>
      )}

      {/* Draw mode */}
      {!showPreview && mode === "draw" && !disabled && (
        <div className="sig-pad__draw-area">
          <canvas
            ref={canvasRef}
            className="sig-pad__canvas"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <div className="sig-pad__draw-actions">
            <button type="button" className="sig-pad__btn sig-pad__btn--clear" onClick={clearCanvas}>
              {t("user_sig_clear")}
            </button>
            <button
              type="button"
              className="sig-pad__btn sig-pad__btn--confirm"
              onClick={saveDrawing}
              disabled={!hasDrawn}
            >
              {t("user_sig_confirm")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
