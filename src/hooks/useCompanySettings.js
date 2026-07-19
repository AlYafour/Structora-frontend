import { useQuery } from '@tanstack/react-query';
import { companyApi } from '../services';

// Shared across the app so multiple components (Variation Notice form, print
// document) can read the current company's settings — including General
// Remarks — from one cached fetch instead of each hitting the API on its own.
export default function useCompanySettings(options = {}) {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: () => companyApi.getCurrentSettings(),
    staleTime: 5 * 60 * 1000, // matches the backend's own 5-minute cache on tenant-settings/current/
    ...options,
  });
}
