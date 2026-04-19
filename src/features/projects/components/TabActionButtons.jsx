import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";

/**
 * Standardized Tab Action Buttons Component
 * Used for action-based tabs (Variations, Payments, Invoices, etc.)
 * 
 * @param {string} projectId - Project ID
 * @param {string} itemId - Item ID (variation, payment, invoice, etc.)
 * @param {string} basePath - Base path for actions (e.g., 'variations', 'payments', 'invoices')
 * @param {object} options - Optional configuration
 * @param {boolean} options.showView - Show View button (default: true)
 * @param {boolean} options.showEdit - Show Edit button (default: true)
 * @param {boolean} options.showDownload - Show Download button (default: true)
 * @param {function} options.onEdit - Custom edit handler
 * @param {function} options.onDownload - Custom download handler
 */
export default function TabActionButtons({
  projectId,
  itemId,
  basePath,
  options = {}
}) {
  const { t } = useTranslation();
  const {
    showView = true,
    showEdit = true,
    showDownload = true,
    onEdit,
    onDownload
  } = options;

  const viewPath = `/${basePath}/${itemId}/view`;
  const editPath = `/${basePath}/${itemId}/edit`;

  return (
    <div className="prj-tab-action-buttons">
      {showView && (
        <Button
          as={Link}
          to={viewPath}
          variant="ghost"
          size="sm"
        >
          {t("view")}
        </Button>
      )}
      {showEdit && (
        onEdit ? (
          <Button
            onClick={onEdit}
            variant="ghost"
            size="sm"
          >
            {t("edit")}
          </Button>
        ) : (
          <Button
            as={Link}
            to={editPath}
            variant="ghost"
            size="sm"
          >
            {t("edit")}
          </Button>
        )
      )}
      {showDownload && onDownload && (
        <Button
          onClick={onDownload}
          variant="ghost"
          size="sm"
        >
          {t("download")}
        </Button>
      )}
    </div>
  );
}
