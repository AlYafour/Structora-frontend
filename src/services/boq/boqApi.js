/**
 * BOQ (Bill of Quantities) API Service
 */
import { api } from '../api';
import { handleError } from '../../utils/errorHandler';

class BOQService {
  constructor() {
    // Don't include /api/ here - api instance already handles it
    this.basePath = '';
    this.batchUpdateAvailable = null; // Cache for batch update availability
  }

  /**
   * Get all BOQ sections for a project
   */
  async getSections(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/boq/sections/`);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.getSections');
    }
  }

  /**
   * Get a single BOQ section
   */
  async getSection(projectId, sectionId) {
    try {
      const { data } = await api.get(`projects/${projectId}/boq/sections/${sectionId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.getSection');
    }
  }

  /**
   * Create a new BOQ section
   */
  async createSection(projectId, payload) {
    try {
      const { data } = await api.post(`projects/${projectId}/boq/sections/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.createSection');
    }
  }

  /**
   * Update a BOQ section
   */
  async updateSection(projectId, sectionId, payload) {
    try {
      const { data } = await api.patch(`projects/${projectId}/boq/sections/${sectionId}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.updateSection');
    }
  }

  /**
   * Delete a BOQ section
   */
  async deleteSection(projectId, sectionId) {
    try {
      await api.delete(`projects/${projectId}/boq/sections/${sectionId}/`);
      return true;
    } catch (error) {
      throw handleError(error, 'BOQService.deleteSection');
    }
  }

  /**
   * Create missing sections for orphaned items
   */
  async createMissingSections(projectId) {
    try {
      const { data } = await api.post(`projects/${projectId}/boq/sections/create-missing/`);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.createMissingSections');
    }
  }

  /**
   * Get all BOQ items for a project
   */
  async getItems(projectId) {
    try {
      const { data } = await api.get(`projects/${projectId}/boq/items/`);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.getItems');
    }
  }

  /**
   * Get BOQ items for a specific section
   */
  async getItemsBySection(projectId, sectionId) {
    try {
      const { data } = await api.get(`projects/${projectId}/boq/items/`, {
        params: { section: sectionId }
      });
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.getItemsBySection');
    }
  }

  /**
   * Get a single BOQ item
   */
  async getItem(projectId, itemId) {
    try {
      const { data } = await api.get(`projects/${projectId}/boq/items/${itemId}/`);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.getItem');
    }
  }

  /**
   * Create a new BOQ item
   */
  async createItem(projectId, payload) {
    try {
      const { data } = await api.post(`projects/${projectId}/boq/items/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.createItem');
    }
  }

  /**
   * Update a BOQ item
   */
  async updateItem(projectId, itemId, payload) {
    try {
      const { data } = await api.patch(`projects/${projectId}/boq/items/${itemId}/`, payload);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.updateItem');
    }
  }

  /**
   * Delete a BOQ item
   */
  async deleteItem(projectId, itemId) {
    try {
      await api.delete(`projects/${projectId}/boq/items/${itemId}/`);
      return true;
    } catch (error) {
      throw handleError(error, 'BOQService.deleteItem');
    }
  }

  /**
   * Import Excel file and get preview
   */
  async importExcel(file, projectId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);

      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`boq/import-excel/`, formData);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.importExcel');
    }
  }

  /**
   * Import parsed data (JSON format)
   */
  async importData(projectId, importData) {
    try {
      const { data } = await api.post(`boq/import-data/`, {
        project_id: projectId,
        data: importData,
      });
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.importData');
    }
  }

  /**
   * Import data directly from Excel file
   */
  async importDataWithFile(formData, projectId) {
    try {
      // FIX: Don't set Content-Type for FormData
      const { data } = await api.post(`boq/import-data/`, formData);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.importDataWithFile');
    }
  }

  /**
   * Batch update multiple items at once
   * @param {number} projectId - Project ID
   * @param {Array} updates - Array of {id, ...fields} objects
   */
  async batchUpdateItems(projectId, updates) {
    // If we know batch API is not available, skip the request
    if (this.batchUpdateAvailable === false) {
      return this._fallbackToIndividualUpdates(projectId, updates);
    }

    try {
      const { data } = await api.post(`projects/${projectId}/boq/items/batch-update/`, {
        updates: updates
      });
      // Mark as available if successful
      this.batchUpdateAvailable = true;
      return data;
    } catch (error) {
      // If 404, mark as unavailable and use fallback
      if (error?.response?.status === 404) {
        this.batchUpdateAvailable = false;
        // Only log once
        if (!this._batchWarningLogged) {

          this._batchWarningLogged = true;
        }
      }
      return this._fallbackToIndividualUpdates(projectId, updates);
    }
  }

  /**
   * Fallback to individual updates
   * @private
   */
  async _fallbackToIndividualUpdates(projectId, updates) {
    // Use Promise.allSettled to handle partial failures gracefully
    const results = await Promise.allSettled(
      updates.map(({ id, ...fields }) => 
        this.updateItem(projectId, id, fields).catch(err => {

          return null;
        })
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    return { 
      success: successful === updates.length, 
      successful,
      total: updates.length,
      results 
    };
  }

  /**
   * Reorder all items in a section (used when order values get too large)
   * @param {number} projectId - Project ID
   * @param {number} sectionId - Section ID
   */
  async reorderSection(projectId, sectionId) {
    try {
      const { data } = await api.post(`projects/${projectId}/boq/sections/${sectionId}/reorder/`);
      return data;
    } catch (error) {
      throw handleError(error, 'BOQService.reorderSection');
    }
  }
}

export default new BOQService();
