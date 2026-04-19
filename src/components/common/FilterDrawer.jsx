import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";

export default function FilterDrawer({ open, onClose, filters, setFilters, clearFilters, cities, projectTypes, consultants, contractTypes, getProjectTypeLabel, getContractTypeLabel, i18n }) {
  const { t } = useTranslation();
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    const timerId = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasActiveFilters = Object.values(filters).some(v => v && v.trim() !== "");

  return (
    <>
      <div className="filter-drawer-backdrop" role="presentation" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} />
      <div ref={drawerRef} className="filter-drawer">
        <div className="filter-drawer__header">
          <h3 className="filter-drawer__title">{t("filters")}</h3>
          <Button variant="ghost" size="sm" className="filter-drawer__close" onClick={onClose} aria-label={t("close")}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 5L5 15M5 5l10 10" />
            </svg>
          </Button>
        </div>

        <div className="filter-drawer__body">
          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("general_search")}</label>
            <input
              className="filter-drawer__input"
              type="text"
              placeholder={t("general_search")}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>

          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("project_view_internal_code").replace(":", "")}</label>
            <div className="filter-drawer__input-wrapper">
              <span className="filter-drawer__prefix">M</span>
              <input
                className="filter-drawer__input"
                type="text"
                placeholder={t("project_view_internal_code").replace(":", "")}
                value={filters.internal_code}
                onChange={(e) => {
                  let value = e.target.value;
                  if (value.startsWith("M") || value.startsWith("m")) {
                    value = value.substring(1);
                  }
                  setFilters((f) => ({ ...f, internal_code: value }));
                }}
              />
            </div>
          </div>

          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("city")}</label>
            <input
              className="filter-drawer__input"
              type="text"
              placeholder={t("city")}
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              list="cities-list"
            />
            <datalist id="cities-list">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>

          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("project_type")}</label>
            <select
              className="filter-drawer__select"
              value={filters.project_type}
              onChange={(e) => setFilters((f) => ({ ...f, project_type: e.target.value }))}
            >
              <option value="">{t("type_all")}</option>
              {projectTypes.map((type) => (
                <option key={type} value={type}>
                  {getProjectTypeLabel(type, i18n.language)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("consultant")}</label>
            <select
              className="filter-drawer__select"
              value={filters.consultant}
              onChange={(e) => setFilters((f) => ({ ...f, consultant: e.target.value }))}
            >
              <option value="">{t("consultant_all")}</option>
              {consultants.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("contract_type")}</label>
            <select
              className="filter-drawer__select"
              value={filters.contract_type}
              onChange={(e) => setFilters((f) => ({ ...f, contract_type: e.target.value }))}
            >
              <option value="">{t("contract_type_all")}</option>
              {contractTypes.map((c) => (
                <option key={c} value={c}>
                  {getContractTypeLabel(c, i18n.language)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("owner_name")}</label>
            <input
              className="filter-drawer__input"
              type="text"
              placeholder={t("owner_name")}
              value={filters.owner_name}
              onChange={(e) => setFilters((f) => ({ ...f, owner_name: e.target.value }))}
            />
          </div>

          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("phone_number_search")}</label>
            <input
              className="filter-drawer__input"
              type="text"
              placeholder={t("phone_number_search")}
              value={filters.phone}
              onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="filter-drawer__section">
            <label className="filter-drawer__label">{t("email_search")}</label>
            <input
              className="filter-drawer__input"
              type="text"
              placeholder={t("email_search")}
              value={filters.email}
              onChange={(e) => setFilters((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </div>

        <div className="filter-drawer__footer">
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="filter-drawer__clear">
              {t("clear_filters")}
            </Button>
          )}
          <Button variant="primary" onClick={onClose} className="filter-drawer__apply">
            {t("apply_filters")}
          </Button>
        </div>
      </div>
    </>
  );
}
