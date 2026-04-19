/**
 * Re-exports from consolidated forms directory
 * All form components have been moved to /components/forms/
 * This file maintains backward compatibility
 */

export {
  FormInput,
  FormTextarea,
  FormChips,
  FormField,
  FormViewField,
  FormSection,
  FormGrid,
} from '../../forms';

// FormSelect is a re-export of UnifiedSelect
export { default as FormSelect } from '../../../components/common/Select';
