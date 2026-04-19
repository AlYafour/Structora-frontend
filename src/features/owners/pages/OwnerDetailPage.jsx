import { useParams, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { projectApi } from "../../../services/projects";
import { useState, useEffect } from "react";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import ViewRow from "../../../components/forms/ViewRow";
import { FaUser, FaEdit } from "react-icons/fa";
import { calculateAgeFromEmiratesId } from "../../../utils/formatters/id";
import { logger } from "../../../utils/logger";
import "./OwnerDetailPage.css";

export default function OwnerDetailPage() {
 const { ownerName } = useParams();
 const location = useLocation();
 const { t, i18n } = useTranslation();
 const isAR = /^ar\b/i.test(i18n.language || "");
 const [ownerData, setOwnerData] = useState(location.state?.ownerData || null);
 const [projects, setProjects] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [profileImage, setProfileImage] = useState("");

 useEffect(() => {
 if (ownerData) {
 loadProjects();
 // Load profile image from localStorage
 const savedImage = localStorage.getItem(`owner_${ownerData.name}_image`);
 if (savedImage) {
 setProfileImage(savedImage);
 }
 } else {
 setError(t("owner_data_not_found"));
 setLoading(false);
 }
 }, [ownerData]);

 const handleImageUpload = (e) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 const url = reader.result;
 setProfileImage(url);
 localStorage.setItem(`owner_${ownerData.name}_image`, url);
 };
 reader.readAsDataURL(file);
 }
 };

 const loadProjects = async () => {
 if (!ownerData) return;
 setLoading(true);
 try {
 const projectDetails = await Promise.all(
 ownerData.projects.map(async (p) => {
 try {
 const data = await projectApi.getById(p.id);
 return { ...p, ...data };
 } catch (e) {
 return p;
 }
 })
 );
 setProjects(projectDetails);
 } catch (e) {
 logger.error("Error loading projects", e);
 setError(t("error_loading_projects"));
 } finally {
 setLoading(false);
 }
 };

 if (loading) {
 return <PageLayout loading={true} loadingText={t("loading")} />;
 }

 if (error || !ownerData) {
 return (
 <PageLayout>
 <div className="container">
 <div className="card">
 <h2>{t("error")}</h2>
 <p>{error || t("owner_data_not_found")}</p>
 <Button as={Link} to="/owners" variant="primary">
 {t("back_to_owners")}
 </Button>
 </div>
 </div>
 </PageLayout>
 );
 }

 const fullOwnerData = ownerData.fullData || {};
 // Use age from backend if available, otherwise calculate from ID number
 const age = fullOwnerData.age ?? calculateAgeFromEmiratesId(fullOwnerData.id_number);

 return (
 <PageLayout>
 <div className="container">
 {/* Owner Profile */}
 <div className="card ds-mb-6">
 <div className="ds-flex ds-gap-8 ds-p-8 ds-items-start ds-flex-wrap">
 {/* Profile Image */}
 <div className="ds-relative ds-shrink-0">
 {profileImage ? (
 <div className="ds-relative">
 <img
 src={profileImage}
 alt={ownerData.name}
 className="ds-rounded-lg owner-detail__profile-image"
 />
 <label
 className="ds-flex ds-flex-center owner-detail__edit-btn"
 >
 <FaEdit className="ds-text-sm" />
 <input
 type="file"
 accept="image/*"
 onChange={handleImageUpload}
 className="ds-hidden"
 />
 </label>
 </div>
 ) : (
 <label
 className="ds-flex ds-flex-col ds-flex-center ds-gap-3 owner-detail__upload-placeholder"
 >
 <FaUser className="owner-detail__upload-icon" />
 <span className="ds-font-medium ds-text-sm ds-text-muted">
 {t("upload_image")}
 </span>
 <input
 type="file"
 accept="image/*"
 onChange={handleImageUpload}
 className="ds-hidden"
 />
 </label>
 )}
 </div>

 {/* Owner Information */}
 <div className="ds-flex-1 ds-min-w-300">
 <Button as={Link} to="/owners" variant="ghost" className="ds-mb-4">
 ← {t("back_to_owners")}
 </Button>
 <h1 className="ds-font-bold owner-detail__name">
 {ownerData.name}
 </h1>
 {ownerData.nameAr && (
 <p className="owner-detail__name-ar">
 {ownerData.nameAr}
 </p>
 )}
 {ownerData.nameEn && (
 <p className="owner-detail__name-en">
 {ownerData.nameEn}
 </p>
 )}
 </div>
 </div>
 </div>

 {/* Owner Details */}
 <div className="card">
 <div className="card-body">
 <h2 className="ds-mb-6">{t("owner_details")}</h2>

 <div className="form-grid cols-2">
 <ViewRow
 label={t("owner_name")}
 value={ownerData.name}
 />
 {ownerData.nameAr && (
 <ViewRow
 label={t("owner_name_ar")}
 value={ownerData.nameAr}
 />
 )}
 {ownerData.nameEn && (
 <ViewRow
 label={t("owner_name_en")}
 value={ownerData.nameEn}
 />
 )}
 {fullOwnerData.nationality && (
 <ViewRow
 label={t("nationality")}
 value={fullOwnerData.nationality}
 />
 )}
 {fullOwnerData.id_number && (
 <ViewRow
 label={t("id_number")}
 value={fullOwnerData.id_number}
 />
 )}
 {age !== null && (
 <ViewRow
 label={t("age")}
 value={`${age} ${isAR ? t("year") : t("years")}`}
 />
 )}
 {fullOwnerData.phone && (
 <ViewRow
 label={t("phone")}
 value={fullOwnerData.phone}
 />
 )}
 {fullOwnerData.email && (
 <ViewRow
 label={t("email")}
 value={fullOwnerData.email}
 />
 )}
 {fullOwnerData.share_percent && (
 <ViewRow
 label={t("share_percent")}
 value={`${fullOwnerData.share_percent}%`}
 />
 )}
 {fullOwnerData.right_hold_type && (
 <ViewRow
 label={t("right_hold_type")}
 value={fullOwnerData.right_hold_type}
 />
 )}
 </div>
 </div>

 {/* Projects */}
 <div className="mt-16">
 <h2>{t("projects")} ({projects.length})</h2>
 {projects.length === 0 ? (
 <p className="prj-muted mt-16">{t("no_projects_found")}</p>
 ) : (
 <div className="prj-table__wrapper mt-16">
 <table className="prj-table">
 <thead>
 <tr>
 <th>{t("project_name")}</th>
 <th>{t("internal_code")}</th>
 <th>{t("type")}</th>
 <th>{t("action")}</th>
 </tr>
 </thead>
 <tbody>
 {projects.map((p) => (
 <tr key={p.id}>
 <td>{p.name || p.display_name || `Project #${p.id}`}</td>
 <td>
 <code>{p.internal_code || `PRJ-${p.id}`}</code>
 </td>
 <td>{p.project_type || t("empty_value")}</td>
 <td>
 <Button as={Link} to={`/projects/${p.id}`} variant="primary" className="ds-me-2">
 {t("view")}
 </Button>
 <Button as={Link} to={`/projects/${p.id}/wizard`} variant="ghost">
 {t("edit")}
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </div>
 </PageLayout>
 );
}
