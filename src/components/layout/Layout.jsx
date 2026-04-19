import { useTranslation } from "react-i18next";
import { useLocation, Outlet } from "react-router-dom";
import { Suspense } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import Breadcrumbs from "./Breadcrumbs";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import ChatbotWidget from "../../features/chatbot/components/ChatbotWidget";
import PageSkeleton from "./PageSkeleton";

function LayoutContent() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const { collapsed } = useSidebar();
  const lang = i18n.language;
  const isRTL = lang === "ar";

  // Superusers ALWAYS see admin sidebar
  const isAdmin = user?.is_superuser;

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

        {/* Page content — Outlet renders the matched child route */}
        <main className="app-content">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Chatbot for company users */}
      {!isAdmin && <ChatbotWidget />}
    </div>
  );
}

export default function Layout() {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
}
