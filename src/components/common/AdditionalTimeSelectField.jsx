import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

// Canonical stored value stays this exact English string regardless of UI
// language (same convention as VARIATION_CAUSE_OPTIONS/BOQ_OPTIONS) — only
// the displayed label localizes. Matches the existing (previously unused)
// "additional_time_default" translation key in variations.json.
const SEPARATE_VALUE = 'To be submitted separately';

/**
 * Single-select combobox for the "Additional Time" field — exactly two
 * possible answers:
 *   1. The fixed string "To be submitted separately".
 *   2. "<N> days" — while typing, the live "___ days" list entry updates to
 *      show the typed digits (e.g. typing "3","0" turns it into "30 days");
 *      selecting it commits that exact string.
 * Anything else typed/committed that doesn't resolve to one of those two
 * shapes is rejected (kept as the previous value) — this is not a freeSolo
 * "type anything" field, just two fixed answers, one of which has a blank.
 * Old variations with arbitrary free text (pre-dating this field) still
 * display/pre-fill fine; they're just not a valid *new* commit target.
 */
export default function AdditionalTimeSelectField({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = /^ar\b/i.test(i18n.language || '');

  const separateLabel = t('additional_time_default', SEPARATE_VALUE);
  const daysUnit = t('days', 'days');
  const daysLabel = (digits) => `${digits || '___'} ${daysUnit}`;

  const getDisplayLabel = (val) => {
    if (!val) return '';
    if (val === SEPARATE_VALUE) return separateLabel;
    const m = String(val).match(/^(\d+)\s*days?$/i);
    if (m) return daysLabel(m[1]);
    return val; // legacy free text — shown as-is until re-edited
  };

  const commit = (raw) => {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) {
      onChange('');
      return;
    }
    if (trimmed.toLowerCase() === SEPARATE_VALUE.toLowerCase() || trimmed === separateLabel) {
      onChange(SEPARATE_VALUE);
      return;
    }
    const daysUnitEscaped = daysUnit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const daysMatch = trimmed.match(new RegExp(`^(\\d+)\\s*(days?|${daysUnitEscaped})?$`, 'i'));
    if (daysMatch) {
      onChange(`${daysMatch[1]} days`);
      return;
    }
    // Doesn't resolve to either of the two valid answers — ignore the edit
    // and keep whatever was previously stored (including legacy free text).
  };

  const handleChange = (_event, newValue) => {
    if (!newValue) {
      onChange('');
      return;
    }
    if (typeof newValue === 'string') {
      commit(newValue);
      return;
    }
    if (newValue.__daysTemplate) {
      if (!newValue.digits) return;
      onChange(`${newValue.digits} days`);
    }
  };

  return (
    <Autocomplete
      freeSolo
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      disabled={disabled}
      className={className}
      options={[SEPARATE_VALUE]}
      value={value || null}
      onChange={handleChange}
      getOptionLabel={(option) => (
        typeof option === 'string' ? getDisplayLabel(option) : daysLabel(option.digits)
      )}
      // Block selecting "___ days" before any digits are typed — otherwise MUI still
      // snaps its (uncontrolled) inputValue to the clicked option's label even though
      // handleChange no-ops, leaving "___ days" visibly stuck in the field.
      getOptionDisabled={(option) => typeof option !== 'string' && option.__daysTemplate && !option.digits}
      // Only 2 answers ever exist, so there's no real "search" to narrow down —
      // always show both. The days entry re-derives its digits from whatever's
      // currently typed (e.g. reopening on an existing "30 days" value still
      // shows "30 days", not an empty list from a failed text-match filter).
      filterOptions={(opts, params) => [
        ...opts,
        { __daysTemplate: true, digits: params.inputValue.replace(/[^0-9]/g, '') },
      ]}
      renderOption={(optionProps, option) => (
        <li {...optionProps} key={typeof option === 'string' ? option : 'days-template'}>
          {typeof option === 'string' ? getDisplayLabel(option) : daysLabel(option.digits)}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '10pt',
              backgroundColor: 'var(--color-white, #fff)',
              '& fieldset': { borderColor: 'var(--border-primary, #ccc)' },
              '&:hover fieldset': { borderColor: 'var(--text-tertiary, #999)' },
              '&.Mui-focused': {
                boxShadow: '0 0 0 3px var(--primary-100, #D1DEE9)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--primary-500, #3D5A80)',
              },
              '& .MuiOutlinedInput-input': {
                border: 'none',
                minHeight: 'auto',
                background: 'none',
                boxShadow: 'none',
                padding: '8px 12px',
                textAlign: isRTL ? 'right' : 'left',
                '&:focus': {
                  border: 'none',
                  boxShadow: 'none',
                  outline: 'none',
                },
              },
            },
          }}
        />
      )}
      componentsProps={{
        popper: { sx: { zIndex: 1000 } },
        paper: {
          sx: {
            borderRadius: '10px',
            border: '1px solid var(--border, #e5e7eb)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
            marginTop: '6px',
            '& .MuiAutocomplete-option': {
              padding: '8px 12px',
              fontSize: '13px',
              borderBottom: '1px solid var(--border, #f1f1f1)',
              '&:last-of-type': { borderBottom: 'none' },
              '&[aria-selected="true"]': { backgroundColor: 'var(--primary-100, #D1DEE9)' },
              '&.Mui-focused': { backgroundColor: 'var(--surface, #f9fafb)' },
            },
          },
        },
      }}
    />
  );
}

AdditionalTimeSelectField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};
