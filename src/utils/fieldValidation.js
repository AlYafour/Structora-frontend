/**
 * Client-side form field completeness checks for new project creation.
 * All results are warnings (never errors) — they never block saves.
 *
 * currentStep controls which sections are checked so early steps don't
 * produce noise for sections the user hasn't reached yet.
 */

export function validateFormFields(formData, language = "ar", noPermit = false, currentStep = "contract") {
  const issues = [];
  const isAR = language === "ar";

  const w = (code, ar, en) =>
    issues.push({ severity: "warning", code, message: isAR ? ar : en });

  const checkSiteplan = ["siteplan", "license", "contract"].includes(currentStep);
  const checkOwners   = checkSiteplan;
  const checkLicense  = ["license", "contract"].includes(currentStep);
  const checkContract = currentStep === "contract";

  // ── Siteplan section ───────────────────────────────────────────────────────
  if (checkSiteplan) {
    const sp = formData?.siteplan_section || {};
    if (!sp.allocation_date)
      w("ALLOC_DATE_MISSING",
        "تاريخ تخصيص الأرض فارغ — يُنصح بإدخاله للحصول على توثيق مكتمل.",
        "Land allocation date is empty — recommended for complete documentation.");
  }

  // ── Owner section ──────────────────────────────────────────────────────────
  if (checkOwners) {
    const owners = formData?.owner_section?.owners || [];
    owners.forEach((owner, idx) => {
      const n = idx + 1;
      if (!owner.id_number)
        w(`OWNER_${idx}_ID_NO`,
          `المالك ${n}: رقم الهوية فارغ.`,
          `Owner ${n}: ID number is empty.`);
      if (!owner.id_expiry_date)
        w(`OWNER_${idx}_ID_EXP`,
          `المالك ${n}: تاريخ انتهاء الهوية فارغ.`,
          `Owner ${n}: ID expiry date is empty.`);
      if (!owner.id_issue_date)
        w(`OWNER_${idx}_ID_ISS`,
          `المالك ${n}: تاريخ إصدار الهوية فارغ.`,
          `Owner ${n}: ID issue date is empty.`);
      if (!owner.nationality)
        w(`OWNER_${idx}_NAT`,
          `المالك ${n}: الجنسية فارغة.`,
          `Owner ${n}: Nationality is empty.`);
    });
  }

  // ── License section ────────────────────────────────────────────────────────
  if (checkLicense && !noPermit) {
    const lic = formData?.license_section || {};
    if (!lic.license_no)
      w("LIC_NO_MISSING",    "رقم رخصة البناء فارغ.",          "Building license number is empty.");
    if (!lic.issue_date)
      w("LIC_ISS_MISSING",   "تاريخ إصدار رخصة البناء فارغ.",  "Building license issue date is empty.");
    if (!lic.expiry_date)
      w("LIC_EXP_MISSING",   "تاريخ انتهاء رخصة البناء فارغ.", "Building license expiry date is empty.");
  }

  // ── Contract section ───────────────────────────────────────────────────────
  if (checkContract) {
    const ct = formData?.contract_section || {};
    if (!ct.contract_date)
      w("CONT_DATE_MISSING",  "تاريخ العقد فارغ.",                  "Contract date is empty.");
    if (!ct.project_end_date)
      w("CONT_END_MISSING",   "تاريخ انتهاء المشروع فارغ.",         "Project end date is empty.");
    if (!ct.total_project_value)
      w("CONT_VAL_MISSING",   "قيمة المشروع الإجمالية فارغة.",      "Total project value is empty.");
    if (!ct.total_bank_value)
      w("CONT_BANK_MISSING",  "قيمة التمويل البنكي فارغة.",         "Bank financing value is empty.");
    if (!ct.total_owner_value)
      w("CONT_OWNER_MISSING", "قيمة تمويل المالك فارغة.",           "Owner financing value is empty.");
  }

  return issues;
}
