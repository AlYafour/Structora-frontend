import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import Button from "../../../../components/common/Button";
import { FormSection, FormGrid } from "../../../../components/ui/form";
import StaticContractAttachmentFile from "./StaticContractAttachmentFile";
import ContractAttachment from "./ContractAttachment";

const ContractPdfReviewer = lazy(() => import("../../../../components/pdf-review/ContractPdfReviewer"));

/**
 * ContractAttachmentsSection - Contract attachments section
 * Displays static file uploads (contract, BOQ, materials table) and dynamic attachments (appendices)
 * Includes mandatory PDF page-by-page review for contract file.
 */
export default function ContractAttachmentsSection({
  form,
  setF,
  viewMode,
  projectId,
  isPrivateFunding,
  noPermit = false,
  isSuperAdmin = false,
  contractReviewState,
  onContractReviewStateChange,
  onContractReviewComplete,
  appendixReviewStates = {},
  onAppendixReviewStateChange,
  onAppendixReviewComplete,
  authDocFile = null,
  authDocFileUrl = null,
  authDocReviewState,
  onAuthDocReviewStateChange,
  onAuthDocReviewComplete,
  signatures = [],
  acknowledgmentChecked = false,
  onAcknowledgmentChange,
  reviewerName = "",
}) {
  const { t } = useTranslation();

  // Check if a file is a PDF
  const isPdf = (file, fileUrl) => {
    if (file instanceof File) return file.type === "application/pdf" || file.name?.endsWith(".pdf");
    if (fileUrl) return fileUrl.toLowerCase().endsWith(".pdf");
    return false;
  };


  const hasNewContractFile = form.contract_file instanceof File;
  const contractIsPdf = isPdf(form.contract_file, null);

  // Authorization document review
  const hasAuthDoc = authDocFile || authDocFileUrl;
  const authDocIsPdf = isPdf(authDocFile, authDocFileUrl);

  // Determine if all reviews are complete for showing acknowledgment
  const allReviewsComplete = (() => {
    if (viewMode) return false;
    let hasAnyReview = false;
    let allDone = true;

    // Contract review
    if (hasNewContractFile && contractIsPdf) {
      hasAnyReview = true;
      const contractDone = contractReviewState?.confirmedPages?.size > 0
        && contractReviewState.confirmedPages.size === contractReviewState.totalPages;
      if (!contractDone) allDone = false;
    }

    // Appendix reviews
    if (form.attachments?.length > 0) {
      form.attachments.filter(att => att && att.type !== "main_contract").forEach((att, idx) => {
        const origIdx = form.attachments.findIndex(a => a === att);
        const key = origIdx !== -1 ? origIdx : idx;
        if (isPdf(att.file, att.file_url) && (att.file || att.file_url)) {
          hasAnyReview = true;
          if (!appendixReviewStates[key] || appendixReviewStates[key].confirmedPages?.size !== appendixReviewStates[key].totalPages || appendixReviewStates[key].totalPages === 0) {
            allDone = false;
          }
        }
      });
    }

    // Auth doc review
    if (hasAuthDoc && authDocIsPdf) {
      hasAnyReview = true;
      const authDone = authDocReviewState?.confirmedPages?.size > 0
        && authDocReviewState.confirmedPages.size === authDocReviewState.totalPages;
      if (!authDone) allDone = false;
    }

    return hasAnyReview && allDone;
  })();

  return (
    <FormSection title={`7) ${t("contract.sections.attachments")}`}>
      {/* Core attachments */}
      <div className="wizard-mb-4">
        <FormGrid cols={3} gap="md">
          {/* 1) Original contract */}
          <StaticContractAttachmentFile
            label={t("attachments_original_contract_header")}
            value={form.contract_file}
            fileUrl={form.contract_file_url}
            fileName={form.contract_file_name}
            onChange={(file) => {
              setF("contract_file", file);

              // reset review ONLY when a new file is selected
              onContractReviewStateChange?.({
                confirmedPages: new Set(),
                totalPages: 0,
              });

              onContractReviewComplete?.(false);
            }}
            onRemoveExisting={() => {
              setF("contract_file_url", null);
              setF("contract_file_name", null);
              setF("contract_file", null);

              onContractReviewStateChange?.({
                confirmedPages: new Set(),
                totalPages: 0,
              });

              onContractReviewComplete?.(false);
            }}
            accept=".pdf"
            maxSizeMB={10}
            isView={viewMode}
            projectId={projectId}
            endpoint={`projects/${projectId}/contract/`}
          />

          {/* 2) Bill of Quantities */}
          <StaticContractAttachmentFile
            label={t("attachments_boq_header")}
            value={form.quantities_table_file}
            fileUrl={form.quantities_table_file_url}
            fileName={form.quantities_table_file_name}
            onChange={(file) => setF("quantities_table_file", file)}
            onRemoveExisting={() => {
              setF("quantities_table_file_url", null);
              setF("quantities_table_file_name", null);
              setF("quantities_table_file", null);
            }}
            accept=".pdf,.xlsx,.xls"
            maxSizeMB={10}
            isView={viewMode}
            projectId={projectId}
            endpoint={`projects/${projectId}/contract/`}
          />

          {/* 3) Approved materials table */}
          <StaticContractAttachmentFile
            label={t("attachments_materials_table_header")}
            value={form.approved_materials_table_file}
            fileUrl={form.approved_materials_table_file_url}
            fileName={form.approved_materials_table_file_name}
            onChange={(file) => setF("approved_materials_table_file", file)}
            onRemoveExisting={() => {
              setF("approved_materials_table_file_url", null);
              setF("approved_materials_table_file_name", null);
              setF("approved_materials_table_file", null);
            }}
            accept=".pdf,.xlsx,.xls"
            maxSizeMB={10}
            isView={viewMode}
            projectId={projectId}
            endpoint={`projects/${projectId}/contract/`}
          />

          {/* 4) Approved price offer — shown only when noPermit */}
          {noPermit && (
            <StaticContractAttachmentFile
              label={t("approved_price_offer")}
              value={form.price_offer_file}
              fileUrl={form.price_offer_file_url}
              fileName={form.price_offer_file_name}
              onChange={(file) => setF("price_offer_file", file)}
              onRemoveExisting={() => {
                setF("price_offer_file_url", null);
                setF("price_offer_file_name", null);
                setF("price_offer_file", null);
              }}
              accept=".pdf"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
          )}
        </FormGrid>
      </div>

      {/* PDF Review for contract file */}
      {!viewMode && hasNewContractFile && contractIsPdf && (
        <Suspense fallback={<div style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>{t("contract_review.loading")}</div>}>
          <ContractPdfReviewer
            file={form.contract_file}
            fileUrl={form.contract_file_url}
            isSuperAdmin={isSuperAdmin}
            reviewState={contractReviewState}
            onReviewStateChange={onContractReviewStateChange}
            onReviewComplete={onContractReviewComplete}
            signatures={signatures}
            label={t("attachments_original_contract_header")}
            reviewerName={reviewerName}
          />
        </Suspense>
      )}

      {/* Dynamic attachments (appendices) */}
      <div className="wizard-appendices-separator">
        <h5 className="wizard-appendices-separator__title">
          {t("contract.sections.contractual_appendices")}
        </h5>
        {viewMode ? (
          <div>
            {form.attachments && form.attachments.length > 0 ? (
              <FormGrid cols={3} gap="md">
                {form.attachments
                  .filter(att => {
                    if (att && att.type === "main_contract") {
                      return false;
                    }
                    return true;
                  })
                  .map((att, idx, filteredArray) => {
                    const previousAppendices = filteredArray
                      .slice(0, idx)
                      .filter(a => a.type === "appendix");
                    const appendixNumber = previousAppendices.length;

                    return (
                      <ContractAttachment
                        key={att.id || att.label || idx}
                        attachment={att}
                        index={appendixNumber}
                        attachmentIndex={idx}
                        isView={true}
                        onUpdate={() => { }}
                        onRemove={() => { }}
                        canRemove={false}
                        projectId={projectId}
                        isPrivateFunding={isPrivateFunding}
                      />
                    );
                  })}
              </FormGrid>
            ) : (
              <div className="card text-center prj-muted p-20">
                {t("contract.no_appendices")}
              </div>
            )}
          </div>
        ) : (
          <div>
            {form.attachments && form.attachments.length > 0 && (
              <>
                <FormGrid cols={3} gap="md">
                  {form.attachments
                    .filter(att => {
                      if (att && att.type === "main_contract") {
                        return false;
                      }
                      return true;
                    })
                    .map((att, idx, filteredArray) => {
                      const previousAppendices = filteredArray
                        .slice(0, idx)
                        .filter(a => a.type === "appendix");
                      const appendixNumber = previousAppendices.length;
                      const originalIndex = form.attachments.findIndex(a => a === att);
                      const attKey = originalIndex !== -1 ? originalIndex : idx;

                      return (
                        <ContractAttachment
                          key={attKey}
                          attachment={att}
                          index={appendixNumber}
                          attachmentIndex={attKey}
                          isView={false}
                          onUpdate={(attIndex, field, value) => {
                            const updated = [...form.attachments];
                            updated[attIndex] = { ...updated[attIndex], [field]: value };
                            setF("attachments", updated);
                            // Reset review for this appendix when file changes
                            if (field === "file") {
                              onAppendixReviewStateChange?.(attKey, { confirmedPages: new Set(), totalPages: 0 });
                            }
                          }}
                          onRemove={(attIndex) => {
                            const updated = form.attachments.filter((_, i) => i !== attIndex);
                            setF("attachments", updated);
                          }}
                          canRemove={true}
                          projectId={projectId}
                          isPrivateFunding={isPrivateFunding}
                        />
                      );
                    })}
                </FormGrid>

                {/* PDF Review for each appendix that is a PDF */}
                {form.attachments
                  .filter(att => att && att.type !== "main_contract")
                  .map((att, idx) => {
                    const originalIndex = form.attachments.findIndex(a => a === att);
                    const attKey = originalIndex !== -1 ? originalIndex : idx;
                    const attFile = att.file;
                    const attFileUrl = att.file_url;
                    const attIsPdf = isPdf(attFile, attFileUrl);

                    if (!attIsPdf || (!attFile && !attFileUrl)) return null;

                    return (
                      <Suspense key={`review-${attKey}`} fallback={<div style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>{t("contract_review.loading")}</div>}>
                        <ContractPdfReviewer
                          file={attFile}
                          fileUrl={attFileUrl}
                          isSuperAdmin={isSuperAdmin}
                          reviewState={appendixReviewStates[attKey]}
                          onReviewStateChange={(state) => onAppendixReviewStateChange?.(attKey, state)}
                          onReviewComplete={(done) => onAppendixReviewComplete?.(attKey, done)}
                          label={att.label || `${t("contract.appendix")} ${idx + 1}`}
                          reviewerName={reviewerName}
                        />
                      </Suspense>
                    );
                  })}
              </>
            )}

            <div className="wizard-mt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  const newAttachment = {
                    type: "",
                    date: "",
                    file: null,
                    file_url: null,
                    file_name: null,
                    price: "",
                    notes: "",
                  };
                  setF("attachments", [...(form.attachments || []), newAttachment]);
                }}
              >
                + {t("contract.add_new_appendix")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Authorization document PDF review */}
      {!viewMode && hasAuthDoc && authDocIsPdf && (
        <Suspense fallback={<div style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>{t("contract_review.loading")}</div>}>
          <ContractPdfReviewer
            file={authDocFile}
            fileUrl={authDocFileUrl}
            isSuperAdmin={isSuperAdmin}
            reviewState={authDocReviewState}
            onReviewStateChange={onAuthDocReviewStateChange}
            onReviewComplete={onAuthDocReviewComplete}
            signatures={signatures}
            label={t("contract.authorization_document_review") || "مراجعة مستند التفويض"}
            reviewerName={reviewerName}
          />
        </Suspense>
      )}

      {/* Final acknowledgment — shown only when ALL document reviews are complete */}
      {!viewMode && allReviewsComplete && (
        <div className={`cpdf-acknowledgment ${acknowledgmentChecked ? "cpdf-acknowledgment--done" : ""}`}>
          <label className="cpdf-acknowledgment__label">
            <input
              type="checkbox"
              checked={acknowledgmentChecked}
              onChange={(e) => onAcknowledgmentChange?.(e.target.checked)}
              className="cpdf-confirm__checkbox"
            />
            <span className="cpdf-acknowledgment__text">
              {t("contract_review.acknowledgment_text")}
            </span>
          </label>
        </div>
      )}
    </FormSection>
  );
}
