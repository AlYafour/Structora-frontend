import { useTranslation } from "react-i18next";
import { useLocation, Outlet } from "react-router-dom";
import { Suspense } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import Breadcrumbs from "./Breadcrumbs";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import AiAssistantModal from "../../features/ai-assistant/AiAssistantModal";
import ValidationPopup from "../../features/ai-assistant/ValidationPopup";
import { ValidationProvider } from "../../contexts/ValidationContext";
import PageSkeleton from "./PageSkeleton";
import AppTabBar from "./AppTabBar";

function LayoutContent() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const { collapsed } = useSidebar();
  const lang = i18n.language;
  const isRTL = lang === "ar";

  // Superusers ALWAYS see admin sidebar
  const isAdmin = user?.is_superuser;

  // Extract project ID from URL (e.g. /projects/42 or /projects/42/...)
  const projectIdMatch = location.pathname.match(/\/projects\/(\d+)/);
  const currentProjectId = projectIdMatch ? Number(projectIdMatch[1]) : null;

  return (
    <div className="app-layout" lang={lang} dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <AppSidebar mode={isAdmin ? 'admin' : 'company'} />

      {/* Main content area */}
      <div className={`app-content-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top bar */}
        <AppTopBar showSearch />

        {/* Breadcrumbs for admin */}
        {isAdmin && <Breadcrumbs />}

        {/* App-level tab bar for company users */}
        {!isAdmin && <AppTabBar />}

        {/* Page content — Outlet renders the matched child route */}
        <main className="app-content">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* AI Assistant for company users */}
      {!isAdmin && <AiAssistantModal projectId={currentProjectId} />}
      {!isAdmin && <ValidationPopup />}
    </div>
  );
}

export default function Layout() {
  return (
    <SidebarProvider>
      <ValidationProvider>
        <LayoutContent />
      </ValidationProvider>
    </SidebarProvider>
  );
}
