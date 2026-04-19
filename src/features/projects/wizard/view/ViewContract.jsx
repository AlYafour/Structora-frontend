import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import ContractStep from "../steps/ContractStep";

export default function ViewContract() {
  const { projectId } = useParams();
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="container">
        <ViewPageHeader
          title={t("view_contract_title") || `${t("contract_information")} — ${t("bc_view")}`}
          projectId={projectId}
          showWizard={false}
          backLabel={t("back")}
        />
        <div className="mt-12">
          <ContractStep projectId={projectId} onPrev={null} onNext={null} isView={true} />
        </div>
      </div>
    </PageLayout>
  );
}
