import { useEffect, useState } from "react";
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { taxInvoiceApi } from "../../../../services/taxInvoices";
import { projectApi, companyApi } from "../../../../services";
import { logger } from "../../../../utils/logger";
import { handleError } from "../../../../utils/errorHandler";
import PageLayout from "../../../../components/layout/PageLayout";
import PageHeader from "../../../../components/layout/PageHeader";
import ProjectEntryInfo from "../../../../components/common/ProjectEntryInfo";
import UnifiedFinancialPrintTemplate from "../../../../components/print/UnifiedFinancialPrintTemplate";
import Button from "../../../../components/common/Button";
import { FaPrint } from "react-icons/fa";
import { buildFileUrl } from "../../../../utils/helpers/file";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

export default function ViewTaxInvoicePage() {
  const { taxInvoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const projectIdFromQuery = searchParams.get('project');
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const [loading, setLoading] = useState(true);
  const [taxInvoice, setTaxInvoice] = useState(null);
  const [project, setProject] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadTaxInvoice();
  }, [taxInvoiceId]);

  const loadTaxInvoice = async () => {
    setLoading(true);
    try {
      const projectId = projectIdFromQuery;
      if (!projectId) {
        navigate("/");
        return;
      }

      const data = await taxInvoiceApi.getById(projectId, taxInvoiceId);
      setTaxInvoice(data);

      try {
        const projectData = await projectApi.getById(projectId);
        setProject(Array.isArray(projectData) ? projectData[0] : projectData);
      } catch (error) {
        const handledError = handleError(error, 'ViewTaxInvoicePage.loadProject');
        logger.warn("Could not load project", handledError);
      }

      try {
        const settingsData = await companyApi.getCurrentSettings();
        let logoUrl = settingsData.logo_url || null;
        if (!logoUrl && settingsData.company_logo) {
          logoUrl = buildFileUrl(settingsData.company_logo);
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
        setCompany({ name: "Company Name", name_en: "", address: "", phone: "", email: "", vat_number: "", logo: null });
      }
    } catch (error) {
      const handledError = handleError(error, 'ViewTaxInvoicePage.loadTaxInvoice');
      logger.error("Error loading tax invoice", handledError);
      navigate(projectIdFromQuery ? `/projects/${projectIdFromQuery}?tab=tax_invoices` : "/");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const pid = projectIdFromQuery || taxInvoice?.project;
    navigate(pid ? `/projects/${pid}?tab=tax_invoices` : "/");
  };

  if (loading || !taxInvoice) {
    return (
      <PageLayout loading={loading} loadingText={t("loading")}>
        <div />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Top bar — hidden when printing */}
      <div className="no-print">
        <PageHeader
          onBack={handleBack}
          actions={
            <Button variant="primary" size="sm" onClick={() => window.print()} startIcon={<FaPrint />}>
              {t("print")}
            </Button>
          }
        >
          <ProjectEntryInfo project={project} />
        </PageHeader>
      </div>

      {/* Unified financial print document */}
      <UnifiedFinancialPrintTemplate
        documentType="taxInvoice"
        data={taxInvoice}
        project={project}
        company={company}
        hideControls={true}
      />
    </PageLayout>
  );
}
