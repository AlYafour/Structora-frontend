import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateProjectQueries } from "../../../hooks/useProjectData";
import { useNotifications } from "../../../../../contexts/NotificationContext";
import { VAT_RATE } from "../../../../../utils/constants";
import { projectApi } from "../../../../../services";
import { advancePaymentApi } from "../../../../../services/advancePayments";
import PageLayout from "../../../../../components/layout/PageLayout";
import FinancialActionBar from "../../../../../components/common/FinancialActionBar";
import UnifiedSelect from "../../../../../components/common/Select";
import DateInput from "../../../../../components/forms/DateInput";
import CurrencyField from "../../../../../components/forms/CurrencyField";
import { formatMoney } from "../../../../../utils/formatters";
import DirhamsIcon from "../../../../../components/common/DirhamsIcon";
import { removeCommas } from "../../../../../utils/formatters/number";
import Button from "../../../../../components/common/Button";
import Dialog from "../../../../../components/common/Dialog";
import { logger } from "../../../../../utils/logger";
import { useInvoiceForm } from "../hooks/useInvoiceForm";
import useFinancialEntitlement from "../../../financial-pages/entitlement/hooks/useFinancialEntitlement";
import ProjectEntryInfo from "../../../../../components/common/ProjectEntryInfo";
import { getProjectName } from "../../../utils/projectHelpers";
import "./CreateInvoicePage.css";
import useTenantNavigate from '../../../../../hooks/useTenantNavigate';

const EMPTY_ITEM = () => ({
  description: "",
  amount_incl_vat: "",        // user enters total incl VAT
  total: 0,                   // net amount (excl VAT) — auto-calculated
  vat: 0,                     // VAT portion — auto-calculated
  source: "base_contract",    // 'base_contract' | 'variation' | 'bank_vat'
  variation_id: null,
  prolongation_fee_id: null,
});

