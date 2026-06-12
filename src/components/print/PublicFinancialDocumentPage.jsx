import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../services/api";
import UnifiedFinancialPrintTemplate from "./UnifiedFinancialPrintTemplate";

const PRINT_A4_WIDTH_PX = 794;
const PRINT_A4_HEIGHT_PX = Math.round(PRINT_A4_WIDTH_PX * Math.SQRT2);

export default function PublicFinancialDocumentPage() {
  const { documentType, token } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetch(`${API_BASE_URL}public/financial-documents/${documentType}/${token}/`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setState({ loading: false, error: null, data }))
      .catch(() => setState({ loading: false, error: "Document not found.", data: null }));
  }, [documentType, token]);

  useEffect(() => {
    const updateScale = () => {
      const viewportPadding = window.innerWidth < 720 ? 24 : 48;
      const nextScale = Math.min(1, (window.innerWidth - viewportPadding) / PRINT_A4_WIDTH_PX);
      setScale(Math.max(0.35, nextScale));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  if (state.loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "rgba(0,0,0,0.88)" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #d8c9b3", borderTopColor: "#17202f", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", flexDirection: "column", gap: 12, background: "rgba(0,0,0,0.88)" }}>
        <p style={{ color: "#d8c9b3", fontSize: 16 }}>{state.error}</p>
      </div>
    );
  }

  const payload = state.data;
  const extras = payload?.extras || {};

  return (
    <div className="public-financial-page">
      <div className="public-financial-toolbar">
        <button onClick={() => window.print()}>
          Print / طباعة
        </button>
      </div>

      <div
        className="public-financial-stage"
        style={{ width: PRINT_A4_WIDTH_PX * scale, minHeight: PRINT_A4_HEIGHT_PX * scale }}
      >
        <div
          className="public-financial-scale"
          style={{ transform: `scale(${scale})` }}
        >
          <UnifiedFinancialPrintTemplate
            documentType={payload.document_type}
            data={payload.data}
            project={payload.project}
            company={payload.company_info}
            hideControls={true}
            invoiceAttachments={extras.invoice_attachments}
            variations={extras.variations}
            linkedInvoiceItems={extras.linked_invoice_items}
            sheetPreview={true}
          />
        </div>
      </div>

      <style>{`
        .public-financial-page {
          min-height: 100vh;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #1d1b1a;
        }

        .public-financial-toolbar {
          width: min(100%, ${PRINT_A4_WIDTH_PX}px);
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        .public-financial-toolbar button {
          background: #17202f;
          color: #fff;
          border: none;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          font-weight: 700;
        }

        .public-financial-stage {
          position: relative;
          transform-origin: top center;
        }

        .public-financial-scale {
          width: ${PRINT_A4_WIDTH_PX}px;
          transform-origin: top left;
          box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
          background: #fff;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .public-financial-page {
            display: block !important;
            min-height: auto !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .public-financial-toolbar {
            display: none !important;
          }

          .public-financial-stage {
            width: ${PRINT_A4_WIDTH_PX}px !important;
            min-height: auto !important;
          }

          .public-financial-scale {
            transform: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
