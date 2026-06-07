import { useState } from "react";
import { useLanguage } from "../../../../hooks";

// ─── per-language label map ────────────────────────────────────────────────────
const LABELS = {
  ar: {
    sectionTitle:   "بنود العقد",
    panelA:         "أ) البنود العامة",
    panelB:         "ب) التعريفات",
    panelC:         "ج) البنود المرقمة",
    addClause:      "إضافة بند عام",
    addDefinition:  "إضافة تعريف",
    addSubClause:   "إضافة فقرة",
    addSection:     "إضافة بند رئيسي",
    termPh:         "المصطلح",
    definitionPh:   "التعريف...",
    emptyGeneral:   "لا توجد بنود عامة.",
    emptyDefs:      "لا توجد تعريفات.",
    emptySections:  "لا توجد بنود مرقمة.",
    remove:         "حذف",
    sectionLabel:   "البند",
    sectionTitlePh: (n) => `عنوان البند ${n}...`,
    clausePh:       (n) => `نص البند ${n}...`,
    subClausePh:    (s, j) => `نص الفقرة ${s}.${j}...`,
  },
  en: {
    sectionTitle:   "Contract Clauses",
    panelA:         "A) General Clauses",
    panelB:         "B) Definitions",
    panelC:         "C) Numbered Sections",
    addClause:      "Add General Clause",
    addDefinition:  "Add Definition",
    addSubClause:   "Add Sub-clause",
    addSection:     "Add Main Section",
    termPh:         "Term",
    definitionPh:   "Definition...",
    emptyGeneral:   "No general clauses.",
    emptyDefs:      "No definitions.",
    emptySections:  "No numbered sections.",
    remove:         "Remove",
    sectionLabel:   "Section",
    sectionTitlePh: (n) => `Section ${n} title...`,
    clausePh:       (n) => `Clause ${n} text...`,
    subClausePh:    (s, j) => `Sub-clause ${s}.${j} text...`,
  },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function emptyClause()  { return { text: "" }; }
function emptyDef()     { return { term: "", definition: "" }; }
function emptySection() { return { title: "", sub_clauses: [emptyClause()] }; }

// ─── shared primitives ────────────────────────────────────────────────────────
function PanelHeader({ title, count, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "10px 0",
        textAlign: "right",
        direction: "rtl",
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary, #111827)" }}>
        {title}
        {count > 0 && (
          <span style={{
            marginInlineStart: 8,
            background: "var(--color-primary-50, #eff6ff)",
            color: "var(--color-primary-600, #2563eb)",
            borderRadius: 99,
            padding: "1px 8px",
            fontSize: 11,
            fontWeight: 600,
          }}>{count}</span>
        )}
      </span>
      <span style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7280)", marginInlineEnd: 4 }}>
        {open ? "▲" : "▼"}
      </span>
    </button>
  );
}

function AddButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        padding: "6px 14px",
        borderRadius: 6,
        border: "1.5px dashed var(--color-border, #d1d5db)",
        background: "var(--color-surface-subtle, #f9fafb)",
        color: "var(--color-text-secondary, #6b7280)",
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
      {label}
    </button>
  );
}

function RemoveButton({ title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        flexShrink: 0,
        width: 26,
        height: 26,
        borderRadius: "50%",
        border: "none",
        background: "var(--color-error-50, #fef2f2)",
        color: "var(--color-error-500, #ef4444)",
        cursor: "pointer",
        fontSize: 14,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
      }}
    >×</button>
  );
}

