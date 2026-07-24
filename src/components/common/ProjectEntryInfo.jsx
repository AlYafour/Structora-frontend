import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatInternalCode } from "../../utils/formatters/id";

/**
 * ProjectEntryInfo - Shows project name (Arabic + English) + internal code in the action bar
 * Used across all entry pages (payments, invoices, variations, extensions, etc.)
 *
 * Usage:
 *   <FinancialActionBar ...>
 *     <ProjectEntryInfo project={project} />
 *   </FinancialActionBar>
 */
const ProjectEntryInfo = memo(function ProjectEntryInfo({ project }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  if (!project) return null;

  const nameAr = project.display_name || project.name || "";
  const nameEn = project.display_name_en || "";
  const rawCode = project.project_code || project.internal_code;
  const code = rawCode ? formatInternalCode(rawCode) : null;

  // Check if both names exist and are different
  const hasBothNames = nameAr && nameEn && nameAr !== nameEn;

  return (
    <div className="project-entry-info">
      <div className="project-entry-info__names">
        {isArabic ? (
          // Arabic active: Arabic name gets primary style (--ar), English gets secondary style (--en)
          <>
            {nameAr && (
              <span className="project-entry-info__name project-entry-info__name--ar">
                {nameAr}
              </span>
            )}
            {hasBothNames && nameEn && (
              <span className="project-entry-info__name project-entry-info__name--en">
                {nameEn}
              </span>
            )}
            {!hasBothNames && !nameAr && nameEn && (
              <span className="project-entry-info__name project-entry-info__name--en">
                {nameEn}
              </span>
            )}
          </>
        ) : (
          // English active: English name gets primary style (--ar), Arabic gets secondary style (--en)
          <>
            {nameEn && (
              <span className="project-entry-info__name project-entry-info__name--ar">
                {nameEn}
              </span>
            )}
            {hasBothNames && nameAr && (
              <span className="project-entry-info__name project-entry-info__name--en">
                {nameAr}
              </span>
            )}
            {!hasBothNames && !nameEn && nameAr && (
              <span className="project-entry-info__name project-entry-info__name--en">
                {nameAr}
              </span>
            )}
          </>
        )}
      </div>
      {code && (
        <span className="project-entry-info__code">
          {code}
        </span>
      )}
    </div>
  );
});

export default ProjectEntryInfo;
