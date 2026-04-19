import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./wizard-stepper.css";

export default function WizardStepper({
  steps = [],
  currentIndex = 0,
  onStepClick,
  isStepCompleted,
  canEnter,
  showTooltips = true,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar");
  const [hoveredStep, setHoveredStep] = useState(null);

  return (
    <div className="wizard-stepper" dir={isRTL ? "rtl" : "ltr"} role="tablist" aria-label={t("wizard.steps") || "Wizard steps"}>
      {steps.map((step, index) => {
        const isCompleted = isStepCompleted?.(step.id) || index < currentIndex;
        const isActive    = index === currentIndex;
        const isClickable = canEnter?.(index) ?? true;
        const isUpcoming  = index > currentIndex && !isCompleted;
        const isHovered   = hoveredStep === index;

        const cls = [
          "wizard-stepper__item",
          isCompleted && "wizard-stepper__item--completed",
          isActive    && "wizard-stepper__item--active",
          isUpcoming  && "wizard-stepper__item--upcoming",
          !isClickable && "wizard-stepper__item--disabled",
        ].filter(Boolean).join(" ");

        const tooltip = (() => {
          if (!showTooltips || isClickable) return null;
          if (index > 0 && !isStepCompleted?.(steps[index - 1]?.id))
            return t("wizard.complete_previous_step") || "أكمل الخطوة السابقة أولاً";
          return t("wizard.step_disabled") || "هذه الخطوة غير متاحة بعد";
        })();

        return (
          <div
            key={step.id ?? index}
            className="wizard-stepper__item-wrapper"
            onMouseEnter={() => setHoveredStep(index)}
            onMouseLeave={() => setHoveredStep(null)}
          >
            <button
              type="button"
              role="tab"
              className={cls}
              onClick={() => isClickable && onStepClick?.(index)}
              disabled={!isClickable}
              aria-selected={isActive}
              aria-disabled={!isClickable}
              aria-label={`${t("wizard.step") || "خطوة"} ${index + 1}: ${step.title}`}
              tabIndex={isClickable ? 0 : -1}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onStepClick?.(index);
                }
              }}
            >
              {/* Circle */}
              <span className="wizard-stepper__indicator" aria-hidden="true">
                {isCompleted ? (
                  <svg className="wizard-stepper__check" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="wizard-stepper__number">{index + 1}</span>
                )}
              </span>

              {/* Label */}
              <div className="wizard-stepper__content">
                <span className="wizard-stepper__step-num">
                  {isCompleted
                    ? (t("wizard.completed") || "مكتملة")
                    : isActive
                    ? (t("wizard.current") || "الحالية")
                    : `${t("wizard.step") || "خطوة"} ${index + 1}`}
                </span>
                <span className="wizard-stepper__label">{step.title}</span>
              </div>
            </button>

            {/* Tooltip */}
            {tooltip && isHovered && !isClickable && (
              <div className="wizard-stepper__tooltip" role="tooltip">
                {tooltip}
                <div className="wizard-stepper__tooltip-arrow" />
              </div>
            )}
          </div>
        );
      })}

      {/* Screen reader live region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`${t("wizard.step") || "خطوة"} ${currentIndex + 1} / ${steps.length}: ${steps[currentIndex]?.title}`}
      </div>
    </div>
  );
}
