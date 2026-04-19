import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-page__content">
        <h1 className="not-found-page__code">404</h1>
        <h2 className="not-found-page__title">{t("page_not_found", "Page Not Found")}</h2>
        <p className="not-found-page__desc">{t("page_not_found_desc", "The page you're looking for doesn't exist or has been moved.")}</p>
        <Button variant="primary" onClick={() => navigate(-1)}>
          {t("go_back", "Go Back")}
        </Button>
      </div>
    </div>
  );
}
