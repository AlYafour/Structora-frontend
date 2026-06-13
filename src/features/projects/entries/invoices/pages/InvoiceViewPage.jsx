import { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../../../contexts/NotificationContext";
import { projectApi, companyApi } from "../../../../../services";
import { logger } from "../../../../../utils/logger";
import { handleError } from "../../../../../utils/errorHandler";
import PageLayout from "../../../../../components/layout/PageLayout";
import PageHeader from "../../../../../components/layout/PageHeader";
import ProjectEntryInfo from "../../../../../components/common/ProjectEntryInfo";
import UnifiedFinancialPrintTemplate from "../../../../../components/print/UnifiedFinancialPrintTemplate";
import Button from "../../../../../components/common/Button";
import { FaPrint } from "react-icons/fa";
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

export default function InvoiceViewPage() {
  const { invoiceId } = useParams();
  const { t, i18n } = useTranslation();
  const { error: showError } = useNotifications();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useTenantNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [project, setProject] = useState(null);
  const [company, setCompany] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [printMode, setPrintMode] = useState("detailed");

  // Set document title for print (hides "Project Management System" in browser header)
  useEffect(() => {
    const originalTitle = document.title;
    document.title = " ";
    return () => { document.title = originalTitle; };
  }, []);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadFullProjectData = async (projectId) => {
    try {
      // ✅ Use include parameter to reduce API calls from 4 to just 1
      const projectData = await projectApi.getWithIncludes(projectId, ['siteplan', 'license', 'contract']);

      // ✅ Extract related data from the project object
      const siteplanData = projectData?.siteplan_data || null;
      const licenseData = projectData?.license_data || null;
      const contractData = projectData?.contract_data || null;
      const consultantNameAr =
        licenseData?.design_consultant_name ||
        licenseData?.supervision_consultant_name ||
        licenseData?.design_consultant?.name ||
        licenseData?.supervision_consultant?.name ||
        "";
      const consultantNameEn =
        licenseData?.design_consultant_name_en ||
        licenseData?.supervision_consultant_name_en ||
        licenseData?.design_consultant?.name_en ||
        licenseData?.supervision_consultant?.name_en ||
        "";

      setProject({
        ...projectData,
        owners: siteplanData?.owners || [],
        consultant: consultantNameAr || consultantNameEn || null,
        consultant_name: consultantNameAr,
        consultant_name_en: consultantNameEn,
        __consultant_name_ar: consultantNameAr,
        __consultant_name_en: consultantNameEn,
        plot_number: siteplanData?.plot_number || projectData?.plot_number || null,
        contract: contractData,
      });
    } catch (e) {
      logger.warn("Could not load full project data", e);
    }
  };

  const loadInvoice = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Single API call replaces getAll() + N×getInvoices() loop
      const result = await projectApi.findInvoiceById(invoiceId);
      const invoiceData = result?.invoice || result;
      const foundProjectId = result?.project_id || invoiceData?.project;

      if (!invoiceData || !foundProjectId) {
        setLoadError("invoice_not_found");
        return;
      }

      setProjectId(foundProjectId);
      const projectId = foundProjectId;

      // Load full project data with owners, consultant, contract
      await loadFullProjectData(projectId);

      setInvoice(invoiceData);

      // Load company info (non-critical — use _skipAuthRedirect to prevent redirect on 401)
      try {
        const { data: settingsData } = await import("../../../../../services/api").then(m =>
          m.api.get('auth/tenant-settings/current/', { _skipAuthRedirect: true })
        );
        const rawLogoPath = settingsData.logo_url || settingsData.company_logo || "";
        const cleanPath = rawLogoPath.split("?")[0];
        let logoUrl = null;
        if (cleanPath) {
          logoUrl = cleanPath.startsWith("http") ? cleanPath : `/media/${cleanPath}`;
        }

        setCompany({
          name: settingsData.company_name || settingsData.contractor_name || "Company Name",
          name_en: settingsData.contractor_name_en || "",
          address: settingsData.company_address || settingsData.contractor_address || "",
          phone: settingsData.company_phone || settingsData.contractor_phone || "",
          email: settingsData.contractor_email || "",
          vat_number: settingsData.company_license_number || settingsData.contractor_license_no || "",
          logo: logoUrl,
        });
      } catch (e) {
        logger.warn("Could not load company settings", e);
        setCompany({
          name: "Company Name",
          name_en: "",
          address: "",
          phone: "",
          email: "",
          vat_number: "",
          logo: null,
        });
      }
    } catch (e) {
      logger.error("Error loading invoice", e);
      setLoadError("load_error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout loading={true} loadingText={t("loading")}>
        <div></div>
      </PageLayout>
    );
  }

  if (loadError || !invoice) {
    return (
      <PageLayout>
        <div className="prj-error-state">
          <div className="prj-error-state__icon">⚠️</div>
          <h2 className="prj-error-state__title">
            {loadError === "invoice_not_found" ? t("invoice_not_found") : t("error_loading_invoice")}
          </h2>
          <p className="prj-error-state__desc">
            {t("error_description")}
          </p>
          <div className="prj-error-state__actions">
            <Button variant="primary" onClick={() => loadInvoice()}>
              {t("error_try_again")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("/projects")}>
              {t("error_go_to_projects")}
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const handleBack = () => {
    const pid = projectId || invoice?.project || project?.id;
    navigate(pid ? `/projects/${pid}?tab=invoices` : "/projects");
  };

  return (
    <PageLayout>
      {/* Top bar — hidden when printing */}
      <div className="no-print" style={{ maxWidth: 1320, flexDirection: "row", justifyContent: "center", alignItems: "center", margin: "0 auto" }}>
        <PageHeader
          onBack={handleBack}
          actions={
            <>
              <div style={{ display: 'flex', border: '1.5px solid #d1d5db', borderRadius: '7px', overflow: 'hidden' }}>
                <button
                  onClick={() => setPrintMode("detailed")}
                  style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s', background: printMode === 'detailed' ? '#17202f' : 'transparent', color: printMode === 'detailed' ? '#fff' : '#6b7280' }}
                >
                  {t("print_mode_detailed", "Detailed")}
                </button>
                <button
                  onClick={() => setPrintMode("summary")}
                  style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, border: 'none', borderLeft: '1.5px solid #d1d5db', cursor: 'pointer', transition: 'background 0.15s, color 0.15s', background: printMode === 'summary' ? '#17202f' : 'transparent', color: printMode === 'summary' ? '#fff' : '#6b7280' }}
                >
                  {t("print_mode_summary", "Summary")}
                </button>
              </div>
              <Button variant="primary" size="sm" onClick={() => window.print()} startIcon={<FaPrint />}>
                {t("print")}
              </Button>
            </>
          }
        >
          <ProjectEntryInfo project={project} />
        </PageHeader>
      </div>

      {/* Unified financial print document */}
      <UnifiedFinancialPrintTemplate
        documentType="invoice"
        data={invoice}
        project={project}
        company={company}
        onClose={handleBack}
        hideControls={true}
        printMode={printMode}
      />
    </PageLayout>
  );
}

