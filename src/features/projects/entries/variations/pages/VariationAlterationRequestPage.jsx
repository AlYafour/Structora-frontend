import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../../contexts/AuthContext";
import { useNotifications } from "../../../../../contexts/NotificationContext";
import { projectApi } from "../../../../../services";
import { handleError } from "../../../../../utils/errorHandler";
import PageLayout from "../../../../../components/layout/PageLayout";
import Button from "../../../../../components/common/Button";
import useTenantNavigate from "../../../../../hooks/useTenantNavigate";
import {
    FaCheckCircle,
    FaTimesCircle,
    FaClock,
    FaEdit,
    FaTrashAlt,
    FaUser,
    FaCalendarAlt,
    FaTag,
    FaArrowLeft,
    FaCommentAlt,
    FaUserCheck,
} from "react-icons/fa";

export default function VariationAlterationRequestPage() {
    const { variationId, requestId } = useParams();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { success, error: showError } = useNotifications();
    const navigate = useTenantNavigate();

    const isProjectManager = user?.role?.name === "Manager";
    const isSupervisor = user?.role?.name === "Supervisor";

    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState(null);
    const [loadError, setLoadError] = useState(null);

    const [responding, setResponding] = useState(false);
    const [decision, setDecision] = useState(null); // 'accepted' | 'declined'
    const [responseReason, setResponseReason] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const result = await projectApi.findVariationById(variationId);
                const projectId = result?.project_id;
                if (!projectId) throw new Error("Could not determine project for this variation.");
                const data = await projectApi.getAlterationRequest(projectId, variationId, requestId);
                if (!cancelled) setRequest({ ...data, projectId });
            } catch (e) {
                if (!cancelled) {
                    const msg = handleError(e, "VariationAlterationRequestPage.load").message;
                    setLoadError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [variationId, requestId]);

    const openConfirm = (d) => {
        setDecision(d);
        setResponseReason("");
        setConfirmOpen(true);
    };

    const handleRespond = async () => {
        if (!responseReason.trim()) return;
        if (!request?.projectId) return;
        try {
            setResponding(true);
            await projectApi.respondToAlterationRequest(
                request.projectId, variationId, requestId,
                { status: decision, response_reason: responseReason.trim() }
            );
            success(
                decision === "accepted"
                    ? t("alteration_request_accepted")
                    : t("alteration_request_declined")
            );
            navigate(-1);
        } catch (e) {
            const msg = e?.response?.data?.error || e?.message || t("error_default");
            showError(msg);
        } finally {
            setResponding(false);
            setConfirmOpen(false);
        }
    };

    const requestTypeLabel = (type) => {
        if (type === "edit") return t("edit_request");
        if (type === "delete") return t("delete_request");
        return t("unapprove_request", "Unapprove request");
    };

    const canRespond = request?.status === "pending" && (
        request?.request_type === "unapprove" && request?.requested_by_role === "Manager"
            ? isSupervisor
            : isProjectManager
    );

    const statusConfig = {
        pending:  { icon: <FaClock />,        cls: "prj-badge prj-badge--warning", color: "#b45309" },
        accepted: { icon: <FaCheckCircle />,   cls: "prj-badge prj-badge--success", color: "#15803d" },
        declined: { icon: <FaTimesCircle />,   cls: "prj-badge prj-badge--danger",  color: "#b91c1c" },
    };

    const statusBadge = (s) => {
        const cfg = statusConfig[s] || statusConfig.declined;
        const label = s === "pending"
            ? t("pending")
            : s === "accepted"
                ? t("accepted")
                : t("declined");
        return (
            <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {cfg.icon} {label}
            </span>
        );
    };

    const MetaField = ({ icon, label, value }) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p className="ds-text-xs ds-text-muted" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ opacity: 0.6 }}>{icon}</span> {label}
            </p>
            <p className="ds-font-medium">{value || "—"}</p>
        </div>
    );

    return (
        <PageLayout loading={loading} loadingText={t("loading")}>
            <div className="container ds-py-6" style={{ maxWidth: 700 }}>

                {/* Back link */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        color: "var(--color-text-muted, #6b7280)", fontSize: 14, marginBottom: 16,
                    }}
                >
                    <FaArrowLeft size={12} /> {t("back")}
                </button>

                {loadError && (
                    <div className="prj-empty-state ds-text-danger">{loadError}</div>
                )}

                {!loading && !loadError && request && (
                    <div className="card prj-main-card" style={{ overflow: "hidden" }}>

                        {/* ── Card Header ── */}
                        <div
                            style={{
                                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                padding: "20px 24px", gap: 12,
                                borderBottom: "1px solid var(--color-border, #e5e7eb)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div
                                    style={{
                                        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: request.request_type === "delete"
                                            ? "var(--color-red-100, #fee2e2)"
                                            : "var(--color-blue-100, #dbeafe)",
                                    }}
                                >
                                    {request.request_type === "delete"
                                        ? <FaTrashAlt style={{ color: "var(--color-red-600, #dc2626)", fontSize: 18 }} />
                                        : <FaEdit style={{ color: "var(--color-blue-600, #2563eb)", fontSize: 18 }} />
                                    }
                                </div>
                                <div>
                                    <h2 className="ds-font-semibold ds-text-xl" style={{ margin: 0 }}>
                                        {requestTypeLabel(request.request_type)}
                                    </h2>
                                    <p className="ds-text-sm ds-text-muted" style={{ margin: 0 }}>
                                        {t("variation_label")} #{request.variation}
                                    </p>
                                </div>
                            </div>
                            {statusBadge(request.status)}
                        </div>

                        {/* ── Body ── */}
                        <div style={{ padding: "24px 24px 0" }}>

                            {/* Metadata grid */}
                            <div className="ds-grid ds-grid-cols-2 ds-gap-4 ds-mb-5">
                                <MetaField
                                    icon={<FaUser />}
                                    label={t("requested_by")}
                                    value={request.requested_by_name}
                                />
                                <MetaField
                                    icon={<FaTag />}
                                    label={t("request_type")}
                                    value={requestTypeLabel(request.request_type)}
                                />
                                <MetaField
                                    icon={<FaClock />}
                                    label={t("status")}
                                    value={statusBadge(request.status)}
                                />
                                <MetaField
                                    icon={<FaCalendarAlt />}
                                    label={t("date")}
                                    value={request.created_at
                                        ? new Date(request.created_at).toLocaleDateString()
                                        : null
                                    }
                                />
                            </div>

                            {/* Request reason */}
                            <div className="ds-mb-5">
                                <p
                                    className="ds-text-xs ds-text-muted ds-mb-2"
                                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                                >
                                    <FaCommentAlt style={{ opacity: 0.6 }} /> {t("reason")}
                                </p>
                                <div
                                    style={{
                                        padding: "12px 16px",
                                        borderRadius: 8,
                                        background: "var(--color-surface-raised, #f8fafc)",
                                        border: "1px solid var(--color-border, #e5e7eb)",
                                        borderInlineStart: "3px solid var(--color-primary, #2563eb)",
                                        whiteSpace: "pre-wrap",
                                        minHeight: 72,
                                        fontSize: 14,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {request.reason || "—"}
                                </div>
                            </div>

                            {/* Response section — only when decided */}
                            {request.status !== "pending" && (
                                <div
                                    className="ds-mb-5"
                                    style={{
                                        padding: "16px",
                                        borderRadius: 8,
                                        background: request.status === "accepted"
                                            ? "var(--color-green-50, #f0fdf4)"
                                            : "var(--color-red-50, #fef2f2)",
                                        border: `1px solid ${request.status === "accepted"
                                            ? "var(--color-green-200, #bbf7d0)"
                                            : "var(--color-red-200, #fecaca)"}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex", alignItems: "center", gap: 6,
                                            marginBottom: 10,
                                            color: request.status === "accepted"
                                                ? "var(--color-green-700, #15803d)"
                                                : "var(--color-red-700, #b91c1c)",
                                            fontWeight: 600, fontSize: 13,
                                        }}
                                    >
                                        {request.status === "accepted"
                                            ? <FaCheckCircle />
                                            : <FaTimesCircle />
                                        }
                                        {t("response_reason")}
                                    </div>
                                    <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>
                                        {request.response_reason || "—"}
                                    </p>
                                    <p
                                        className="ds-text-xs ds-text-muted"
                                        style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5 }}
                                    >
                                        <FaUserCheck style={{ opacity: 0.6 }} />
                                        {t("responded_by")} {request.response_by_name || "—"}
                                    </p>
                                </div>
                            )}

                            {/* Confirm panel */}
                            {confirmOpen && (
                                <div
                                    className="ds-mb-5"
                                    style={{
                                        padding: "20px",
                                        borderRadius: 10,
                                        background: decision === "accepted"
                                            ? "var(--color-green-50, #f0fdf4)"
                                            : "var(--color-red-50, #fef2f2)",
                                        border: `1px solid ${decision === "accepted"
                                            ? "var(--color-green-300, #86efac)"
                                            : "var(--color-red-300, #fca5a5)"}`,
                                    }}
                                >
                                    <p
                                        className="ds-font-medium ds-mb-1"
                                        style={{
                                            color: decision === "accepted"
                                                ? "var(--color-green-800, #166534)"
                                                : "var(--color-red-800, #991b1b)",
                                        }}
                                    >
                                        {decision === "accepted"
                                            ? t("confirm_accept_request")
                                            : t("confirm_decline_request")}
                                    </p>
                                    <p className="ds-text-sm ds-text-muted ds-mb-3">
                                        {t("response_reason_required")}
                                    </p>
                                    <textarea
                                        className="prj-input ds-w-full ds-mb-4"
                                        rows={4}
                                        value={responseReason}
                                        onChange={(e) => setResponseReason(e.target.value)}
                                        placeholder={t("response_reason_placeholder")}
                                        autoFocus
                                        style={{ resize: "vertical" }}
                                    />
                                    <div className="ds-flex ds-gap-3">
                                        <Button
                                            variant={decision === "accepted" ? "primary" : "danger"}
                                            onClick={handleRespond}
                                            disabled={!responseReason.trim() || responding}
                                            loading={responding}
                                        >
                                            {decision === "accepted"
                                                ? t("confirm_accept")
                                                : t("confirm_decline")}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setConfirmOpen(false)}
                                            disabled={responding}
                                        >
                                            {t("cancel")}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Footer Actions ── */}
                        <div
                            style={{
                                padding: "16px 24px 24px",
                                display: "flex", gap: 12, flexWrap: "wrap",
                                borderTop: (canRespond && !confirmOpen)
                                    ? "1px solid var(--color-border, #e5e7eb)"
                                    : undefined,
                                marginTop: (canRespond && !confirmOpen) ? 0 : undefined,
                            }}
                        >
                            {canRespond && !confirmOpen && (
                                <>
                                    <Button variant="primary" onClick={() => openConfirm("accepted")}>
                                        <FaCheckCircle style={{ marginInlineEnd: 6 }} />
                                        {t("accept_request")}
                                    </Button>
                                    <Button variant="danger" onClick={() => openConfirm("declined")}>
                                        <FaTimesCircle style={{ marginInlineEnd: 6 }} />
                                        {t("decline_request")}
                                    </Button>
                                </>
                            )}
                            {!confirmOpen && (
                                <Button variant="ghost" onClick={() => navigate(-1)}>
                                    {t("back")}
                                </Button>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </PageLayout>
    );
}
