import { useTranslation } from "react-i18next";
import { FaRegEye } from "react-icons/fa";
import { FiDownload, FiFile } from "react-icons/fi";
import { openFileInNewWindow, downloadFile, extractFileNameFromUrl } from "../../utils/helpers/file";
import Button from "../common/Button";
import "./FileAttachmentView.css";

export default function FileAttachmentView({ fileUrl, fileName, projectId, endpoint }) {
 const { t } = useTranslation();

 if (!fileUrl && !fileName) {
 return <div className="file-attachment-view__empty">{t("no_file_attached")}</div>;
 }

 // Extract file name and decode URL
 const getDisplayName = () => {
 if (fileName) {
 try {
 return decodeURIComponent(fileName);
 } catch { /* decodeURIComponent fallback */
 return fileName;
 }
 }
 if (fileUrl) {
 return extractFileNameFromUrl(fileUrl) || t("file");
 }
 return t("file");
 };

 const displayName = getDisplayName();

 const handleView = async (e) => {
 if (e) {
 e.preventDefault();
 e.stopPropagation();
 }
 if (!fileUrl) return;
 await openFileInNewWindow(fileUrl, displayName);
 };

 const handleDownload = async (e) => {
 if (e) {
 e.preventDefault();
 e.stopPropagation();
 }
 if (!fileUrl) return;
 await downloadFile(fileUrl, displayName);
 };

 return (
 <div className="file-attachment-view__container">
 <div className="file-attachment-view__icon">
 <FiFile />
 </div>
 <div className="file-attachment-view__info">
 <span className="file-attachment-view__filename" title={displayName}>
 {displayName}
 </span>
 </div>
 <div className="file-attachment-view__actions">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="file-attachment-view__btn"
 onClick={handleView}
 disabled={!fileUrl}
 title={t("view_file")}
 >
 <FaRegEye />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 className="file-attachment-view__btn"
 onClick={handleDownload}
 disabled={!fileUrl}
 title={t("download_file")}
 >
 <FiDownload />
 </Button>
 </div>
 </div>
 );
}
