import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../../../services/api";
import VariationPrintDocument from "../components/VariationPrintDocument";
import {
  applyPrintPagePartBreaks,
  applyPrintTablePagination,
  pinPrintBottomGroup,
} from "../utils/printPagination";

const PRINT_A4_WIDTH_PX = 794;
const PRINT_A4_HEIGHT_PX = Math.round(PRINT_A4_WIDTH_PX * Math.SQRT2);

function waitForFrame(count = 1) {
  let promise = Promise.resolve();
  for (let i = 0; i < count; i += 1) {
    promise = promise.then(() => new Promise(resolve => requestAnimationFrame(resolve)));
  }
  return promise;
}

function waitForImages(el) {
  const images = Array.from(el.querySelectorAll("img"));
  return Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
}

async function preparePublicPrintLayout(el) {
  el.classList.add("vpd-print-mode");
  el.style.width = `${PRINT_A4_WIDTH_PX}px`;
  await waitForImages(el);
  await waitForFrame(2);

  applyPrintTablePagination(el, PRINT_A4_HEIGHT_PX);
  await waitForFrame();

  applyPrintPagePartBreaks(el, PRINT_A4_HEIGHT_PX);
  await waitForFrame();

  pinPrintBottomGroup(el, {
    pageHeight: PRINT_A4_HEIGHT_PX,
    continuationPageHeight: PRINT_A4_HEIGHT_PX,
  });
}

export default function PublicVariationPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [scale, setScale] = useState(1);
  const ref = useRef();

  useEffect(() => {
    fetch(`${API_BASE_URL}public/variations/${token}/`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setState({ loading: false, error: null, data }))
      .catch(() => setState({ loading: false, error: "Document not found.", data: null }));
  }, [token]);

  useLayoutEffect(() => {
    if (!state.data || !ref.current) return undefined;

    let cancelled = false;

    const updateScale = () => {
      const viewportPadding = window.innerWidth < 720 ? 24 : 48;
      const nextScale = Math.min(1, (window.innerWidth - viewportPadding) / PRINT_A4_WIDTH_PX);
      setScale(Math.max(0.35, nextScale));
    };

    preparePublicPrintLayout(ref.current).then(() => {
      if (!cancelled) updateScale();
    });

    window.addEventListener("resize", updateScale);
    updateScale();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", updateScale);
    };
  }, [state.data]);

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
        <p style={{ color: "#7f7364", fontSize: 16 }}>{state.error}</p>
      </div>
    );
  }

  const { variation, project, company_info } = state.data;
  const noticeData = (() => {
    try { return JSON.parse(variation.description); }
    catch { return {}; }
  })();

  return (
    <div className="public-variation-page">
      <div className="public-variation-toolbar">
        <button onClick={() => window.print()}>
          Print / طباعة
        </button>
      </div>

      <div
        className="public-variation-stage"
        style={{ width: PRINT_A4_WIDTH_PX * scale, minHeight: PRINT_A4_HEIGHT_PX * scale }}
      >
        <div
          className="public-variation-scale"
          style={{ transform: `scale(${scale})` }}
        >
          <VariationPrintDocument
            ref={ref}
            variation={variation}
            project={project}
            companyInfo={company_info}
            noticeData={noticeData}
          />
        </div>
      </div>

      <style>{`
        .public-variation-page {
          min-height: 100vh;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #1d1b1a;
        }

        .public-variation-toolbar {
          width: min(100%, ${PRINT_A4_WIDTH_PX}px);
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        .public-variation-toolbar button {
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

        .public-variation-stage {
          position: relative;
          transform-origin: top center;
        }

        .public-variation-scale {
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

          .public-variation-page {
            display: block !important;
            min-height: auto !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .public-variation-toolbar {
            display: none !important;
          }

          .public-variation-stage {
            width: ${PRINT_A4_WIDTH_PX}px !important;
            min-height: auto !important;
          }

          .public-variation-scale {
            transform: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
