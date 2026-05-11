import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { companyApi } from '../../../services/company/companyApi';
import { authApi } from '../../../services/auth/authApi';
import PageLayout from '../../../components/layout/PageLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button';
import ActionMenu from '../../../components/common/ActionMenu';
import Dialog from '../../../components/common/Dialog';
import Field from '../../../components/forms/Field';
import UniqueFieldInput from '../../../components/forms/UniqueFieldInput';
import PhoneInput from '../../../components/forms/PhoneInput';
import FileUpload from '../../../components/file-upload/FileUpload';
import SignaturePad from '../../../components/signature/SignaturePad';
import { logger } from '../../../utils/logger';
import { useNotifications } from '../../../contexts/NotificationContext';
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import './CompanyUsersPage.css';

function UserAvatar({ user }) {
  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  return <div className="cu-avatar">{initials}</div>;
}

export default function CompanyUsersPage() {
  const { user, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useTenantNavigate();
  const { success, error: showError } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState({});

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: '',
    is_active: true,
    id_number: '',
    id_file: null,
    id_expiry_date: '',
    job_title: '',
    signature: null,
    effective_permission_codes: [],
  });

  const [formErrors, setFormErrors] = useState({});

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const { canManageUsers } = useAuth();

  useEffect(() => {
    if (!canManageUsers) return;
    loadData();
  }, [canManageUsers]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [usersData, allRoles, permsData] = await Promise.all([
        companyApi.getUsers(),
        companyApi.getRoles(),
        companyApi.getPermissionsByCategory().catch(() => ({})),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : (usersData?.results || usersData || []));

      const ALLOWED_ROLE_NAMES = ['company_super_admin', 'Admin', 'Manager', 'staff_user'];
      const companyRoles = (Array.isArray(allRoles) ? allRoles : (allRoles?.results || []))
        .filter(r => r.is_active && ALLOWED_ROLE_NAMES.includes(r.name));
      setRoles(companyRoles);

      setPermissionsByCategory(permsData || {});
    } catch (err) {
      logger.error('Error loading data', err);
      showError(err.response?.data?.error || t('company_error_loading_data'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === 'role') {
      const selectedRole = roles.find(r => String(r.id) === String(value));
      if (selectedRole?.name !== 'staff_user') {
        setFormData(prev => ({ ...prev, role: value, effective_permission_codes: [] }));
        return;
      }
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePermissionToggle = (code) => {
    setFormData(prev => {
      const current = prev.effective_permission_codes;
      return {
        ...prev,
        effective_permission_codes: current.includes(code)
          ? current.filter(c => c !== code)
          : [...current, code],
      };
    });
  };

  const handleCategoryToggle = (categoryPerms, allChecked) => {
    const codes = categoryPerms.map(p => p.code);
    setFormData(prev => {
      const current = new Set(prev.effective_permission_codes);
      if (allChecked) {
        codes.forEach(c => current.delete(c));
      } else {
        codes.forEach(c => current.add(c));
      }
      return { ...prev, effective_permission_codes: Array.from(current) };
    });
  };

  const handleOpenModal = useCallback((userToEdit = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        email: userToEdit.email || '',
        password: '',
        first_name: userToEdit.first_name || '',
        last_name: userToEdit.last_name || '',
        phone: (userToEdit.phone || '').replace(/^\+971/, ''),
        role: userToEdit.role?.id || '',
        is_active: userToEdit.is_active !== false,
        id_number: userToEdit.id_number || '',
        id_file: null,
        id_expiry_date: userToEdit.id_expiry_date || '',
        job_title: userToEdit.job_title || '',
        signature: null,
        _existing_id_file_url: userToEdit.id_file_url || '',
        _existing_signature_url: userToEdit.signature_url || '',
        effective_permission_codes: Array.isArray(userToEdit.permissions)
          ? userToEdit.permissions
          : [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: '',
        is_active: true,
        id_number: '',
        id_file: null,
        id_expiry_date: '',
        job_title: '',
        signature: null,
        effective_permission_codes: [],
      });
    }
    setShowModal(true);
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormErrors({});
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: '',
      is_active: true,
      id_number: '',
      id_file: null,
      id_expiry_date: '',
      job_title: '',
      signature: null,
      effective_permission_codes: [],
    });
  };

  const isStaffUserRole = (roleId) => {
    return roles.find(r => String(r.id) === String(roleId))?.name === 'staff_user';
  };

  const buildFormData = () => {
    const fd = new FormData();
    const hasFiles = formData.id_file instanceof File || formData.signature instanceof File;

    const textFields = ['email', 'password', 'first_name', 'last_name', 'id_number', 'id_expiry_date', 'job_title'];
    textFields.forEach(key => {
      if (formData[key]) fd.append(key, formData[key]);
    });
    if (formData.phone) fd.append('phone', `+971${formData.phone}`);
    if (formData.role) fd.append('role_id', formData.role);
    if (formData.id_file instanceof File) fd.append('id_file', formData.id_file);
    if (formData.signature instanceof File) fd.append('signature', formData.signature);

    if (isStaffUserRole(formData.role)) {
      formData.effective_permission_codes.forEach(code =>
        fd.append('explicit_permission_codes_write', code)
      );
    }

    return { fd, hasFiles };
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.id_expiry_date) {
      errors.id_expiry_date = t('fill_required_fields');
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const staffRole = isStaffUserRole(formData.role);

      if (editingUser) {
        const { fd, hasFiles } = buildFormData();
        if (!formData.password) fd.delete('password');

        if (hasFiles) {
          await authApi.updateUser(editingUser.id, fd);
        } else {
          const updateData = { ...formData };
          if (!updateData.password) delete updateData.password;
          if (updateData.role) {
            updateData.role_id = updateData.role;
            delete updateData.role;
          }
          if (updateData.phone) updateData.phone = `+971${updateData.phone}`;
          if (!updateData.id_expiry_date) delete updateData.id_expiry_date;
          if (!updateData.id_number) delete updateData.id_number;
          delete updateData.id_file;
          delete updateData.signature;
          delete updateData._existing_id_file_url;
          delete updateData._existing_signature_url;
          if (staffRole) {
            updateData.explicit_permission_codes_write = updateData.effective_permission_codes;
          }
          delete updateData.effective_permission_codes;
          await authApi.updateUser(editingUser.id, updateData);
        }
        success(t('company_user_updated'));
      } else {
        if (!formData.email || !formData.email.trim()) {
          showError(t('company_email_required'));
          setLoading(false);
          return;
        }
        if (!formData.password || !formData.password.trim()) {
          showError(t('company_password_required'));
          setLoading(false);
          return;
        }

        const hasFiles = formData.id_file instanceof File || formData.signature instanceof File;
        if (hasFiles) {
          const { fd } = buildFormData();
          await authApi.createUser(fd);
        } else {
          const createData = { ...formData };
          if (createData.role) {
            createData.role_id = createData.role;
            delete createData.role;
          }
          if (!createData.first_name) delete createData.first_name;
          if (!createData.last_name) delete createData.last_name;
          if (createData.phone) createData.phone = `+971${createData.phone}`;
          else delete createData.phone;
          if (!createData.id_expiry_date) delete createData.id_expiry_date;
          if (!createData.id_number) delete createData.id_number;
          if (!createData.job_title) delete createData.job_title;
          delete createData.id_file;
          delete createData.signature;
          if (staffRole) {
            createData.explicit_permission_codes_write = createData.effective_permission_codes;
          }
          delete createData.effective_permission_codes;
          await authApi.createUser(createData);
        }
        success(t('company_user_created'));
      }

      await loadData();
      await refreshUser();
      handleCloseModal();
    }
    catch (err) {
      logger.error('Error saving user', err);
      let errorMsg = '';
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.error) {
          errorMsg = errorData.error;
        } else if (errorData.email) {
          errorMsg = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        } else if (errorData.password) {
          errorMsg = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        } else if (errorData.role_id) {
          errorMsg = Array.isArray(errorData.role_id) ? errorData.role_id[0] : errorData.role_id;
        } else if (typeof errorData === 'object') {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const msg = Array.isArray(messages) ? messages[0] : messages;
              return `${field}: ${msg}`;
            })
            .join(', ');
          if (fieldErrors) errorMsg = fieldErrors;
        }
        if (!errorMsg) errorMsg = JSON.stringify(errorData, null, 2);
      } else {
        errorMsg = err.message || t('company_error_saving_data');
      }
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUserId) return;
    setLoading(true);
    try {
      await authApi.deleteUser(deletingUserId);
      success(t('company_user_deleted'));
      setDeleteConfirmOpen(false);
      setDeletingUserId(null);
      await loadData();
    } catch (err) {
      logger.error('Error deleting user', err);
      showError(err.response?.data?.error || t('company_error_deleting_user'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userToToggle) => {
    setLoading(true);
    try {
      await authApi.toggleUserStatus(userToToggle.id);
      success(t('company_user_status_updated'));
      await loadData();
    } catch (err) {
      logger.error('Error toggling user status', err);
      showError(
        err.response?.data?.error ||
        err.data?.error ||
        err.message ||
        t('company_error_updating_status')
      );
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (u) => {
    const roleName = u.role?.name;
    if (!roleName) return '-';
    const key = `nav_role_${roleName.toLowerCase()}`;
    const translated = t(key, { defaultValue: '' });
    return translated || (isRTL ? u.role?.name_ar || roleName : u.role?.name_en || roleName);
  };

  if (!canManageUsers) {
    return (
      <div className="prj-alert" style={{ margin: 40 }}>
        <div className="prj-alert__title">{t('company_unauthorized')}</div>
        <p>{t('company_no_permission')}</p>
      </div>
    );
  }

  return (
    <PageLayout loading={loadingData} loadingText={t("loading")}>
      <div className="list-page">
        <PageHeader
          onBack={() => navigate(-1)}
          title={t('company_manage_users')}
          subtitle={t('company_manage_users_subtitle')}
          actions={
            <Button variant="primary" onClick={() => handleOpenModal()}>
              + {t('company_add_new_user')}
            </Button>
          }
        />

        {users.length === 0 ? (
          <div className="cu-empty">
            <div className="cu-empty__icon">👥</div>
            <p className="cu-empty__title">{t('company_no_users')}</p>
            <p className="cu-empty__sub">{t('company_no_users_sub') || (isRTL ? 'ابدأ بإضافة أول موظف في الشركة' : 'Start by adding your first team member')}</p>
            <Button variant="primary" onClick={() => handleOpenModal()}>
              + {t('company_add_new_user')}
            </Button>
          </div>
        ) : (
          <div className="prj-table__wrapper">
            <table className="prj-table">
              <thead>
                <tr>
                  <th className="ds-text-center ds-w-60">#</th>
                  <th style={{ textAlign: isRTL ? 'right' : 'left' }}>{t('company_th_name')}</th>
                  <th>{t('user_job_title')}</th>
                  <th>{t('company_th_role')}</th>
                  <th className="ds-text-center">{t('company_th_status')}</th>
                  <th className="ds-w-60 ds-text-center">{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id}>
                    <td className="ds-text-center prj-table__index">{idx + 1}</td>
                    <td>
                      <div className="cu-user-cell">
                        <UserAvatar user={u} />
                        <div>
                          <div className="cu-user-name">
                            {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div className="cu-user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.job_title || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td>
                      <span className="prj-badge prj-badge--info">
                        {getRoleName(u)}
                      </span>
                    </td>
                    <td className="ds-text-center">
                      <span className={`prj-badge ${u.is_active ? 'prj-badge--success' : 'prj-badge--danger'}`}>
                        {u.is_active ? t('company_status_active') : t('company_status_inactive')}
                      </span>
                    </td>
                    <td className="col-actions">
                      <ActionMenu items={[
                        { label: t('company_btn_edit'), type: 'button', onClick: () => handleOpenModal(u) },
                        {
                          label: u.is_active ? t('company_btn_disable') : t('company_btn_enable'),
                          type: 'button',
                          variant: u.is_active ? 'danger' : 'success',
                          onClick: () => handleToggleActive(u),
                        },
                        ...(u.id !== user?.id ? [{
                          label: t('delete'),
                          type: 'button',
                          variant: 'danger',
                          onClick: () => { setDeletingUserId(u.id); setDeleteConfirmOpen(true); },
                        }] : []),
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="prj-foot prj-muted">
                    {t("total")}: {users.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Delete Confirm Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          title={t("confirm_delete")}
          desc={t('company_confirm_delete_user')}
          confirmLabel={loading ? t("deleting") : t("delete")}
          cancelLabel={t("cancel")}
          onClose={() => !loading && setDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
          danger
          busy={loading}
        />

        {/* Add/Edit User Dialog */}
        <Dialog
          open={showModal}
          title={editingUser ? t('company_edit_user') : t('company_add_new_user')}
          confirmLabel={loading ? t("saving") : (editingUser ? t('company_save_changes') : t('company_add_user'))}
          cancelLabel={t("cancel")}
          onClose={() => !loading && handleCloseModal()}
          onConfirm={handleSubmit}
          busy={loading}
          size="large"
        >
          <div className="cu-modal-body">

            {/* ── Section 1: Account Info ── */}
            <div className="cu-section">
              <div className="cu-section__header">
                <div className="cu-section__icon">✉</div>
                <h4 className="cu-section__title">
                  {t('account_information')}
                </h4>
              </div>
              <div className="form-grid cols-2">
                <Field label={t('company_email_label')} required>
                  {editingUser ? (
                    <input
                      type="email"
                      name="email"
                      className="input"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled
                    />
                  ) : (
                    <UniqueFieldInput
                      fieldType="email"
                      className="input"
                      value={formData.email}
                      onChange={(val) => setFormData(prev => ({ ...prev, email: val }))}
                      excludeType="user"
                      excludeId=""
                      placeholder={t("email_placeholder") || "email@example.com"}
                    />
                  )}
                </Field>

                <Field
                  label={editingUser ? t('company_new_password_optional') : t('company_password')}
                  required={!editingUser}
                >
                  <input
                    type="password"
                    name="password"
                    className="input"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    placeholder={editingUser ? t('company_password_keep_current') : ''}
                  />
                </Field>
              </div>
            </div>

            {/* ── Section 2: Personal Info ── */}
            <div className="cu-section">
              <div className="cu-section__header">
                <div className="cu-section__icon">👤</div>
                <h4 className="cu-section__title">
                  {t('personal_information')}
                </h4>
              </div>
              <div className="form-grid cols-2">
                <Field label={t('company_first_name')}>
                  <input
                    type="text"
                    name="first_name"
                    className="input"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder={t('first_name_placeholder')}
                  />
                </Field>

                <Field label={t('company_last_name')}>
                  <input
                    type="text"
                    name="last_name"
                    className="input"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder={t('last_name_placeholder')}
                  />
                </Field>

                <Field label={t('company_phone_label')}>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => setFormData(prev => ({ ...prev, phone: val }))}
                    excludeType="user"
                    excludeId={editingUser?.id || ""}
                  />
                </Field>

                <Field label={t('user_job_title')}>
                  <input
                    type="text"
                    name="job_title"
                    className="input"
                    value={formData.job_title}
                    onChange={handleInputChange}
                    placeholder={t('user_job_title_placeholder')}
                  />
                </Field>
              </div>
            </div>

            {/* ── Section 3: Role & Access ── */}
            <div className="cu-section">
              <div className="cu-section__header">
                <div className="cu-section__icon">🔑</div>
                <h4 className="cu-section__title">
                  {t('role_and_access')}
                </h4>
              </div>
              <div className="form-grid cols-2">
                <Field label={t('company_role_label')} required>
                  <select
                    name="role"
                    className="input"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    disabled={editingUser && editingUser?.role?.name === 'company_super_admin'}
                  >
                    <option value="">{t('company_select_role')}</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {isRTL ? role.name_ar || role.name : role.name_en || role.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label className="cu-active-toggle" style={{ userSelect: 'none' }}>
                    <div className="cu-active-toggle__label">
                      <span className="cu-active-toggle__title">{t('company_user_is_active')}</span>
                      <span className="cu-active-toggle__sub">
                        {formData.is_active
                          ? t('account_active_desc')
                          : t('account_disabled_desc')
                        }
                      </span>
                    </div>
                    <label className="cu-switch">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                      />
                      <span className="cu-switch__track" />
                    </label>
                  </label>
                </div>
              </div>
            </div>

            {/* ── Section 4: Custom Permissions (staff_user only) ── */}
            {isStaffUserRole(formData.role) && (
              <div className="cu-section">
                <div className="cu-section__header">
                  <div className="cu-section__icon">🔐</div>
                  <h4 className="cu-section__title">
                    {isRTL ? 'الصلاحيات المخصصة' : 'Custom Permissions'}
                  </h4>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, marginTop: -4 }}>
                  {isRTL
                    ? 'الصلاحيات الفعلية لهذا الموظف. يمكنك تفعيل أو إلغاء أي صلاحية بشكل مستقل عن الدور الافتراضي.'
                    : 'Effective permissions for this staff member. You can enable or disable any permission independently of the default role.'}
                </p>
                {Object.keys(permissionsByCategory).length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {isRTL ? 'جاري تحميل الصلاحيات...' : 'Loading permissions...'}
                  </p>
                ) : (
                  <div className="cu-permissions-grid">
                    {Object.entries(permissionsByCategory).map(([catKey, cat]) => {
                      const catPerms = cat.permissions || [];
                      const checkedCount = catPerms.filter(p => formData.effective_permission_codes.includes(p.code)).length;
                      const allChecked = checkedCount === catPerms.length;
                      return (
                        <div key={catKey} className="cu-perm-category">
                          <div className="cu-perm-category__header">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={() => handleCategoryToggle(catPerms, allChecked)}
                                style={{ accentColor: 'var(--accent, #C8A84E)', width: 14, height: 14 }}
                              />
                              {isRTL ? cat.label_ar : cat.label_en}
                              <span style={{ fontWeight: 400, opacity: 0.65 }}>
                                ({checkedCount}/{catPerms.length})
                              </span>
                            </label>
                          </div>
                          <div className="cu-perm-category__items">
                            {catPerms.map(perm => (
                              <label key={perm.code} className="cu-perm-item">
                                <input
                                  type="checkbox"
                                  checked={formData.effective_permission_codes.includes(perm.code)}
                                  onChange={() => handlePermissionToggle(perm.code)}
                                />
                                <span>{isRTL ? perm.name : (perm.name_en || perm.name)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Section 5: Identity Documents ── */}
            <div className="cu-section">
              <div className="cu-section__header">
                <div className="cu-section__icon">🪪</div>
                <h4 className="cu-section__title">
                  {t('identity_documents')}
                </h4>
              </div>
              <div className="form-grid cols-2" style={{ marginBottom: 16 }}>
                <Field label={t('user_id_number')}>
                  <UniqueFieldInput
                    fieldType="id_number"
                    className="input"
                    value={formData.id_number}
                    onChange={(val) => setFormData(prev => ({ ...prev, id_number: val }))}
                    excludeType="user"
                    excludeId={editingUser?.id || ""}
                    placeholder={t('user_id_number_placeholder')}
                  />
                </Field>

                <Field label={t('user_id_expiry_date')} required error={formErrors.id_expiry_date}>
                  <input
                    type="date"
                    name="id_expiry_date"
                    className={`input${formErrors.id_expiry_date ? ' form-input-error' : ''}`}
                    value={formData.id_expiry_date}
                    onChange={handleInputChange}
                  />
                </Field>
              </div>

              <div className="cu-files-grid">
                <Field label={t('user_id_file')}>
                  <FileUpload
                    value={formData.id_file}
                    onChange={(file) => setFormData(prev => ({ ...prev, id_file: file }))}
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    maxSizeMB={5}
                    existingFileUrl={formData._existing_id_file_url}
                    existingFileName={t('user_id_file')}
                    onRemoveExisting={() => setFormData(prev => ({ ...prev, _existing_id_file_url: '' }))}
                    showPreview
                    fileType="id_file"
                  />
                </Field>

                <Field label={t('user_signature')}>
                  <SignaturePad
                    value={formData.signature}
                    onChange={(file) => setFormData(prev => ({ ...prev, signature: file }))}
                    existingUrl={formData._existing_signature_url}
                    disabled={false}
                  />
                </Field>
              </div>
            </div>

          </div>
        </Dialog>
      </div>
    </PageLayout>
  );
}
