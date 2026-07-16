import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

/**
 * Single-select combobox over a fixed list of preset string options — no
 * freeSolo typing, no "add option" affordance; picking an option replaces
 * the value outright. Single-select sibling of MultiPresetSelectField.
 *
 * `value`/`options` stay the stable canonical (English) strings — only the
 * displayed label localizes. Pass `optionLabelsAr` (a map of canonical
 * option -> Arabic label) to localize the displayed text when the UI
 * language is Arabic.
 */
export default function SinglePresetSelectField({
  value,
  onChange,
  options,
  optionLabelsAr,
  placeholder,
  className = '',
  disabled = false,
}) {
  const { i18n } = useTranslation();
  const isRTL = /^ar\b/i.test(i18n.language || '');

  const handleChange = (_event, newValue) => {
    onChange(newValue ?? '');
  };

  const getLabel = (option) => (isRTL && optionLabelsAr?.[option]) || option || '';

  return (
    <Autocomplete
      disabled={disabled}
      disableClearable
      className={className}
      options={options}
      value={value || null}
      onChange={handleChange}
      getOptionLabel={getLabel}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          sx={{
            width: '100%',
            '& .MuiOutlinedInput-root': {
              width: '100%',
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
                padding: '5px 8px',
                textAlign: 'center',
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
              textAlign: isRTL ? 'right' : 'left',
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

SinglePresetSelectField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  optionLabelsAr: PropTypes.objectOf(PropTypes.string),
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};
