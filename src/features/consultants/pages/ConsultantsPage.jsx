import { useMemo, useState, useCallback } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import PageLayout from "../../../components/layout/PageLayout";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import Dialog from "../../../components/common/Dialog";
import { useConsultants } from "../hooks/useConsultants";
import "./ConsultantsPage.css";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function ConsultantsPage() {
    const { t, i18n } = useTranslation();
    const isAR = /^ar\b/i.test(i18n.language || "");
    const navigate = useTenantNavigate();

    // ✅ React Query hook for consultants data (replaces manual state management)
    const {
        consultants,
        isLoading: loading,
        deleteConsultant,
        bulkDelete,
        isDeleting,
        isBulkDeleting,
    } = useConsultants(i18n.language);

    // Single delete
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [targetConsultant, setTargetConsultant] = useState(null);

    // Multi-select + bulk delete
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

    const { success, error: showError } = useNotifications();
    const showToast = useCallback((type, msg) => type === "success" ? success(msg) : showError(msg), [success, showError]);

    // ===== Organized filters =====
    const [filters, setFilters] = useState({
        q: "",
    });

    const filteredConsultants = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        return consultants.filter((consultant) => {
            if (!q) return true;
            return (
                consultant.name.toLowerCase().includes(q) ||
                consultant.name_en?.toLowerCase().includes(q) ||
                consultant.licenseNo?.toLowerCase().includes(q)
            );
        });
    }, [consultants, filters]);

    const isAllSelected =
        filteredConsultants.length > 0 && filteredConsultants.every((c) => selectedKeys.has(c.__key));

    // Memoized handlers to prevent re-creating functions on every render
    const toggleSelect = useCallback((key) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        setSelectedKeys(() => {
            if (isAllSelected) return new Set();
            return new Set(filteredConsultants.map((c) => c.__key));
        });
    }, [isAllSelected, filteredConsultants]);

    const askDelete = useCallback((consultant) => {
        setTargetConsultant({ key: consultant.__key, name: consultant.name, id: consultant.id });
        setConfirmOpen(true);
    }, []);

    const handleDelete = () => {
        if (!targetConsultant?.id) return;
        const id = targetConsultant.id;

        deleteConsultant(id, {
            onSuccess: () => {
                setSelectedKeys((prev) => {
                    const n = new Set(prev);
                    n.delete(targetConsultant.key);
                    return n;
                });
                showToast("success", t("delete_success"));
                setConfirmOpen(false);
                setTargetConsultant(null);
            },
            onError: (error) => {
                showToast("error", error?.message || t("delete_error"));
            },
        });
    };

    const askBulkDelete = () => {
        if (selectedKeys.size === 0) return;
        setBulkConfirmOpen(true);
    };

    const handleBulkDelete = () => {
        if (selectedKeys.size === 0) return;
        const keys = Array.from(selectedKeys);
        const consultantsToDelete = consultants.filter((c) => selectedKeys.has(c.__key));
        const idsToDelete = consultantsToDelete.filter((c) => c.id).map((c) => c.id);

        bulkDelete(idsToDelete, {
            onSuccess: (result) => {
                const { succeeded, failed } = result;
                setSelectedKeys(new Set());
                setBulkConfirmOpen(false);

                if (failed === 0) {
                    showToast("success", t("bulk_delete_success")?.replace("{{count}}", succeeded) || `Deleted ${succeeded} consultants`);
                } else if (succeeded === 0) {
                    showToast("error", t("bulk_delete_error"));
                } else {
                    showToast("error", t("bulk_delete_partial")?.replace("{{ok}}", succeeded).replace("{{fail}}", failed) || `Deleted ${succeeded}, failed ${failed}`);
                }
            },
            onError: () => {
                showToast("error", t("bulk_delete_error"));
            },
        });
    };

    const selectedCount = selectedKeys.size;

    const clearFilters = () => setFilters({ q: "" });

    const handleConsultantClick = (consultant) => {
        navigate(`/consultants/${consultant.id}`, {
            state: { consultantData: consultant }
        });
    };

    return (
        <PageLayout loading={loading} loadingText={t("loading")}>
            <div className="list-page">
                <PageHeader
                    onBack={() => navigate(-1)}
                    title={t("consultants")}
                    subtitle={t("consultants_page_subtitle")}
                    actions={
                        <Button variant="primary" onClick={() => navigate("/consultants/new")}>
                            {t("add_consultant")}
                        </Button>
                    }
                />

                {/* Filters Bar */}
                <div className="prj-filters">
                    <div className="prj-filters__grid">
                        <input
                            className="prj-input"
                            placeholder={t("search_consultants")}
                            value={filters.q}
                            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                        />
                    </div>

                    <div className="prj-filters__actions">
                        <Button variant="ghost" onClick={clearFilters}>
                            {t("clear_filters")}
                        </Button>
                    </div>
                </div>

                {/* Action bar when items are selected */}
                {selectedCount > 0 && (
                    <div className="prj-bulkbar">
                        <div className="prj-bulkbar__info">
                            {t("selected")} <strong>{selectedCount}</strong>
                        </div>
                        <div className="prj-bulkbar__actions">
                            <Button variant="danger" onClick={askBulkDelete}>
                                {t("delete_selected")}
                            </Button>
                            <Button variant="ghost" onClick={() => setSelectedKeys(new Set())}>
                                {t("clear_selection")}
                            </Button>
                        </div>
                    </div>
                )}

                {filteredConsultants.length === 0 ? (
                    <div className="prj-alert">
                        <div className="prj-alert__title">
                            {filters.q ? t("no_consultants_match_search") : t("no_consultants_found")}
                        </div>
                    </div>
                ) : (
                    <div className="prj-table__wrapper">
                        <table className="prj-table">
                            <thead>
                                <tr>
                                    <th className="ds-w-50 ds-text-center">
                                        <input
                                            type="checkbox"
                                            aria-label={t("select_all")}
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>#</th>
                                    <th>{t("consultant_name")}</th>
                                    <th>{t("consultant_municipality_license")}</th>
                                    <th>{t("projects_count")}</th>
                                    <th className="ds-w-60 ds-text-center">{t("action")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredConsultants.map((consultant, idx) => {
                                    const checked = selectedKeys.has(consultant.__key);
                                    return (
                                        <tr key={consultant.__key} onClick={() => handleConsultantClick(consultant)}>
                                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    aria-label={`${t("select")} ${consultant.name}`}
                                                    checked={checked}
                                                    onChange={() => toggleSelect(consultant.__key)}
                                                />
                                            </td>
                                            <td className="prj-muted">{idx + 1}</td>
                                            <td>
                                                {isAR ? (
                                                    <>
                                                        <div className="ds-font-medium">
                                                            {consultant.name || consultant.name_en || t("empty_value")}
                                                        </div>

                                                        {consultant.name_en && consultant.name_en !== consultant.name && (
                                                            <div className="consultants-page__name-en">
                                                                {consultant.name_en}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="ds-font-medium">
                                                            {consultant.name_en || consultant.name || t("empty_value")}
                                                        </div>

                                                        {consultant.name && consultant.name !== consultant.name_en && (
                                                            <div className="consultants-page__name-en">
                                                                {consultant.name}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                            <td>
                                                <code className="prj-code">{consultant.licenseNo || t("empty_value")}</code>
                                            </td>
                                            <td>
                                                <span className="prj-badge is-on">
                                                    {consultant.projects.length} {t("projects")}
                                                </span>
                                            </td>
                                            <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                                                <ActionMenu items={[
                                                    { label: t("edit"), type: "button", onClick: () => navigate(`/consultants/${consultant.id}/edit`, { state: { consultantData: consultant } }) },
                                                    { label: t("delete"), type: "button", variant: "danger", onClick: () => askDelete(consultant), disabled: isDeleting },
                                                ]} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={6} className="prj-foot prj-muted">
                                        {t("total")}: {filteredConsultants.length} / {consultants.length} {t("consultants")}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* Delete Confirm Dialog */}
                <Dialog
                    open={confirmOpen}
                    title={t("confirm_delete")}
                    desc={t("confirm_delete_consultant") || `Are you sure you want to remove ${targetConsultant?.name} from the list?`}
                    confirmLabel={isDeleting ? t("deleting") : t("delete")}
                    cancelLabel={t("cancel")}
                    onClose={() => !isDeleting && setConfirmOpen(false)}
                    onConfirm={handleDelete}
                    danger
                    busy={isDeleting}
                />

                {/* Bulk Delete Confirm Dialog */}
                <Dialog
                    open={bulkConfirmOpen}
                    title={t("bulk_delete")}
                    desc={
                        <>
                            {t("bulk_delete_desc")} <strong>{selectedCount}</strong> {t("consultants")}. {t("bulk_delete_continue")}
                        </>
                    }
                    confirmLabel={isBulkDeleting ? t("deleting") : t("delete_confirm")}
                    cancelLabel={t("cancel")}
                    onClose={() => !isBulkDeleting && setBulkConfirmOpen(false)}
                    onConfirm={handleBulkDelete}
                    danger
                    busy={isBulkDeleting}
                />
            </div>
        </PageLayout>
    );
}

