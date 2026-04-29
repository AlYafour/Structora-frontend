import { memo, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";
import { toLocalizedUse, LAND_USE_LABEL_KEYS } from "../../../utils/licenseHelpers";
import { formatDate } from "../../../utils/formatters";
import { extractFileNameFromUrl, buildFileUrl } from "../../../utils/helpers/file";

const SitePlanTab = memo(function SitePlanTab({ projectId, siteplan, projectPermissions }) {
  const { t, i18n } = useTranslation();
  const hasSiteplan = !!siteplan;
  const [plotImageZoomed, setPlotImageZoomed] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const isAR = i18n.language === "ar";
  console.log(projectPermissions)

  const getTranslated = (value, arValue, enValue) => {
    if (!value) return t("empty_value");
    if (isAR && arValue) return arValue;
    if (!isAR && enValue) return enValue;
    return value;
  };

  const allocationTypeLabel =
    siteplan?.allocation_type &&
    toLocalizedUse(siteplan.allocation_type, i18n.language);

  const landUseLabel =
    siteplan?.land_use &&
    (LAND_USE_LABEL_KEYS[siteplan.land_use]
      ? t(LAND_USE_LABEL_KEYS[siteplan.land_use])
      : toLocalizedUse(siteplan.land_use, i18n.language));

  const allocationDateLabel =
    siteplan?.allocation_date &&
    formatDate(siteplan.allocation_date, i18n.language);

  const applicationDateLabel =
    siteplan?.application_date &&
    formatDate(siteplan.application_date, i18n.language);

  const RibbonInfoCard = ({ label, value, isLast = false }) => {
    const hasValue = value !== null && value !== undefined && value !== "";

    return (
      <div
        className={`overview-ribbon__slot ${isLast ? "overview-ribbon__slot--last" : ""
          }`}
      >
        <div className="overview-ribbon__slot-label">{label}</div>
        <div className="overview-ribbon__slot-value">
          {hasValue ? value : t("empty_value")}
        </div>
      </div>
    );
  };

  const mapsData = useMemo(() => {
    if (!siteplan) return null;

    const lat = siteplan.latitude;
    const lng = siteplan.longitude;
    const hasCoords = lat && lng;

    const zone = siteplan.zone || "";
    const sector = siteplan.sector || "";
    const landNo = siteplan.land_no || siteplan.plot_no || "";
    const plotAddress = siteplan.plot_address || "";

    if (!hasCoords && !zone && !sector && !landNo) return null;

    const label = [zone, sector, landNo ? `Plot ${landNo}` : "", plotAddress]
      .filter(Boolean)
      .join(" - ");

    if (hasCoords) {
      const coordStr = `${lat},${lng}`;
      return {
        url: `https://www.google.com/maps/search/?api=1&query=${coordStr}`,
        embedUrl: `https://www.google.com/maps?q=${coordStr}&z=17&output=embed`,
        label,
        hasCoords: true,
      };
    }

    const query = [sector, zone, siteplan.municipality || "", "Abu Dhabi UAE"]
      .filter(Boolean)
      .join(", ");
    const encodedQuery = encodeURIComponent(query);

    return {
      url: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
      embedUrl: `https://www.google.com/maps?q=${encodedQuery}&output=embed&z=15`,
      label,
      hasCoords: false,
    };
  }, [siteplan]);

  const getOwnerName = (owner, index) => {
    return (
      getTranslated(
        owner.owner_name || owner.owner_name_en,
        owner.owner_name_ar,
        owner.owner_name_en
      ) || `${t("owner")} ${index + 1}`
    );
  };

  const actions = (
    <div className="prj-tab-header">
      <div className="prj-tab-actions ds-flex ds-gap-3">
        <Button
          as={Link}
          to={`/projects/${projectId}/wizard?step=siteplan&mode=view&sectionOnly=true`}
          variant="secondary"
          size="md"
        >
          {t("view")}
        </Button>
        <Button
          as={Link}
          to={`/projects/${projectId}/wizard?step=siteplan&mode=edit&sectionOnly=true`}
          variant="primary"
          size="md"
          disabled={!projectPermissions?.can_edit}
        >
          {t("edit")}
        </Button>
      </div>
    </div>
  );

  if (!hasSiteplan) {
    return (
      <div className="prj-tab-panel">
        {actions}
        <div className="prj-empty-state">{t("site_plan_not_added")}</div>
      </div>
    );
  }

  const ownersWithId = siteplan?.owners?.filter((o) => o.id_attachment) || [];

  return (
    <div className="prj-tab-panel">
      {actions}

      {(siteplan?.plot_image || siteplan?.site_plan_file || mapsData) && (
        <Card className="ds-p-5 ds-mt-4">
          <div className="siteplan-hero-grid">
            <div className="siteplan-hero-grid__panel">
              {siteplan?.plot_image ? (
                <div className="siteplan-plot-image-container">
                  <img
                    src={buildFileUrl(siteplan.plot_image)}
                    alt={t("plot_map_image")}
                    className={`siteplan-plot-image ${plotImageZoomed ? "siteplan-plot-image--zoomed" : ""
                      }`}
                    onClick={() => setPlotImageZoomed(!plotImageZoomed)}
                    loading="lazy"
                  />
                  <p className="siteplan-plot-image__hint">{t("click_to_zoom")}</p>
                </div>
              ) : siteplan?.site_plan_file ? (
                <div className="siteplan-plot-image__processing">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>{t("plot_image_processing")}</span>
                </div>
              ) : null}
            </div>

            <div className="siteplan-hero-grid__panel">
              {mapsData ? (
                <div className="siteplan-map-container">
                  <iframe
                    src={mapsData.embedUrl}
                    className="siteplan-map-iframe"
                    title={t("plot_location_map")}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="siteplan-map-unavailable">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="40"
                    height="40"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{t("location_unavailable")}</span>
                </div>
              )}
            </div>
          </div>

          {mapsData && (
            <div className="siteplan-share-bar">
              <div className="siteplan-share-wrapper">
                <Button
                  variant="outline"
                  size="sm"
                  className="siteplan-share-btn"
                  onClick={() => setShareMenuOpen(!shareMenuOpen)}
                >
                  <span className="siteplan-share-content">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>

                    <span className="siteplan-share-label">
                      {t("share_plot_location")}
                    </span>
                  </span>
                </Button>

                {shareMenuOpen && (
                  <div className="siteplan-share-menu">
                    <button
                      type="button"
                      className="siteplan-share-menu__item"
                      onClick={() => {
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(
                            t("plot_location_share_text") +
                            "\n" +
                            mapsData.label +
                            "\n" +
                            mapsData.url
                          )}`,
                          "_blank"
                        );
                        setShareMenuOpen(false);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        <path
                          d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
                          fillRule="evenodd"
                        />
                      </svg>
                      WhatsApp
                    </button>

                    <button
                      type="button"
                      className="siteplan-share-menu__item"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(mapsData.url);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        } catch {
                          const ta = document.createElement("textarea");
                          ta.value = mapsData.url;
                          ta.style.position = "fixed";
                          ta.style.opacity = "0";
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }
                        setShareMenuOpen(false);
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="18"
                        height="18"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {linkCopied ? t("copied") : t("copy_link")}
                    </button>

                    <button
                      type="button"
                      className="siteplan-share-menu__item"
                      onClick={() => {
                        window.open(mapsData.url, "_blank");
                        setShareMenuOpen(false);
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="18"
                        height="18"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {t("open_in_maps")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ─── Siteplan info section — new design with 11 separate cards ─── */}
      <div className="overview-ribbon__data ds-mt-6">
        <div className="overview-ribbon__slots">
          <RibbonInfoCard label={t("municipality")} value={siteplan?.municipality} />
          <RibbonInfoCard label={t("zone")} value={siteplan?.zone} />
          <RibbonInfoCard label={t("sector")} value={siteplan?.sector} />
          <RibbonInfoCard label={t("plot_area_sqm")} value={siteplan?.plot_area_sqm} />
          <RibbonInfoCard label={t("plot_area_sqft")} value={siteplan?.plot_area_sqft} />
          <RibbonInfoCard label={t("land_no")} value={siteplan?.land_no} />
          <RibbonInfoCard label={t("allocation_type")} value={allocationTypeLabel} />
          <RibbonInfoCard label={t("land_use")} value={landUseLabel} />
          <RibbonInfoCard label={t("allocation_date")} value={allocationDateLabel} />
          <RibbonInfoCard label={t("application_date")} value={applicationDateLabel} />
          <RibbonInfoCard
            label={t("application_number")}
            value={siteplan?.application_number}
            isLast
          />
        </div>
      </div>

      <div className="ds-mt-6">
        <h3 className="prj-section-heading">{t("attachments")}</h3>
        <Card className="ds-p-5">
          <div className="ds-grid-auto-300">
            {siteplan?.site_plan_file && (
              <div>
                <div className="prj-info-label ds-mb-3">{t("site_plan_file")}</div>
                <FileAttachmentView
                  fileUrl={siteplan.site_plan_file}
                  fileName={extractFileNameFromUrl(siteplan.site_plan_file)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/siteplan/`}
                />
              </div>
            )}

            {ownersWithId.map((owner, index) => {
              const idAttachment = owner.id_attachment;
              const ownerName = getOwnerName(owner, index);

              return (
                <div key={owner.id || owner.id_number || index}>
                  <div className="prj-info-label ds-mb-3">
                    {t("owner_id_attachment")} - {ownerName}
                  </div>
                  <FileAttachmentView
                    fileUrl={
                      typeof idAttachment === "string" && idAttachment.trim()
                        ? idAttachment
                        : null
                    }
                    fileName={
                      typeof idAttachment === "string"
                        ? extractFileNameFromUrl(idAttachment)
                        : ""
                    }
                    projectId={projectId}
                    endpoint={`projects/${projectId}/siteplan/`}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
});

export default SitePlanTab;