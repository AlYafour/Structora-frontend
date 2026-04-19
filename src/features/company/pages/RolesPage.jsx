import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaShieldAlt, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes,
  FaUsers, FaChevronDown, FaChevronUp, FaSave, FaBan,
} from 'react-icons/fa';
import { rolesApi, permissionsApi } from '../../../services/roles';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import './RolesPage.css';

// System roles cannot be deleted
const SYSTEM_ROLES = new Set(['company_super_admin', 'Admin', 'Manager', 'staff_user']);

// ─── Permission checkbox group ───────────────────────────────
function PermissionGroup({ category, label, permissions, selected, onToggle, onToggleAll }) {
  const [open, setOpen] = useState(true);
  const allChecked = permissions.every(p => selected.has(p.code));
  const someChecked = permissions.some(p => selected.has(p.code));
  const { i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language);

  return (
    <div className="rp-perm-group">
      <div className="rp-perm-group__header" onClick={() => setOpen(v => !v)}>
        <label className="rp-perm-group__all" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={allChecked}
            ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
            onChange={() => onToggleAll(permissions.map(p => p.code), !allChecked)}
          />
          <span className="rp-perm-group__label">{label}</span>
          <span className="rp-perm-group__count">({permissions.length})</span>
        </label>
        <button type="button" className="rp-perm-group__toggle">
          {open ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>
      {open && (
        <div className="rp-perm-group__items">
          {permissions.map(p => (
            <label key={p.code} className="rp-perm-item">
              <input
                type="checkbox"
                checked={selected.has(p.code)}
                onChange={() => onToggle(p.code)}
              />
              <span className="rp-perm-item__name">{isAR ? p.name : (p.name_en || p.name)}</span>
              <span className="rp-perm-item__code">{p.code}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Role form (create / edit) ───────────────────────────────
function RoleForm({ role, permCategories, onSave, onCancel }) {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language);
  const [form, setForm] = useState({
    name: role?.name || '',
    name_en: role?.name_en || '',
    description: role?.description || '',
    is_active: role?.is_active ?? true,
  });
  const [selected, setSelected] = useState(
    new Set(role?.permission_codes || [])
  );
  const [saving, setSaving] = useState(false);
  const { error: showError } = useNotifications();

  const isSystem = role && SYSTEM_ROLES.has(role.name);

  const toggle = useCallback((code) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }, []);

  const toggleAll = useCallback((codes, add) => {
    setSelected(prev => {
      const next = new Set(prev);
      codes.forEach(c => add ? next.add(c) : next.delete(c));
      return next;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showError(t('roles_name_required', 'اسم الدور مطلوب')); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        permission_codes_write: Array.from(selected),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="rp-form" onSubmit={handleSubmit}>
      <div className="rp-form__fields">
        <div className="rp-form__row">
          <div className="rp-form__field">
            <label>{t('roles_name_ar', 'اسم الدور (عربي)')}</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              disabled={isSystem}
              placeholder={t('roles_name_ar_placeholder', 'مثال: محاسب')}
              required
            />
            {isSystem && <p className="rp-form__hint">{t('roles_system_name_locked', 'اسم الدور الأساسي محمي')}</p>}
          </div>
          <div className="rp-form__field">
            <label>{t('roles_name_en', 'اسم الدور (إنجليزي)')}</label>
            <input
              className="input"
              value={form.name_en}
              onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
              placeholder="e.g. Accountant"
            />
          </div>
        </div>
        <div className="rp-form__field">
          <label>{t('roles_description', 'الوصف')}</label>
          <input
            className="input"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t('roles_description_placeholder', 'وصف مختصر لمهام هذا الدور')}
          />
        </div>
      </div>

      <div className="rp-form__perms-title">
        <FaShieldAlt />
        {t('roles_permissions', 'الصلاحيات')}
        <span className="rp-form__perms-count">
          {selected.size} {t('roles_selected', 'محدد')}
        </span>
      </div>

      <div className="rp-form__perms">
        {Object.entries(permCategories).map(([cat, data]) => (
          <PermissionGroup
            key={cat}
            category={cat}
            label={isAR ? data.label_ar : data.label_en}
            permissions={data.permissions}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        ))}
      </div>

      <div className="rp-form__actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          <FaBan /> {t('cancel', 'إلغاء')}
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <FaSave /> {saving ? t('saving', 'جار الحفظ...') : t('save', 'حفظ')}
        </button>
      </div>
    </form>
  );
}

// ─── Role card ───────────────────────────────────────────────
function RoleCard({ role, onEdit, onDelete }) {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language);
  const isSystem = SYSTEM_ROLES.has(role.name);

  return (
    <div className={`rp-card ${!role.is_active ? 'rp-card--inactive' : ''}`}>
      <div className="rp-card__header">
        <div className="rp-card__info">
          <h3 className="rp-card__name">{isAR ? role.name : (role.name_en || role.name)}</h3>
          {role.description && <p className="rp-card__desc">{role.description}</p>}
        </div>
        <div className="rp-card__meta">
          <span className="rp-card__users">
            <FaUsers /> {role.users_count || 0}
          </span>
          {isSystem && <span className="rp-card__system-badge">{t('roles_system_badge', 'نظام')}</span>}
        </div>
      </div>

      <div className="rp-card__perms">
        {(role.permission_codes || []).slice(0, 8).map(code => (
          <span key={code} className="rp-card__perm-chip">{code}</span>
        ))}
        {(role.permission_codes || []).length > 8 && (
          <span className="rp-card__perm-chip rp-card__perm-chip--more">
            +{role.permission_codes.length - 8}
          </span>
        )}
      </div>

      <div className="rp-card__actions">
        <button className="btn btn-sm btn-ghost" onClick={() => onEdit(role)}>
          <FaEdit /> {t('edit', 'تعديل')}
        </button>
        {!isSystem && (
          <button className="btn btn-sm btn-danger-ghost" onClick={() => onDelete(role)}>
            <FaTrash /> {t('delete', 'حذف')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────
export default function RolesPage() {
  const { t } = useTranslation();
  const { canManageRoles } = useAuth();
  const { success, error: showError } = useNotifications();

  const [roles, setRoles] = useState([]);
  const [permCategories, setPermCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingRole, setEditingRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // withPermissions() may return 403 if user only has role.view (not admin)
      // fall back to basic list() in that case
      let rolesData = [];
      try {
        const rolesRes = await rolesApi.withPermissions();
        rolesData = rolesRes.data;
      } catch (rolesErr) {
        if (rolesErr?.response?.status === 403 || rolesErr?.response?.status === 404) {
          const fallback = await rolesApi.list();
          rolesData = fallback.data;
        } else {
          throw rolesErr;
        }
      }

      let permsData = {};
      try {
        const permsRes = await permissionsApi.byCategory();
        permsData = permsRes.data;
      } catch {
        // permissions by category not critical — page still works without it
      }

      setRoles(rolesData);
      setPermCategories(permsData);
    } catch {
      showError(t('roles_load_error', 'تعذر تحميل الأدوار'));
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data) => {
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, data);
        success(t('roles_updated', 'تم تحديث الدور بنجاح'));
      } else {
        await rolesApi.create(data);
        success(t('roles_created', 'تم إنشاء الدور بنجاح'));
      }
      setView('list');
      setEditingRole(null);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.name?.[0] || err?.response?.data?.error || t('error_generic', 'حدث خطأ');
      showError(msg);
    }
  };

  const handleDelete = async (role) => {
    try {
      await rolesApi.delete(role.id);
      success(t('roles_deleted', 'تم حذف الدور'));
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      showError(err?.response?.data?.error || t('error_generic', 'حدث خطأ'));
      setDeleteConfirm(null);
    }
  };

  if (!canManageRoles) {
    return (
      <div className="rp-forbidden">
        <FaBan className="rp-forbidden__icon" />
        <p>{t('no_permission', 'ليس لديك صلاحية الوصول لهذه الصفحة')}</p>
      </div>
    );
  }

  return (
    <div className="rp-page">
      {/* Header */}
      <div className="rp-page__header">
        <div className="rp-page__title">
          <FaShieldAlt className="rp-page__icon" />
          <div>
            <h1>{t('roles_title', 'الأدوار والصلاحيات')}</h1>
            <p>{t('roles_subtitle', 'أنشئ أدواراً مخصصة وحدد صلاحياتها بدقة')}</p>
          </div>
        </div>
        {view === 'list' && (
          <button className="btn btn-primary" onClick={() => { setEditingRole(null); setView('create'); }}>
            <FaPlus /> {t('roles_add', 'دور جديد')}
          </button>
        )}
      </div>

      {/* Form view */}
      {(view === 'create' || view === 'edit') && (
        <div className="rp-form-wrapper">
          <h2 className="rp-form-wrapper__title">
            {view === 'create' ? t('roles_create', 'إنشاء دور جديد') : t('roles_edit', 'تعديل الدور')}
          </h2>
          <RoleForm
            role={editingRole}
            permCategories={permCategories}
            onSave={handleSave}
            onCancel={() => { setView('list'); setEditingRole(null); }}
          />
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          {loading ? (
            <div className="rp-loading">{t('loading', 'جار التحميل...')}</div>
          ) : (
            <div className="rp-grid">
              {roles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={r => { setEditingRole(r); setView('edit'); }}
                  onDelete={r => setDeleteConfirm(r)}
                />
              ))}
              {roles.length === 0 && (
                <div className="rp-empty">{t('roles_empty', 'لا توجد أدوار بعد')}</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="rp-dialog-overlay">
          <div className="rp-dialog">
            <h3>{t('roles_delete_confirm', 'تأكيد الحذف')}</h3>
            <p>{t('roles_delete_msg', 'هل تريد حذف دور')} <strong>{deleteConfirm.name}</strong>؟</p>
            <div className="rp-dialog__actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>
                <FaTimes /> {t('cancel', 'إلغاء')}
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                <FaTrash /> {t('delete', 'حذف')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
