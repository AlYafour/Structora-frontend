/**
 * 🎨 RtlSelect Component (MUI Version)
 * RTL-aware select dropdown using MUI Autocomplete
 *
 * @version 2.0.0 - Migrated from react-select to MUI
 * @migration This component now uses MUI Autocomplete instead of react-select
 *            for bundle size optimization (~100KB saved)
 */

import { useMemo, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

const RtlSelect = forwardRef(function RtlSelect({
  options = [],
  value,
  onChange,
  placeholder,
  isDisabled = false,
  isClearable = true,
  className = '',
}, ref) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === 'ar';

  // Find selected option
  const findOption = (v) => options.find((o) => o.value === v) || null;

  const selectedOption = useMemo(() => findOption(value), [value, options]);

  const handleChange = (_event, newValue) => {
    onChange(newValue ? newValue.value : '');
  };

  return (
    <div className={`rtl-select ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Autocomplete
        ref={ref}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        getOptionLabel={(option) => option?.label ?? ''}
        isOptionEqualToValue={(option, val) => option?.value === val?.value}
        disabled={isDisabled}
        disableClearable={!isClearable}
        size="small"
        noOptionsText={t('no_options', 'لا توجد خيارات')}
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
            sx={{
              '& .MuiOutlinedInput-root': {
                direction: isRTL ? 'rtl' : 'ltr',
                '& fieldset': {
                  borderColor: 'var(--color-border, #e5e7eb)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--color-primary, #14213D)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--color-primary, #14213D)',
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

export default RtlSelect;
