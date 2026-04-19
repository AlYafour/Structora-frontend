import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import LicenseStep from "../steps/LicenseStep";

export default function ViewLicense() {
  const { projectId } = useParams();
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="container">
        <ViewPageHeader title={t("view_license_title")} projectId={projectId} />
        <div className="mt-12">
          <LicenseStep projectId={projectId} onPrev={null} onNext={null} isView={true} />
        </div>
      </div>
    </PageLayout>
  );
}
