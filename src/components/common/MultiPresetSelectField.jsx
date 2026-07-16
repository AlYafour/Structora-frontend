import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

/**
 * Searchable multi-select combobox over a fixed list of preset string options.
 * Unlike PresetSelectField, this only allows picking from `options` — no
 * freeSolo typing and no "add option" affordance.
 *
 * `value`/`options` stay the stable canonical (English) strings — the same
 * convention used by COUNTRIES/NATIONALITIES in utils/constants.js, where
 * only the displayed label is localized, not the stored value. Pass
 * `optionLabelsAr` (a map of canonical option -> Arabic label) to localize
 * the displayed text when the UI language is Arabic.
 */
export default function MultiPresetSelectField({
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
    onChange(Array.isArray(newValue) ? newValue : []);
  };

  const getLabel = (option) => {
    if (typeof option !== 'string') return option?.label ?? '';
    return (isRTL && optionLabelsAr?.[option]) || option;
  };

  const hasValue = Array.isArray(value) && value.length > 0;

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      disabled={disabled}
      className={className}
      options={options}
      value={Array.isArray(value) ? value : []}
      onChange={handleChange}
      getOptionLabel={getLabel}
      renderOption={(optionProps, option, { selected }) => (
        <li {...optionProps} key={option}>
          <Checkbox
            icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
            checkedIcon={<CheckBoxIcon fontSize="small" />}
            sx={{
              marginInlineEnd: 1,
              color: 'var(--border-primary, #ccc)',
              '&.Mui-checked': { color: 'var(--primary-500, #3D5A80)' },
            }}
            checked={selected}
          />
          {getLabel(option)}
        </li>
      )}
      renderTags={(selected) => {
        if (!selected.length) return null;
        const joined = selected.map(getLabel).join(isRTL ? '، ' : ', ');
        return (
          <Tooltip arrow title={<span dir={isRTL ? 'rtl' : 'ltr'}>{joined}</span>}>
            <span
              dir={isRTL ? 'rtl' : 'ltr'}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                flex: '1 1 auto',
                fontSize: '10pt',
              }}
            >
              {joined}
            </span>
          </Tooltip>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={hasValue ? '' : placeholder}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '10pt',
              backgroundColor: 'var(--color-white, #fff)',
              flexWrap: 'nowrap',
              overflow: 'hidden',
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
                minWidth: 0,
                // Grows to fill the field (so the placeholder is fully visible) when
                // nothing is selected yet; once chips are present, it only takes the
                // leftover space so it doesn't fight them for room.
                flex: hasValue ? '0 1 auto' : '1 1 auto',
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
        listbox: { sx: { maxHeight: 252, overflowY: 'auto', padding: 0 } },
      }}
    />
  );
}

MultiPresetSelectField.propTypes = {
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  optionLabelsAr: PropTypes.objectOf(PropTypes.string),
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};
