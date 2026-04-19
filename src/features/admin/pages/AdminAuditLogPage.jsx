import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import { logger } from '../../../utils/logger';
import { formatDate } from '../../../utils/formatters';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import {
  FaSearch,
  FaFilter,
  FaHistory,
  FaSignInAlt,
  FaSignOutAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaEye,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import './AdminAuditLogPage.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

const ACTION_ICONS = {
  login: FaSignInAlt,
  logout: FaSignOutAlt,
  create: FaPlus,
  edit: FaEdit,
  delete: FaTrash,
  approve: FaCheck,
  reject: FaTimes,
  view: FaEye,
  submit: FaChevronUp,
  final_approve: FaCheck,
  delete_request: FaTrash,
  delete_approve: FaCheck,
};

const ACTION_COLORS = {
  login: '#10b981',
  logout: '#6b7280',
  create: '#3b82f6',
  edit: '#f59e0b',
  delete: '#ef4444',
  approve: '#10b981',
  reject: '#ef4444',
  view: '#6b7280',
  submit: '#8b5cf6',
  final_approve: '#059669',
  delete_request: '#dc2626',
  delete_approve: '#ef4444',
};

export default function AdminAuditLogPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const isRTL = i18n.language === 'ar';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [expandedLog, setExpandedLog] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 50;

  useEffect(() => {
    if (!user?.is_superuser) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadLogs();
  }, [user]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('auth/audit-logs/');
      setLogs(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      logger.error('Error loading audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  // Unique values for filters
  const actions = useMemo(() => {
    const set = new Set();
    logs.forEach(l => set.add(l.action));
    return [...set].sort();
  }, [logs]);

  const models = useMemo(() => {
    const set = new Set();
    logs.forEach(l => { if (l.model_name) set.add(l.model_name); });
    return [...set].sort();
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchSearch = !searchQuery ||
        (l.user_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.model_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.ip_address || '').includes(searchQuery);

      const matchAction = filterAction === 'all' || l.action === filterAction;
      const matchModel = filterModel === 'all' || l.model_name === filterModel;

      return matchSearch && matchAction && matchModel;
    });
  }, [logs, searchQuery, filterAction, filterModel]);

  // Pagination
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredLogs.slice(start, start + perPage);
  }, [filteredLogs, page]);

  const totalPages = Math.ceil(filteredLogs.length / perPage);

  const getActionIcon = (action) => {
    const Icon = ACTION_ICONS[action] || FaHistory;
    return <Icon />;
  };

  if (!user?.is_superuser) return null;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="admin-audit">
      <div className="admin-audit__header">
        <div>
          <h1 className="admin-audit__title">{t('admin_audit_title')}</h1>
          <p className="admin-audit__subtitle">{t('admin_audit_subtitle')}</p>
        </div>
        <div className="admin-audit__header-stat">
          {t('admin_total_records')}: <strong>{filteredLogs.length}</strong>
        </div>
      </div>

      {/* Filters */}
      <Card className="admin-audit__filters">
        <div className="admin-audit__search-row">
          <div className="admin-audit__search">
            <FaSearch className="admin-audit__search-icon" />
            <input
              type="text"
              className="admin-audit__search-input"
              placeholder={t('admin_search_logs')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <div className="admin-audit__filter-group">
            <FaFilter className="admin-audit__filter-icon" />
            <select
              className="admin-audit__filter-select"
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            >
              <option value="all">{t('admin_all_actions')}</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              className="admin-audit__filter-select"
              value={filterModel}
              onChange={(e) => { setFilterModel(e.target.value); setPage(1); }}
            >
              <option value="all">{t('admin_all_models')}</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Log List */}
      <Card>
        {loading ? (
          <div className="admin-audit__loading">{t('admin_loading')}</div>
        ) : paginatedLogs.length === 0 ? (
          <div className="admin-audit__empty">{t('admin_no_logs_found')}</div>
        ) : (
          <>
            <div className="admin-audit__list">
              {paginatedLogs.map((log) => (
                <div key={log.id} className="admin-audit__item">
                  <div
                    className="admin-audit__item-main"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <span
                      className="admin-audit__action-icon"
                      style={{ color: ACTION_COLORS[log.action] || 'var(--muted)' }}
                    >
                      {getActionIcon(log.action)}
                    </span>
                    <div className="admin-audit__item-info">
                      <div className="admin-audit__item-desc">
                        {log.description || `${log.action} ${log.model_name || ''}`}
                      </div>
                      <div className="admin-audit__item-meta">
                        <span>{log.user_email || '—'}</span>
                        <span>{formatDate(log.created_at, i18n.language)}</span>
                        {log.ip_address && <span>{log.ip_address}</span>}
                      </div>
                    </div>
                    <div className="admin-audit__item-badges">
                      <span
                        className="admin-audit__action-badge"
                        style={{
                          background: `${ACTION_COLORS[log.action] || 'var(--muted)'}15`,
                          color: ACTION_COLORS[log.action] || 'var(--muted)',
                        }}
                      >
                        {log.action}
                      </span>
                      {log.model_name && (
                        <span className="admin-audit__model-badge">{log.model_name}</span>
                      )}
                    </div>
                    <span className="admin-audit__expand-icon">
                      {expandedLog === log.id ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  </div>

                  {expandedLog === log.id && (
                    <div className="admin-audit__item-details">
                      {log.object_id && (
                        <div className="admin-audit__detail-row">
                          <strong>{t('admin_object_id')}:</strong> {log.object_id}
                        </div>
                      )}
                      {log.user_agent && (
                        <div className="admin-audit__detail-row">
                          <strong>{t('admin_user_agent')}:</strong>
                          <span className="admin-audit__detail-mono">{log.user_agent}</span>
                        </div>
                      )}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="admin-audit__detail-row">
                          <strong>{t('admin_changes')}:</strong>
                          <pre className="admin-audit__detail-json">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="admin-audit__pagination">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t('admin_prev')}
                </Button>
                <span className="admin-audit__page-info">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t('admin_next')}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
