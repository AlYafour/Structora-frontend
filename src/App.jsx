/**
 * App Component - Main Application Routes
 * @version 3.0.0
 *
 * Route structure:
 * - Public routes: /, /landing, /pricing, /register-company
 * - Auth routes: /admin/login, /login/:tenantSlug
 * - Admin routes: /admin/* (super admin only)
 * - Tenant routes: /:tenantSlug/* (scoped to each company)
 * - Backward compat: old paths redirect to /:tenantSlug/*
 */

import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ProtectedRoute } from "./components/auth";

// Minimal fallback for the very first app load (before Layout renders)
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
    <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#14213D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ====== Public Pages ======
const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const PricingPage = lazy(() => import("./pages/public/PricingPage"));
const CompanyRegistrationPage = lazy(() => import("./features/auth/pages/CompanyRegistrationPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// ====== Auth Pages ======
const AdminLoginPage = lazy(() => import("./features/admin/pages/AdminLoginPage"));
const CompanyLoginPage = lazy(() => import("./features/auth/pages/CompanyLoginPage"));
const OnboardingWizardPage = lazy(() => import("./features/auth/pages/OnboardingWizardPage"));

// ====== Dashboard Pages ======
const HomePage = lazy(() => import("./pages/HomePage"));
const AdminDashboardPage = lazy(() => import("./features/admin/pages/AdminDashboardPage"));

// ====== Admin Pages ======
const AdminTenantsPage = lazy(() => import("./features/admin/pages/AdminTenantsPage"));
const AdminCreateCompanyPage = lazy(() => import("./features/admin/pages/AdminCreateCompanyPage"));
const AdminEditCompanyPage = lazy(() => import("./features/admin/pages/AdminEditCompanyPage"));
const AdminUsersPage = lazy(() => import("./features/admin/pages/AdminUsersPage"));
const AdminAnalyticsPage = lazy(() => import("./features/admin/pages/AdminAnalyticsPage"));
const AdminSettingsPage = lazy(() => import("./features/admin/pages/AdminSettingsPage"));
const AdminAuditLogPage = lazy(() => import("./features/admin/pages/AdminAuditLogPage"));

// ====== Company Pages ======
const CompanySettingsPage = lazy(() => import("./features/company/pages/CompanySettingsPage"));
const CompanyUsersPage = lazy(() => import("./features/company/pages/CompanyUsersPage"));
const RolesPage = lazy(() => import("./features/company/pages/RolesPage"));

// ====== Projects Pages ======
const ProjectsPage = lazy(() => import("./features/projects/pages/ProjectsPage"));
const ProjectView = lazy(() => import("./features/projects/pages/ProjectView"));
const WizardPage = lazy(() => import("./features/projects/wizard/WizardPage"));
const PendingApprovalsPage = lazy(() => import("./features/projects/pages/PendingApprovalsPage"));
const ViewSetup = lazy(() => import("./features/projects/wizard/view/ViewSetup"));
const ViewSitePlan = lazy(() => import("./features/projects/wizard/view/ViewSitePlan"));
const ViewLicense = lazy(() => import("./features/projects/wizard/view/ViewLicense"));
const ViewContract = lazy(() => import("./features/projects/wizard/view/ViewContract"));
const ViewSummary = lazy(() => import("./features/projects/view/ViewSummary"));
const ProjectFinancialEntitlementPage = lazy(() => import("./features/projects/financial-pages/entitlement/ProjectFinancialEntitlementPage"));
const SelectProjectForType = lazy(() => import("./features/projects/pages/SelectProjectForType"));
const AddProgressPage = lazy(() => import("./features/projects/financial-pages/progress/AddProgressPage"));
const ViewProgressEntryPage = lazy(() => import("./features/projects/financial-pages/progress/ViewProgressEntryPage"));

// ====== Project Entries Pages ======
const StartOrderPage = lazy(() => import("./features/projects/entries/start-order/StartOrderPage"));
const ViewStartOrderPage = lazy(() => import("./features/projects/entries/start-order/ViewStartOrderPage"));
const ProjectSchedulePage = lazy(() => import("./features/projects/entries/project-schedule/ProjectSchedulePage"));
const ViewProjectSchedulePage = lazy(() => import("./features/projects/entries/project-schedule/ViewProjectSchedulePage"));
const ExcavationNoticePage = lazy(() => import("./features/projects/entries/excavation-notice/ExcavationNoticePage"));
const ViewExcavationNoticePage = lazy(() => import("./features/projects/entries/excavation-notice/ViewExcavationNoticePage"));
const ExtensionsPage = lazy(() => import("./features/projects/entries/extensions/ExtensionsPage"));
const ViewExtensionsPage = lazy(() => import("./features/projects/entries/extensions/ViewExtensionsPage"));
const AwardingPage = lazy(() => import("./features/projects/entries/awarding/AwardingPage"));
const ViewAwardingPage = lazy(() => import("./features/projects/entries/awarding/ViewAwardingPage"));

// ====== Payments Pages ======
const CreatePaymentPage = lazy(() => import("./features/projects/entries/payments/pages/CreatePaymentPage"));
const ViewPaymentPage = lazy(() => import("./features/projects/entries/payments/pages/ViewPaymentPage"));
const ViewReceiptVoucherPage = lazy(() => import("./features/projects/entries/receiptVouchers/ViewReceiptVoucherPage"));
const ViewTaxInvoicePage = lazy(() => import("./features/projects/entries/taxInvoices/ViewTaxInvoicePage"));

// ====== Variations Pages ======
const VariationViewPage = lazy(() => import("./features/projects/entries/variations/pages/VariationViewPage"));
const NoticeOfVariationPage = lazy(() => import("./features/projects/entries/variations/pages/NoticeOfVariationPage"));

// ====== Invoices Pages ======
const InvoiceViewPage = lazy(() => import("./features/projects/entries/invoices/pages/InvoiceViewPage"));
const CreateActualInvoicePage = lazy(() => import("./features/projects/entries/invoices/pages/CreateActualInvoicePage"));

// ====== Owners Pages ======
const OwnersPage = lazy(() => import("./features/owners/pages/OwnersPage"));
const OwnerDetailPage = lazy(() => import("./features/owners/pages/OwnerDetailPage"));
const EditOwnerPage = lazy(() => import("./features/owners/pages/EditOwnerPage"));

// ====== Consultants Pages ======
const ConsultantsPage = lazy(() => import("./features/consultants/pages/ConsultantsPage"));
const ConsultantDetailPage = lazy(() => import("./features/consultants/pages/ConsultantDetailPage"));
const EditConsultantPage = lazy(() => import("./features/consultants/pages/EditConsultantPage"));

// ====== Profile Pages ======
const ProfilePage = lazy(() => import("./features/profile/pages/ProfilePage"));

// ====== BOQ Pages ======
const BOQPage = lazy(() => import("./features/boq/pages/BOQPage"));

// ====== Payment Claims Pages ======
const CreatePaymentClaimPage = lazy(() => import("./features/projects/financial-pages/payment-claims/pages/CreatePaymentClaimPage"));
const ViewPaymentClaimPage = lazy(() => import("./features/projects/financial-pages/payment-claims/pages/ViewPaymentClaimPage"));


/**
 * Backward compatibility: redirect old non-scoped paths to tenant-scoped ones.
 * e.g. /dashboard → /alyafour/dashboard
 */
function LegacyRedirect() {
  const location = useLocation();
  const slug = localStorage.getItem('tenant_slug');
  if (slug) {
    return <Navigate to={`/${slug}${location.pathname}${location.search}`} replace />;
  }
  return <Navigate to="/" replace />;
}


/**
 * Shared tenant route definitions — used inside /:tenantSlug layout.
 * All paths are RELATIVE (no leading slash).
 */
function TenantRoutes() {
  return (
    <>
      {/* Dashboard */}
      <Route index element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

      {/* Projects */}
      <Route path="projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="projects/pending-approvals" element={<ProtectedRoute><PendingApprovalsPage /></ProtectedRoute>} />
      <Route path="projects/select/:type" element={<ProtectedRoute><SelectProjectForType /></ProtectedRoute>} />
      <Route path="projects/:projectId" element={<ProtectedRoute><ProjectView /></ProtectedRoute>} />
      <Route path="projects/:projectId/wizard" element={<ProtectedRoute><WizardPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/progress/add" element={<ProtectedRoute><AddProgressPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/progress/:entryId/view" element={<ProtectedRoute><ViewProgressEntryPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/summary" element={<ProtectedRoute><ViewSummary /></ProtectedRoute>} />
      <Route path="projects/:projectId/financial-entitlement" element={<ProtectedRoute><ProjectFinancialEntitlementPage /></ProtectedRoute>} />
      <Route path="projects/wizard" element={<Navigate to="projects" replace />} />

      {/* Project phases (view only) */}
      <Route path="projects/:projectId/setup/view" element={<ProtectedRoute><ViewSetup /></ProtectedRoute>} />
      <Route path="projects/:projectId/siteplan/view" element={<ProtectedRoute><ViewSitePlan /></ProtectedRoute>} />
      <Route path="projects/:projectId/license/view" element={<ProtectedRoute><ViewLicense /></ProtectedRoute>} />
      <Route path="projects/:projectId/contract/view" element={<ProtectedRoute><ViewContract /></ProtectedRoute>} />

      {/* Start Order */}
      <Route path="projects/:projectId/start-order/create" element={<ProtectedRoute><StartOrderPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/start-order/:itemId/edit" element={<ProtectedRoute><StartOrderPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/start-order/view" element={<ProtectedRoute><ViewStartOrderPage /></ProtectedRoute>} />

      {/* Project Schedule */}
      <Route path="projects/:projectId/project-schedule/create" element={<ProtectedRoute><ProjectSchedulePage /></ProtectedRoute>} />
      <Route path="projects/:projectId/project-schedule/:itemId/edit" element={<ProtectedRoute><ProjectSchedulePage /></ProtectedRoute>} />
      <Route path="projects/:projectId/project-schedule/view" element={<ProtectedRoute><ViewProjectSchedulePage /></ProtectedRoute>} />

      {/* Excavation Notice */}
      <Route path="projects/:projectId/excavation-notice/create" element={<ProtectedRoute><ExcavationNoticePage /></ProtectedRoute>} />
      <Route path="projects/:projectId/excavation-notice/:itemId/edit" element={<ProtectedRoute><ExcavationNoticePage /></ProtectedRoute>} />
      <Route path="projects/:projectId/excavation-notice/view" element={<ProtectedRoute><ViewExcavationNoticePage /></ProtectedRoute>} />

      {/* Extensions */}
      <Route path="projects/:projectId/extensions/edit" element={<ProtectedRoute><ExtensionsPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/extensions/view" element={<ProtectedRoute><ViewExtensionsPage /></ProtectedRoute>} />

      {/* Awarding */}
      <Route path="projects/:projectId/awarding/create" element={<ProtectedRoute><AwardingPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/awarding/:itemId/edit" element={<ProtectedRoute><AwardingPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/awarding/view" element={<ProtectedRoute><ViewAwardingPage /></ProtectedRoute>} />

      {/* Wizard for new project */}
      <Route path="wizard/new" element={<ProtectedRoute><WizardPage /></ProtectedRoute>} />

      {/* Payments */}
      <Route path="payments/create" element={<ProtectedRoute><CreatePaymentPage /></ProtectedRoute>} />
      <Route path="payments/:paymentId/view" element={<ProtectedRoute><ViewPaymentPage /></ProtectedRoute>} />
      <Route path="payments/:paymentId/edit" element={<ProtectedRoute><CreatePaymentPage /></ProtectedRoute>} />
      <Route path="receipt-vouchers/:voucherId/view" element={<ProtectedRoute><ViewReceiptVoucherPage /></ProtectedRoute>} />
      <Route path="tax-invoices/:taxInvoiceId/view" element={<ProtectedRoute><ViewTaxInvoicePage /></ProtectedRoute>} />

      {/* Variations */}
      <Route path="variations/create" element={<ProtectedRoute><NoticeOfVariationPage /></ProtectedRoute>} />
      <Route path="variations/:variationId/view" element={<ProtectedRoute><VariationViewPage /></ProtectedRoute>} />
      <Route path="variations/:variationId/edit" element={<ProtectedRoute><NoticeOfVariationPage /></ProtectedRoute>} />
      <Route path="variations/:variationId/notice" element={<ProtectedRoute><NoticeOfVariationPage /></ProtectedRoute>} />
      <Route path="projects/:projectId/variations/notice" element={<ProtectedRoute><NoticeOfVariationPage /></ProtectedRoute>} />

      {/* Invoices */}
      <Route path="invoices" element={<Navigate to="projects" replace />} />
      <Route path="invoices/create" element={<ProtectedRoute><CreateActualInvoicePage /></ProtectedRoute>} />
      <Route path="invoices/:invoiceId/edit" element={<ProtectedRoute><CreateActualInvoicePage /></ProtectedRoute>} />
      <Route path="invoices/:invoiceId/view" element={<ProtectedRoute><InvoiceViewPage /></ProtectedRoute>} />

      {/* Owners */}
      <Route path="owners" element={<ProtectedRoute><OwnersPage /></ProtectedRoute>} />
      <Route path="owners/:ownerName" element={<ProtectedRoute><OwnerDetailPage /></ProtectedRoute>} />
      <Route path="owners/:ownerName/edit" element={<ProtectedRoute><EditOwnerPage /></ProtectedRoute>} />

      {/* Consultants */}
      <Route path="consultants" element={<ProtectedRoute><ConsultantsPage /></ProtectedRoute>} />
      <Route path="consultants/new" element={<ProtectedRoute><EditConsultantPage /></ProtectedRoute>} />
      <Route path="consultants/:consultantId" element={<ProtectedRoute><ConsultantDetailPage /></ProtectedRoute>} />
      <Route path="consultants/:consultantId/edit" element={<ProtectedRoute><EditConsultantPage /></ProtectedRoute>} />

      {/* BOQ */}
      <Route path="boq" element={<ProtectedRoute><BOQPage /></ProtectedRoute>} />
      <Route path="boq/:projectId" element={<ProtectedRoute><BOQPage /></ProtectedRoute>} />

      {/* Payment Claims */}
      <Route path="payment-claims/create" element={<ProtectedRoute><CreatePaymentClaimPage /></ProtectedRoute>} />
      <Route path="payment-claims/:claimId/edit" element={<ProtectedRoute><CreatePaymentClaimPage /></ProtectedRoute>} />
      <Route path="payment-claims/:claimId/view" element={<ProtectedRoute><ViewPaymentClaimPage /></ProtectedRoute>} />

      {/* Company management */}
      <Route path="company/settings" element={<ProtectedRoute requireAdmin><CompanySettingsPage /></ProtectedRoute>} />
      <Route path="company/users" element={<ProtectedRoute permission="user.view" requireAdmin><CompanyUsersPage /></ProtectedRoute>} />
      <Route path="company/roles" element={<ProtectedRoute permission="role.view" requireAdmin><RolesPage /></ProtectedRoute>} />

      {/* Profile */}
      <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Unknown route within tenant */}
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}


export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ══════ Public pages ══════ */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/register-company" element={<CompanyRegistrationPage />} />

        {/* ══════ Login pages ══════ */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/login/:tenantSlug" element={<CompanyLoginPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* ══════ Onboarding (no layout) ══════ */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizardPage /></ProtectedRoute>} />

        {/* ══════ Admin routes (super admin) — inside Layout ══════ */}
        <Route path="/admin" element={<Layout />}>
          <Route path="dashboard" element={<ProtectedRoute requireSuperAdmin><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="create-company" element={<ProtectedRoute requireSuperAdmin><AdminCreateCompanyPage /></ProtectedRoute>} />
          <Route path="tenants" element={<ProtectedRoute requireSuperAdmin><AdminTenantsPage /></ProtectedRoute>} />
          <Route path="tenants/:tenantId/edit" element={<ProtectedRoute requireSuperAdmin><AdminEditCompanyPage /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute requireSuperAdmin><AdminUsersPage /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute requireSuperAdmin><AdminAnalyticsPage /></ProtectedRoute>} />
          <Route path="audit-log" element={<ProtectedRoute requireSuperAdmin><AdminAuditLogPage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requireSuperAdmin><AdminSettingsPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute requireSuperAdmin><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ══════ Tenant-scoped routes — inside Layout ══════ */}
        <Route path="/:tenantSlug" element={<Layout />}>
          {TenantRoutes()}
        </Route>

        {/* ══════ Backward compatibility — redirect old paths ══════ */}
        {/* If someone navigates to /dashboard, /projects, etc. without slug */}
        <Route path="/dashboard" element={<LegacyRedirect />} />
        <Route path="/projects/*" element={<LegacyRedirect />} />
        <Route path="/wizard/*" element={<LegacyRedirect />} />
        <Route path="/payments/*" element={<LegacyRedirect />} />
        <Route path="/variations/*" element={<LegacyRedirect />} />
        <Route path="/invoices/*" element={<LegacyRedirect />} />
        <Route path="/owners/*" element={<LegacyRedirect />} />
        <Route path="/consultants/*" element={<LegacyRedirect />} />
        <Route path="/boq/*" element={<LegacyRedirect />} />
        <Route path="/payment-claims/*" element={<LegacyRedirect />} />
        <Route path="/receipt-vouchers/*" element={<LegacyRedirect />} />
        <Route path="/tax-invoices/*" element={<LegacyRedirect />} />
        <Route path="/company/*" element={<LegacyRedirect />} />
        <Route path="/profile" element={<LegacyRedirect />} />
        <Route path="/home" element={<LegacyRedirect />} />

        {/* Unknown route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
