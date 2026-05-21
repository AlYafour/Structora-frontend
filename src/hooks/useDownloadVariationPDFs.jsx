import { useState, useCallback, createRef } from "react";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../contexts/NotificationContext";
import { api } from "../services/api";
import { projectApi } from "../services";
import { downloadBlob } from "../utils/helpers/file";
import VariationPrintDocument from "../features/projects/entries/variations/components/VariationPrintDocument";

const PRINT_A4_WIDTH_PX = 794;
const PRINT_A4_HEIGHT_PX = Math.round(PRINT_A4_WIDTH_PX * Math.SQRT2);
const PDF_RENDER_CONCURRENCY = 1;

async function runWithConcurrency(items, limit, worker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await worker(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
}

async function waitForFrame(count = 1) {
  for (let i = 0; i < count; i++) {
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}

async function waitForImages(el) {
  const images = Array.from(el.querySelectorAll("img"));
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
}

async function preparePrintDocumentLayout(el) {
  const footer = el?.querySelector('.vpd-doc__footer');

  el.classList.add('vpd-print-mode');
  el.style.width = `${PRINT_A4_WIDTH_PX}px`;
  await waitForFrame(2);

  if (footer) {
    const remainder = el.scrollHeight % PRINT_A4_HEIGHT_PX;
    const footerOffset = remainder === 0 ? 0 : PRINT_A4_HEIGHT_PX - remainder;
    footer.style.marginTop = `${footerOffset}px`;
    await waitForFrame();
  }
}

async function renderVariationPrintPdfBlob({ variation, project, companyInfo, noticeData }) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const container = document.createElement("div");
  const docRef = createRef();
  const root = createRoot(container);

  Object.assign(container.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${PRINT_A4_WIDTH_PX}px`,
    background: "#ffffff",
    zIndex: "-1",
  });

  document.body.appendChild(container);

  try {
    root.render(
      <VariationPrintDocument
        ref={docRef}
        variation={variation}
        project={project}
        companyInfo={companyInfo}
        noticeData={noticeData}
      />
    );

    await waitForFrame(3);

    const el = docRef.current;
    if (!el) throw new Error("Variation print document did not render");

    await waitForImages(el);
    await preparePrintDocumentLayout(el);

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: PRINT_A4_WIDTH_PX,
      windowHeight: el.scrollHeight,
      width: el.scrollWidth,
      height: el.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const scale = pageW / canvas.width;
    const pages = Math.ceil((canvas.height * scale) / pageH);

    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      pdf.setFillColor(251, 248, 242);
      pdf.rect(0, 0, pageW, pageH, "F");
      const srcY = Math.round((i * pageH) / scale);
      const srcH = Math.min(Math.round(pageH / scale), canvas.height - srcY);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = srcH;
      slice.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
      pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageW, srcH * scale);
    }

    return pdf.output("blob");
  } finally {
    root.unmount();
    container.remove();
  }
}

export function useDownloadVariationPDFs(projectId) {
  const { t } = useTranslation();
  const { success, error: showError } = useNotifications();
  const [zipLoading, setZipLoading] = useState(false);

  const downloadZip = useCallback(async ({ items, zipName }) => {
    if (!items?.length) return;
    setZipLoading(true);
    try {
      const [projectData, settingsRes] = await Promise.all([
        projectApi.getWithIncludes(projectId, ["siteplan", "license", "contract"]),
        api.get("auth/tenant-settings/current/", { _skipAuthRedirect: true }),
      ]);

      const settingsData = settingsRes.data;
      const rawLogoPath = (settingsData.logo_url || settingsData.company_logo || "").split("?")[0];
      const logoUrl = rawLogoPath
        ? (rawLogoPath.startsWith("http") ? rawLogoPath : `${window.location.origin}/media/${rawLogoPath}`)
        : null;

      const companyInfo = {
        logo:    logoUrl,
        name:    settingsData.contractor_name    || settingsData.company_name    || "",
        name_en: settingsData.contractor_name_en || settingsData.company_name    || "",
        phone:   settingsData.company_phone      || settingsData.contractor_phone || "",
        email:   settingsData.company_email      || settingsData.contractor_email || "",
        address: settingsData.company_address    || settingsData.contractor_address || "",
      };

      const zip = new JSZip();
      let skipped = 0;

      await runWithConcurrency(
        items,
        PDF_RENDER_CONCURRENCY,
        async (variation) => {
          try {
            let noticeData = {};
            if (variation?.description) {
              try { noticeData = JSON.parse(variation.description); } catch { noticeData = {}; }
            }

            const blob = await renderVariationPrintPdfBlob({
              variation,
              project: projectData,
              companyInfo,
              noticeData,
            });

            if (blob) {
              const fileName = (variation.variation_number || `VAR-${variation.id}`)
                .replace(/[\\/:*?"<>|]/g, "_");
              zip.file(`${fileName}.pdf`, blob);
            }
          } catch (err) {
            console.error("[useDownloadVariationPDFs] item failed:", variation?.id, err);
            skipped++;
          }
        }
      );

      const projectName = (projectData.display_name || projectData.name || `Project_${projectId}`)
        .replace(/[\\/:*?"<>|]/g, "_");
      const finalName = (zipName || `${projectName}_Variations.zip`).replace(/[\\/:*?"<>|]/g, "_");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, finalName);

      if (skipped > 0) {
        showError(t("documents_partial", `Downloaded with ${skipped} item(s) skipped due to errors.`));
      } else {
        success(t("documents_downloaded", "Documents downloaded successfully"));
      }
    } catch (err) {
      console.error("[useDownloadVariationPDFs]", err);
      showError(t("download_error", "Download failed. Please try again."));
    } finally {
      setZipLoading(false);
    }
  }, [projectId, t, success, showError]);

  return { downloadZip, zipLoading };
}
