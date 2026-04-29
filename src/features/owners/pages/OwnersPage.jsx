import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import PageLayout from "../../../components/layout/PageLayout";
import PageHeader from "../../../components/layout/PageHeader";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import Dialog from "../../../components/common/Dialog";
import CopyIconButton from "../../../components/common/CopyIconButton";
import { calculateAgeFromEmiratesId } from "../../../utils/formatters/id";
import { useOwners } from "../hooks/useOwners";
import useTenantNavigate from "../../../hooks/useTenantNavigate";
import "./OwnersPage.css";

export default function OwnersPage() {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useTenantNavigate();

  const {
    owners: ownersData,
    isLoading: loading,
    refetch,
  } = useOwners(i18n.language);

  const [locallyHiddenKeys, setLocallyHiddenKeys] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetOwner, setTargetOwner] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const { success, error: showError } = useNotifications();

  const showToast = useCallback(
    (type, msg) => (type === "success" ? success(msg) : showError(msg)),
    [success, showError]
  );

  const owners = useMemo(
    () => ownersData.filter((owner) => !locallyHiddenKeys.has(owner.__key)),
    [ownersData, locallyHiddenKeys]
  );

  const [filters, setFilters] = useState({
    q: "",
  });

  useEffect(() => {
    const handler = () => refetch();

    window.addEventListener("siteplan-owners-updated", handler);
    window.addEventListener("contract-updated", handler);

    return () => {
      window.removeEventListener("siteplan-owners-updated", handler);
      window.removeEventListener("contract-updated", handler);
    };
  }, [refetch]);

  const filteredOwners = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return owners.filter((owner) => {
      if (!q) return true;

      return (
        owner.name?.toLowerCase().includes(q) ||
        owner.nameAr?.toLowerCase().includes(q) ||
        owner.nameEn?.toLowerCase().includes(q) ||
        owner.fullData?.nationality?.toLowerCase().includes(q) ||
        owner.fullData?.id_number?.toLowerCase().includes(q)
      );
    });
  }, [owners, filters]);

  const isAllSelected =
    filteredOwners.length > 0 &&
    filteredOwners.every((owner) => selectedKeys.has(owner.__key));

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
      return new Set(filteredOwners.map((owner) => owner.__key));
    });
  }, [isAllSelected, filteredOwners]);

  const askDelete = useCallback((owner) => {
    setTargetOwner({ key: owner.__key, name: owner.name });
    setConfirmOpen(true);
  }, []);

  const handleDelete = () => {
    if (!targetOwner?.key) return;

    const key = targetOwner.key;

    setLocallyHiddenKeys((prev) => new Set(prev).add(key));

    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    showToast("success", t("delete_success"));
    setConfirmOpen(false);
    setTargetOwner(null);
  };

  const askBulkDelete = () => {
    if (selectedKeys.size === 0) return;
    setBulkConfirmOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedKeys.size === 0) return;

    const keys = Array.from(selectedKeys);

    setLocallyHiddenKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => next.add(key));
      return next;
    });

    setSelectedKeys(new Set());
    setBulkConfirmOpen(false);

    showToast(
      "success",
      t("bulk_delete_success")?.replace("{{count}}", keys.length) ||
        `Removed ${keys.length} owners from list`
    );
  };

  const selectedCount = selectedKeys.size;

  const clearFilters = () => setFilters({ q: "" });

  const handleOwnerClick = (owner) => {
    navigate(`/owners/${encodeURIComponent(owner.name)}`, {
      state: { ownerData: owner },
    });
  };

  const getOwnerNames = (owner) => {
    const arabicName = owner.nameAr || "";
    const englishName = owner.nameEn || "";
    const fallbackName = owner.name || "";

    const primaryName = isAR
      ? arabicName || englishName || fallbackName
      : englishName || arabicName || fallbackName;

    const secondaryName = isAR
      ? englishName || fallbackName
      : arabicName || fallbackName;

    return {
      primaryName,
      secondaryName:
        secondaryName && secondaryName !== primaryName ? secondaryName : "",
    };
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="list-page">
        <PageHeader
          onBack={() => navigate(-1)}
          title={t("owners")}
          subtitle={t("owners_page_subtitle")}
        />

        <div className="prj-filters">
          <div className="prj-filters__grid">
            <input
              className="prj-input"
              placeholder={t("search_owners")}
              value={filters.q}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, q: e.target.value }))
              }
            />
          </div>

          <div className="prj-filters__actions">
            <Button variant="ghost" onClick={clearFilters}>
              {t("clear_filters")}
            </Button>
          </div>
        </div>

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

        {filteredOwners.length === 0 ? (
          <div className="prj-alert">
            <div className="prj-alert__title">
              {filters.q ? t("no_owners_match_search") : t("no_owners_found")}
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
                  <th>{t("owner_name")}</th>
                  <th>{t("nationality")}</th>
                  <th>{t("age")}</th>
                  <th>{t("id_number")}</th>
                  <th>{t("projects_count")}</th>
                  <th className="ds-w-60 ds-text-center">{t("action")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredOwners.map((owner, idx) => {
                  const checked = selectedKeys.has(owner.__key);
                  const age =
                    owner.fullData?.age ??
                    calculateAgeFromEmiratesId(owner.fullData?.id_number);

                  const { primaryName, secondaryName } = getOwnerNames(owner);

                  return (
                    <tr key={owner.__key} onClick={() => handleOwnerClick(owner)}>
                      <td
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`${t("select")} ${owner.name}`}
                          checked={checked}
                          onChange={() => toggleSelect(owner.__key)}
                        />
                      </td>

                      <td className="prj-muted">{idx + 1}</td>

                      <td>
                        <div className="owners-page__name-cell">
                          <div className="owners-page__name-row owners-page__name-primary">
                            <span>{primaryName || <span className="prj-muted">—</span>}</span>
                            {primaryName && (
                              <CopyIconButton value={primaryName} title={t("copy")} />
                            )}
                          </div>

                          {secondaryName && (
                            <div className="owners-page__name-row owners-page__name-secondary prj-muted">
                              <span>{secondaryName}</span>
                              <CopyIconButton
                                value={secondaryName}
                                title={t("copy")}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        {owner.fullData?.nationality || (
                          <span className="prj-muted">—</span>
                        )}
                      </td>

                      <td>
                        {age !== null ? (
                          <span className="prj-badge">
                            {age} {isAR ? t("year") : t("years")}
                          </span>
                        ) : (
                          <span className="prj-muted">—</span>
                        )}
                      </td>

                      <td>
                        <code className="prj-code">
                          {owner.fullData?.id_number || t("empty_value")}
                        </code>
                      </td>

                      <td>
                        <span className="prj-badge is-on">
                          {owner.projects.length} {t("projects")}
                        </span>
                      </td>

                      <td
                        className="col-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionMenu
                          items={[
                            {
                              label: t("edit"),
                              type: "button",
                              onClick: () =>
                                navigate(
                                  `/owners/${encodeURIComponent(owner.name)}/edit`,
                                  { state: { ownerData: owner } }
                                ),
                            },
                            {
                              label: t("delete"),
                              type: "button",
                              variant: "danger",
                              onClick: () => askDelete(owner),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={8} className="prj-foot prj-muted">
                    {t("total")}: {filteredOwners.length} / {owners.length}{" "}
                    {t("owners")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <Dialog
          open={confirmOpen}
          title={t("confirm_delete")}
          desc={
            t("confirm_delete_owner") ||
            `Are you sure you want to remove ${targetOwner?.name} from the list?`
          }
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleDelete}
          danger
        />

        <Dialog
          open={bulkConfirmOpen}
          title={t("bulk_delete")}
          desc={
            <>
              {t("bulk_delete_desc")} <strong>{selectedCount}</strong>{" "}
              {t("owners")}. {t("bulk_delete_continue")}
            </>
          }
          confirmLabel={t("delete_confirm")}
          cancelLabel={t("cancel")}
          onClose={() => setBulkConfirmOpen(false)}
          onConfirm={handleBulkDelete}
          danger
          busy={false}
        />
      </div>
    </PageLayout>
  );
}