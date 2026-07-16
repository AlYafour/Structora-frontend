import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function SessionExpiredModal({ open, onConfirm }) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar");

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
      }}
      aria-labelledby="session-expired-title"
    >
      <DialogTitle id="session-expired-title">
        {isArabic ? "انتهت صلاحية الجلسة" : "Session expired"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {isArabic
            ? "انتهت صلاحية جلسة عملك. يرجى تسجيل الدخول مرة أخرى للمتابعة."
            : "Your session has expired. Please log in again to continue."}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onConfirm} variant="contained" autoFocus>
          {isArabic ? "تسجيل الدخول مرة أخرى" : "Log in again"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
