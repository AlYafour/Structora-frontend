// Unified component for displaying a row in view mode
import { useTranslation } from "react-i18next";
import Field from "./Field";
import InfoTip from "../common/InfoTip";

export default function ViewRow({ label, value, tip, style }) {
  const { t } = useTranslation();
  return (
    <Field label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
        <span>{value !== undefined && value !== null && String(value) !== "" ? String(value) : t("empty_value")}</span>
        {tip ? <InfoTip align="start" text={tip} /> : null}
      </div>
    </Field>
  );
}
