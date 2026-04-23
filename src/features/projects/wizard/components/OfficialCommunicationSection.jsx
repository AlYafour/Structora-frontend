import { useTranslation } from "react-i18next";
import { FormSection, FormGrid, FormViewField } from "../../../../components/ui/form";
import Field from "../../../../components/forms/Field";
import PhoneInput from "../../../../components/forms/PhoneInput";
import UniqueFieldInput from "../../../../components/forms/UniqueFieldInput";
import "./wizard.css";
import { useLanguage } from "../../../../hooks";


/**
 * OfficialCommunicationSection — Official communication method per contract.
 *
 * Stores:
 *   owner:      { name (selected from owners), emails: string[] }
 *   consultant: { contacts: [{ name, email, phone }, ...] }
 */
export default function OfficialCommunicationSection({ form, setF, viewMode }) {
  const { t } = useTranslation();
  const { isArabic: isAR } = useLanguage();
  const comm = form.official_communication || {};
  const ownerComm = comm.owner || {};
  const consultantComm = comm.consultant || {};

  const updateComm = (section, updates) => {
    const prev = form.official_communication || {};
    const sectionData = prev[section] || {};
    setF("official_communication", {
      ...prev,
      [section]: { ...sectionData, ...updates },
    });
  };

  // Get owners list from form for the dropdown
  const owners = Array.isArray(form.owners) ? form.owners : [];

  // Get authorized person data
  const authorizedPerson = form.authorized_person || {};

  // Build unified person options: owners + authorized person (if exists)
  const personOptions = [
  ...owners.map((o, i) => ({
    key: `owner_${i}`,
    name: isAR
      ? o.owner_name_ar || o.owner_name_en || `${t("entity_types.owner")} ${i + 1}`
      : o.owner_name_en || o.owner_name_ar || `${t("entity_types.owner")} ${i + 1}`,
    email: o.email || "",
    id: o.id || o._id || "",
    type: "owner",
  })),
  ...(authorizedPerson.name || authorizedPerson.name_en
    ? [
        {
          key: "authorized",
          name: isAR
            ? authorizedPerson.name || authorizedPerson.name_en
            : authorizedPerson.name_en || authorizedPerson.name,
          email: authorizedPerson.email || "",
          id: authorizedPerson.id || authorizedPerson._id || "",
          type: "authorized_person",
        },
      ]
    : []),
];

  // Owner emails as array
  const ownerEmails = Array.isArray(ownerComm.emails) ? ownerComm.emails : [""];

  const addOwnerEmail = () => {
    updateComm("owner", { emails: [...ownerEmails, ""] });
  };

  const updateOwnerEmail = (idx, value) => {
    const next = [...ownerEmails];
    next[idx] = value;
    updateComm("owner", { emails: next });
  };

  const removeOwnerEmail = (idx) => {
    const next = ownerEmails.filter((_, i) => i !== idx);
    updateComm("owner", { emails: next.length ? next : [""] });
  };

  // Consultant company name (shared across all contacts)
  const consultantCompanyName = consultantComm.company_name || "";

  // Consultant contacts as array
  // Backwards compat: if old format { name, email }, migrate to contacts array
  const getConsultantContacts = () => {
    if (Array.isArray(consultantComm.contacts) && consultantComm.contacts.length > 0) {
      return consultantComm.contacts;
    }
    if (consultantComm.name || consultantComm.email) {
      return [
        {
          name: consultantComm.name || "",
          email: consultantComm.email || "",
          phone: "",
          position: "",
          id: consultantComm.id || consultantComm._id || "",
        },
      ];
    }
    return [{ name: "", email: "", phone: "", position: "", id: "" }];
  };

  const consultantContacts = getConsultantContacts();

  const updateConsultantContact = (idx, field, value) => {
    const next = [...consultantContacts];
    next[idx] = { ...next[idx], [field]: value };
    updateComm("consultant", { contacts: next });
  };

  const addConsultantContact = () => {
    updateComm("consultant", {
      contacts: [...consultantContacts, { name: "", email: "", phone: "", position: "", id: "" }],
    });
  };

  const removeConsultantContact = (idx) => {
    const next = consultantContacts.filter((_, i) => i !== idx);
    updateComm("consultant", {
      contacts: next.length ? next : [{ name: "", email: "", phone: "", position: "", id: "" }],
    });
  };

  if (viewMode) {
    return (
      <FormSection title={`5) ${t("contract.sections.official_communication")}`}>
        <div className="wizard-comm-parties">
          <div className="wizard-comm-party">
            <h5 className="wizard-comm-party__title">{t("contract.comm_party_representative")}</h5>
            <FormGrid cols={1}>
              <FormViewField label={t("contract.comm_owner_name")} value={ownerComm.name} />
              {Array.isArray(ownerComm.emails) &&
                ownerComm.emails.filter(Boolean).map((email, i) => (
                  <FormViewField key={i} label={`${t("email")} ${i + 1}`} value={email} />
                ))}
            </FormGrid>
          </div>

          <div className="wizard-comm-party">
            <h5 className="wizard-comm-party__title">{t("consultant")}</h5>
            {consultantCompanyName && (
              <FormGrid cols={1}>
                <FormViewField label={t("contract.comm_consultant_company")} value={consultantCompanyName} />
              </FormGrid>
            )}
            {consultantContacts.filter((c) => c.name || c.email || c.phone).map((contact, i) => (
              <div key={i} className={`wizard-comm-contact-view${i > 0 ? " ds-mt-3" : ""}`}>
                {consultantContacts.filter((c) => c.name || c.email || c.phone).length > 1 && (
                  <div className="wizard-comm-contact-view__num">{i + 1}</div>
                )}
                <FormGrid cols={4}>
                  <FormViewField label={t("contract.comm_consultant_name")} value={contact.name} />
                  <FormViewField label={t("contract.comm_consultant_position")} value={contact.position} />
                  <FormViewField label={t("email")} value={contact.email} />
                  <FormViewField label={t("phone")} value={contact.phone} />
                </FormGrid>
              </div>
            ))}
          </div>
        </div>
      </FormSection>
    );
  }

  return (
    <FormSection title={t("contract.sections.official_communication")}>
      <div className="wizard-comm-parties">
        <div className="wizard-comm-party">
          <h5 className="wizard-comm-party__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {t("contract.comm_party_representative")}
          </h5>

          <Field label={t("contract.comm_select_person")}>
            <select
              className="input"
              value={ownerComm.name || ""}
              onChange={(e) => {
                const selectedName = e.target.value;
                const person = personOptions.find((p) => p.name === selectedName);
                const existingExtra = ownerEmails.filter((em, i) => i > 0 && em);
                const emails = person?.email ? [person.email, ...existingExtra] : selectedName ? ownerEmails : [""];
                updateComm("owner", { name: selectedName, emails });
              }}
            >
              <option value="">{t("contract.comm_select_owner_or_authorized")}</option>
              {personOptions.map((p) => (
                <option key={p.key} value={p.name}>
                  {p.name}{" "}
                  {p.type === "authorized_person"
                    ? `(${t("contract.signer_authorized_person")})`
                    : `(${t("entity_types.owner")})`}
                </option>
              ))}
            </select>
          </Field>

          <div className="wizard-comm-emails ds-mt-3">
            <label className="field-label">{t("contract.comm_owner_emails")}</label>

            {ownerEmails.map((email, idx) => {
              const selectedPerson = personOptions.find((p) => p.name === ownerComm.name);

              return (
                <div key={idx} style={{ marginBottom: 10 }}>
                  <div className="wizard-comm-email-row">
                    <div style={{ flex: 1 }}>
                      <UniqueFieldInput
                        fieldType="email"
                        value={email}
                        onChange={(val) => updateOwnerEmail(idx, val)}
                        excludeType={selectedPerson?.type || ""}
                        excludeId={selectedPerson?.id || ""}
                        className="input"
                        placeholder={t("email_placeholder") || "Email@example.com"}
                        dir="ltr"
                      />
                    </div>

                    {ownerEmails.length > 1 && (
                      <button
                        type="button"
                        className="wizard-comm-email-remove"
                        onClick={() => removeOwnerEmail(idx)}
                        title={t("remove")}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <button type="button" className="wizard-comm-email-add" onClick={addOwnerEmail}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t("contract.comm_add_email")}
            </button>
          </div>
        </div>

        <div className="wizard-comm-party">
          <h5 className="wizard-comm-party__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {t("consultant")}
          </h5>

          {consultantCompanyName && (
            <div className="wizard-comm-company-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>{consultantCompanyName}</span>
            </div>
          )}

          <div className="wizard-comm-contacts">
            {consultantContacts.map((contact, idx) => (
              <div key={idx} className="wizard-comm-contact-card">
                {consultantContacts.length > 1 && (
                  <div className="wizard-comm-contact-card__header">
                    <span className="wizard-comm-contact-card__num">
                      {t("contract.comm_consultant_person")} {idx + 1}
                    </span>
                    <button
                      type="button"
                      className="wizard-comm-email-remove"
                      onClick={() => removeConsultantContact(idx)}
                      title={t("remove")}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}

                <FormGrid cols={2}>
                  <Field label={t("contract.comm_consultant_name")}>
                    <input
                      className="input"
                      value={contact.name || ""}
                      onChange={(e) => updateConsultantContact(idx, "name", e.target.value)}
                      placeholder={t("contract.comm_consultant_name_placeholder")}
                    />
                  </Field>

                  <Field label={t("contract.comm_consultant_position")}>
                    <input
                      className="input"
                      value={contact.position || ""}
                      onChange={(e) => updateConsultantContact(idx, "position", e.target.value)}
                      placeholder={t("contract.comm_consultant_position_placeholder")}
                    />
                  </Field>

                  <Field label={t("email")}>
                    <UniqueFieldInput
                      fieldType="email"
                      value={contact.email || ""}
                      onChange={(val) => updateConsultantContact(idx, "email", val)}
                      excludeType="consultant"
                      excludeId={contact.id || ""}
                      className="input"
                      placeholder={t("email_placeholder") || "Email@example.com"}
                      dir="ltr"
                    />
                  </Field>
                </FormGrid>

                <Field label={t("phone")} style={{ marginTop: 10 }}>
                  <PhoneInput
                    value={(contact.phone || "").replace(/^\+971/, "")}
                    onChange={(val) => {
                      const formatted = val ? `+971${val}` : "";
                      updateConsultantContact(idx, "phone", formatted);
                    }}
                    excludeType="consultant"
                  />
                </Field>
              </div>
            ))}

            <button type="button" className="wizard-comm-email-add" onClick={addConsultantContact}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t("contract.comm_add_consultant_person")}
            </button>
          </div>
        </div>
      </div>
    </FormSection>
  );
}