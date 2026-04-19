import { useTranslation } from "react-i18next";
import { formatDuration } from "../utils/projectHelpers";

/**
 * DurationCell Component
 * Displays duration with days and months in a two-line format
 * @param {Object} duration - Duration object from API
 */
const DurationCell = ({ duration }) => {
  const { t } = useTranslation();
  const formatted = formatDuration(duration);

  if (!formatted.hasAny) return '-';

  return (
    <div className="projects-table-name-wrapper">
      {formatted.days !== null && (
        <div className="projects-table-name-primary">
          {formatted.days} {formatted.days === 1 ? t("day") : t("days")}
        </div>
      )}
      {formatted.months !== null && (
        <div className="projects-table-name-secondary">
          {formatted.months} {formatted.months === 1 ? t("month") : t("months")}
        </div>
      )}
    </div>
  );
};

export default DurationCell;
