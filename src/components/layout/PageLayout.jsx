import { useTranslation } from "react-i18next";
import BrandedLoader from "../common/BrandedLoader";

// Unified page layout component - simple without extra container
export default function PageLayout({ children, loading, error, loadingText, errorText }) {
  const { t } = useTranslation();
  const defaultLoadingText = loadingText ?? t("loading_default");
  const defaultErrorText = errorText ?? t("error_default");
  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <BrandedLoader size={80} />
          {defaultLoadingText && <p className="page-loading__text">{defaultLoadingText}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <div className="page-error__content">
          <p className="page-error__text">{defaultErrorText}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
