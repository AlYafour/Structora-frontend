import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FormSection, FormGrid } from "../../../../components/ui/form";
import Field from "../../../../components/forms/Field";
import PersonField from "./PersonField";
import UniqueFieldInput from "../../../../components/forms/UniqueFieldInput";
import PhoneInput from "../../../../components/forms/PhoneInput";
import useUniquenessCheck from "../../../../hooks/useUniquenessCheck";
import "./wizard.css";

/**
 * ContractPartiesSection - Contract parties section
 * Displays owner and contractor information
 */
export default function ContractPartiesSection({
  form,
  setF,
  viewMode,
  noPermit = false,
}) {
  const { t } = useTranslation();

  // Phone uniqueness per owner
  const { checkUniqueness } = useUniquenessCheck();
  const [ownerPhoneErrors, setOwnerPhoneErrors] = useState({});
  const phoneDebounceRefs = useRef({});

  const checkOwnerPhone = useCallback((ownerId, phone) => {
    if (phoneDebounceRefs.current[ownerId]) clearTimeout(phoneDebounceRefs.current[ownerId]);
    if (!phone || phone.length < 7) { setOwnerPhoneErrors(prev => ({ ...prev, [ownerId]: null })); return; }
    phoneDebounceRefs.current[ownerId] = setTimeout(async () => {
      const result = await checkUniqueness("phone", phone, "owner", ownerId);
      if (!result.cancelled && result.exists) {
        const typeLabel = t(`entity_types.${result.owner_type}`) || result.owner_type;
        setOwnerPhoneErrors(prev => ({ ...prev, [ownerId]: t("validation.duplicate_phone", { name: result.owner_name, type: typeLabel }) }));
      } else if (!result.cancelled) {
        setOwnerPhoneErrors(prev => ({ ...prev, [ownerId]: null }));
      }
    }, 600);
  }, [checkUniqueness, t]);

  // noPermit: owner data is entered manually (not synced from siteplan)
  const updateOwnerField = (idx, key, val) => {
    const arr = Array.isArray(form.owners) ? [...form.owners] : [{}];
    arr[idx] = { ...(arr[idx] || {}), [key]: val };
    setF("owners", arr);
  };

  // Ensure at least one owner slot when noPermit
  const noPermitOwners = (() => {
    const arr = Array.isArray(form.owners) ? form.owners : [];
    return arr.length > 0 ? arr : [{}];
  })();

  return (
    <FormSection title={`3) ${t("contract.sections.parties")}`}>
      <FormGrid cols={noPermit ? 1 : 2} gap="lg" className="ds-items-stretch">
        {/* First party - Owner */}
        <div className="wizard-funding-card">
          <h5 className="wizard-funding-card__title">
            {t("contract.fields.first_party_owner") || "الطرف الأول (المالك)"}
          </h5>

          {noPermit ? (
            /* noPermit: owner entered manually */
            <div>
              {noPermitOwners.map((o, i) => (
                <div key={i} style={{ marginBottom: i < noPermitOwners.length - 1 ? "24px" : "0" }}>
                  {noPermitOwners.length > 1 && (
                    <div className="owner-block__label" style={{ marginBottom: "10px", fontWeight: 600, fontSize: "0.85rem", opacity: 0.7 }}>
                      {t("owner")} {i + 1}
                    </div>
                  )}
                  <div className="form-grid cols-2 wizard-gap-4">
                    <Field label={t("owner_name_ar")}>
                      {viewMode ? (
                        <div className="wizard-view-value">{o.owner_name_ar || t("empty_value")}</div>
                      ) : (
                        <input
                          className="input"
                          type="text"
                          value={o.owner_name_ar || ""}
                          onChange={(e) => updateOwnerField(i, "owner_name_ar", e.target.value)}
                        />
                      )}
                    </Field>
                    <Field label={t("owner_name_en")}>
                      {viewMode ? (
                        <div className="wizard-view-value">{o.owner_name_en || t("empty_value")}</div>
                      ) : (
                        <input
                          className="input"
                          type="text"
                          value={o.owner_name_en || ""}
                          onChange={(e) => updateOwnerField(i, "owner_name_en", e.target.value)}
                          placeholder={t("owner_name_en_placeholder")}
                        />
                      )}
                    </Field>
                    <Field label={t("id_number")}>
                      {viewMode ? (
                        <div className="wizard-view-value">{o.id_number || t("empty_value")}</div>
                      ) : (
                        <input
                          className="input"
                          type="text"
                          value={o.id_number || ""}
                          onChange={(e) => updateOwnerField(i, "id_number", e.target.value)}
                          placeholder={t("id_placeholder")}
                        />
                      )}
                    </Field>
                    <Field label={t("phone")}>
                      {viewMode ? (
                        <div className="wizard-view-value">{o.phone || t("empty_value")}</div>
                      ) : (
                        <>
                          <PhoneInput
                            value={(o.phone || "").replace("+971", "")}
                            onChange={(val) => {
                              const formatted = val ? `+971${val}` : "";
                              updateOwnerField(i, "phone", formatted);
                              checkOwnerPhone(i, formatted);
                            }}
                            excludeType="owner"
                            excludeId={o.id || ""}
                          />
                          {ownerPhoneErrors[i] && (
                            <div className="wizard-field-error wizard-field-error--duplicate">{ownerPhoneErrors[i]}</div>
                          )}
                        </>
                      )}
                    </Field>
                    <Field label={t("email")} className="wizard-col-full">
                      {viewMode ? (
                        <div className="wizard-view-value">{o.email || t("empty_value")}</div>
                      ) : (
                        <UniqueFieldInput
                          fieldType="email"
                          value={o.email || ""}
                          onChange={(val) => updateOwnerField(i, "email", val)}
                          excludeType="owner"
                          excludeId={o.id || ""}
                          placeholder={t("email_placeholder") || "Email@example.com"}
                        />
                      )}
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Normal flow: owner data synced from siteplan (mostly read-only) */
            (() => {
              const ownersArray = Array.isArray(form.owners) ? form.owners : [];
              const explicitlyAuthorized = ownersArray.filter(o => o.is_authorized === true);
              const authorizedOwners = explicitlyAuthorized.length > 0 ? explicitlyAuthorized : ownersArray;

              if (authorizedOwners.length === 0) {
                return (
                  <div className="wizard-empty-state">
                    {t("contract.notes.no_authorized_owner") || "لا يوجد مالك مفوض محدد"}
                  </div>
                );
              }

              return (
                <div>
                  {authorizedOwners.map((o, i) => {
                    const originalIndex = ownersArray.findIndex(owner =>
                      owner.id_number === o.id_number && owner.owner_name_ar === o.owner_name_ar
                    );

                    return (
                      <div key={o.id || o.id_number || i} style={{ marginBottom: i < authorizedOwners.length - 1 ? "24px" : "0" }}>
                        {authorizedOwners.length > 1 && (
                          <div className="owner-block__label" style={{ marginBottom: "10px", fontWeight: 600, fontSize: "0.85rem", opacity: 0.7 }}>
                            {t("owner")} {i + 1}
                          </div>
                        )}
                        <div className="form-grid cols-2 wizard-gap-4">
                          <Field label={t("owner_name_ar")}>
                            {viewMode ? (
                              <div className="wizard-view-value">{o.owner_name_ar || t("empty_value")}</div>
                            ) : (
                              <input className="input input--readonly" readOnly value={o.owner_name_ar || ""} />
                            )}
                          </Field>
                          <Field label={t("owner_name_en")}>
                            {viewMode ? (
                              <div className="wizard-view-value">{o.owner_name_en || t("empty_value")}</div>
                            ) : (
                              <input
                                className="input"
                                type="text"
                                value={o.owner_name_en || ""}
                                onChange={(e) => {
                                  const arr = Array.isArray(form.owners) ? form.owners : [];
                                  const updated = [...arr];
                                  if (originalIndex !== -1) {
                                    updated[originalIndex] = { ...updated[originalIndex], owner_name_en: e.target.value };
                                    setF("owners", updated);
                                  }
                                }}
                                placeholder={t("owner_name_en_placeholder")}
                              />
                            )}
                          </Field>
                          <Field label={t("id_number")}>
                            {viewMode ? (
                              <div className="wizard-view-value">{o.id_number || t("empty_value")}</div>
                            ) : (
                              <input className="input input--readonly" readOnly value={o.id_number || ""} />
                            )}
                          </Field>
                          <div></div>
                          <Field label={t("phone")}>
                            {viewMode ? (
                              <div className="wizard-view-value">{o.phone || t("empty_value")}</div>
                            ) : (
                              <>
                                <PhoneInput
                                  value={(o.phone || "").replace("+971", "")}
                                  onChange={(val) => {
                                    const formatted = val ? `+971${val}` : "";
                                    const arr = Array.isArray(form.owners) ? form.owners : [];
                                    const updated = [...arr];
                                    if (originalIndex !== -1) {
                                      updated[originalIndex] = { ...updated[originalIndex], phone: formatted };
                                      setF("owners", updated);
                                    }
                                    checkOwnerPhone(o.id || originalIndex, formatted);
                                  }}
                                  excludeType="owner"
                                  excludeId={o.id || ""}
                                />
                                {ownerPhoneErrors[o.id || originalIndex] && (
                                  <div className="wizard-field-error wizard-field-error--duplicate">{ownerPhoneErrors[o.id || originalIndex]}</div>
                                )}
                              </>
                            )}
                          </Field>
                          <Field label={t("email")}>
                            {viewMode ? (
                              <div className="wizard-view-value">{o.email || t("empty_value")}</div>
                            ) : (
                              <UniqueFieldInput
                                fieldType="email"
                                value={o.email || ""}
                                onChange={(val) => {
                                  const arr = Array.isArray(form.owners) ? form.owners : [];
                                  const updated = [...arr];
                                  if (originalIndex !== -1) {
                                    updated[originalIndex] = { ...updated[originalIndex], email: val };
                                    setF("owners", updated);
                                  }
                                }}
                                excludeType="owner"
                                excludeId={o.id || ""}
                                placeholder={t("email_placeholder") || "Email@example.com"}
                              />
                            )}
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>

        {/* Second party - Contractor - hidden when noPermit */}
        {!noPermit && (
          <div className="wizard-funding-card">
            <h5 className="wizard-funding-card__title">
              {t("contract.fields.second_party_contractor") || "الطرف الثاني (المقاول)"}
            </h5>
            <div className="form-grid cols-2 wizard-gap-4">
              <Field label={t("owner_name_ar")}>
                <input className="input input--readonly" readOnly value={form.contractor_name || ""} />
              </Field>
              <Field label={t("owner_name_en")}>
                <input className="input input--readonly" readOnly value={form.contractor_name_en || ""} />
              </Field>
              <Field label={t("contractor_lic")}>
                <input className="input input--readonly" readOnly value={form.contractor_trade_license || ""} />
              </Field>
              <div></div>
              <Field label={t("phone")}>
                <PhoneInput
                  value={(form.contractor_phone || "").replace("+971", "")}
                  onChange={() => {}}
                  disabled
                />
              </Field>
              <Field label={t("email")}>
                <input className="input input--readonly" readOnly value={form.contractor_email || ""} />
              </Field>
            </div>
            {!form.contractor_name && !form.contractor_name_en && (
              <p style={{ fontSize: "0.78rem", color: "var(--accent)", marginTop: 8, opacity: 0.8 }}>
                {t("contractor_not_configured")}
              </p>
            )}
          </div>
        )}
      </FormGrid>
    </FormSection>
  );
}
