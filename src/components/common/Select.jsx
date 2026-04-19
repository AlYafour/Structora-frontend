import PropTypes from "prop-types";

/**
 * 🎨 UnifiedSelect Component (MUI Version)
 * Unified select dropdown using MUI Autocomplete
 * Supports RTL/LTR, search, clear, and consistent styling
 *
 * @version 2.0.0 - Migrated from react-select to MUI
 * @migration This component now uses MUI Autocomplete instead of react-select
 *            for bundle size optimization (~100KB saved)
 */

import { useMemo, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';

const UnifiedSelect = forwardRef(function UnifiedSelect({
  options = [],
  value,
  onChange,
  placeholder,
  isDisabled = false,
  isClearable = true,
  isSearchable = true,
  className = '',
  style = {},
  getOptionLabel: customGetOptionLabel,
  getOptionValue: customGetOptionValue,
  isLoading = false,
  noOptionsMessage,
}, ref) {
  const { t, i18n } = useTranslation();
  const isRTL = /^ar\b/i.test(i18n.language || '');

  // Transform options if needed
  const transformedOptions = useMemo(() => {
    if (!options || options.length === 0) return [];

    // If options already have value/label, use them
    if (options[0] && ('value' in options[0] || 'label' in options[0])) {
      return options.map((opt) => ({
        value: opt.value,
        label: opt.label ?? String(opt.value),
        original: opt,
      }));
    }

    // Otherwise, transform from common formats
    return options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt), original: opt };
      }

      // Handle objects with id/name/display_name
      const val = customGetOptionValue ? customGetOptionValue(opt) : (opt.id || opt.value);
      const label = customGetOptionLabel
        ? customGetOptionLabel(opt)
        : (opt.display_name || opt.name || opt.label || String(val));

      return { value: val, label, original: opt };
    });
  }, [options, customGetOptionLabel, customGetOptionValue]);

  // Find selected option
  const selectedOption = useMemo(() => {
    if (value === null || value === undefined || value === '') return null;
    return transformedOptions.find((opt) => {
      const optValue = customGetOptionValue && opt.original
        ? customGetOptionValue(opt.original)
        : opt.value;
      return String(optValue) === String(value);
    }) || null;
  }, [value, transformedOptions, customGetOptionValue]);

  const handleChange = (_event, newValue) => {
    if (!newValue) {
      onChange('');
      return;
    }
    const optValue = customGetOptionValue && newValue.original
      ? customGetOptionValue(newValue.original)
      : newValue.value;
    onChange(optValue);
  };

  return (
    <div className={`unified-select ${className}`} style={style} dir={isRTL ? 'rtl' : 'ltr'}>
      <Autocomplete
        ref={ref}
        options={transformedOptions}
        value={selectedOption}
        onChange={handleChange}
        getOptionLabel={(option) => option?.label ?? ''}
        isOptionEqualToValue={(option, val) => option?.value === val?.value}
        disabled={isDisabled}
        disableClearable={!isClearable}
        loading={isLoading}
        size="small"
        noOptionsText={
          typeof noOptionsMessage === 'function'
            ? noOptionsMessage({ inputValue: '' })
            : noOptionsMessage || t('no_options', 'لا توجد خيارات')
        }
        loadingText={t('loading', 'جاري التحميل...')}
        componentsProps={{
          paper: {
            sx: {
              direction: isRTL ? 'rtl' : 'ltr',
            },
          },
          popper: {
            sx: {
              zIndex: 9999,
            },
          } }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder || t('select_placeholder', 'اختر...')}
            InputProps={{
              ...params.InputProps,
              readOnly: !isSearchable,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ) }}
            sx={{
              '& .MuiOutlinedInput-root': {
                minHeight: '40px',
                direction: isRTL ? 'rtl' : 'ltr',
                '& fieldset': {
                  borderColor: 'var(--color-border, #e5e7eb)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--color-primary, #14213D)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--color-primary, #14213D)',
                  boxShadow: '0 0 0 3px var(--color-primary-light, rgba(20, 33, 61, 0.1))',
                },
              },
              '& .MuiInputBase-input': {
                textAlign: isRTL ? 'right' : 'left',
              } }}
          />
        )}
        renderOption={(optionProps, option) => (
          <li
            {...optionProps}
            key={option.value}
            style={{
              direction: isRTL ? 'rtl' : 'ltr',
              textAlign: isRTL ? 'right' : 'left' }}
          >
            {option.label}
          </li>
        )}
      />
    </div>
  );
});

UnifiedSelect.propTypes = {
  /** Array of options to display */
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.shape({
        value: PropTypes.any,
        label: PropTypes.string,
      }),
      PropTypes.object,
    ])
  ),
  /** Currently selected value */
  value: PropTypes.any,
  /** Change handler - receives the selected value */
  onChange: PropTypes.func.isRequired,
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Whether the select is disabled */
  isDisabled: PropTypes.bool,
  /** Whether the select can be cleared */
  isClearable: PropTypes.bool,
  /** Whether the select is searchable */
  isSearchable: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Inline styles */
  style: PropTypes.object,
  /** Custom function to get label from option */
  getOptionLabel: PropTypes.func,
  /** Custom function to get value from option */
  getOptionValue: PropTypes.func,
  /** Whether options are loading */
  isLoading: PropTypes.bool,
  /** Message or function to display when no options available */
  noOptionsMessage: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
};

export default UnifiedSelect;
