import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../../services/admin';
import { useNotifications } from '../../../contexts/NotificationContext';
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import './AdminCreateCompanyPage.css';

export default function AdminCreateBranchPage() {
  const { companyId } = useParams();
  const navigate = useTenantNavigate();
  const { t, i18n } = useTranslation();
  const { success, error: showError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    branch_name: '', branch_code: '', admin_first_name: '', admin_last_name: '',
    admin_email: '', admin_password: '', max_users: 10, max_projects: 50,
  });

  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: name === 'branch_code' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await adminApi.createBranch(companyId, {
        ...form, max_users: Number(form.max_users), max_projects: Number(form.max_projects),
      });
      success(t('admin_branch_created_success'));
      navigate('/admin/tenants');
    } catch (err) {
      showError(err?.message || t('admin_branch_create_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-create" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="admin-create__header">
        <div><h1 className="admin-create__title">{t('admin_add_branch_title')}</h1><p className="admin-create__subtitle">{t('admin_add_branch_desc')}</p></div>
        <Button variant="secondary" onClick={() => navigate('/admin/tenants')}>{t('admin_back_to_companies')}</Button>
      </div>
      <form onSubmit={submit}>
        <Card className="admin-create__section">
          <div className="admin-create__grid">
            <Field label={t('admin_branch_name')} required><input className="admin-create__input" name="branch_name" value={form.branch_name} onChange={change} required /></Field>
            <Field label={t('admin_branch_code')} required><input className="admin-create__input admin-create__input--mono" name="branch_code" value={form.branch_code} onChange={change} minLength={2} maxLength={10} placeholder="DUB" required /></Field>
            <Field label={t('admin_field_admin_first_name')} required><input className="admin-create__input" name="admin_first_name" value={form.admin_first_name} onChange={change} required /></Field>
            <Field label={t('admin_field_admin_last_name')} required><input className="admin-create__input" name="admin_last_name" value={form.admin_last_name} onChange={change} required /></Field>
            <Field label={t('admin_field_admin_email')} required><input className="admin-create__input" type="email" name="admin_email" value={form.admin_email} onChange={change} required /></Field>
            <Field label={t('admin_field_password')} required><input className="admin-create__input" type="password" name="admin_password" value={form.admin_password} onChange={change} required /></Field>
            <Field label={t('admin_max_users')}><input className="admin-create__input" type="number" min="1" name="max_users" value={form.max_users} onChange={change} /></Field>
            <Field label={t('admin_max_projects')}><input className="admin-create__input" type="number" min="1" name="max_projects" value={form.max_projects} onChange={change} /></Field>
          </div>
        </Card>
        <div className="admin-create__actions"><Button type="submit" variant="primary" disabled={loading}>{loading ? t('admin_creating_branch') : t('admin_create_branch')}</Button></div>
      </form>
    </div>
  );
}
