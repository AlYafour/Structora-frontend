import { useTranslation } from "react-i18next";
import Dialog from "../../../components/common/Dialog";

function ProgressSection({ title, colorClass, data, prefix }) {
  const { t } = useTranslation();
  const items = [
    { label: t("progress_technical_actual"), value: data[`${prefix}_actual_current`] },
    { label: t("progress_technical_current"), value: data[`${prefix}_technical_current`] },
    { label: t("progress_technical_approved"), value: data[`${prefix}_technical_approved`] },
    { label: t("progress_financial"), value: data[`${prefix}_financial`] },
    { label: t("progress_invoice_approved"), value: data[`${prefix}_invoice_approved`] }
  ];

  return (
    <div className={`progress-section ${colorClass}`}>
      <h3 className="progress-section__title">{title}</h3>
      <div className="progress-grid">
        {items.map((item) => (
          <div key={item.label} className="progress-item">
            <span className="progress-item__label">{item.label}</span>
            <span className="progress-item__value">
              {item.value !== null && item.value !== undefined
                ? `${Number(item.value).toFixed(2)}%`
                : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTIONS = [
  { titleKey: "progress_overall", colorClass: "progress-section--gray", prefix: "overall" },
  { titleKey: "progress_owner_base", colorClass: "progress-section--blue", prefix: "owner" },
  { titleKey: "progress_bank_base", colorClass: "progress-section--green", prefix: "bank" },
  { titleKey: "progress_variations", colorClass: "progress-section--yellow", prefix: "variations" },
];

export default function ProgressDetailsDialog({ project, onClose }) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={Boolean(project)}
      title={
        project
          ? `${t("progress_details")} - ${project.display_name || project.name}`
          : ''
      }
      onClose={onClose}
      showActions={false}
      maxWidth="800px"
    >
      {project && (
        <div className="progress-details ds-flex ds-flex-col ds-gap-4">
          {SECTIONS.map((s) => (
            <ProgressSection
              key={s.prefix}
              title={t(s.titleKey)}
              colorClass={s.colorClass}
              data={project}
              prefix={s.prefix}
            />
          ))}
        </div>
      )}
    </Dialog>
  );
}
