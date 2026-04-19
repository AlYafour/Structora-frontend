/**
 * Layout Components - Design System v2.0
 * Layout and navigation components
 *
 * Usage:
 * import { Layout, PageLayout, Breadcrumbs } from '@/components/layout';
 */

// Main Layout
export { default as Layout } from './Layout';
export { default as PageLayout } from './PageLayout';
export { default as PageHeader } from './PageHeader';
export { default as Breadcrumbs } from './Breadcrumbs';

// Unified Navigation
export { default as AppSidebar } from './AppSidebar';
export { default as AppTopBar } from './AppTopBar';

// Context
export { SidebarProvider, useSidebar } from './SidebarContext';
