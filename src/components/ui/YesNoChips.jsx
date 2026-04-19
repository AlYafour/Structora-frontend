// Unified Yes/No selection component
import { useTranslation } from "react-i18next";
import Button from "../common/Button";

export default function YesNoChips({ value, onChange, disabled = false }) {
  const { t } = useTranslation();
  
  return (
    <div className="chips">
      {["no", "yes"].map(v => (
        <Button
          key={v}
          type="button"
          variant={value === v ? "primary" : "secondary"}
          className={`chip ${value === v ? "active" : ""}`}
          onClick={() => !disabled && onChange(v)}
          disabled={disabled}
        >
          {v === "yes" ? t("yes") : t("no")}
        </Button>
      ))}
    </div>
  );
}

