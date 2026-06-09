import { Suspense } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Card from "../../../components/common/Card";
import Dialog from "../../../components/common/Dialog";
import PageLayout from "../../../components/layout/PageLayout";
import useProjectData from "../../../hooks/useProjectData";
import useProjectPermissions from "../../../hooks/useProjectPermissions";
import { useAuth } from "../../../contexts/AuthContext";
import { getTabComponent } from "../tabs/registry";
import { useProjectTabs } from "../hooks/useProjectTabs.js";
import useProjectWorkflow from "../hooks/useProjectWorkflow";
import ProjectViewHeader from "../components/ProjectViewHeader";
import ProjectTabsNavigation from "../components/ProjectTabsNavigation";
import { getProjectName } from "../utils/projectHelpers.js";
import { useLanguage } from "../../../hooks";

export default function ProjectView() {
 const { projectId } = useParams();
 const { t } = useTranslation();
 const { user } = useAuth();
 const { project, siteplan, license, contract, awarding, startOrder, projectSchedule, excavationNotice, payments, variations, invoices, prolongationFees, loading, reload } = useProjectData(projectId);
 const { permissions: projectPermissions, loading: permissionsLoading } = useProjectPermissions(projectId);
 // Determine user type
 const isManager = user?.role?.name === 'Manager';
 const isSuperAdmin = user?.is_superuser || user?.role?.name === 'company_super_admin';
 const isCompanySuperAdmin = user?.role?.name === 'company_super_admin';
 const canDeleteProject = isCompanySuperAdmin && projectPermissions?.can_delete === true;

 // Use custom hook for tabs
 const { activeTab, setActiveTab } = useProjectTabs("overview");

 const { isArabic: isAR } = useLanguage();

const projectDisplayName = isAR
  ? (project?.display_name || project?.name || t("wizard_project_prefix") + ` #${projectId}`)
  : (project?.display_name_en || project?.display_name || project?.name || t("wizard_project_prefix") + ` #${projectId}`);

 // Use workflow hook for all dialog states and action handlers
 const {
 confirmOpen, setConfirmOpen, deleting,
 errorMsg, setErrorMsg,
 submitDialogOpen, setSubmitDialogOpen,
 approveDialogOpen, setApproveDialogOpen,
 rejectDialogOpen, setRejectDialogOpen,
 finalApproveDialogOpen, setFinalApproveDialogOpen,
 revokeFinalApprovalDialogOpen, setRevokeFinalApprovalDialogOpen,
 actionNotes, setActionNotes,
 processingAction,
 onDelete, handleSubmit, handleApprove, handleReject, handleFinalApprove, handleRevokeFinalApproval,
 } = useProjectWorkflow(projectId, reload);

 const hasStartOrder = !!startOrder;
 const isHousingLoan = contract?.contract_classification === "housing_loan_program";

 return (
 <PageLayout loading={loading} loadingText={t("loading")}>
 <div className="container">
 {/* Header Section */}
 <ProjectViewHeader
 project={project}
 projectId={projectId}
 projectPermissions={projectPermissions}
 activeTab={activeTab}
 isManager={isManager}
 isSuperAdmin={isSuperAdmin}
 canDeleteProject={canDeleteProject}
 permissionsLoading={permissionsLoading}
 onDeleteClick={() => canDeleteProject && setConfirmOpen(true)}
 onSubmitClick={() => setSubmitDialogOpen(true)}
 onApproveClick={() => setApproveDialogOpen(true)}
 onRejectClick={() => setRejectDialogOpen(true)}
 onFinalApproveClick={() => setFinalApproveDialogOpen(true)}
 onRevokeFinalApprovalClick={() => setRevokeFinalApprovalDialogOpen(true)}
 siteplan={siteplan}
 />

 {/* Main Content Card with Tabs */}
 <Card className="prj-main-card">
 {/* Tabs Navigation */}
 <ProjectTabsNavigation
 activeTab={activeTab}
 onTabChange={setActiveTab}
 hasStartOrder={hasStartOrder}
 isHousingLoan={isHousingLoan}
 />

 {/* Tab Content */}
 <div className="prj-tab-content">
 {(() => {
 const TabComponent = getTabComponent(activeTab);
 if (!TabComponent) return null;

 return (
 <Suspense fallback={<div className="prj-tab-panel project-view__tab-loading">{t("loading")}</div>}>
 {activeTab === "overview" && (
 <TabComponent
 projectId={projectId}
 project={project}
 contract={contract}
 siteplan={siteplan}
 projectPermissions={projectPermissions}
 onDeleteClick={() => canDeleteProject && setConfirmOpen(true)}
 onReload={reload}
 />
 )}
 {activeTab === "siteplan" && (
 <TabComponent projectId={projectId} siteplan={siteplan} projectPermissions={projectPermissions} />
 )}
 {activeTab === "license" && (
 <TabComponent projectId={projectId} license={license} projectPermissions={projectPermissions} />
 )}
 {activeTab === "contract" && (
 <TabComponent projectId={projectId} contract={contract} startOrder={startOrder} projectPermissions={projectPermissions} />
 )}
 {activeTab === "awarding" && (
 <TabComponent projectId={projectId} awarding={awarding} />
 )}
 {activeTab === "start_order" && (
 <TabComponent projectId={projectId} startOrder={startOrder} onDeleted={reload} />
 )}
 {activeTab === "project_schedule" && (
 <TabComponent projectId={projectId} projectSchedule={projectSchedule} />
 )}
 {activeTab === "excavation_notice" && (
 <TabComponent projectId={projectId} excavationNotice={excavationNotice} />
 )}
 {hasStartOrder && activeTab === "extensions" && (
 <TabComponent projectId={projectId} startOrder={startOrder} />
 )}
 {/* Unified financial tab */}
 {(activeTab === "financial" || activeTab === "project_contract_financial_summary" || activeTab === "project_financial_entitlements") && (
 <TabComponent
 projectId={projectId}
 contract={contract}
 variations={variations}
 payments={payments}
 prolongationFees={prolongationFees}
 />
 )}
 {activeTab === "variations" && (
 <TabComponent projectId={projectId} project={project} variations={variations} onReload={reload} />
 )}
 {activeTab === "payments" && (
 <TabComponent projectId={projectId} payments={payments} onReload={reload} />
 )}
 {activeTab === "payment_claims" && (
 <TabComponent projectId={projectId} onReload={reload} />
 )}
 {activeTab === "invoices" && (
 <TabComponent projectId={projectId} invoices={invoices} onReload={reload} />
 )}
 {activeTab === "receipt_vouchers" && (
 <TabComponent projectId={projectId} />
 )}
 {activeTab === "tax_invoices" && (
 <TabComponent projectId={projectId} />
 )}
 {activeTab === "progress" && (
 <TabComponent projectId={projectId} onReload={reload} />
 )}
 {activeTab === "prolongation_fees" && (
 <TabComponent projectId={projectId} onReload={reload} />
 )}
 </Suspense>
 );
 })()}
 </div>
 </Card>
 </div>

 {/* Dialogs */}

 <Dialog
  open={confirmOpen}
  title={t("confirm_delete")}
  desc={
    <>
      {t("confirm_delete_desc")}{" "}
      <b>{projectDisplayName}</b>?<br />
      {t("delete_cannot_undo")}
    </>
  }
  confirmLabel={deleting ? t("deleting") : t("delete_permanent")}
  cancelLabel={t("cancel")}
  onClose={() => !deleting && setConfirmOpen(false)}
  onConfirm={onDelete}
  danger
  busy={deleting}
/>
 {/* Error dialog */}
 <Dialog
 open={!!errorMsg}
 title={t("error")}
 desc={errorMsg}
 confirmLabel={t("ok")}
 onClose={() => setErrorMsg("")}
 onConfirm={() => setErrorMsg("")}
 />

 {/* Dialog for submitting project for approval */}
 <Dialog
 open={submitDialogOpen}
 title={t("submit_for_approval")}
 desc={
 <div>
 <p>{t("submit_project_confirmation")}</p>
 <p className="ds-mt-2 ds-text-sm ds-text-muted">
 {t("submit_project_warning")}
 </p>
 </div>
 }
 confirmLabel={t("submit")}
 cancelLabel={t("cancel")}
 onClose={() => setSubmitDialogOpen(false)}
 onConfirm={handleSubmit}
 busy={processingAction}
 />

 {/* Dialog for stage approval */}
 <Dialog
 open={approveDialogOpen}
 title={t("approve_stage")}
 desc={
 <div>
 <p>{t("approve_stage_confirmation")}</p>
 <div className="ds-mt-4">
 <label className="ds-block ds-mb-2 ds-font-medium">
 {t("notes")} ({t("optional")})
 </label>
 <textarea
 className="prj-input"
 rows={3}
 value={actionNotes}
 onChange={(e) => setActionNotes(e.target.value)}
 placeholder={t("approval_notes_placeholder")}
 />
 </div>
 </div>
 }
 confirmLabel={t("approve")}
 cancelLabel={t("cancel")}
 onClose={() => {
 setApproveDialogOpen(false);
 setActionNotes("");
 }}
 onConfirm={handleApprove}
 busy={processingAction}
 />

 {/* Dialog for project rejection */}
 <Dialog
 open={rejectDialogOpen}
 title={t("reject_project")}
 desc={
 <div>
 <p>{t("reject_project_confirmation")}</p>
 <div className="ds-mt-4">
 <label className="ds-block ds-mb-2 ds-font-medium">
 {t("rejection_reason")} *
 </label>
 <textarea
 className="prj-input"
 rows={4}
 value={actionNotes}
 onChange={(e) => setActionNotes(e.target.value)}
 placeholder={t("rejection_reason_placeholder")}
 required
 />
 </div>
 </div>
 }
 confirmLabel={t("reject")}
 cancelLabel={t("cancel")}
 onClose={() => {
 setRejectDialogOpen(false);
 setActionNotes("");
 }}
 onConfirm={handleReject}
 busy={processingAction}
 danger
 />

 {/* Dialog for final approval */}
 <Dialog
 open={finalApproveDialogOpen}
 title={t("final_approve")}
 desc={
 <div>
 <p className="project-view__final-approve-text">
 {t("final_approve_confirmation")}
 </p>
 <p className="ds-mt-2 ds-text-sm ds-text-muted">
 {t("final_approve_warning")}
 </p>
 <div className="ds-mt-4">
 <label className="ds-block ds-mb-2 ds-font-medium">
 {t("notes")} ({t("optional")})
 </label>
 <textarea
 className="prj-input"
 rows={3}
 value={actionNotes}
 onChange={(e) => setActionNotes(e.target.value)}
 placeholder={t("final_approval_notes_placeholder")}
 />
 </div>
 </div>
 }
 confirmLabel={t("final_approve")}
 cancelLabel={t("cancel")}
 onClose={() => {
 setFinalApproveDialogOpen(false);
 setActionNotes("");
 }}
 onConfirm={handleFinalApprove}
 busy={processingAction}
 />

 {/* Dialog for revoking final approval */}
 <Dialog
 open={revokeFinalApprovalDialogOpen}
 title={t("revoke_final_approval")}
 desc={
 <div>
 <p className="project-view__final-approve-text">
 {t("revoke_final_approval_confirmation")}
 </p>
 <p className="ds-mt-2 ds-text-sm ds-text-muted">
 {t("revoke_final_approval_warning")}
 </p>
 <div className="ds-mt-4">
 <label className="ds-block ds-mb-2 ds-font-medium">
 {t("notes")} ({t("optional")})
 </label>
 <textarea
 className="prj-input"
 rows={3}
 value={actionNotes}
 onChange={(e) => setActionNotes(e.target.value)}
 placeholder={t("revoke_final_approval_notes_placeholder")}
 />
 </div>
 </div>
 }
 confirmLabel={t("revoke_final_approval")}
 cancelLabel={t("cancel")}
 onClose={() => {
 setRevokeFinalApprovalDialogOpen(false);
 setActionNotes("");
 }}
 onConfirm={handleRevokeFinalApproval}
 busy={processingAction}
 danger
 />

 </PageLayout>
 );
}
