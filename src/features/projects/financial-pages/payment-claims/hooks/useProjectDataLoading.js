/**
 * useProjectDataLoading Hook
 *
 * Shared logic for loading project data and building the interimPaymentData
 * object used by both CreatePaymentClaimPage and ViewPaymentClaimPage.
 */
import { useState, useEffect } from 'react';
import { projectApi } from '../../../../../services/projects';
import { paymentClaimApi } from '../../../../../services/paymentClaim';
import { handleError } from '../../../../../utils/errorHandler';
import { logger } from '../../../../../utils/logger';
import { api } from '../../../../../services/api';

const EMPTY_INTERIM = {
  project_no: '',
  project_title: '',
  project_image: '',
  project_description: '',
  owner: '',
  date: '',
  interim_payment_number: '',
};

/**
 * Extracts interimPaymentData fields from project data.
 * @param {Object} projectData - Full project data with includes
 * @param {string} [dateOverride] - Pre-formatted date string (for view mode)
 * @returns {Object} interimPaymentData fields (without interim_payment_number)
 */
function extractProjectInfo(projectData, dateOverride) {
  const projectNo =
    projectData?.license_data?.license_project_no ||
    projectData?.license_data?.project_no ||
    projectData?.license_data?.license_no ||
    '';

  const projectTitle = projectData?.name || '';

  const sitePlanFile = projectData?.siteplan_data?.site_plan_file;
  const projectImage = sitePlanFile
    ? `${api.defaults.baseURL || ''}${sitePlanFile.startsWith('/') ? '' : '/'}${sitePlanFile}`
    : '';

  const owners = projectData?.siteplan_data?.owners || [];
  const authorizedOwner = owners.find((o) => o.is_authorized) || owners[0];
  const ownerName = authorizedOwner
    ? authorizedOwner.owner_name_ar || authorizedOwner.owner_name_en || ''
    : '';

  const date =
    dateOverride ||
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return {
    project_no: projectNo,
    project_title: projectTitle,
    project_image: projectImage,
    project_description: projectData?.description || '',
    owner: ownerName,
    date,
  };
}

/**
 * @param {string|null} projectId - Selected project ID
 * @param {Object} [options]
 * @param {boolean} [options.fetchNextNumber=false] - Whether to fetch the next claim number
 * @param {string} [options.dateOverride] - Pre-formatted date (for view mode)
 * @returns {{ project, selectedProjectData, interimPaymentData, setInterimPaymentData, loadingProjectData }}
 */
export function useProjectDataLoading(projectId, options = {}) {
  const { fetchNextNumber = false, dateOverride } = options;

  const [project, setProject] = useState(null);
  const [selectedProjectData, setSelectedProjectData] = useState(null);
  const [interimPaymentData, setInterimPaymentData] = useState({ ...EMPTY_INTERIM });
  const [loadingProjectData, setLoadingProjectData] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setSelectedProjectData(null);
      setInterimPaymentData({ ...EMPTY_INTERIM });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingProjectData(true);

        // Load basic project in parallel with full data
        projectApi.getById(projectId).then(setProject).catch((err) => {
          logger.debug("Failed to load project", err);
        });

        const projectData = await projectApi.getWithIncludes(projectId, [
          'siteplan',
          'license',
          'contract',
        ]);
        if (cancelled) return;
        setSelectedProjectData(projectData);

        const info = extractProjectInfo(projectData, dateOverride);

        // Optionally fetch next payment claim number
        let nextNumber = '';
        if (fetchNextNumber) {
          try {
            const nextNumberData = await paymentClaimApi.getNextNumber(projectId);
            nextNumber = nextNumberData?.next_number || '';
          } catch {
            const count = projectData?.payment_claims?.length || 0;
            nextNumber = `PI${String(count + 1).padStart(4, '0')}`;
          }
        }

        if (cancelled) return;
        setInterimPaymentData({
          ...info,
          interim_payment_number: nextNumber,
        });
      } catch (error) {
        handleError(error, 'useProjectDataLoading');
      } finally {
        if (!cancelled) setLoadingProjectData(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [projectId, fetchNextNumber, dateOverride]);

  return {
    project,
    selectedProjectData,
    interimPaymentData,
    setInterimPaymentData,
    loadingProjectData,
  };
}
