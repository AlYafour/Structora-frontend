/**
 * BOQ (Bill of Quantities) Page
 * Main page for managing BOQ data with import and editing capabilities
 */
import { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import { boqApi } from "../../../services/boq";
import { projectApi } from "../../../services/projects";
import { handleError } from "../../../utils/errorHandler";
import { logger } from "../../../utils/logger";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import PageLayout from "../../../components/layout/PageLayout";
import ImportDataDialog from "../components/ImportDataDialog";
import BOQTable from "../components/BOQTable";
import "./BOQPage.css";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function BOQPage() {
 const { t, i18n } = useTranslation();
 const { projectId } = useParams();
 const navigate = useTenantNavigate();
 const isRTL = i18n.language === 'ar';

 const [projects, setProjects] = useState([]);
 const [selectedProjectId, setSelectedProjectId] = useState(projectId ? parseInt(projectId) : null);
 const [sections, setSections] = useState([]);
 const [items, setItems] = useState([]);
 const [loading, setLoading] = useState(false);
 const [importDialogOpen, setImportDialogOpen] = useState(false);
 const { success, error: showError } = useNotifications();

 useEffect(() => {
 loadProjects();
 }, []);

 useEffect(() => {
 if (selectedProjectId) {
 loadBOQData(selectedProjectId);
 } else {
 setSections([]);
 setItems([]);
 }
 }, [selectedProjectId]);

 const loadProjects = async () => {
 try {
 const data = await projectApi.getAll();
 setProjects(data);
 if (data.length > 0 && !selectedProjectId) {
 setSelectedProjectId(data[0].id);
 }
 } catch (error) {
 handleError(error, "BOQPage.loadProjects");
 }
 };

 const loadBOQData = async (projectId) => {
 try {
 setLoading(true);
 logger.log(`Loading BOQ data for project ${projectId}...`);
 
 const [sectionsData, itemsData] = await Promise.all([
 boqApi.getSections(projectId),
 boqApi.getItems(projectId),
 ]);
 
 // Handle paginated response (if API returns {results: [...]})
 let sections = [];
 let items = [];
 
 if (Array.isArray(sectionsData)) {
 sections = sectionsData;
 } else if (sectionsData && Array.isArray(sectionsData.results)) {
 sections = sectionsData.results;
 } else if (sectionsData && sectionsData.data && Array.isArray(sectionsData.data)) {
 sections = sectionsData.data;
 }
 
 if (Array.isArray(itemsData)) {
 items = itemsData;
 } else if (itemsData && Array.isArray(itemsData.results)) {
 items = itemsData.results;
 } else if (itemsData && itemsData.data && Array.isArray(itemsData.data)) {
 items = itemsData.data;
 }
 
 // If we have items but no sections, try to create missing sections
 if (items.length > 0 && sections.length === 0) {
 logger.warn('Found items but no sections. Attempting to create missing sections...');
 try {
 const result = await boqApi.createMissingSections(selectedProjectId);
 if (result.success) {
 logger.log(`Created missing sections: ${result.message}`);
 // Reload sections after creating missing ones
 const newSectionsData = await boqApi.getSections(selectedProjectId);
 if (Array.isArray(newSectionsData)) {
 sections = newSectionsData;
 } else if (newSectionsData && Array.isArray(newSectionsData.results)) {
 sections = newSectionsData.results;
 } else if (newSectionsData && newSectionsData.data && Array.isArray(newSectionsData.data)) {
 sections = newSectionsData.data;
 }
 logger.log(`Loaded ${sections.length} sections after creating missing ones`);
 }
 } catch (error) {
 logger.error('Error creating missing sections:', error);
 // Fallback: try to get sections from items
 const sectionIds = [...new Set(items.map(item => item.section).filter(Boolean))];
 if (sectionIds.length > 0) {
 logger.log(`Trying to fetch ${sectionIds.length} sections by ID...`);
 const sectionPromises = sectionIds.map(sectionId => 
 boqApi.getSection(selectedProjectId, sectionId).catch(() => null)
 );
 const fetchedSections = await Promise.all(sectionPromises);
 const validSections = fetchedSections.filter(s => s !== null);
 if (validSections.length > 0) {
 sections = validSections;
 logger.log(`Loaded ${sections.length} sections from items`);
 }
 }
 }
 }
 
 setSections(sections);
 setItems(items);
 
 // Log for debugging
 logger.log(`Loaded ${sections.length} sections and ${items.length} items`);
 
 if (sections.length === 0 && items.length === 0) {
 logger.log("No BOQ data found - may need to import");
 } else {
 logger.log(`Successfully loaded BOQ data: ${sections.length} sections, ${items.length} items`);
 }
 } catch (error) {

 handleError(error, "BOQPage.loadBOQData");
 showError(t('boq_error_loading_data') || 'Error loading BOQ data');
 setSections([]);
 setItems([]);
 } finally {
 setLoading(false);
 }
 };

 const handleImportSuccess = async () => {
 setImportDialogOpen(false);
 success(t('boq_import_success') || 'Data imported successfully');
 // Reload data immediately after import
 if (selectedProjectId) {
 // Force reload by clearing and reloading
 setSections([]);
 setItems([]);
 setLoading(true);
 // Wait a bit for backend to finish processing
 await new Promise(resolve => setTimeout(resolve, 1500));
 // Reload data
 await loadBOQData(selectedProjectId);
 }
 };

 const handleItemUpdate = async (itemId, data) => {
 try {
 await boqApi.updateItem(selectedProjectId, itemId, data);
 await loadBOQData(selectedProjectId);
 success(t('boq_item_updated') || 'Item updated successfully');
 } catch (error) {
 handleError(error, "BOQPage.handleItemUpdate");
 showError(t('boq_error_updating_item') || 'Error updating item');
 }
 };

 const handleItemDelete = async (itemId) => {
 try {
 await boqApi.deleteItem(selectedProjectId, itemId);
 await loadBOQData(selectedProjectId);
 success(t('boq_item_deleted') || 'Item deleted successfully');
 } catch (error) {
 handleError(error, "BOQPage.handleItemDelete");
 showError(t('boq_error_deleting_item') || 'Error deleting item');
 }
 };

 const handleItemCreate = async (data) => {
 try {
 await boqApi.createItem(selectedProjectId, data);
 await loadBOQData(selectedProjectId);
 success(t('boq_item_created') || 'Item created successfully');
 } catch (error) {
 handleError(error, "BOQPage.handleItemCreate");
 showError(t('boq_error_creating_item') || 'Error creating item');
 }
 };

 return (
 <PageLayout>
 <div className="boq-page" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Page Header */}
 <div className="boq-page-header">
 <h1 className="boq-page-title">{t('boq_page_title') || 'Bill of Quantities (BOQ)'}</h1>
 <Button
 onClick={() => setImportDialogOpen(true)}
 variant="primary"
 className="ds-me-4"
 >
 {t('boq_import_data') || 'Import Data'}
 </Button>
 </div>

 {/* Project Selector */}
 <div className="boq-project-selector">
 <label>{t('boq_select_project') || 'Select Project'}:</label>
 <select
 value={selectedProjectId || ''}
 onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
 className="boq-page__select"
 >
 <option value="">{t('boq_select_project_placeholder') || '-- Select Project --'}</option>
 {projects.map((project) => (
 <option key={project.id} value={project.id}>
 {project.name || project.internal_code || `Project #${project.id}`}
 </option>
 ))}
 </select>
 </div>

 {/* BOQ Table */}
 {selectedProjectId ? (
 loading ? (
 <div className="boq-empty-state">
 <p>{t('boq_loading') || 'Loading...'}</p>
 </div>
 ) : sections.length > 0 || items.length > 0 ? (
 <div>
 {/* Data Summary */}
 <div className="boq-page__summary">
 <div>
 <strong className="boq-page__summary-label">{t('boq_data_summary') || 'Data Summary'}:</strong>
 <span className="boq-page__summary-count">
 {sections.length} {t('boq_sections') || 'sections'} • {items.length} {t('boq_items') || 'items'}
 </span>
 </div>
 <Button
 onClick={() => setImportDialogOpen(true)}
 variant="secondary"
 size="small"
 >
 {t('boq_import_more') || '+ Import More'}
 </Button>
 </div>
 
 {/* BOQ Table */}
 <BOQTable
 sections={sections}
 items={items}
 loading={loading}
 onItemUpdate={handleItemUpdate}
 onItemDelete={handleItemDelete}
 onItemCreate={handleItemCreate}
 />
 </div>
 ) : (
 <div className="boq-empty-state">
 <div className="boq-empty-state-content">
 <p className="boq-page__empty-title">{t('boq_no_data') || 'No BOQ data found. Import data to get started.'}</p>
 <p className="boq-page__empty-description">
 {t('boq_import_instructions') || 'Click the button below to import your Excel file with BOQ data.'}
 </p>
 <Button
 onClick={() => setImportDialogOpen(true)}
 variant="primary"
 className="ds-mt-4"
 >
 {t('boq_import_data') || 'Import Data'}
 </Button>
 </div>
 </div>
 )
 ) : (
 <div className="boq-empty-state">
 <p>{t('boq_select_project_first') || 'Please select a project to view BOQ data'}</p>
 </div>
 )}

 {/* Import Dialog */}
 <ImportDataDialog
 open={importDialogOpen}
 onClose={() => setImportDialogOpen(false)}
 onSuccess={handleImportSuccess}
 projectId={selectedProjectId}
 projects={projects}
 />

 </div>
 </PageLayout>
 );
}
