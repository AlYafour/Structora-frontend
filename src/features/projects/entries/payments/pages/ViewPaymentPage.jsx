import { useEffect, useState } from "react";
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { paymentApi, projectApi, companyApi } from "../../../../../services";
import { logger } from "../../../../../utils/logger";
import { handleError } from "../../../../../utils/errorHandler";
import PageLayout from "../../../../../components/layout/PageLayout";
import PageHeader from "../../../../../components/layout/PageHeader";
import ProjectEntryInfo from "../../../../../components/common/ProjectEntryInfo";
import PaymentPrintTemplate from "../../../../../components/payments/PaymentPrintTemplate";
import Button from "../../../../../components/common/Button";
import { FaPrint } from "react-icons/fa";
import { buildFileUrl } from "../../../../../utils/helpers/file";
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

export default function ViewPaymentPage() {
  const { paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const projectIdFromQuery = searchParams.get('project');
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [project, setProject] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  const loadPayment = async () => {
    setLoading(true);
    try {
      const data = await paymentApi.getById(paymentId);
      setPayment(data);

      if (data.project) {
        try {
          const projectData = await projectApi.getById(data.project);
          setProject(Array.isArray(projectData) ? projectData[0] : projectData);
        } catch (error) {
          const handledError = handleError(error, 'ViewPaymentPage.loadProject');
          logger.warn("Could not load project", handledError);
        }
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
      const handledError = handleError(error, 'ViewPaymentPage.loadPayment');
      logger.error("Error loading payment", handledError);
      const pid = payment?.project || project?.id || projectIdFromQuery;
      navigate(pid ? `/projects/${pid}?tab=payments` : "/payments");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const pid = projectIdFromQuery || payment?.project || project?.id;
    navigate(pid ? `/projects/${pid}?tab=payments` : "/payments");
  };

  if (loading || !payment) {
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

      {/* A4 Payment Document */}
      <PaymentPrintTemplate
        payment={payment}
        project={project}
        company={company}
        onClose={handleBack}
        hideControls={true}
      />
    </PageLayout>
  );
}
