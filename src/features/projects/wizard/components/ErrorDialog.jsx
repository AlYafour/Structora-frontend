import { useTranslation } from "react-i18next";
import Dialog from "../../../../components/common/Dialog";

/**
 * Shared error/warning dialog used across wizard steps.
 *
 * @param {string}   errorMsg    – the message to display (falsy = hidden)
 * @param {function} setErrorMsg – setter to clear the message
 * @param {"warning"|"error"} [title] – override the dialog title key (default "warning")
 */
export default function ErrorDialog({ errorMsg, setErrorMsg, title }) {
  const { t } = useTranslation();
  const clear = () => setErrorMsg("");

  return (
    <Dialog
      open={!!errorMsg}
      title={t(title || "warning")}
      desc={<pre className="pre-wrap m-0">{errorMsg}</pre>}
      confirmLabel={t("ok")}
      onClose={clear}
      onConfirm={clear}
    />
  );
}
