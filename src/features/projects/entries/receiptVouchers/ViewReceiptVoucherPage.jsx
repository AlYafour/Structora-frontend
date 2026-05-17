import { useEffect, useState } from "react";
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { receiptVoucherApi } from "../../../../services/receiptVouchers";
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

export default function ViewReceiptVoucherPage() {
  const { voucherId } = useParams();
  const [searchParams] = useSearchParams();
  const projectIdFromQuery = searchParams.get('project');
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const [loading, setLoading] = useState(true);
  const [voucher, setVoucher] = useState(null);
  const [project, setProject] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadVoucher();
  }, [voucherId]);

  const loadVoucher = async () => {
    setLoading(true);
    try {
      const projectId = projectIdFromQuery;
      if (!projectId) {
        navigate("/");
        return;
      }

      const data = await receiptVoucherApi.getById(projectId, voucherId);
      setVoucher(data);

      try {
        const projectData = await projectApi.getWithIncludes(projectId, ['siteplan', 'license']);
        const siteplanData = projectData?.siteplan_data || null;
        setProject({ ...projectData, owners: siteplanData?.owners || [] });
      } catch (error) {
        const handledError = handleError(error, 'ViewReceiptVoucherPage.loadProject');
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
      const handledError = handleError(error, 'ViewReceiptVoucherPage.loadVoucher');
      logger.error("Error loading receipt voucher", handledError);
      navigate(projectIdFromQuery ? `/projects/${projectIdFromQuery}?tab=payments` : "/");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const pid = projectIdFromQuery || voucher?.project;
    navigate(pid ? `/projects/${pid}?tab=payments` : "/");
  };

  if (loading || !voucher) {
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
        documentType="receiptVoucher"
        data={voucher}
        project={project}
        company={company}
        hideControls={true}
      />
    </PageLayout>
  );
}
