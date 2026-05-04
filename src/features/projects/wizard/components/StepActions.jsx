/**
 * StepActions - Unified Navigation Buttons
 *
 * Unified button system for all wizard steps:
 * - Primary button: "Save and Continue" or "Finish" on the last step
 * - Secondary button: "Back"
 *
 * Same labels, order, colors, and placement on all pages
 */
import { useTranslation } from "react-i18next";
import Button from "../../../../components/common/Button";
import "./wizard.css";

export default function StepActions({
  onPrev,
  onNext,
  disableNext = false,
  isLoading = false,
  isLastStep = false,
  showPrev = true,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // Unified text - same text on all pages
  const prevText = t("back");
  const nextText = isLastStep
    ? (t("finish"))
    : (t("save_and_continue"));
  const loadingText = t("saving");

  const handleNext = async () => {
    if (disableNext || isLoading) return;
    if (typeof onNext === "function") {
      try {
        await onNext();
      } catch {
        // error is already shown by the step's ErrorDialog
      }
    }
  };

  const handlePrev = () => {
    if (typeof onPrev === "function") onPrev();
  };

  return (
    <div className="wizard-actions-bar" dir={isRTL ? "rtl" : "ltr"}>
      <div className="wizard-actions-bar__inner">
        {/* Back button (Secondary) */}
        {showPrev && onPrev ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={handlePrev}
            disabled={isLoading}
            className="wizard-actions__btn-size"
          >
            {prevText}
          </Button>
        ) : (
          <span />
        )}

        {/* Save and continue button (Primary) */}
        {onNext && (
          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            disabled={disableNext || isLoading}
            loading={isLoading}
            className="wizard-actions__btn-size"
          >
            {isLoading ? loadingText : nextText}
          </Button>
        )}
      </div>
    </div>
  );
}
