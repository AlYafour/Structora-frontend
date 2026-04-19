import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import PageLayout from "../../../components/layout/PageLayout";
import ViewPageHeader from "../../../components/ui/ViewPageHeader";
import ContractFinancialSummary from "../financial-pages/contract-summary/ContractFinancialSummary";

export default function ViewSummary() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);

  // Reload data when the page opens
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [location.pathname]);

  return (
    <PageLayout>
      <div className="container">
        <ViewPageHeader title={t("view_summary_title") || t("financial_summary")} projectId={projectId} />
        <div className="mt-12">
          <ContractFinancialSummary key={refreshKey} projectId={projectId} />
        </div>
      </div>
    </PageLayout>
  );
}

