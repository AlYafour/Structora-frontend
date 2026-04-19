import { useTranslation } from "react-i18next";
import Button from "../../../../components/common/Button";
import OwnerForm from "./OwnerForm";
import CollapsibleSection from "./CollapsibleSection";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";

/**
 * OwnerDetailsSection Component
 *
 * Manages owner information including:
 * - Owner list management (add/remove)
 * - Owner form fields (name, ID, phone, email, share %)
 * - ID file uploads per owner
 * - Authorized owner selection
 * - Share percentage validation
 *
 * @param {Object} props - Component props
 * @param {Array} props.owners - Array of owner objects
 * @param {Function} props.setOwners - Function to update owners array
 * @param {boolean} props.viewMode - Whether the component is in view mode
 * @param {Function} props.addOwner - Function to add a new owner
 * @param {Function} props.removeOwner - Function to remove an owner by index
 * @param {Function} props.updateOwner - Function to update an owner by index
 * @param {Function} props.handleAuthorizedChange - Function to handle authorized owner changes
 * @param {Object} props.ownerFileUrls - Object mapping owner index to file URLs
 * @param {Object} props.ownerFileNames - Object mapping owner index to file names
 * @param {string|number} props.projectId - Project ID
 * @param {boolean} props.isAR - Whether the current language is Arabic
 * @param {Array} props.contractOwners - Array of contract owners for data matching
 */
export default function OwnerDetailsSection({
  owners,
  viewMode,
  addOwner,
  removeOwner,
  updateOwner,
  ownerFileUrls,
  ownerFileNames,
  projectId,
  isAR,
  contractOwners = [],
  hideIdUpload = false,
  onAuthorizedChange,
  verifiedFields = {},
  onToggleVerify,
}) {
  const { t } = useTranslation();

  /**
   * Matches site plan owner with contract owner data
   * @param {Object} sitePlanOwner - Owner from site plan
   * @returns {Object|null} - Matched contract owner or null
   */
  const getContractOwnerData = (sitePlanOwner) => {
    if (!contractOwners || contractOwners.length === 0) return null;

    // Try to match by ID number first
    if (sitePlanOwner.id_number) {
      const matched = contractOwners.find(
        (co) => co.id_number && co.id_number.trim() === sitePlanOwner.id_number.trim()
      );
      if (matched) return matched;
    }

    // Try to match by Arabic name
    if (sitePlanOwner.owner_name_ar) {
      const matched = contractOwners.find(
        (co) => co.owner_name_ar && co.owner_name_ar.trim() === sitePlanOwner.owner_name_ar.trim()
      );
      if (matched) return matched;
    }

    return null;
  };

  return (
    <CollapsibleSection title={t("owner_details_by_id_card")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}>
      {viewMode ? (
        <div className="stack">
          {owners.length === 0 ? (
            <div className="card text-center prj-muted p-20">
              {t("no_owners_added")}
            </div>
          ) : (
            owners.map((o, i) => {
              const fileUrl =
                ownerFileUrls[i] ||
                (typeof o.id_attachment === "string" && o.id_attachment.trim() !== ""
                  ? o.id_attachment
                  : "");
              const fileName =
                ownerFileNames[i] ||
                (o.id_attachment instanceof File ? o.id_attachment.name : "") ||
                (fileUrl ? extractFileNameFromUrl(fileUrl) : "");
              const contractOwner = getContractOwnerData(o);
              const ownerWithContractData = {
                ...o,
                phone: contractOwner?.phone || o.phone || "",
                email: contractOwner?.email || o.email || "",
              };
              return (
                <OwnerForm
                  key={o._uid || o.id || i}
                  owner={ownerWithContractData}
                  index={i}
                  isView={true}
                  isAR={isAR}
                  idAttachmentUrl={fileUrl}
                  projectId={projectId}
                  idAttachmentFileName={fileName}
                  hideIdUpload={hideIdUpload}
                />
              );
            })
          )}
        </div>
      ) : (
        <>
          {owners.length === 0 ? (
            <div className="card text-center prj-muted p-20">
              {t("no_owners_added")}
            </div>
          ) : (
            owners.map((o, i) => {
              const fileUrl =
                ownerFileUrls[i] ||
                (typeof o.id_attachment === "string" && o.id_attachment.trim() !== ""
                  ? o.id_attachment
                  : "");
              const fileName =
                ownerFileNames[i] ||
                (o.id_attachment instanceof File ? o.id_attachment.name : "") ||
                (fileUrl ? extractFileNameFromUrl(fileUrl) : "");
              return (
                <OwnerForm
                  key={o._uid || o.id || i}
                  owner={o}
                  index={i}
                  isView={false}
                  onUpdate={updateOwner}
                  onRemove={removeOwner}
                  canRemove={owners.length > 1}
                  isAR={isAR}
                  idAttachmentUrl={fileUrl}
                  projectId={projectId}
                  idAttachmentFileName={fileName}
                  hideContactInfo={true}
                  hideIdUpload={hideIdUpload}
                  isAuthorized={!!o.is_authorized}
                  onAuthorizedChange={onAuthorizedChange}
                  verifiedFields={verifiedFields}
                  onToggleVerify={onToggleVerify}
                />
              );
            })
          )}
          <div className="ds-mt-3">
            <Button variant="secondary" onClick={addOwner}>
              {t("add_owner")}
            </Button>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