export default function CreateActualInvoicePage() {
  const { invoiceId } = useParams();
  const { t, i18n } = useTranslation();
  const { success, error: showError } = useNotifications();
  const navigate = useTenantNavigate();

  const formatAmountString = (value) => formatMoney(value, { lang: i18n.language });
  const renderAmount = (value) => {
    const str = formatAmountString(value);
    if (i18n.language === 'en') {
      const numPart = str.replace(/AED\s?/, '').trim();
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {numPart} <DirhamsIcon size={10} color="#374151" />
        </span>
      );
    }
    return str;
  };

  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = !!invoiceId;
  const projectFromQuery = searchParams.get("project");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([EMPTY_ITEM()]);
  const [warningDialog, setWarningDialog] = useState({ open: false, warnings: [] });

  // Advance payment state
  const [deductionPreview, setDeductionPreview] = useState(null);
  const [applyAdvanceDeduction, setApplyAdvanceDeduction] = useState(true);

  const {
    loading,
    projects,
    variations,
    prolongationFees,
    contractData,
    latestProgress,
    existingInvoices,
    advanceSummary,
    creditSummary,
    formData,
    setFormData,
    handleProjectChange: baseHandleProjectChange,
  } = useInvoiceForm(invoiceId, projectFromQuery, isEditMode, { error: showError, success }, t);

  const getProlongationFeeById = useCallback(
    (feeId) => prolongationFees.find(f => String(f.id) === String(feeId)) || null,
    [prolongationFees]
  );

  const isNoVatProlongationFee = useCallback((feeId) => {
    const fee = getProlongationFeeById(feeId);
    return !!fee && parseFloat(fee.vat_rate || 0) === 0;
  }, [getProlongationFeeById]);

  const getProlongationFeeGrossAmount = useCallback((fee) => (
    parseFloat(fee?.gross_amount ?? fee?.amount ?? 0) || 0
  ), []);

  // When edit mode loads, sync items from formData.items
  useEffect(() => {
    if (!loading && isEditMode && formData.items && formData.items.length > 0) {
      setItems(formData.items.map(it => {
        const net = parseFloat(it.total) || 0;
        const source = it.source || (it.prolongation_fee_id ? "prolongation_fee" : it.variation_id ? "variation" : "base_contract");
        const noVatFee = source === "prolongation_fee" && isNoVatProlongationFee(it.prolongation_fee_id);
        const inclVat = noVatFee ? net : Math.round(net * (1 + VAT_RATE) * 100) / 100;
        const vat = Math.round((inclVat - net) * 100) / 100;
        return {
          description: it.description || "",
          amount_incl_vat: inclVat ? String(inclVat.toFixed(2)) : "",
          total: net,
          vat: vat,
          source,
          variation_id: it.variation_id || null,
          prolongation_fee_id: it.prolongation_fee_id || null,
        };
      }));
    }
  }, [loading, isEditMode, formData.items, isNoVatProlongationFee]);

  const handleProjectChange = (projectId) => {
    baseHandleProjectChange(projectId);
    if (projectId) {
      setSearchParams({ project: projectId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // Reset deduction preview when project changes
  useEffect(() => {
    if (!formData.project) {
      setDeductionPreview(null);
    }
  }, [formData.project]);

  const selectedProject = projects.find(p => String(p.id) === String(formData.project)) || null;

  const { data: fin } = useFinancialEntitlement({
    contract: contractData,
    variations,
    prolongationFees,
    payments: [],
  });

  // Bank pays only its net share (no VAT) — owner pays VAT on bank's share
  const bankActualFixed = fin?.rebuiltContract?.bankActualFixed || 0;
  const bankVATpaidByOwner = Math.round(bankActualFixed * 0.05 * 100) / 100;

  const payer = formData.payer || "owner";

  // ── Per-component progress percentages ────────────────────────────
  // Owner base contract progress
  const ownerBaseProgress = latestProgress
    ? parseFloat(latestProgress.owner_technical_current ?? latestProgress.technical_progress_current ?? 0)
    : 0;
  // Bank base contract progress
  const bankBaseProgress = latestProgress
    ? parseFloat(latestProgress.bank_technical_current ?? latestProgress.technical_progress_current ?? 0)
    : 0;
  // Per-VO progress map
  const variationProgressMap = latestProgress?.variation_progress || {};
  const getVOProgress = useCallback((voId) => {
    const entry = variationProgressMap[String(voId)] || variationProgressMap[voId] || {};
    return parseFloat(entry.technical_current ?? 0);
  }, [variationProgressMap]);

  // ── Previous invoices ─────────────────────────────────────────────
  const previousInvoices = existingInvoices.filter(inv =>
    !invoiceId || String(inv.id) !== String(invoiceId)
  );

  // VO IDs that already appear in a previous invoice (excluded from dropdown)
  const previouslyInvoicedVOIds = useMemo(() => {
    const ids = new Set();
    previousInvoices
      .filter(inv => inv.payer === "owner")
      .forEach(inv => {
        (Array.isArray(inv.items) ? inv.items : []).forEach(it => {
          if (it.variation_id != null) ids.add(String(it.variation_id));
        });
      });
    return ids;
  }, [previousInvoices]);

  const previouslyInvoicedProlongationFeeIds = useMemo(() => {
    const ids = new Set();
    previousInvoices
      .filter(inv => inv.payer === "owner")
      .forEach(inv => {
        (Array.isArray(inv.items) ? inv.items : []).forEach(it => {
          if (it.prolongation_fee_id != null) ids.add(String(it.prolongation_fee_id));
        });
      });
    return ids;
  }, [previousInvoices]);

  const prevOwnerInvoiced = previousInvoices
    .filter(inv => inv.payer === "owner")
    .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

  const prevBankInvoiced = previousInvoices
    .filter(inv => inv.payer === "bank")
    .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

  // Previous invoiced for base contract items only (owner) — excludes bank_vat items
  const prevOwnerBaseInvoiced = previousInvoices
    .filter(inv => inv.payer === "owner")
    .reduce((sum, inv) => {
      const invItems = Array.isArray(inv.items) ? inv.items : [];
      const baseTotal = invItems.reduce((s, it) => {
        // Skip bank_vat items and variation items
        if (it.source === "bank_vat" || it.source === "prolongation_fee" || it.variation_id || it.prolongation_fee_id) return s;
        return s + (parseFloat(it.total) || 0);
      }, 0);
      return sum + baseTotal * (1 + VAT_RATE);
    }, 0);

  // Previous invoiced bank VAT items (owner)
  const prevBankVATInvoiced = previousInvoices
    .filter(inv => inv.payer === "owner")
    .reduce((sum, inv) => {
      const invItems = Array.isArray(inv.items) ? inv.items : [];
      return sum + invItems.reduce((s, it) => {
        if (it.source === "bank_vat") return s + (parseFloat(it.total) || 0);
        return s;
      }, 0);
    }, 0);

  const getPrevVOInvoiced = useCallback((voId) => previousInvoices
    .filter(inv => inv.payer === "owner")
    .reduce((sum, inv) => {
      const invItems = Array.isArray(inv.items) ? inv.items : [];
      const voTotal = invItems.reduce((s, it) => {
        if (String(it.variation_id) === String(voId)) return s + (parseFloat(it.total) || 0);
        return s;
      }, 0);
      return sum + voTotal * (1 + VAT_RATE);
    }, 0), [previousInvoices]);

  const getPrevProlongationFeeInvoiced = useCallback((feeId) => previousInvoices
    .filter(inv => inv.payer === "owner")
    .reduce((sum, inv) => {
      const invItems = Array.isArray(inv.items) ? inv.items : [];
      const feeTotal = invItems.reduce((s, it) => {
        if (String(it.prolongation_fee_id) === String(feeId)) return s + (parseFloat(it.total) || 0);
        return s;
      }, 0);
      return sum + (isNoVatProlongationFee(feeId) ? feeTotal : feeTotal * (1 + VAT_RATE));
    }, 0), [previousInvoices, isNoVatProlongationFee]);

  // ── Owner base contract obligation & due ──────────────────────────
  // ownerTotalOriginal = owner.net + owner.fee (excl consultant fees paid to consultant)
  const ownerTotalOriginal = fin?.rebuiltContract?.ownerTotalOriginal || 0;
  // Owner's share obligation (incl VAT on owner's share only)
  const ownerShareOblig = Math.round(ownerTotalOriginal * (1 + VAT_RATE) * 100) / 100;
  // Owner's TOTAL obligation to contractor includes owner share + bank VAT
  const ownerBaseObligInclVAT = Math.round((ownerShareOblig + bankVATpaidByOwner) * 100) / 100;

  // Cumulative amounts due by progress
  const ownerShareDueCumul = Math.round(ownerTotalOriginal * (1 + VAT_RATE) * ownerBaseProgress / 100 * 100) / 100;
  // Bank VAT due is proportional to bank's progress (not owner's)
  const bankVATdueByCumul = Math.round(bankVATpaidByOwner * bankBaseProgress / 100 * 100) / 100;
  // Combined cumulative (for overall tracking)
  const ownerBaseDueCumul = ownerShareDueCumul + bankVATdueByCumul;

  // ── SEPARATED due this cycle (the key fix) ──
  // Base contract due = owner share cumulative − previous base contract invoices
  const ownerBaseOnlyDueThisCycle = Math.max(0, ownerShareDueCumul - prevOwnerBaseInvoiced);
  // Bank VAT due = bank VAT cumulative − previous bank VAT invoices
  const bankVATDueThisCycle = Math.max(0, bankVATdueByCumul - prevBankVATInvoiced);
  // Combined (for overall tracking)
  const ownerBaseDueThisCycle = ownerBaseOnlyDueThisCycle + bankVATDueThisCycle;

  // Remaining
  const ownerBaseOnlyRemaining = Math.max(0, ownerShareOblig - prevOwnerBaseInvoiced);
  const bankVATRemaining = Math.max(0, bankVATpaidByOwner - prevBankVATInvoiced);
  const ownerBaseRemaining = ownerBaseOnlyRemaining + bankVATRemaining;

  // ── Bank obligation & due (bank pays NO VAT — owner pays VAT on bank's share) ──
  const bankObligationToContractor = bankActualFixed;  // net only, no VAT
  const bankRemaining = Math.max(0, bankObligationToContractor - prevBankInvoiced);
  const bankDueCumul = bankObligationToContractor * bankBaseProgress / 100;
  const bankDueThisCycle = Math.max(0, bankDueCumul - prevBankInvoiced);

  // ── VO info per variation (using per-VO progress) ─────────────────
  const getVOInfo = useCallback((vo) => {
    if (!vo) return { obligation: 0, prevInvoiced: 0, dueThisCycle: 0, remaining: 0, progress: 0 };
    const obligation = parseFloat(vo.total_amount || 0) * (1 + VAT_RATE);
    const prevInv = getPrevVOInvoiced(vo.id);
    const voProg = getVOProgress(vo.id);
    const dueCumul = obligation * voProg / 100;
    // For negative VOs, don't clamp — the due/remaining amounts are legitimately negative
    const dueThisCycle = obligation < 0 ? dueCumul - prevInv : Math.max(0, dueCumul - prevInv);
    const remaining = obligation < 0 ? obligation - prevInv : Math.max(0, obligation - prevInv);
    return { obligation, prevInvoiced: prevInv, dueThisCycle, remaining, progress: voProg };
  }, [getPrevVOInvoiced, getVOProgress]);

  const getProlongationFeeInfo = useCallback((fee) => {
    if (!fee) return { obligation: 0, prevInvoiced: 0, dueThisCycle: 0, remaining: 0 };
    const obligation = parseFloat(fee.gross_amount ?? fee.amount ?? 0);
    const prevInv = getPrevProlongationFeeInvoiced(fee.id);
    const remaining = Math.max(0, obligation - prevInv);
    return { obligation, prevInvoiced: prevInv, dueThisCycle: remaining, remaining };
  }, [getPrevProlongationFeeInvoiced]);

  // ── Totals for owner ──────────────────────────────────────────────
  // Owner total obligation to contractor = base contract + all VOs (all incl VAT)
  const totalVOsObligation = variations.reduce((sum, vo) => sum + getVOInfo(vo).obligation, 0);
  const totalProlongationFeesObligation = prolongationFees.reduce((sum, fee) => sum + getProlongationFeeInfo(fee).obligation, 0);
  const ownerInvoiceObligation = ownerBaseObligInclVAT + totalVOsObligation + totalProlongationFeesObligation;
  const ownerRemaining = Math.max(0, ownerInvoiceObligation - prevOwnerInvoiced);
  const totalVOsDueThisCycle = variations.reduce((sum, vo) => sum + getVOInfo(vo).dueThisCycle, 0);
  const totalProlongationFeesDueThisCycle = prolongationFees.reduce((sum, fee) => sum + getProlongationFeeInfo(fee).dueThisCycle, 0);
  const ownerDueThisCycle = ownerBaseDueThisCycle + totalVOsDueThisCycle + totalProlongationFeesDueThisCycle;
  const totalVOsRemaining = variations.reduce((sum, vo) => sum + getVOInfo(vo).remaining, 0);

  // ── VOs selected in the items table (unique) ─────────────────────
  const selectedVOsInItems = items
    .filter(it => it.source === "variation" && it.variation_id)
    .reduce((acc, it) => {
      const voId = String(it.variation_id);
      if (!acc.find(x => String(x.id) === voId)) {
        const vo = variations.find(v => String(v.id) === voId);
        if (vo) acc.push(vo);
      }
      return acc;
    }, []);

  // ── Info bar ──────────────────────────────────────────────────────
  const showInfoBar = !!(formData.project && (ownerInvoiceObligation > 0 || bankObligationToContractor > 0 || ownerBaseProgress > 0 || bankBaseProgress > 0));

  // ── Items helpers ─────────────────────────────────────────────────
  const recalcItem = (item) => {
    const amount = parseFloat(removeCommas(item.amount_incl_vat || "0")) || 0;
    // bank_vat source OR bank payer: no VAT — amount is the net amount directly
    if (item.source === "bank_vat" || payer === "bank") {
      return { ...item, total: amount, vat: 0 };
    }
    if (item.source === "prolongation_fee" && isNoVatProlongationFee(item.prolongation_fee_id)) {
      return { ...item, total: amount, vat: 0 };
    }
    const net = Math.round(amount / 1.05 * 100) / 100;
    const vat = Math.round((amount - net) * 100) / 100;
    return { ...item, total: net, vat };
  };

  const updateItem = (idx, patch) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = recalcItem({ ...next[idx], ...patch });
      // If source changed, clear variation_id
      if (patch.source && patch.source !== "variation") {
        next[idx] = { ...next[idx], variation_id: null };
      }
      if (patch.source && patch.source !== "prolongation_fee") {
        next[idx] = { ...next[idx], prolongation_fee_id: null };
      }
      if (patch.source === "variation") {
        next[idx] = { ...next[idx], variation_id: null, prolongation_fee_id: null };
      }
      if (patch.source === "prolongation_fee") {
        next[idx] = { ...next[idx], variation_id: null, prolongation_fee_id: null };
      }
      return next;
    });
  };

  const addItem = () => setItems(prev => {
    const hasBase = prev.some(it => it.source === "base_contract");
    const hasBankVat = prev.some(it => it.source === "bank_vat");
    const newItem = EMPTY_ITEM();
    // Auto-select first available source
    if (hasBase) {
      if (variations.length > 0) newItem.source = "variation";
      else if (prolongationFees.length > 0) newItem.source = "prolongation_fee";
      else if (bankVATpaidByOwner > 0 && !hasBankVat) newItem.source = "bank_vat";
    }
    return [...prev, newItem];
  });

  const removeItem = (idx) => {
    if (items.length === 1) return; // keep at least one row
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Totals ────────────────────────────────────────────────────────
  const totalInclVAT = items.reduce((s, it) => s + (parseFloat(removeCommas(it.amount_incl_vat || "0")) || 0), 0);
  const totalExclVAT = items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0);
  const vatAmount = Math.round((totalInclVAT - totalExclVAT) * 100) / 100;

  // Calculate deduction preview when owner invoice amount changes
  useEffect(() => {
    if (formData.project && payer === 'owner' && advanceSummary && applyAdvanceDeduction && totalInclVAT > 0) {
      const timer = setTimeout(() => {
        advancePaymentApi.calculateDeduction(formData.project, totalInclVAT)
          .then(data => setDeductionPreview(parseFloat(data?.total_deduction) > 0 ? data : null))
          .catch(() => setDeductionPreview(null));
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDeductionPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.project, payer, totalInclVAT, advanceSummary, applyAdvanceDeduction]);

  // ── Validation ────────────────────────────────────────────────────
  const validate = () => {
    if (!formData.project || !formData.invoice_date) {
      showError(t("fill_required_fields"));
      return false;
    }
    if (totalInclVAT === 0) {
      showError(t("invoice_amount_required"));
      return false;
    }
    // Bank items cannot have variation, prolongation fee, or bank_vat source
    if (payer === "bank") {
      const hasVO = items.some(it => it.source === "variation" || it.source === "prolongation_fee" || it.source === "bank_vat");
      if (hasVO) {
        showError(t("invoice_item_variation_not_allowed"));
        return false;
      }
      // Bank requires minimum 20% technical progress before first invoice
      if (bankBaseProgress < 20 && prevBankInvoiced <= 0) {
        showError(t("bank_min_progress_required"));
        return false;
      }
    }
    // Owner variation items must have a variation selected
    for (let i = 0; i < items.length; i++) {
      if (items[i].source === "variation" && !items[i].variation_id) {
        showError(t("select_variation_required"));
        return false;
      }
      if (items[i].source === "prolongation_fee" && !items[i].prolongation_fee_id) {
        showError(t("select_prolongation_fee_required") || "Select a prolongation fee.");
        return false;
      }
    }
    // No duplicate base contract rows
    const baseRows = items.filter(it => it.source === "base_contract");
    if (baseRows.length > 1) {
      showError(t("base_contract_already_used"));
      return false;
    }
    // No duplicate bank_vat rows
    const bankVatRows = items.filter(it => it.source === "bank_vat");
    if (bankVatRows.length > 1) {
      showError(t("bank_vat_already_used"));
      return false;
    }
    // No duplicate VO rows
    const voIds = items.filter(it => it.source === "variation" && it.variation_id).map(it => String(it.variation_id));
    if (new Set(voIds).size !== voIds.length) {
      showError(t("variation_already_used"));
      return false;
    }
    const feeIds = items.filter(it => it.source === "prolongation_fee" && it.prolongation_fee_id).map(it => String(it.prolongation_fee_id));
    if (new Set(feeIds).size !== feeIds.length) {
      showError(t("prolongation_fee_already_used") || "Prolongation fee already used.");
      return false;
    }

    return true;
  };

  const collectWarnings = () => {
    const warnings = [];
    if (payer === "owner" && ownerBaseProgress > 0) {
      const baseItem = items.find(it => it.source === "base_contract");
      if (baseItem) {
        const baseAmountInclVAT = (parseFloat(removeCommas(baseItem.amount_incl_vat || "0")) || 0);
        if (baseAmountInclVAT > ownerBaseOnlyDueThisCycle + 0.01) {
          warnings.push(
            `${t("base_amount_exceeds_due") || "تحذير: مبلغ العقد الأساسي"} (${formatAmountString(baseAmountInclVAT)}) ${t("exceeds_due_amount") || "أعلى من المستحق حسب الإنجاز"} (${formatAmountString(ownerBaseOnlyDueThisCycle)})`
          );
        }
      }
      for (const item of items) {
        if (item.source === "variation" && item.variation_id) {
          const vo = variations.find(v => String(v.id) === String(item.variation_id));
          if (vo) {
            const voInfo = getVOInfo(vo);
            const voAmountInclVAT = (parseFloat(removeCommas(item.amount_incl_vat || "0")) || 0);
            if (voAmountInclVAT > voInfo.dueThisCycle + 0.01) {
              warnings.push(
                `${t("vo_amount_exceeds_due") || "تحذير: مبلغ أمر التغيير"} (${formatAmountString(voAmountInclVAT)}) ${t("exceeds_due_amount") || "أعلى من المستحق حسب الإنجاز"} (${formatAmountString(voInfo.dueThisCycle)})`
              );
            }
          }
        }
        if (item.source === "prolongation_fee" && item.prolongation_fee_id) {
          const fee = prolongationFees.find(f => String(f.id) === String(item.prolongation_fee_id));
          if (fee) {
            const feeInfo = getProlongationFeeInfo(fee);
            const feeAmountInclVAT = (parseFloat(removeCommas(item.amount_incl_vat || "0")) || 0);
            if (feeAmountInclVAT > feeInfo.remaining + 0.01) {
              warnings.push(
                `${t("prolongation_fees") || "Prolongation Fees"} (${formatAmountString(feeAmountInclVAT)}) ${t("exceeds_due_amount") || "exceeds due amount"} (${formatAmountString(feeInfo.remaining)})`
              );
            }
          }
        }
      }
    }
    return warnings;
  };

  // ── Submit ────────────────────────────────────────────────────────
  const doSubmit = async () => {
    setSaving(true);
    try {
      const r2 = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;
      const payload = {
        project: parseInt(formData.project),
        payment: null,
        payer: payer,
        amount: r2(totalInclVAT),
        net_amount: r2(totalExclVAT),
        vat: r2(vatAmount),
        invoice_date: formData.invoice_date,
        invoice_number: formData.invoice_number?.trim() || null,
        description: formData.description || "",
        skip_advance_deduction: !applyAdvanceDeduction,
        items: items.map(it => ({
          description: it.description || (
            it.source === "variation" ? `${t("invoice_item_variation_prefix")} #${it.variation_id}` :
              it.source === "prolongation_fee" ? `${t("prolongation_fees") || "Prolongation Fees"} #${it.prolongation_fee_id}` :
              it.source === "bank_vat" ? t("bank_vat_paid_by_owner") :
                t("invoice_item_base_contract")
          ),
          quantity: 1,
          unit_price: r2(it.total),
          total: r2(it.total),
          source: it.source || "base_contract",
          variation_id: it.source === "variation" ? (parseInt(it.variation_id) || null) : null,
          prolongation_fee_id: it.source === "prolongation_fee" ? (parseInt(it.prolongation_fee_id) || null) : null,
        })),
      };

      const projectId = formData.project;
      if (isEditMode) {
        await projectApi.updateInvoice(projectId, invoiceId, payload);
        success(t("invoice_updated_successfully"));
      } else {
        await projectApi.createInvoice(projectId, payload);
        success(t("invoice_created_successfully"));
      }

      invalidateProjectQueries(queryClient, projectId);
      navigate(`/projects/${projectId}?tab=invoices`);
    } catch (err) {
      logger.error("Error saving invoice", err);
      logger.error("Response data:", err?.response?.data);
      const errData = err?.response?.data;
      let errMsg = t("save_error");
      if (errData) {
        if (typeof errData === "string") {
          errMsg = errData;
        } else if (errData.detail && errData.detail !== "An error occurred") {
          errMsg = errData.detail;
        } else if (errData.debug?.data) {
          // Custom exception handler wraps DRF errors in debug.data
          const debugData = errData.debug.data;
          const msgs = Object.entries(debugData).map(([k, v]) =>
            `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
          );
          if (msgs.length) errMsg = msgs.join("\n");
        } else {
          const msgs = Object.entries(errData)
            .filter(([k]) => k !== "error" && k !== "status_code" && k !== "debug")
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
          if (msgs.length) errMsg = msgs.join("\n");
        }
      }
      showError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const warnings = collectWarnings();
    if (warnings.length > 0) {
      setWarningDialog({ open: true, warnings });
      return;
    }
    await doSubmit();
  };

  const handleBack = () => {
    const projectId = formData.project || projectFromQuery;
    navigate(projectId ? `/projects/${projectId}?tab=invoices` : "/projects");
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="entry-form entry-form--wide">
        <FinancialActionBar onBack={handleBack} saving={saving} formId="create-invoice-form">
          <ProjectEntryInfo project={selectedProject} />
        </FinancialActionBar>

        <form id="create-invoice-form" onSubmit={handleSubmit} className="create-invoice-form">
          {/* ── Card 1: Invoice Details ── */}
          <div className="card">
            <div className="card__header">{t("invoice_details")}</div>
            <div className="card__body">
              {/* Row 1: Project + Payer + Date */}
              <div className="invoice-form__row invoice-form__row--3">
                <div className="invoice-form__field">
                  <label className="invoice-form__label">
                    {t("project_name")} <span className="invoice-form__required">*</span>
                  </label>
                  {selectedProject ? (
                    <input
                      type="text"
                      className="prj-input invoice-form__readonly-input"
                      value={(() => {
                        const owners = Array.isArray(selectedProject.owners) ? selectedProject.owners : [];
                        const name = getProjectName({ ...selectedProject, __owners_data: owners }, t);
                        const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
                        return name?.[lang] || name?.full || name?.en || name?.ar || selectedProject.display_name || selectedProject.name || `${t("project")} #${selectedProject.id}`;
                      })()}
                      readOnly
                    />
                  ) : (
                    <UnifiedSelect
                      options={projects}
                      value={formData.project}
                      onChange={handleProjectChange}
                      placeholder={t("select_project")}
                      isDisabled={isEditMode}
                      getOptionLabel={(opt) => {
                        const owners = Array.isArray(opt.owners) ? opt.owners : [];
                        const name = getProjectName({ ...opt, __owners_data: owners }, t);
                        const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
                        return (
                          name?.[lang] ||
                          name?.full ||
                          name?.en ||
                          name?.ar ||
                          opt.display_name ||
                          opt.name ||
                          `${t("project")} #${opt.id}`
                        );
                      }}
                      getOptionValue={(opt) => opt.id?.toString()}
                    />
                  )}
                </div>

                <div className="invoice-form__field">
                  <label className="invoice-form__label">
                    {t("invoice_payer")} <span className="invoice-form__required">*</span>
                  </label>
                  <select
                    className="prj-select w-full"
                    value={payer}
                    onChange={(e) => {
                      const newPayer = e.target.value;
                      setFormData({ ...formData, payer: newPayer });
                      // Recalc all items for new payer (bank = no VAT)
                      setItems(prev => prev.map(it => {
                        const updated = newPayer === "bank"
                          ? { ...it, source: "base_contract", variation_id: null, prolongation_fee_id: null }
                          : it;
                        const amount = parseFloat(removeCommas(updated.amount_incl_vat || "0")) || 0;
                        if (newPayer === "bank" || updated.source === "bank_vat") {
                          return { ...updated, total: amount, vat: 0 };
                        }
                        if (updated.source === "prolongation_fee" && isNoVatProlongationFee(updated.prolongation_fee_id)) {
                          return { ...updated, total: amount, vat: 0 };
                        }
                        const net = Math.round(amount / 1.05 * 100) / 100;
                        return { ...updated, total: net, vat: Math.round((amount - net) * 100) / 100 };
                      }));
                    }}
                    required
                  >
                    <option value="owner">{t("invoice_payer_owner")}</option>
                    <option value="bank">{t("invoice_payer_bank")}</option>
                  </select>
                </div>

                <div className="invoice-form__field">
                  <label className="invoice-form__label">
                    {t("invoice_date")} <span className="invoice-form__required">*</span>
                  </label>
                  <DateInput
                    className="prj-input"
                    value={formData.invoice_date}
                    onChange={(value) => setFormData({ ...formData, invoice_date: value })}
                  />
                </div>
              </div>

              {/* Row 2: Invoice Number + Description */}
              <div className="invoice-form__row invoice-form__row--2">
                <div className="invoice-form__field">
                  <label className="invoice-form__label">
                    {t("invoice_number")} <span className="invoice-form__required">*</span>
                  </label>
                  <input
                    type="text"
                    className="prj-input invoice-form__readonly-input"
                    value={formData.invoice_number || ""}
                    readOnly
                  />
                </div>

                <div className="invoice-form__field">
                  <label className="invoice-form__label">{t("invoice_description")}</label>
                  <input
                    type="text"
                    className="prj-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t("invoice_description_placeholder")}
                  />
                </div>
              </div>

              {/* ── Info bar ── */}
             {showInfoBar && (
  <div className="invoice-form__info-bar">
    {payer === "bank" ? (
      <>
        <div className="invoice-form__info-item">
          <span className="invoice-form__info-label">{t("current_progress")}</span>
          <span className="invoice-form__info-value invoice-form__info-value--primary">
            {Number(bankBaseProgress).toFixed(2)}%
          </span>
        </div>

        <div className="invoice-form__info-item">
          <span className="invoice-form__info-label">{t("bank_total_obligation")}</span>
          <span className="invoice-form__info-value">
            {renderAmount(bankObligationToContractor)}
          </span>
        </div>

        <div className="invoice-form__info-item">
          <span className="invoice-form__info-label">{t("previously_invoiced_bank")}</span>
          <span className="invoice-form__info-value invoice-form__info-value--warning">
            {renderAmount(prevBankInvoiced)}
          </span>
        </div>

        {bankBaseProgress > 0 && (
          <div className="invoice-form__info-item">
            <span className="invoice-form__info-label">{t("required_amount_by_progress")}</span>
            <span className="invoice-form__info-value invoice-form__info-value--success">
              {renderAmount(bankDueThisCycle)}
            </span>
          </div>
        )}

        <div className="invoice-form__info-item">
          <span className="invoice-form__info-label">{t("remaining_bank_obligation")}</span>
          <span className="invoice-form__info-value invoice-form__info-value--success">
            {renderAmount(bankRemaining)}
          </span>
        </div>
      </>
    ) : (
      <>
        {/* ✅ OWNER INFO (RESTORED) */}
        <div className="invoice-form__info-item">
          <span className="invoice-form__info-label">{t("current_progress")}</span>
          <span className="invoice-form__info-value invoice-form__info-value--primary">
            {Number(ownerBaseProgress).toFixed(2)}%
          </span>
        </div>

        <div className="invoice-form__info-item">
          <span className="invoice-form__info-label">{t("owner_total_obligation")}</span>
          <span className="invoice-form__info-value">
            {renderAmount(ownerInvoiceObligation)}
          </span>
        </div>

        <div className="invoice-form__info-item">
          <span className="invoice-form__info-label">{t("previously_invoiced_owner")}</span>
          <span className="invoice-form__info-value invoice-form__info-value--warning">
            {renderAmount(prevOwnerInvoiced)}
          </span>
        </div>

        {ownerBaseProgress > 0 && (
          <div className="invoice-form__info-item">
            <span className="invoice-form__info-label">{t("required_amount_by_progress")}</span>
            <span className="invoice-form__info-value invoice-form__info-value--success">
              {renderAmount(ownerDueThisCycle)}
            </span>
          </div>
        )}

        <div className="invoice-form__info-item">
          <span className="invoice-form__info-label">{t("remaining_owner_obligation")}</span>
          <span className="invoice-form__info-value invoice-form__info-value--success">
            {renderAmount(ownerRemaining)}
          </span>
        </div>

        {/* ✅ ADVANCE BANNER */}
        {advanceSummary && (
          <div className="inv-info__banner inv-info__banner--advance">
            <div className="inv-info__banner-header">
              <span className="inv-info__banner-title">{t("advance_payment_active")}</span>
              <label className="inv-info__banner-check">
                <input
                  type="checkbox"
                  checked={applyAdvanceDeduction}
                  onChange={(e) => setApplyAdvanceDeduction(e.target.checked)}
                />
                {t("apply_advance_deduction")}
              </label>
            </div>

            {advanceSummary.advances
              .filter((ap) => ap.status === "active")
              .map((ap) => (
                <div key={ap.id || ap.percentage} className="inv-info__banner-row">
                  <span>
                    {t("advance_payment")} ({ap.percentage}%): {renderAmount(ap.amount)}
                  </span>
                  <span>
                    {t("recovered")}: {renderAmount(ap.recovered_amount)} |{" "}
                    {t("remaining")}: {renderAmount(ap.remaining_amount)}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* ✅ CREDIT BANNER */}
        {creditSummary && (
          <div className="inv-info__banner inv-info__banner--credit">
            <div className="inv-info__banner-header">
              <span className="inv-info__banner-title">
                {t("available_credit")}:{" "}
                {renderAmount(parseFloat(creditSummary.total_credit) || 0)}
              </span>
            </div>

            {creditSummary.credits?.map((cr) => (
              <div key={cr.payment_id} className="inv-info__banner-row">
                <span>
                  {t("credit_from_payment")} #{cr.payment_id} —{" "}
                  {renderAmount(parseFloat(cr.credit_balance) || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </>
    )}
  </div>
)}
            </div>
          </div>

          {/* ── Card 2: Invoice Items ── */}
          <div className="card">
            <div className="card__header">{t("invoice_items")}</div>
            <div className="card__body">
              <div className="invoice-items-table-wrapper">
                <table className="invoice-items-table">
                  <thead>
                    <tr>
                      <th className="invoice-items-table__th invoice-items-table__th--source">
                        {t("invoice_item_variation_column")}
                      </th>
                      <th className="invoice-items-table__th">
                        {t("item_description")}
                      </th>
                      <th className="invoice-items-table__th invoice-items-table__th--price">
                        {payer === "bank" ? t("total_amount") : t("amount_incl_vat_col")}
                      </th>
                      {payer !== "bank" && (
                        <th className="invoice-items-table__th invoice-items-table__th--total">
                          {t("invoice_net_amount")}
                        </th>
                      )}
                      {payer !== "bank" && (
                        <th className="invoice-items-table__th invoice-items-table__th--total">
                          {t("vat_amount_col")}
                        </th>
                      )}
                      <th className="invoice-items-table__th invoice-items-table__th--action" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const selectedVO = variations.find(v => String(v.id) === String(item.variation_id)) || null;
                      const voInfo = selectedVO ? getVOInfo(selectedVO) : null;
                      const selectedProlongationFee = prolongationFees.find(f => String(f.id) === String(item.prolongation_fee_id)) || null;
                      const prolongationFeeInfo = selectedProlongationFee ? getProlongationFeeInfo(selectedProlongationFee) : null;

                      // IDs already used in OTHER rows (for duplicate prevention)
                      const usedVOIds = items.filter((_, i) => i !== idx && items[i].variation_id).map(it => String(it.variation_id));
                      const usedProlongationFeeIds = items.filter((_, i) => i !== idx && items[i].prolongation_fee_id).map(it => String(it.prolongation_fee_id));
                      const baseUsedInOther = items.some((it, i) => i !== idx && it.source === "base_contract");
                      const bankVatUsedInOther = items.some((it, i) => i !== idx && it.source === "bank_vat");
                      const baseConflict = item.source === "base_contract" && baseUsedInOther;
                      const bankVatConflict = item.source === "bank_vat" && bankVatUsedInOther;

                      return (
                        <tr key={`item-${idx}`} className="invoice-items-table__row">
                          {/* Source column */}
                          <td className="invoice-items-table__td invoice-items-table__td--source">
                            {/* Source type selector */}
                            <select
                              className="prj-select w-full"
                              value={item.source}
                              onChange={(e) => updateItem(idx, { source: e.target.value })}
                              disabled={payer === "bank"}
                            >
                              <option value="base_contract" disabled={baseUsedInOther}>
                                {baseUsedInOther ? `✓ ${t("invoice_item_base_contract")}` : t("invoice_item_base_contract")}
                              </option>
                              {payer === "owner" && variations.length > 0 && (
                                <option value="variation">{t("invoice_item_variation")}</option>
                              )}
                              {payer === "owner" && prolongationFees.length > 0 && (
                                <option value="prolongation_fee">{t("prolongation_fees") || "Prolongation Fees"}</option>
                              )}
                              {payer === "owner" && bankVATpaidByOwner > 0 && (
                                <option value="bank_vat" disabled={bankVatUsedInOther}>
                                  {bankVatUsedInOther ? `✓ ${t("invoice_source_bank_vat")}` : t("invoice_source_bank_vat")}
                                </option>
                              )}
                            </select>

                            {/* Warning: base contract already used */}
                            {baseConflict && (
                              <small style={{ color: "var(--error-500, #ef4444)", display: "block", marginTop: "4px" }}>
                                ⚠ {t("base_contract_already_used")}
                              </small>
                            )}

                            {/* Base contract info panel — horizontal (owner share only, excl bank VAT) */}
                            {item.source === "base_contract" && payer === "owner" && ownerBaseProgress > 0 && (
                              <div className="inv-item-chips">
                                <span className="inv-item-chip">{t("owner_share_obligation")}: <b>{renderAmount(ownerShareOblig)}</b></span>
                                <span className="inv-item-chip">{t("base_contract_progress")}: <b className="inv-item-chip__val--primary">{Number(ownerBaseProgress).toFixed(1)}%</b></span>
                                <span className="inv-item-chip">{t("cumulative_due_by_progress")}: <b>{renderAmount(ownerShareDueCumul)}</b></span>
                                <span className="inv-item-chip inv-item-chip--danger">{t("previously_invoiced_base")}: <b>−{renderAmount(prevOwnerBaseInvoiced)}</b></span>
                                <span
                                  className="inv-item-chip inv-item-chip--success inv-item-chip--clickable"
                                  title={t("click_to_fill_amount")}
                                  onClick={() => updateItem(idx, { amount_incl_vat: ownerBaseOnlyDueThisCycle.toFixed(2) })}
                                >
                                  {t("due_from_base_contract")}: <b>{formatAmountString(ownerBaseOnlyDueThisCycle)}</b>
                                </span>
                                <span className="inv-item-chip">{t("remaining_base_contract")}: <b>{renderAmount(ownerBaseOnlyRemaining)}</b></span>
                              </div>
                            )}

                            {/* Bank payer: base contract info panel */}
                            {item.source === "base_contract" && payer === "bank" && bankBaseProgress > 0 && (
                              <div className="inv-item-chips">
                                <span className="inv-item-chip">{t("bank_obligation_no_vat")}: <b>{renderAmount(bankObligationToContractor)}</b></span>
                                <span className="inv-item-chip">{t("bank_progress")}: <b className="inv-item-chip__val--primary">{Number(bankBaseProgress).toFixed(1)}%</b></span>
                                <span className="inv-item-chip">{t("cumulative_due_by_progress")}: <b>{renderAmount(bankDueCumul)}</b></span>
                                <span className="inv-item-chip inv-item-chip--danger">{t("previously_invoiced_bank")}: <b>−{renderAmount(prevBankInvoiced)}</b></span>
                                <span
                                  className="inv-item-chip inv-item-chip--success inv-item-chip--clickable"
                                  title={t("click_to_fill_amount")}
                                  onClick={() => updateItem(idx, { amount_incl_vat: bankDueThisCycle.toFixed(2) })}
                                >
                                  {t("due_from_base_contract")}: <b>{renderAmount(bankDueThisCycle)}</b>
                                </span>
                                <span className="inv-item-chip">{t("remaining_bank_obligation")}: <b>{renderAmount(bankRemaining)}</b></span>
                              </div>
                            )}

                            {/* Warning: bank VAT already used */}
                            {bankVatConflict && (
                              <small style={{ color: "var(--error-500, #ef4444)", display: "block", marginTop: "4px" }}>
                                ⚠ {t("bank_vat_already_used")}
                              </small>
                            )}

                            {/* Bank VAT info panel — horizontal */}
                            {item.source === "bank_vat" && payer === "owner" && (
                              <div className="inv-item-chips" style={{ marginTop: "6px" }}>
                                <span className="inv-item-chip">{t("bank_vat_total")}: <b>{renderAmount(bankVATpaidByOwner)}</b></span>
                                <span className="inv-item-chip">{t("bank_progress")}: <b className="inv-item-chip__val--primary">{Number(bankBaseProgress).toFixed(1)}%</b></span>
                                <span className="inv-item-chip">{t("cumulative_due_by_progress")}: <b>{renderAmount(bankVATdueByCumul)}</b></span>
                                <span className="inv-item-chip inv-item-chip--danger">{t("previously_invoiced_bank_vat")}: <b>−{renderAmount(prevBankVATInvoiced)}</b></span>
                                <span
                                  className="inv-item-chip inv-item-chip--success inv-item-chip--clickable"
                                  title={t("click_to_fill_amount")}
                                  onClick={() => updateItem(idx, { amount_incl_vat: bankVATDueThisCycle.toFixed(2) })}
                                >
                                  {t("due_bank_vat")}: <b>{renderAmount(bankVATDueThisCycle)}</b>
                                </span>
                              </div>
                            )}

                            {/* VO selector when source = variation */}
                            {item.source === "variation" && payer === "owner" && (
                              <div className="invoice-form__source-info">
                                <select
                                  className="prj-select w-full"
                                  style={{ marginTop: "6px" }}
                                  value={item.variation_id || ""}
                                  onChange={(e) => updateItem(idx, { variation_id: e.target.value || null })}
                                >
                                  <option value="">{t("select_variation_placeholder")}</option>
                                  {variations
                                    .filter(vo =>
                                      // Hide VOs already invoiced in a previous invoice,
                                      // but keep the one currently selected in this row
                                      !previouslyInvoicedVOIds.has(String(vo.id)) ||
                                      String(vo.id) === String(item.variation_id)
                                    )
                                    .map(vo => {
                                      const alreadyUsed = usedVOIds.includes(String(vo.id));
                                      return (
                                        <option key={vo.id} value={vo.id} disabled={alreadyUsed}>
                                          {alreadyUsed ? "✓ " : ""}{vo.variation_number || `#${vo.id}`} — {formatAmountString(parseFloat(vo.total_amount || 0) * (1 + VAT_RATE))}
                                        </option>
                                      );
                                    })}
                                </select>

                                {/* VO details panel — horizontal chips */}
                                {voInfo && selectedVO && (
                                  <div className="inv-item-chips">
                                    <span className="inv-item-chip">{t("vo_obligation_incl_vat")}: <b>{renderAmount(voInfo.obligation)}</b></span>
                                    <span className="inv-item-chip">{t("current_progress")}: <b className="inv-item-chip__val--primary">{Number(voInfo.progress).toFixed(1)}%</b></span>
                                    <span className="inv-item-chip inv-item-chip--danger">{t("previously_invoiced_vo")}: <b>−{renderAmount(voInfo.prevInvoiced)}</b></span>
                                    <span
                                      className="inv-item-chip inv-item-chip--success inv-item-chip--clickable"
                                      title={t("click_to_fill_amount")}
                                      onClick={() => updateItem(idx, { amount_incl_vat: voInfo.dueThisCycle.toFixed(2) })}
                                    >
                                      {t("vo_due_by_progress")}: <b>{formatAmountString(voInfo.dueThisCycle)}</b>
                                    </span>
                                    <span className="inv-item-chip">{t("remaining_vo_obligation")}: <b>{renderAmount(voInfo.remaining)}</b></span>
                                  </div>
                                )}
                              </div>
                            )}

                            {item.source === "prolongation_fee" && payer === "owner" && (
                              <div className="invoice-form__source-info">
                                <select
                                  className="prj-select w-full"
                                  style={{ marginTop: "6px" }}
                                  value={item.prolongation_fee_id || ""}
                                  onChange={(e) => updateItem(idx, { prolongation_fee_id: e.target.value || null })}
                                >
                                  <option value="">{t("select_prolongation_fee_required") || "Select prolongation fee"}</option>
                                  {prolongationFees
                                    .filter(fee =>
                                      !previouslyInvoicedProlongationFeeIds.has(String(fee.id)) ||
                                      String(fee.id) === String(item.prolongation_fee_id)
                                    )
                                    .map(fee => {
                                      const alreadyUsed = usedProlongationFeeIds.includes(String(fee.id));
                                      const label = fee.description || `${t("prolongation_fees") || "Prolongation Fees"} #${fee.id}`;
                                      return (
                                        <option key={fee.id} value={fee.id} disabled={alreadyUsed}>
                                          {alreadyUsed ? "✓ " : ""}{label} — {formatAmountString(getProlongationFeeGrossAmount(fee))}
                                        </option>
                                      );
                                    })}
                                </select>

                                {prolongationFeeInfo && selectedProlongationFee && (
                                  <div className="inv-item-chips">
                                    <span className="inv-item-chip">{t("total_amount")}: <b>{renderAmount(prolongationFeeInfo.obligation)}</b></span>
                                    <span className="inv-item-chip inv-item-chip--danger">{t("previously_invoiced") || "Previously invoiced"}: <b>−{renderAmount(prolongationFeeInfo.prevInvoiced)}</b></span>
                                    <span
                                      className="inv-item-chip inv-item-chip--success inv-item-chip--clickable"
                                      title={t("click_to_fill_amount")}
                                      onClick={() => updateItem(idx, { amount_incl_vat: prolongationFeeInfo.dueThisCycle.toFixed(2) })}
                                    >
                                      {t("remaining")}: <b>{formatAmountString(prolongationFeeInfo.remaining)}</b>
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Description */}
                          <td className="invoice-items-table__td">
                            <input
                              type="text"
                              className="prj-input"
                              value={item.description}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              placeholder={t("item_description_placeholder")}
                            />
                          </td>

                          {/* Amount — primary input */}
                          <td className="invoice-items-table__td">
                            <CurrencyField
                              value={item.amount_incl_vat}
                              onChange={(value) => updateItem(idx, { amount_incl_vat: value })}
                              placeholder="0.00"
                              showCurrency={false}
                              showArabicWords={false}
                            />
                          </td>

                          {/* Net Amount (excl VAT) — only for owner */}
                          {payer !== "bank" && (
                            <td className="invoice-items-table__td invoice-items-table__td--total">
                              {renderAmount(item.total)}
                            </td>
                          )}

                          {/* VAT — only for owner */}
                          {payer !== "bank" && (
                            <td className="invoice-items-table__td invoice-items-table__td--total">
                              {renderAmount(item.vat)}
                            </td>
                          )}

                          {/* Remove */}
                          <td className="invoice-items-table__td invoice-items-table__td--action">
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => removeItem(idx)}
                              disabled={items.length === 1}
                              title={t("remove_item")}
                            >
                              ×
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="invoice-items-table__footer">
                      <td colSpan={2}>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={addItem}
                        >
                          + {t("add_item")}
                        </Button>
                      </td>
                      <td className="invoice-items-table__footer-label">
                        {payer === "bank" ? t("total_amount") : t("invoice_amount_incl_vat")}
                      </td>
                      <td className="invoice-items-table__footer-total">
                        {renderAmount(totalInclVAT)}
                      </td>
                      {payer !== "bank" && <td colSpan={2} />}
                    </tr>

                    {payer !== "bank" && (
                      <>
                        <tr className="invoice-items-table__footer">
                          <td colSpan={2} />
                          <td className="invoice-items-table__footer-label">
                            {t("invoice_net_amount")}
                          </td>
                          <td className="invoice-items-table__footer-total">
                            {renderAmount(totalExclVAT)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                        <tr className="invoice-items-table__footer">
                          <td colSpan={2} />
                          <td className="invoice-items-table__footer-label">
                            {t("vat_5")}
                          </td>
                          <td className="invoice-items-table__footer-total">
                            {renderAmount(vatAmount)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </>
                    )}

                    {/* Advance payment deduction preview */}
                    {deductionPreview && payer === "owner" && (
                      <>
                        <tr className="invoice-items-table__footer invoice-items-table__footer--deduction">
                          <td colSpan={2} />
                          <td className="invoice-items-table__footer-label invoice-items-table__footer-label--deduction">
                            {t("advance_deduction")} ({deductionPreview.advances?.map(a => `${parseFloat(a.owner_progress || 0).toFixed(0)}%`).join(' + ') || ''})
                          </td>
                          <td className="invoice-items-table__footer-total invoice-items-table__footer-total--deduction">
                            - {renderAmount(deductionPreview.total_deduction)}
                          </td>
                          {payer !== "bank" && <td colSpan={2} />}
                        </tr>
                        <tr className="invoice-items-table__footer invoice-items-table__footer--net">
                          <td colSpan={2} />
                          <td className="invoice-items-table__footer-label invoice-items-table__footer-label--net">
                            {t("net_after_deduction")}
                          </td>
                          <td className="invoice-items-table__footer-total invoice-items-table__footer-total--net">
                            {renderAmount(deductionPreview.net_amount)}
                          </td>
                          {payer !== "bank" && <td colSpan={2} />}
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </form>
      </div>

      <Dialog
        open={warningDialog.open}
        title={t("warning") || "تحذير"}
        onClose={() => setWarningDialog({ open: false, warnings: [] })}
        onConfirm={async () => {
          setWarningDialog({ open: false, warnings: [] });
          await doSubmit();
        }}
        danger
        size="small"
      >
        <div>
          {warningDialog.warnings.map((w, i) => (
            <p key={i} style={{ marginBottom: i < warningDialog.warnings.length - 1 ? "8px" : 0 }}>{w}</p>
          ))}
          <p style={{ marginTop: "12px" }}>{t("confirm_proceed") || "هل تريد المتابعة؟"}</p>
        </div>
      </Dialog>
    </PageLayout>
  );
}