function NumberBadge({ n }) {
  return (
    <span style={{
      flexShrink: 0,
      width: 24,
      height: 24,
      borderRadius: "50%",
      background: "var(--color-surface-subtle, #f3f4f6)",
      color: "var(--color-text-secondary, #6b7280)",
      fontSize: 12,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>{n}</span>
  );
}

// ─── Panel A: General Clauses ─────────────────────────────────────────────────
function GeneralClausesPanel({ clauses, onChange, viewMode, L }) {
  const [open, setOpen] = useState(true);

  const add    = () => onChange([...clauses, emptyClause()]);
  const remove = (i) => onChange(clauses.filter((_, idx) => idx !== i));
  const update = (i, text) => onChange(clauses.map((c, idx) => idx === i ? { ...c, text } : c));

  return (
    <div style={{ borderBottom: "1px solid var(--color-border, #e5e7eb)", paddingBottom: 12, marginBottom: 12 }}>
      <PanelHeader title={L.panelA} count={clauses.length} open={open} onToggle={() => setOpen(v => !v)} />
      {open && (
        <div style={{ paddingTop: 8, direction: "rtl" }}>
          {clauses.length === 0 && viewMode && (
            <p style={{ color: "var(--color-text-muted, #9ca3af)", fontSize: 13 }}>{L.emptyGeneral}</p>
          )}
          {clauses.map((clause, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <NumberBadge n={i + 1} />
              <textarea
                dir="rtl"
                lang="ar"
                rows={2}
                className="input"
                style={{ flex: 1, resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
                placeholder={L.clausePh(i + 1)}
                value={clause.text}
                readOnly={viewMode}
                onChange={e => update(i, e.target.value)}
              />
              {!viewMode && <RemoveButton title={L.remove} onClick={() => remove(i)} />}
            </div>
          ))}
          {!viewMode && <AddButton label={L.addClause} onClick={add} />}
        </div>
      )}
    </div>
  );
}

// ─── Panel B: Definitions ─────────────────────────────────────────────────────
function DefinitionsPanel({ definitions, onChange, viewMode, L }) {
  const [open, setOpen] = useState(false);

  const add    = () => onChange([...definitions, emptyDef()]);
  const remove = (i) => onChange(definitions.filter((_, idx) => idx !== i));
  const update = (i, field, value) =>
    onChange(definitions.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  return (
    <div style={{ borderBottom: "1px solid var(--color-border, #e5e7eb)", paddingBottom: 12, marginBottom: 12 }}>
      <PanelHeader title={L.panelB} count={definitions.length} open={open} onToggle={() => setOpen(v => !v)} />
      {open && (
        <div style={{ paddingTop: 8, direction: "rtl" }}>
          {definitions.length === 0 && viewMode && (
            <p style={{ color: "var(--color-text-muted, #9ca3af)", fontSize: 13 }}>{L.emptyDefs}</p>
          )}
          {definitions.map((def, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
              <NumberBadge n={i + 1} />
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <input
                  dir="rtl"
                  lang="ar"
                  type="text"
                  className="input"
                  style={{ fontFamily: "inherit", fontSize: 13 }}
                  placeholder={L.termPh}
                  value={def.term}
                  readOnly={viewMode}
                  onChange={e => update(i, "term", e.target.value)}
                />
                <textarea
                  dir="rtl"
                  lang="ar"
                  rows={2}
                  className="input"
                  style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
                  placeholder={L.definitionPh}
                  value={def.definition}
                  readOnly={viewMode}
                  onChange={e => update(i, "definition", e.target.value)}
                />
              </div>
              {!viewMode && <RemoveButton title={L.remove} onClick={() => remove(i)} />}
            </div>
          ))}
          {!viewMode && <AddButton label={L.addDefinition} onClick={add} />}
        </div>
      )}
    </div>
  );
}

// ─── Panel C: Numbered Sections ───────────────────────────────────────────────
function SectionItem({ section, sectionIndex, onChange, onRemove, viewMode, L }) {
  const [open, setOpen] = useState(true);

  const updateTitle = (title) => onChange({ ...section, title });
  const addSub      = () => onChange({ ...section, sub_clauses: [...section.sub_clauses, emptyClause()] });
  const removeSub   = (i) => onChange({ ...section, sub_clauses: section.sub_clauses.filter((_, idx) => idx !== i) });
  const updateSub   = (i, text) => onChange({
    ...section,
    sub_clauses: section.sub_clauses.map((s, idx) => idx === i ? { ...s, text } : s),
  });

  const sn = sectionIndex + 1;

  return (
    <div style={{ border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
      {/* Section header row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: "var(--color-surface-subtle, #f9fafb)",
        borderBottom: open ? "1px solid var(--color-border, #e5e7eb)" : "none",
        direction: "rtl",
      }}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-text-secondary, #6b7280)", padding: 0 }}
        >
          {open ? "▲" : "▼"}
        </button>
        <span style={{ fontWeight: 700, fontSize: 13, flexShrink: 0, color: "var(--color-text-secondary, #6b7280)", whiteSpace: "nowrap" }}>
          {L.sectionLabel} {sn}
        </span>
        <input
          dir="rtl"
          lang="ar"
          type="text"
          className="input"
          style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}
          placeholder={L.sectionTitlePh(sn)}
          value={section.title}
          readOnly={viewMode}
          onChange={e => updateTitle(e.target.value)}
        />
        {!viewMode && <RemoveButton title={L.remove} onClick={onRemove} />}
      </div>

      {/* Sub-clauses */}
      {open && (
        <div style={{ padding: "10px 12px", direction: "rtl" }}>
          {section.sub_clauses.map((sub, j) => (
            <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <span style={{ flexShrink: 0, fontSize: 12, color: "var(--color-text-muted, #9ca3af)", paddingTop: 8, minWidth: 28, textAlign: "center" }}>
                {sn}.{j + 1}
              </span>
              <textarea
                dir="rtl"
                lang="ar"
                rows={2}
                className="input"
                style={{ flex: 1, resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
                placeholder={L.subClausePh(sn, j + 1)}
                value={sub.text}
                readOnly={viewMode}
                onChange={e => updateSub(j, e.target.value)}
              />
              {!viewMode && <RemoveButton title={L.remove} onClick={() => removeSub(j)} />}
            </div>
          ))}
          {!viewMode && <AddButton label={L.addSubClause} onClick={addSub} />}
        </div>
      )}
    </div>
  );
}

function NumberedSectionsPanel({ sections, onChange, viewMode, L }) {
  const [open, setOpen] = useState(false);

  const add    = () => onChange([...sections, emptySection()]);
  const remove = (i) => onChange(sections.filter((_, idx) => idx !== i));
  const update = (i, updated) => onChange(sections.map((s, idx) => idx === i ? updated : s));

  return (
    <div style={{ direction: "rtl" }}>
      <PanelHeader title={L.panelC} count={sections.length} open={open} onToggle={() => setOpen(v => !v)} />
      {open && (
        <div style={{ paddingTop: 8 }}>
          {sections.length === 0 && viewMode && (
            <p style={{ color: "var(--color-text-muted, #9ca3af)", fontSize: 13 }}>{L.emptySections}</p>
          )}
          {sections.map((section, i) => (
            <SectionItem
              key={i}
              section={section}
              sectionIndex={i}
              onChange={updated => update(i, updated)}
              onRemove={() => remove(i)}
              viewMode={viewMode}
              L={L}
            />
          ))}
          {!viewMode && <AddButton label={L.addSection} onClick={add} />}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ContractClausesSection({ form, setF, viewMode }) {
  const { isArabic } = useLanguage();
  const L = isArabic ? LABELS.ar : LABELS.en;

  return (
    <div className="wizard-section">
      <div className="wizard-section__header">
        <h4 className="wizard-section__title">{`7) ${L.sectionTitle}`}</h4>
      </div>
      <div className="wizard-section-card">
        <div className="wizard-section-card__body">

          <GeneralClausesPanel
            clauses={Array.isArray(form.general_clauses) ? form.general_clauses : []}
            onChange={val => setF("general_clauses", val)}
            viewMode={viewMode}
            L={L}
          />

          <DefinitionsPanel
            definitions={Array.isArray(form.definitions) ? form.definitions : []}
            onChange={val => setF("definitions", val)}
            viewMode={viewMode}
            L={L}
          />

          <NumberedSectionsPanel
            sections={Array.isArray(form.contract_sections) ? form.contract_sections : []}
            onChange={val => setF("contract_sections", val)}
            viewMode={viewMode}
            L={L}
          />

        </div>
      </div>
    </div>
  );
}
