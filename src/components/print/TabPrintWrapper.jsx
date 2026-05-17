import { forwardRef, useEffect, useState } from "react";
import { api } from "../../services/api";
import "./TabPrintWrapper.css";

const TabPrintWrapper = forwardRef(function TabPrintWrapper(
  { title, subtitle, filterLabel, children },
  ref
) {
  const [company, setCompany] = useState(null);

  useEffect(() => {
    api
      .get("auth/tenant-settings/current/", { _skipAuthRedirect: true })
      .then((res) => {
        const d = res.data;
        const rawLogo = d.logo_url || d.company_logo || "";
        const cleanPath = rawLogo.split("?")[0];
        const logoUrl = cleanPath
          ? cleanPath.startsWith("http")
            ? cleanPath
            : `/media/${cleanPath}`
          : null;
        setCompany({
          name: d.company_name || d.contractor_name || "",
          name_en: d.contractor_name_en || "",
          address: d.company_address || d.contractor_address || "",
          phone: d.company_phone || d.contractor_phone || "",
          logo: logoUrl,
        });
      })
      .catch(() => {});
  }, []);

  const printDate = new Date().toLocaleDateString("en-AE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div ref={ref} className="tpw-root">

      {/* Print-only header — hidden in browser, visible when printing */}
      <div className="tpw-print-only">
        <div className="tpw-accent-bar" />
        <div className="tpw-header">
          <div className="tpw-company">
            {company?.logo && (
              <img
                src={company.logo}
                alt={company.name || "Logo"}
                className="tpw-company__logo"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div className="tpw-company__body">
              <div className="tpw-company__name">{company?.name}</div>
              {company?.name_en && (
                <div className="tpw-company__name-en">{company.name_en}</div>
              )}
              <div className="tpw-company__details">
                {company?.address && <span>{company.address}</span>}
                {company?.phone && <span dir="ltr">{company.phone}</span>}
              </div>
            </div>
          </div>

          <div className="tpw-title-panel">
            <div className="tpw-title">{title}</div>
            {subtitle && <div className="tpw-subtitle">{subtitle}</div>}
            {filterLabel && (
              <div className="tpw-filter-badge">
                <span className="tpw-filter-badge__dot" />
                {filterLabel}
              </div>
            )}
            <div className="tpw-print-date">{printDate}</div>
          </div>
        </div>
      </div>

      {/* Always-visible children (the table) */}
      {children}

      {/* Print-only footer — hidden in browser, visible when printing */}
      <div className="tpw-print-only tpw-print-only--footer">
        <div className="tpw-footer">
          <span className="tpw-footer__company">{company?.name}</span>
          <span className="tpw-footer__center">CONFIDENTIAL — FOR INTERNAL USE ONLY</span>
          <span className="tpw-footer__date">Generated {printDate}</span>
        </div>
      </div>

    </div>
  );
});

export default TabPrintWrapper;
