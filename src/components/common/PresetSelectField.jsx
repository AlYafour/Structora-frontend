import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/Add';

const filter = createFilterOptions();

/**
 * Searchable combobox over a list of preset string options: typing filters
 * the list, and if nothing matches, an "Add '<text>'" option lets the user
 * commit the typed text as a custom value. Same freeSolo-Autocomplete
 * pattern already used in PersonField.jsx, generalized to plain strings.
 */
export default function PresetSelectField({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  disabled = false,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = /^ar\b/i.test(i18n.language || '');

  const handleChange = (_event, newValue) => {
    if (!newValue) {
      onChange('');
    } else if (typeof newValue === 'string') {
      onChange(newValue);
    } else {
      onChange(newValue.inputValue ?? '');
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
      options={options}
      value={value ?? ''}
      onChange={handleChange}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option?.label ?? '')}
      filterOptions={(opts, params) => {
        const filtered = filter(opts, params);
        const input = params.inputValue;
        const isExisting = opts.some(o => input.toLowerCase() === o.toLowerCase());
        if (input !== '' && !isExisting) {
          filtered.push({ inputValue: input, label: `${t('add_option')} "${input}"` });
        }
        return filtered;
      }}
      renderOption={(optionProps, option) => (
        <li {...optionProps} key={typeof option === 'string' ? option : option.inputValue}>
          {typeof option === 'string' ? option : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--primary-500, #3D5A80)' }}>
              <AddIcon fontSize="small" />
              {option.label}
            </Box>
          )}
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
      componentsProps={{ popper: { sx: { zIndex: 1000 } } }}
    />
  );
}

PresetSelectField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};
