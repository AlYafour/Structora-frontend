import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiSearch, FiZap, FiBookmark, FiTrash2 } from "react-icons/fi";
import "./ProjectTypeSelector.css";
import WizardShell from "./WizardShell";
import StepActions from "./StepActions";
import api from "../../../../services/api";

/* ═══════════ STATIC SUB-COMPONENTS ═══════════ */

function PhaseLabel({ num, done, label }) {
  return (
    <div className="pts-phase-label">
      <div className={`pts-phase-num${done ? " pts-phase-num--done" : ""}`}>
        {done ? <FiCheck size={11} /> : num}
      </div>
      <span className="pts-phase-title">{label}</span>
      <div className="pts-phase-line" />
    </div>
  );
}

function ChoiceCard({ emoji, label, desc, selected, onClick }) {
  return (
    <div
      className={`pts-choice${selected ? " pts-choice--sel" : ""}`}
      role="radio" aria-checked={selected} tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    >
      <div className="pts-choice__check"><FiCheck size={12} /></div>
      <div className="pts-choice__icon"><span style={{ fontSize: "1.4rem" }}>{emoji}</span></div>
      <div className="pts-choice__label">{label}</div>
      {desc && <div className="pts-choice__desc">{desc}</div>}
    </div>
  );
}

function TileCard({ emoji, label, selected, onClick }) {
  return (
    <div
      className={`pts-tile${selected ? " pts-tile--sel" : ""}`}
      role="radio" aria-checked={selected} tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    >
      <div className="pts-tile__check"><FiCheck size={10} /></div>
      <div className="pts-tile__icon"><span className="pts-tile__emoji">{emoji}</span></div>
      <div className="pts-tile__label">{label}</div>
    </div>
  );
}

function GiItem({ label, checked, onToggle }) {
  return (
    <div
      className={`pts-gi${checked ? " pts-gi--on" : ""}`}
      role="checkbox" aria-checked={checked} tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
    >
      <div className="pts-gi__box">{checked && <FiCheck size={9} />}</div>
      <span className="pts-gi__label">{label}</span>
    </div>
  );
}

function CountRow({ count, onClear }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 2px" }}>
      <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
        {isAr ? "المحدد:" : "Selected:"} <span style={{ color: "var(--accent)", fontWeight: 800 }}>{count}</span>
      </span>
      {count > 0 && (
        <span style={{ fontSize: "0.58rem", color: "var(--error,#E85D56)", cursor: "pointer", fontWeight: 600 }} onClick={onClear}>{isAr ? "مسح" : "Clear"}</span>
      )}
    </div>
  );
}

function highlightMatch(text, q) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(200,168,78,0.35)", color: "var(--accent)", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function SearchBarWidget({ id, placeholder, srVal, setSrVal, results, isVisible, onOpen, onClose, onSelect, isAr }) {
  const vis = isVisible && results.length > 0;

  return (
    <div className="pts-sr" style={{ position: "relative", marginBottom: 7 }}>
      <span
        style={{
          position: "absolute",
          top: "50%",
          [isAr ? "right" : "left"]: 25,
          transform: "translateY(-50%)",
          color: "var(--muted)",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <FiSearch size={13} />
      </span>

      <input
        type="text"
        placeholder={placeholder}
        value={srVal}
        onChange={e => { setSrVal(e.target.value); onOpen(); }}
        onFocus={onOpen}
        onBlur={onClose}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: isAr ? "7px 32px 7px 28px" : "7px 28px 7px 32px",
          borderRadius: "var(--radius,10px)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--ink)",
          fontFamily: "inherit",
          fontSize: "0.68rem",
          outline: "none"
        }}
        dir={isAr ? "rtl" : "ltr"}
      />

      {srVal && (
        <span
          style={{
            position: "absolute",
            top: "50%",
            [isAr ? "left" : "right"]: 22,
            transform: "translateY(-50%)",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: "0.7rem",
            lineHeight: 1
          }}
          onMouseDown={e => { e.preventDefault(); setSrVal(""); }}
        >
          ✕
        </span>
      )}

      {vis && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            left: 0,
            zIndex: 50,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius,10px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            maxHeight: 280,
            overflowY: "auto",
            marginTop: 2
          }}
        >
          <div style={{ padding: "4px 10px", fontSize: "0.58rem", color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
            {results.length} {isAr ? "نتيجة" : "results"}
          </div>

          {results.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 10px",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.66rem",
                color: r.sel ? "var(--accent)" : "var(--ink)",
                background: r.sel ? "rgba(200,168,78,0.06)" : "transparent"
              }}
              onMouseDown={e => { e.preventDefault(); onSelect(r); }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: `2px solid ${r.sel ? "var(--accent)" : "var(--border)"}`,
                  background: r.sel ? "var(--accent)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {r.sel && <FiCheck size={8} color="var(--bg,#040A14)" />}
              </div>

              <div style={{ flex: 1 }}>
                {r.p && <div style={{ fontSize: "0.55rem", color: "var(--muted)" }}>{r.p}</div>}
                <div style={{ fontWeight: 600 }}>{highlightMatch(r.n, srVal)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupAccordion({
  groups,
  list,
  setList,
  pfx,
  grpOpen,
  setGrpOpen,
  onToggleAll,
  isAr = false
}) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return <div className="pts-empty-message">No items available</div>;
  }

  return (
    <div>
      {groups.map((g, i) => {
        if (!g || !Array.isArray(g.items)) return null;

        const key = `${pfx}_${i}`;
        const selCount = g.items.filter(x => list.includes(x)).length;
        const allSel = selCount === g.items.length;
        const someSel = selCount > 0 && !allSel;
        const isOpen = grpOpen[key] || selCount > 0;

        return (
          <div key={key} className={`pts-grp${isOpen ? " pts-grp--open" : ""}`}>
            <div
              className="pts-grp__header"
              dir={isAr ? "rtl" : "ltr"}
              onClick={() => setGrpOpen(v => ({ ...v, [key]: !isOpen }))}
            >
              <span
                style={{
                  fontSize: "0.45rem",
                  color: "var(--muted)",
                  transition: "transform 0.25s",
                  transform: isOpen ? "rotate(90deg)" : "none",
                  width: 10
                }}
              >
                ◀
              </span>

              <div
                className={`pts-grp__checkbox${allSel ? " pts-grp__checkbox--all" : someSel ? " pts-grp__checkbox--some" : ""}`}
                onClick={e => {
                  e.stopPropagation();
                  onToggleAll(groups, list, setList, i);
                }}
              >
                {(allSel || someSel) && <FiCheck size={8} />}
              </div>

              <span className="pts-grp__name">{g.g || g.n || "Unnamed Group"}</span>
              <span className="pts-grp__count">{selCount}/{g.items.length}</span>
            </div>

            <div
              className="pts-grp__body"
              style={{ maxHeight: isOpen ? 2000 : 0, overflow: "hidden", transition: "max-height 0.3s" }}
            >
              <div className="pts-grp__items">
                {g.items.map(x => (
                  <GiItem
                    key={x}
                    label={x}
                    checked={list.includes(x)}
                    onToggle={() =>
                      setList(prev => prev.includes(x) ? prev.filter(v => v !== x) : [...prev, x])
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WkAccordion({
  isMnt,
  list,
  setList,
  pfxKey,
  grpOpen,
  setGrpOpen,
  srFilter,
  onToggleAllWk,
  isAr = false
}) {
  const { t } = useTranslation();

  const getWorkTypes = () => {
    const workTypes = [];
    const wkKeys = [
      "structural",
      "architectural",
      "basicFinishing",
      "luxuryFinishing",
      "facades",
      "electrical",
      "mechanical",
      "special",
      "external",
      "renovation",
      "additional"
    ];

    wkKeys.forEach(key => {
      const label = t(`workTypes.${key}`, key);
      const items = t(`workTypes.${key}Items`, { returnObjects: true }) || [];
      workTypes.push({ n: label, it: items });
    });

    return workTypes;
  };

  const WK = getWorkTypes();

  return (
    <div>
      {WK.map((g, i) => {
        const key = `${pfxKey}_${i}`;
        const allItems = g.it.map(x => (isMnt ? `${t("projectType.extraMnt")} ${x}` : x));
        const items = srFilter
          ? allItems.filter(x => x.toLowerCase().includes(srFilter.toLowerCase()))
          : allItems;

        if (items.length === 0) return null;

        const selCount = items.filter(x => list.includes(x)).length;
        const allSel = selCount === items.length;
        const someSel = selCount > 0 && !allSel;
        const isOpen = srFilter ? true : (grpOpen[key] || selCount > 0);
        const gName = isMnt ? g.n.replace("أعمال", t("projectType.extraMnt")) : g.n;

        return (
          <div key={key} className={`pts-grp${isOpen ? " pts-grp--open" : ""}`}>
            <div
              className="pts-grp__header"
              dir={isAr ? "rtl" : "ltr"}
              onClick={() => setGrpOpen(v => ({ ...v, [key]: !isOpen }))}
            >
              <span
                style={{
                  fontSize: "0.45rem",
                  color: "var(--muted)",
                  transition: "transform 0.25s",
                  transform: isOpen ? "rotate(90deg)" : "none",
                  width: 10
                }}
              >
                ◀
              </span>

              <div
                className={`pts-grp__checkbox${allSel ? " pts-grp__checkbox--all" : someSel ? " pts-grp__checkbox--some" : ""}`}
                onClick={e => {
                  e.stopPropagation();
                  onToggleAllWk(i, isMnt, items, list, setList);
                }}
              >
                {(allSel || someSel) && <FiCheck size={8} />}
              </div>

              <span className="pts-grp__name">{gName}</span>
              <span className="pts-grp__count">{selCount}/{items.length}</span>
            </div>

            <div
              className="pts-grp__body"
              style={{ maxHeight: isOpen ? 2000 : 0, overflow: "hidden", transition: "max-height 0.3s" }}
            >
              <div className="pts-grp__items">
                {items.map(x => (
                  <GiItem
                    key={x}
                    label={x}
                    checked={list.includes(x)}
                    onToggle={() =>
                      setList(prev => prev.includes(x) ? prev.filter(v => v !== x) : [...prev, x])
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function ProjectTypeSelector({ onSelect, onChange, onNext: onNextProp, initialData, isView = false, projectId = null, isNewProject = true }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");

  // Get building types from translations
  const TY = useMemo(() => {
    const keys = [
      { i: "🏠", k: "residential" },
      { i: "🏢", k: "commercial" },
      { i: "🏭", k: "industrial" },
      { i: "🏛️", k: "government" },
      { i: "🏥", k: "health" },
      { i: "🕌", k: "religious" },
      { i: "🌿", k: "agricultural" },
      { i: "🛣️", k: "infrastructure" },
    ];
    return keys.map(k => ({ ...k, n: t(`buildingTypes.${k.k}`) }));
  }, [t]);

  // Get maintenance contracts from translations
  const MC = useMemo(() => [
    { i: "🔄", n: t("maintenanceContracts.periodic"), k: "periodic", d: t("maintenanceContracts.periodicDesc") },
    { i: "📌", n: t("maintenanceContracts.ondemand"), k: "ondemand", d: t("maintenanceContracts.ondemandDesc") },
  ], [t]);

  // Get sub-classifications
  const getSubClassifications = useCallback((buildingKey) => {
    if (buildingKey === "infrastructure") {
      return [
        { g: t("infrastructureSubClassifications.transportation"), items: t("infrastructureSubClassifications.transportationItems", { returnObjects: true }) },
        { g: t("infrastructureSubClassifications.waterNetworks"), items: t("infrastructureSubClassifications.waterNetworksItems", { returnObjects: true }) },
        { g: t("infrastructureSubClassifications.waterPlants"), items: t("infrastructureSubClassifications.waterPlantsItems", { returnObjects: true }) },
        { g: t("infrastructureSubClassifications.electricity"), items: t("infrastructureSubClassifications.electricityItems", { returnObjects: true }) },
        { g: t("infrastructureSubClassifications.communications"), items: t("infrastructureSubClassifications.communicationsItems", { returnObjects: true }) },
        { g: t("infrastructureSubClassifications.earthworks"), items: t("infrastructureSubClassifications.earthworksItems", { returnObjects: true }) },
        { g: t("infrastructureSubClassifications.marine"), items: t("infrastructureSubClassifications.marineItems", { returnObjects: true }) },
        { g: t("infrastructureSubClassifications.general"), items: t("infrastructureSubClassifications.generalItems", { returnObjects: true }) },
      ];
    }
    const items = t(`subClassifications.${buildingKey}`, { returnObjects: true });
    return items ? [{ g: "", items }] : [];
  }, [t]);

  const getSubItems = useCallback((buildingKey) => {
    if (buildingKey === "infrastructure") {
      return [];
    }
    return t(`subClassifications.${buildingKey}`, { returnObjects: true }) || [];
  }, [t]);

  // Get building parts from translations
 // Fix the getBuildingParts function - add complete data structure
const getBuildingParts = useCallback((buildingKey) => {
  // Return default empty array if no building key
  if (!buildingKey) return [];
  
  // Complete building parts data structure
  const partsData = {
    residential: [
      { g: t("buildingParts.residential.internalSpaces", "Internal Spaces"), items: t("buildingParts.residential.internalSpacesItems", { returnObjects: true }) || ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Dining Room"] },
      { g: t("buildingParts.residential.operationalSpaces", "Operational Spaces"), items: t("buildingParts.residential.operationalSpacesItems", { returnObjects: true }) || ["Storage", "Laundry", "Staff Room"] },
      { g: t("buildingParts.residential.levels", "Levels/Units"), items: t("buildingParts.residential.levelsItems", { returnObjects: true }) || ["Ground Floor", "First Floor", "Basement"] },
      { g: t("buildingParts.residential.technicalRooms", "Technical Rooms"), items: t("buildingParts.residential.technicalRoomsItems", { returnObjects: true }) || ["Electrical Room", "Mechanical Room", "Server Room"] },
      { g: t("buildingParts.residential.externalElements", "External Elements"), items: t("buildingParts.residential.externalElementsItems", { returnObjects: true }) || ["Garden", "Parking", "Fence", "Swimming Pool"] },
    ],
    commercial: [
      { g: t("buildingParts.commercial.internalSpaces", "Internal Spaces"), items: t("buildingParts.commercial.internalSpacesItems", { returnObjects: true }) || ["Reception", "Offices", "Meeting Rooms", "Restrooms"] },
      { g: t("buildingParts.commercial.operationalSpaces", "Operational Spaces"), items: t("buildingParts.commercial.operationalSpacesItems", { returnObjects: true }) || ["Storage", "Loading Dock", "Waste Management"] },
      { g: t("buildingParts.commercial.levels", "Levels/Units"), items: t("buildingParts.commercial.levelsItems", { returnObjects: true }) || ["Ground Floor", "Upper Floors", "Basement Parking"] },
      { g: t("buildingParts.commercial.technicalRooms", "Technical Rooms"), items: t("buildingParts.commercial.technicalRoomsItems", { returnObjects: true }) || ["HVAC Room", "Electrical Room", "Fire Control Room"] },
      { g: t("buildingParts.commercial.externalElements", "External Elements"), items: t("buildingParts.commercial.externalElementsItems", { returnObjects: true }) || ["Parking Lot", "Signage", "Landscaping"] },
    ],
    industrial: [
      { g: "Production Areas", items: ["Factory Floor", "Assembly Line", "Quality Control", "Packaging Area"] },
      { g: "Storage Areas", items: ["Raw Materials Warehouse", "Finished Goods Storage", "Cold Storage"] },
      { g: "Support Areas", items: ["Maintenance Workshop", "Tool Room", "Staff Facilities", "Canteen"] },
      { g: "Technical Rooms", items: ["Electrical Room", "Compressor Room", "Control Room", "Generator Room"] },
      { g: "External Areas", items: ["Loading Docks", "Truck Parking", "Security Gate", "Waste Area"] },
    ],
    government: [
      { g: "Public Areas", items: ["Lobby", "Waiting Areas", "Public Counters", "Information Desk"] },
      { g: "Administrative Areas", items: ["Offices", "Meeting Rooms", "Conference Hall", "Records Room"] },
      { g: "Service Areas", items: ["Restrooms", "Prayer Room", "Cafeteria", "First Aid"] },
      { g: "Technical Rooms", items: ["Server Room", "Electrical Room", "Security Control", "Archive"] },
      { g: "External Areas", items: ["Parking", "Plaza", "Landscaping", "Security Booths"] },
    ],
    health: [
      { g: "Patient Areas", items: ["Waiting Areas", "Examination Rooms", "Patient Rooms", "ICU", "Operating Theaters"] },
      { g: "Clinical Areas", items: ["Laboratory", "Pharmacy", "Radiology", "Treatment Rooms"] },
      { g: "Administrative Areas", items: ["Reception", "Offices", "Records Room", "Staff Lounge"] },
      { g: "Service Areas", items: ["Sterilization", "Laundry", "Kitchen", "Medical Gas Room"] },
      { g: "Technical Rooms", items: ["Electrical Room", "Generator Room", "HVAC Room", "Waste Management"] },
    ],
    religious: [
      { g: "Worship Areas", items: ["Prayer Hall", "Ablution Area", "Imam Room", "Women's Section"] },
      { g: "Educational Areas", items: ["Quran Study Rooms", "Classrooms", "Library"] },
      { g: "Service Areas", items: ["Restrooms", "Storage", "Kitchen", "Event Hall"] },
      { g: "Technical Rooms", items: ["Electrical Room", "Sound System Room", "Storage"] },
      { g: "External Areas", items: ["Courtyard", "Parking", "Minaret", "Landscaping"] },
    ],
    agricultural: [
      { g: "Agricultural Areas", items: ["Greenhouses", "Open Fields", "Irrigation Systems", "Storage Sheds"] },
      { g: "Animal Areas", items: ["Barns", "Stables", "Poultry Houses", "Veterinary Clinic"] },
      { g: "Processing Areas", items: ["Packing House", "Cold Storage", "Processing Facility"] },
      { g: "Support Areas", items: ["Workshop", "Staff Housing", "Office", "Canteen"] },
      { g: "Technical Rooms", items: ["Pump Room", "Generator Room", "Control Room"] },
    ],
    infrastructure: [
      { g: "Roads & Transportation", items: ["Roads", "Bridges", "Tunnels", "Intersections", "Parking Areas"] },
      { g: "Utility Networks", items: ["Water Networks", "Sewage Systems", "Electrical Networks", "Communication Networks"] },
      { g: "Treatment Facilities", items: ["Water Treatment Plant", "Sewage Treatment Plant", "Pump Stations"] },
      { g: "Protection Systems", items: ["Flood Protection", "Retaining Walls", "Drainage Systems"] },
      { g: "General Infrastructure", items: ["Landscaping", "Lighting", "Signage", "Security Systems"] },
    ],
  };
  
  // Return the parts for the specific building type, or an empty array if not found
  const parts = partsData[buildingKey] || [];
  
  // Ensure each part has an items array
  return parts.map(part => ({
    ...part,
    items: Array.isArray(part.items) ? part.items : []
  }));
}, [t]);

  /* ── UI strings ── */
  const UI = {
    pageTitle: t("projectType.pageTitle"),
    pageSub: t("projectType.pageSub"),
    favsHeader: t("projectType.favsHeader"),
    favDelete: t("projectType.favDelete"),
    aiLabel: t("projectType.aiLabel"),
    aiPlaceholder: t("projectType.aiPlaceholder"),
    aiDone: t("projectType.aiDone"),
    aiSuccess: t("projectType.aiSuccess"),
    aiError: t("projectType.aiError"),
    permitYes: t("projectType.permitYes"),
    permitYesDesc: t("projectType.permitYesDesc"),
    permitNo: t("projectType.permitNo"),
    permitNoDesc: t("projectType.permitNoDesc"),
    catLabel: t("projectType.catLabel"),
    catConstruction: t("projectType.catConstruction"),
    catConDesc: t("projectType.catConDesc"),
    catMaintenance: t("projectType.catMaintenance"),
    catMntDesc: t("projectType.catMntDesc"),
    catRenovation: t("projectType.catRenovation"),
    catRenDesc: t("projectType.catRenDesc"),
    catFitout: t("projectType.catFitout"),
    catFitDesc: t("projectType.catFitDesc"),
    buildingLabel: t("projectType.buildingLabel"),
    subClassLabel: t("projectType.subClassLabel"),
    subClassInfra: t("projectType.subClassInfra"),
    extraWorksTitle: t("projectType.extraWorksTitle"),
    yes: t("projectType.yes"),
    no: t("projectType.no"),
    extraMnt: t("projectType.extraMnt"),
    extraRen: t("projectType.extraRen"),
    extraFit: t("projectType.extraFit"),
    constractLabel: t("projectType.contractLabel"),
    scopeMnt: t("projectType.scopeMnt"),
    scopeRen: t("projectType.scopeRen"),
    scopeFit: t("projectType.scopeFit"),
    scopeFullMnt: t("projectType.scopeFullMnt"),
    scopeFullMntDesc: t("projectType.scopeFullMntDesc"),
    scopePartMnt: t("projectType.scopePartMnt"),
    scopePartDesc: t("projectType.scopePartDesc"),
    scopeFullRen: t("projectType.scopeFullRen"),
    scopeFullRenDesc: t("projectType.scopeFullRenDesc"),
    scopePartRen: t("projectType.scopePartRen"),
    scopeFullFit: t("projectType.scopeFullFit"),
    scopeFullFitDesc: t("projectType.scopeFullFitDesc"),
    scopePartFit: t("projectType.scopePartFit"),
    partsLabel: t("projectType.partsLabel"),
    worksLabel: t("projectType.worksLabel"),
    searchCats: t("projectType.searchCats"),
    searchBuildings: t("projectType.searchBuildings"),
    searchSubs: t("projectType.searchSubs"),
    searchParts: t("projectType.searchParts"),
    searchWorks: t("projectType.searchWorks"),
    searchGeneric: t("projectType.searchGeneric"),
    selectedCount: t("projectType.selectedCount"),
    clear: t("projectType.clear"),
    results: t("projectType.results"),
    summaryTitle: t("projectType.summaryTitle"),
    saveFav: t("projectType.saveFav"),
    favSaved: t("projectType.favSaved"),
    continueBtn: t("projectType.continueBtn"),
    permitWithLabel: t("projectType.permitWithLabel"),
    permitNoLabel: t("projectType.permitNoLabel"),
    mcPeriodic: t("projectType.mcPeriodic"),
    mcOnDemand: t("projectType.mcOnDemand"),
    scopeFull: t("projectType.scopeFull"),
    scopePartial: t("projectType.scopePartial"),
    constrTabs: {
      maintenance: t("projectType.constrTabs.maintenance"),
      renovation: t("projectType.constrTabs.renovation"),
      fitout: t("projectType.constrTabs.fitout"),
      construction: t("projectType.constrTabs.construction")
    },
    constrTabMain: t("projectType.constrTabs.construction"),
  };

  /* ── State ── */
  const [p, setP] = useState(null);
  const [c, setC] = useState(null);
  const [b, setB] = useState(null);
  const [cs, setCs] = useState([]);
  const [sc, setSc] = useState(null);
  const [pt, setPt] = useState([]);
  const [wk, setWk] = useState([]);
  const [mc, setMc] = useState(null);
  const [ex, setEx] = useState([]);
  const [hasExtraWorks, setHasExtraWorks] = useState(null);
  const [activeTrack, setActiveTrack] = useState("construction");
  const [extraTracks, setExtraTracks] = useState({});
  
  const EMPTY_TRACK = { b: null, cs: [], mc: null, sc: null, pt: [], wk: [] };
  const setTrack = useCallback((key, patch) => {
    setExtraTracks(prev => ({ ...prev, [key]: { ...(prev[key] || EMPTY_TRACK), ...patch } }));
  }, []);
  const resetTrack = useCallback((key) => {
    setExtraTracks(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  /* ── Favorites ── */
  const FAVS_KEY = "wizard_classification_favorites_v1";
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVS_KEY) || "[]"); } catch { return []; }
  });
  const [favSaved, setFavSaved] = useState(false);
  const [pendingNext, setPendingNext] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /* ── Search states ── */
  const [srS1, setSrS1] = useState("");
  const [srS2, setSrS2] = useState("");
  const [srS3, setSrS3] = useState("");
  const [srS4, setSrS4] = useState("");
  const [srS5, setSrS5] = useState("");
  const [srS6, setSrS6] = useState("");
  const [srS7, setSrS7] = useState("");
  const [srS8, setSrS8] = useState("");
  const [srS9, setSrS9] = useState("");
  const [srDropVis, setSrDropVis] = useState({});

  /* ── Accordion open state ── */
  const [grpOpen, setGrpOpen] = useState({});

  /* ── AI chat state ── */
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDone, setAiDone] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);
  const aiInputRef = useRef(null);
  const aiChatRef = useRef(null);

  // Helper functions
  const getBuildingName = useCallback((buildingKey) => {
    return t(`buildingTypes.${buildingKey}`, buildingKey);
  }, [t]);

  const getCategoryLabel = useCallback((catKey) => {
    const labels = {
      construction: UI.catConstruction,
      maintenance: UI.catMaintenance,
      renovation: UI.catRenovation,
      fitout: UI.catFitout
    };
    return labels[catKey] || catKey;
  }, [UI]);

  // Reset helpers
  const resetFromPermit = () => { setC(null); setB(null); setCs([]); setSc(null); setPt([]); setWk([]); setMc(null); setEx([]); setHasExtraWorks(null); setExtraTracks({}); setActiveTrack("construction"); setGrpOpen({}); };
  const resetFromCategory = () => { setB(null); setCs([]); setSc(null); setPt([]); setWk([]); setMc(null); setEx([]); setHasExtraWorks(null); setExtraTracks({}); setActiveTrack("construction"); setGrpOpen({}); };
  const resetFromBuilding = () => { setCs([]); setSc(null); setPt([]); setWk([]); setMc(null); setEx([]); setHasExtraWorks(null); setExtraTracks({}); setActiveTrack("construction"); setGrpOpen({}); };
  const resetFromMc = () => { setSc(null); setPt([]); setWk([]); };
  const resetFromScope = () => { setPt([]); setWk([]); };

  const handleToggleExWork = useCallback((key) => {
    setEx(prev => {
      const isRemoving = prev.includes(key);
      const next = isRemoving ? prev.filter(x => x !== key) : [...prev, key];
      if (isRemoving) {
        resetTrack(key);
        setActiveTrack("construction");
      } else {
        setActiveTrack(key);
      }
      return next;
    });
  }, [resetTrack]);

  const tg = useCallback((list, setList, val) => {
    setList(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }, []);

  const toggleGrpAll = useCallback((groups, list, setList, idx) => {
    const g = groups[idx];
    if (!g) return;
    const allIn = g.items.every(x => list.includes(x));
    if (allIn) setList(prev => prev.filter(x => !g.items.includes(x)));
    else setList(prev => [...prev, ...g.items.filter(x => !prev.includes(x))]);
  }, []);

  const toggleWkGrpAll = useCallback((idx, isMnt, items, lst, setLst) => {
    const allIn = items.every(x => lst.includes(x));
    if (allIn) setLst(prev => prev.filter(x => !items.includes(x)));
    else setLst(prev => [...prev, ...items.filter(x => !prev.includes(x))]);
  }, []);

  /* ── isReady logic ── */
  const isReady = useMemo(() => {
    if (c === "construction" && b && cs.length > 0) return true;
    if (c !== "construction" && c && b && cs.length > 0 && sc) {
      if (sc === "full" && wk.length > 0) {
        if (c === "maintenance" && !mc) return false;
        return true;
      }
      if (sc === "partial" && pt.length > 0 && wk.length > 0) {
        if (c === "maintenance" && !mc) return false;
        return true;
      }
    }
    return false;
  }, [c, b, cs, sc, pt, wk, mc]);

  // Save favorite
  const saveFavorite = useCallback(() => {
    if (!isReady) return;
    const buildingLabel = getBuildingName(b);
    const conTrack = {
      category: getCategoryLabel(c),
      building: buildingLabel,
      subs: cs, 
      mc: mc ? (mc === "periodic" ? UI.mcPeriodic : UI.mcOnDemand) : "", 
      sc: sc ? (sc === "full" ? UI.scopeFull : UI.scopePartial) : "", 
      parts: pt, works: wk,
      permit: p === "true" ? UI.permitWithLabel : UI.permitNoLabel,
    };
    
    const EX_META = { maintenance: { icon:"🔧", label: UI.extraMnt }, renovation: { icon:"🔄", label: UI.extraRen }, fitout: { icon:"🎨", label: UI.extraFit } };
    
    const exDisplayTracks = {};
    ex.forEach(key => {
      const t = extraTracks[key] || {};
      const effB = t.b ?? (key === "maintenance" ? b : null);
      const effCs = (t.cs?.length > 0) ? t.cs : (key === "maintenance" ? cs : []);
      if (effB) {
        exDisplayTracks[key] = {
          icon: EX_META[key]?.icon || "", label: EX_META[key]?.label || key,
          building: getBuildingName(effB),
          subs: effCs, 
          mc: t.mc ? (t.mc === "periodic" ? UI.mcPeriodic : UI.mcOnDemand) : "", 
          sc: t.sc ? (t.sc === "full" ? UI.scopeFull : UI.scopePartial) : "", 
          parts: t.pt || [], works: t.wk || [],
        };
      }
    });
    
    const exLabels = ex.map(k => EX_META[k] ? `+ ${EX_META[k].label}` : k);
    const label = [conTrack.category, buildingLabel, ...cs.slice(0,2), ...exLabels].filter(Boolean).join(" · ");
    const entry = {
      id: Date.now(), label, conTrack, exDisplayTracks,
      data: { p, c, b, cs, sc, pt, wk, mc, ex, extraTracks },
    };
    setFavorites(prev => {
      const next = [entry, ...prev].slice(0, 10);
      try { localStorage.setItem(FAVS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setFavSaved(true);
    setTimeout(() => setFavSaved(false), 2000);
  }, [isReady, p, c, b, cs, sc, pt, wk, mc, ex, extraTracks, getBuildingName, getCategoryLabel, UI]);

  const deleteFavorite = useCallback((id) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.id !== id);
      try { localStorage.setItem(FAVS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // AI functions
  const applyAiResult = useCallback(async (data) => {
    setC(null); setB(null); setCs([]); setSc(null); setPt([]); setWk([]); setMc(null); setEx([]);
    const delay = ms => new Promise(r => setTimeout(r, ms));
    if (data.category) { setC(data.category); await delay(300); }
    if (data.b || data.constructionType) { setB(data.b || data.constructionType); await delay(300); }
    if (data.cs?.length) setCs(data.cs);
    else if (data.subs?.length) setCs(data.subs);
    if (data.mc) setMc(data.mc);
    if (data.sc) setSc(data.sc);
    if (data.pt?.length) setPt(data.pt);
    if (data.wk?.length) setWk(data.wk);
    setAiDone(true);
    setTimeout(() => setAiDone(false), 3000);
  }, []);

  const sendAiMessage = useCallback(async (text) => {
    if (!text?.trim() || aiLoading) return;
    const q = text.trim();
    setAiError(""); setAiDone(false); setAiLoading(true);
    setAiMessages(prev => [...prev, { role: "user", content: q }]);
    setAiQuery("");
    try {
      const newHistory = [...aiHistory, { role: "user", content: q }];
      const { data } = await api.post("/ai/classify-project/", { query: q, permit: p, history: aiHistory });
      if (data.type === "question") {
        setAiMessages(prev => [...prev, { role: "assistant", content: data.message, options: data.options }]);
        setAiHistory([...newHistory, { role: "assistant", content: JSON.stringify(data) }]);
      } else {
        const successMsg = UI.aiSuccess;
        setAiMessages(prev => [...prev, { role: "assistant", content: successMsg, isResult: true }]);
        setAiHistory([...newHistory, { role: "assistant", content: JSON.stringify(data) }]);
        await applyAiResult(data);
      }
    } catch (err) {
      setAiError(err.response?.data?.error || UI.aiError);
    } finally {
      setAiLoading(false);
      setTimeout(() => aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: "smooth" }), 100);
    }
  }, [aiLoading, p, aiHistory, applyAiResult, UI]);

  const handleAiSubmit = useCallback(() => sendAiMessage(aiQuery), [aiQuery, sendAiMessage]);
  const handleAiOption = useCallback(opt => sendAiMessage(opt.value), [sendAiMessage]);

  // Handle next
  const handleNext = useCallback(async () => {
    if (!isReady || isSaving) return;
    const typeMap = { residential:"villa", commercial:"villa", industrial:"industrial", government:"governmental", health:"governmental", religious:"governmental", agricultural:"agricultural", infrastructure:"governmental" };
    let projectType = "", contractType = "", projectCategoryCode = "", maintenanceTypeCode = "";
    if (c === "construction") {
      projectType = typeMap[b] || "villa"; contractType = "new"; projectCategoryCode = "CON";
    } else if (c === "fitout") {
      projectType = "fitout"; contractType = "fitout"; projectCategoryCode = "FIT";
    } else if (c === "maintenance") {
      projectType = "maintenance"; contractType = "maintenance"; projectCategoryCode = "MNT";
      maintenanceTypeCode = mc === "periodic" ? "AM" : mc === "ondemand" ? "SM" : "";
    } else if (c === "renovation") {
      projectType = "fitout"; contractType = "fitout"; projectCategoryCode = "REN";
    }
    const classificationData = {
      projectType, contractType, requiresPermit: p, projectCategory: c,
      constructionType: b, subClassifications: cs,
      maintenanceContract: mc, scope: sc, parts: pt, workTypes: wk, extraWorks: ex,
      extraTracks,
    };

    // Save to backend when editing an existing project
    if (!isNewProject && projectId) {
      try {
        setSaveError("");
        setIsSaving(true);
        await api.patch(`projects/${projectId}/`, {
          project_type: projectType,
          contract_type: contractType,
          project_category: projectCategoryCode,
          maintenance_type: maintenanceTypeCode,
          classification_data: classificationData,
        });
      } catch (err) {
        const msg = err?.response?.data
          ? Object.values(err.response.data).flat().join(" ")
          : "Save failed";
        setSaveError(msg);
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    if (onChange) {
      onChange(prev => ({
        ...prev, projectType, contractType,
        projectCategory: projectCategoryCode, maintenanceType: maintenanceTypeCode,
        contractYear: prev.contractYear || new Date().getFullYear(),
        _classification: classificationData,
      }));
      if (onNextProp) onNextProp();
    } else if (onSelect) {
      onSelect(projectType, classificationData);
    }
  }, [isReady, isSaving, isNewProject, projectId, p, c, b, cs, sc, pt, wk, mc, ex, extraTracks, onChange, onNextProp, onSelect]);

  useEffect(() => {
    if (pendingNext && isReady) {
      setPendingNext(false);
      handleNext();
    }
  }, [pendingNext, isReady, handleNext]);

  const applyFavorite = useCallback((fav) => {
    const d = fav.data;
    setP(d.p ?? null);
    setC(d.c ?? null);
    setB(d.b ?? null);
    setCs(d.cs ?? []);
    setSc(d.sc ?? null);
    setPt(d.pt ?? []);
    setWk(d.wk ?? []);
    setMc(d.mc ?? null);
    setEx(d.ex ?? []);
    if (d.extraTracks) {
      setExtraTracks(d.extraTracks);
    } else if (d.extraMaintenanceDetails) {
      const emd = d.extraMaintenanceDetails;
      setExtraTracks({ maintenance: { b: emd.buildingType ?? null, cs: emd.subClassifications ?? [], mc: emd.maintenanceContract ?? null, sc: emd.scope ?? null, pt: emd.parts ?? [], wk: emd.workTypes ?? [] } });
    } else {
      setExtraTracks({});
    }
    setActiveTrack("construction");
    setPendingNext(true);
  }, []);

  // Restore from initialData
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!initialData || restoredRef.current) return;
    restoredRef.current = true;
    const d = initialData;
    const permitVal = d.requiresPermit ?? d.p ?? null;
    const catVal = d.projectCategory ?? d.c ?? null;
    const bVal = d.constructionType ?? d.b ?? null;
    const csVal = d.subClassifications ?? d.cs ?? [];
    const scVal = d.scope ?? d.sc ?? null;
    const ptVal = d.parts ?? d.pt ?? [];
    const wkVal = d.workTypes ?? d.wk ?? [];
    const mcVal = d.maintenanceContract ?? d.mc ?? null;
    const exVal = d.extraWorks ?? d.ex ?? [];
    const etVal = d.extraTracks ?? {};
    setP(permitVal);
    setC(catVal);
    setB(bVal);
    setCs(csVal);
    setSc(scVal);
    setPt(ptVal);
    setWk(wkVal);
    setMc(mcVal);
    setEx(exVal);
    setExtraTracks(etVal);
    if (exVal.length > 0) setHasExtraWorks(true);
    setActiveTrack("construction");
  }, [initialData]);

  // Search helpers
  const matchQ = (text, q) => q ? text.toLowerCase().includes(q.toLowerCase()) : true;

  const getSearchResults = (id, q) => {
    if (!q) return [];
    const results = [];
    if (id === "s1") {
      [
        { n: UI.catConstruction, k: "construction" }, 
        { n: UI.catMaintenance, k: "maintenance" },
        { n: UI.catRenovation, k: "renovation" }, 
        { n: UI.catFitout, k: "fitout" },
      ].forEach(x => { if (matchQ(x.n, q)) results.push({ p: isAr ? "فئة" : "Category", n: x.n, k: x.k, type: "cat" }); });
    } else if (id === "s2" || id === "s6") {
      TY.forEach(t => { if (matchQ(t.n, q)) results.push({ p: isAr ? "المبنى" : "Building", n: t.n, k: t.k, type: "ty" }); });
    } else if (id === "s3" || id === "s7") {
      const currentB = (id === "s7" && activeTrack !== "construction") ? (extraTracks[activeTrack]?.b || b) : b;
      const src = currentB === "infrastructure"
        ? getSubClassifications(currentB).flatMap(g => g.items.map(x => ({ p: g.g, n: x })))
        : (getSubItems(currentB) || []).map(x => ({ p: "", n: x }));
      const currentCs = (id === "s7" && activeTrack !== "construction") ? (extraTracks[activeTrack]?.cs || []) : cs;
      src.forEach(x => { if (matchQ(x.n, q)) results.push({ p: x.p, n: x.n, sel: currentCs.includes(x.n), type: "cs" }); });
    } else if (id === "s4" || id === "s8") {
      const currentB = (id === "s8" && activeTrack !== "construction") ? (extraTracks[activeTrack]?.b || b) : b;
      const currentPt = (id === "s8" && activeTrack !== "construction") ? (extraTracks[activeTrack]?.pt || []) : pt;
      const parts = getBuildingParts(currentB);
      parts.forEach(g => g.items.forEach(x => {
        if (matchQ(x, q)) results.push({ p: g.g, n: x, sel: currentPt.includes(x), type: "pt" });
      }));
    } else if (id === "s5" || id === "s9") {
      const isMnt = (id === "s9" && activeTrack !== "construction") ? (activeTrack === "maintenance") : (c === "maintenance");
      const currentWk = (id === "s9" && activeTrack !== "construction") ? (extraTracks[activeTrack]?.wk || []) : wk;
      const wkKeys = ["structural", "architectural", "basicFinishing", "luxuryFinishing", "facades", "electrical", "mechanical", "special", "external", "renovation", "additional"];
      wkKeys.forEach(key => {
        const items = t(`workTypes.${key}Items`, { returnObjects: true }) || [];
        items.forEach(x => {
          const lb = isMnt ? `${UI.extraMnt} ${x}` : x;
          if (matchQ(lb, q)) results.push({ p: t(`workTypes.${key}`, key), n: lb, sel: currentWk.includes(lb), type: "wk" });
        });
      });
    }
    return results.slice(0, 20);
  };

  const handleSearchSelect = (id, result) => {
    if (result.type === "cat") {
      setC(result.k); resetFromCategory();
      setSrS1(""); setSrDropVis(v => ({ ...v, [id]: false }));
    } else if (result.type === "ty") {
      if (id === "s6" && activeTrack !== "construction") {
        setTrack(activeTrack, { b: result.k, cs: [], mc: null, sc: null, pt: [], wk: [] });
      } else {
        setB(result.k); resetFromBuilding();
      }
      setSrS2(""); setSrDropVis(v => ({ ...v, [id]: false }));
    } else if (result.type === "cs") {
      if (id === "s7" && activeTrack !== "construction") {
        const currentCs = extraTracks[activeTrack]?.cs || [];
        const newCs = currentCs.includes(result.n) ? currentCs.filter(i => i !== result.n) : [...currentCs, result.n];
        setTrack(activeTrack, { cs: newCs });
      } else {
        tg(cs, setCs, result.n);
      }
    } else if (result.type === "pt") {
      if (id === "s8" && activeTrack !== "construction") {
        const currentPt = extraTracks[activeTrack]?.pt || [];
        const newPt = currentPt.includes(result.n) ? currentPt.filter(i => i !== result.n) : [...currentPt, result.n];
        setTrack(activeTrack, { pt: newPt });
      } else {
        tg(pt, setPt, result.n);
      }
    } else if (result.type === "wk") {
      if (id === "s9" && activeTrack !== "construction") {
        const currentWk = extraTracks[activeTrack]?.wk || [];
        const newWk = currentWk.includes(result.n) ? currentWk.filter(i => i !== result.n) : [...currentWk, result.n];
        setTrack(activeTrack, { wk: newWk });
      } else {
        tg(wk, setWk, result.n);
      }
    }
  };

  const renderSearchBar = (id, placeholder, srVal, setSrVal) => (
    <SearchBarWidget
      key={id}
      id={id}
      placeholder={placeholder}
      srVal={srVal}
      setSrVal={setSrVal}
      results={getSearchResults(id, srVal)}
      isVisible={!!(srDropVis[id] && srVal)}
      onOpen={() => setSrDropVis(v => ({ ...v, [id]: true }))}
      onClose={() => setTimeout(() => setSrDropVis(v => ({ ...v, [id]: false })), 300)}
      onSelect={(r) => handleSearchSelect(id, r)}
      isAr={isAr}
    />
  );

  // Phase counter
  let phaseNum = 0;
  const nextPhase = () => { phaseNum++; return phaseNum; };

  // Scope options
  const scopeOptions = c === "maintenance"
    ? [{ i: "🏢", n: UI.scopeFullMnt, k: "full", d: UI.scopeFullMntDesc }, { i: "📐", n: UI.scopePartMnt, k: "partial", d: UI.scopePartDesc }]
    : c === "renovation"
    ? [{ i: "🏢", n: UI.scopeFullRen, k: "full", d: UI.scopeFullRenDesc }, { i: "📐", n: UI.scopePartRen, k: "partial", d: UI.scopePartDesc }]
    : [{ i: "🏢", n: UI.scopeFullFit, k: "full", d: UI.scopeFullFitDesc }, { i: "📐", n: UI.scopePartFit, k: "partial", d: UI.scopePartDesc }];

  /* ═══════════ RENDER ═══════════ */
  return (
    <WizardShell
      footer={isView ? null : (
        <>
          {saveError && (
            <div style={{ color: "var(--error,#E85D56)", fontSize: "0.75rem", textAlign: "center", padding: "0 1rem 0.5rem" }}>
              {saveError}
            </div>
          )}
          <StepActions
            onNext={handleNext}
            nextDisabled={!isReady || isSaving}
            isLoading={isSaving}
            nextLabel={UI.continueBtn}
          />
        </>
      )}
    >
      <div className={`pts-container${isView ? " pts-container--view" : ""}`} dir={isAr ? "rtl" : "ltr"} style={isView ? { pointerEvents: "none", userSelect: "none" } : undefined}>

        {/* Header */}
        <div className="pts-header">
          <h2 className="pts-header__title">{UI.pageTitle}</h2>
          <p className="pts-header__sub">{UI.pageSub}</p>
        </div>

        {/* Favorites section */}
        {!isView && favorites.length > 0 && (
          <div className="pts-favs">
            <div className="pts-favs__header">
              <FiBookmark size={13} />
              <span>{UI.favsHeader}</span>
            </div>
            <div className="pts-favs__list">
              {favorites.map(fav => {
                const con = fav.conTrack;
                if (!con) return (
                  <div key={fav.id} className="pts-favs__item">
                    <button type="button" className="pts-favs__item-label" onClick={() => applyFavorite(fav)}>{fav.label}</button>
                    <button type="button" className="pts-favs__item-del" onClick={() => deleteFavorite(fav.id)}><FiTrash2 size={12} /></button>
                  </div>
                );
                const exTracks = fav.exDisplayTracks || {};
                return (
                  <div key={fav.id} className="pts-favs__card">
                    <button type="button" className="pts-favs__card-body" onClick={() => applyFavorite(fav)}>
                      <div className="pts-favs__track">
                        <span className="pts-favs__track-title">🏗️ {con.category}</span>
                        <div className="pts-favs__tags">
                          <span className="pts-favs__tag pts-favs__tag--permit">{con.permit}</span>
                          {con.building && <span className="pts-favs__tag">{con.building}</span>}
                          {con.subs?.slice(0, 3).map(x => <span key={x} className="pts-favs__tag pts-favs__tag--sub">{x}</span>)}
                          {con.subs?.length > 3 && <span className="pts-favs__tag pts-favs__tag--more">+{con.subs.length - 3}</span>}
                          {con.mc && <span className="pts-favs__tag pts-favs__tag--mc">{con.mc}</span>}
                          {con.sc && <span className="pts-favs__tag pts-favs__tag--scope">{con.sc}</span>}
                          {con.works?.slice(0, 2).map(x => <span key={x} className="pts-favs__tag pts-favs__tag--wk">{x}</span>)}
                        </div>
                      </div>
                      {Object.values(exTracks).map(t => (
                        <div key={t.label} className="pts-favs__track pts-favs__track--mnt">
                          <span className="pts-favs__track-title">{t.icon} {t.label}</span>
                          <div className="pts-favs__tags">
                            {t.building && <span className="pts-favs__tag">{t.building}</span>}
                            {t.subs?.slice(0, 2).map(x => <span key={x} className="pts-favs__tag pts-favs__tag--sub">{x}</span>)}
                            {t.mc && <span className="pts-favs__tag pts-favs__tag--mc">{t.mc}</span>}
                            {t.sc && <span className="pts-favs__tag pts-favs__tag--scope">{t.sc}</span>}
                          </div>
                        </div>
                      ))}
                    </button>
                    <button type="button" className="pts-favs__item-del" onClick={() => deleteFavorite(fav.id)} title={UI.favDelete}>
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Chat */}
        {!isView && <div className="pts-ai-search">
          <div className="pts-ai-search__label">
            <FiZap size={14} className="pts-ai-search__zap" />
            {UI.aiLabel}
          </div>
          {aiMessages.length > 0 && (
            <div ref={aiChatRef} className="pts-ai-chat">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`pts-ai-msg pts-ai-msg--${msg.role}`}>
                  <div className="pts-ai-msg__content">{msg.content}</div>
                  {msg.options?.length > 0 && (
                    <div className="pts-ai-msg__options">
                      {msg.options.map((opt, j) => (
                        <button key={j} className="pts-ai-opt" onClick={() => handleAiOption(opt)}>{opt.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {aiLoading && <div className="pts-ai-msg pts-ai-msg--assistant"><div className="pts-ai-typing">…</div></div>}
            </div>
          )}
          {aiError && <div className="pts-ai-error">{aiError}</div>}
          {aiDone && <div className="pts-ai-done">{UI.aiDone}</div>}
          <div className="pts-ai-search__bar">
            <input
              ref={aiInputRef}
              type="text"
              className="pts-ai-search__input"
              placeholder={UI.aiPlaceholder}
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAiSubmit(); }}
              disabled={aiLoading}
              dir={isAr ? "rtl" : "ltr"}
            />
            <button
              className="pts-ai-search__btn"
              onClick={handleAiSubmit}
              disabled={aiLoading || !aiQuery.trim()}
            >
              {aiLoading ? "…" : <FiZap size={14} />}
            </button>
          </div>
        </div>}

        {/* Phase 1: Permit */}
        <div className="pts-choices">
          {[
            { i: "🏛️", n: UI.permitYes,  k: "true",  d: UI.permitYesDesc },
            { i: "📋", n: UI.permitNo,   k: "false", d: UI.permitNoDesc },
          ].map(o => (
            <ChoiceCard key={o.k} emoji={o.i} label={o.n} desc={o.d} selected={p === o.k}
              onClick={() => { setP(o.k); resetFromPermit(); }} />
          ))}
        </div>

        {/* Phase 2: Category */}
        {p && (
          <div className="pts-phase-section">
            <PhaseLabel num={nextPhase()} done={c !== null} label={UI.catLabel} />
            {renderSearchBar("s1", UI.searchCats, srS1, setSrS1)}
            <div className="pts-choices">
              {[
                { i: "🏗️", n: UI.catConstruction, k: "construction", d: UI.catConDesc },
                { i: "🔧", n: UI.catMaintenance,  k: "maintenance",  d: UI.catMntDesc },
                { i: "🔄", n: UI.catRenovation,   k: "renovation",   d: UI.catRenDesc },
                { i: "🎨", n: UI.catFitout,        k: "fitout",       d: UI.catFitDesc },
              ].map(o => (
                <ChoiceCard key={o.k} emoji={o.i} label={o.n} desc={o.d}
                  selected={c === o.k}
                  onClick={() => { setC(o.k); resetFromCategory(); }} />
              ))}
            </div>
          </div>
        )}

        {/* Phase 3: Building Type (Construction Track) */}
        {c && activeTrack === "construction" && (
          <div className="pts-phase-section">
            <PhaseLabel num={nextPhase()} done={b !== null} label={UI.buildingLabel} />
            {renderSearchBar("s2", UI.searchBuildings, srS2, setSrS2)}
            <div className="pts-tiles">
              {TY.filter(t => !srS2 || t.n.toLowerCase().includes(srS2.toLowerCase())).map(t => (
                <TileCard key={t.k} emoji={t.i} label={t.n} selected={b === t.k}
                  onClick={() => { setB(t.k); resetFromBuilding(); setSrS2(""); }} />
              ))}
            </div>
          </div>
        )}

        {/* Phase 4: Sub-classifications (Construction Track) */}
        {b && activeTrack === "construction" && (
          <div className="pts-phase-section">
            <PhaseLabel num={nextPhase()} done={cs.length > 0} label={b === "infrastructure" ? UI.subClassInfra : UI.subClassLabel} />
            {renderSearchBar("s3", UI.searchSubs, srS3, setSrS3)}
            <CountRow count={cs.length} onClear={() => setCs([])} />
            {b === "infrastructure" ? (
              <GroupAccordion
  groups={
    srS3
      ? getSubClassifications(b)
          .map(g => ({ ...g, items: g.items.filter(x => x.toLowerCase().includes(srS3.toLowerCase())) }))
          .filter(g => g.items.length > 0)
      : getSubClassifications(b)
  }
  list={cs}
  setList={setCs}
  pfx="ig"
  grpOpen={grpOpen}
  setGrpOpen={setGrpOpen}
  onToggleAll={toggleGrpAll}
  isAr={isAr}
/>
            ) : (
              <div className="pts-cbl">
                {getSubItems(b).filter(x => !srS3 || x.toLowerCase().includes(srS3.toLowerCase())).map(x => (
                  <GiItem key={x} label={x} checked={cs.includes(x)} onToggle={() => tg(cs, setCs, x)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Extra Works Section */}
        {c === "construction" && cs.length > 0 && activeTrack === "construction" && (
          <div className="pts-phase-section">
            <div className="pts-xq">
              <div className="pts-xq__title">{UI.extraWorksTitle}</div>
              <div className="pts-xq__yn" style={{ display: "flex", gap: 8, marginBottom: hasExtraWorks === true ? 12 : 0 }}
              dir={isAr ? "rtl" : "ltr"} >
                <button
                  type="button"
                  onClick={() => setHasExtraWorks(true)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: "var(--radius,10px)",
                    border: `2px solid ${hasExtraWorks === true ? "var(--accent)" : "var(--border)"}`,
                    background: hasExtraWorks === true ? "rgba(200,168,78,0.12)" : "var(--surface)",
                    color: hasExtraWorks === true ? "var(--accent)" : "var(--ink)",
                    fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {UI.yes}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasExtraWorks(false);
                    setEx([]);
                    setExtraTracks({});
                    setActiveTrack("construction");
                  }}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: "var(--radius,10px)",
                    border: `2px solid ${hasExtraWorks === false ? "var(--accent)" : "var(--border)"}`,
                    background: hasExtraWorks === false ? "rgba(200,168,78,0.12)" : "var(--surface)",
                    color: hasExtraWorks === false ? "var(--accent)" : "var(--ink)",
                    fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {UI.no}
                </button>
              </div>
              {hasExtraWorks === true && (
                <div className="pts-xq__options">
                  {[
                    { i: "🔧", n: UI.extraMnt, k: "maintenance" },
                    { i: "🔄", n: UI.extraRen, k: "renovation" },
                    { i: "🎨", n: UI.extraFit, k: "fitout" },
                  ].map(o => (
                    <div key={o.k} className={`pts-xo${ex.includes(o.k) ? " pts-xo--on" : ""}`}
                      onClick={() => handleToggleExWork(o.k)}>
                      <div className="pts-xo__box">{ex.includes(o.k) && <FiCheck size={9} />}</div>
                      <span>{o.i}</span>
                      <span className="pts-xo__label">{o.n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Track Switcher Tabs */}
        {c === "construction" && ex.length > 0 && (
          <div className="pts-phase-section" style={{ paddingBottom: 0 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}
            dir={isAr ? "rtl" : "ltr"}
            >
              {[
                { k: "construction", icon: "🏗️", label: UI.constrTabMain, done: b && cs.length > 0 },
                ...ex.map(k => {
                  const t = extraTracks[k] || {};
                  const effB = t.b ?? (k === "maintenance" ? b : null);
                  const effCs = (t.cs?.length > 0) ? t.cs : (k === "maintenance" ? cs : []);
                  const done = k === "maintenance" ? !!(effB && effCs.length > 0 && t.mc) : !!(t.b && t.cs?.length > 0);
                  return { k, icon: { maintenance:"🔧", renovation:"🔄", fitout:"🎨" }[k], label: UI.constrTabs[k], done };
                }),
              ].map(tab => (
                <button key={tab.k} type="button" onClick={() => setActiveTrack(tab.k)} style={{
                  flex: 1, minWidth: 80, padding: "8px 12px", borderRadius: "var(--radius,10px)",
                  border: `2px solid ${activeTrack === tab.k ? "var(--accent)" : "var(--border)"}`,
                  background: activeTrack === tab.k ? "rgba(200,168,78,0.12)" : "var(--surface)",
                  color: activeTrack === tab.k ? "var(--accent)" : "var(--ink)",
                  fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span>{tab.icon}</span> {tab.label}
                  {tab.done && <FiCheck size={11} style={{ color: "var(--accent)" }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Extra Track: Building Type (Renovation/Fitout) */}
        {c === "construction" && activeTrack !== "construction" && ex.includes(activeTrack) && activeTrack !== "maintenance" && (() => {
          const t = extraTracks[activeTrack] || EMPTY_TRACK;
          return (
            <>
              <div className="pts-phase-section">
                <PhaseLabel num={nextPhase()} done={t.b !== null} label={UI.buildingLabel} />
                {renderSearchBar("s6", UI.searchBuildings, srS6, setSrS6)}
                <div className="pts-tiles">
                  {TY.map(x => (
                    <TileCard key={x.k} emoji={x.i} label={x.n} selected={t.b === x.k}
                      onClick={() => setTrack(activeTrack, { b: x.k, cs: [], mc: null, sc: null, pt: [], wk: [] })} />
                  ))}
                </div>
              </div>

              {t.b && (
                <div className="pts-phase-section">
                  <PhaseLabel num={nextPhase()} done={t.cs.length > 0} label={t.b === "infrastructure" ? UI.subClassInfra : UI.subClassLabel} />
                  {renderSearchBar("s7", UI.searchGeneric, srS7, setSrS7)}
                  <CountRow count={t.cs.length} onClear={() => setTrack(activeTrack, { cs: [], mc: null, sc: null, pt: [], wk: [] })} />
                  {t.b === "infrastructure" ? (
                    <GroupAccordion groups={getSubClassifications(t.b)} list={t.cs}
                      setList={v => setTrack(activeTrack, { cs: typeof v === "function" ? v(t.cs) : v })} pfx={`x${activeTrack}ig`}
                      grpOpen={grpOpen} setGrpOpen={setGrpOpen} onToggleAll={toggleGrpAll} />
                  ) : (
                    <div className="pts-cbl">
                      {getSubItems(t.b).map(x => (
                        <GiItem key={x} label={x} checked={t.cs.includes(x)}
                          onToggle={() => setTrack(activeTrack, { cs: t.cs.includes(x) ? t.cs.filter(i => i !== x) : [...t.cs, x] })} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}

        {/* Extra Track: Maintenance Contract */}
        {c === "construction" && activeTrack === "maintenance" && ex.includes("maintenance") && (() => {
          const t = extraTracks[activeTrack] || EMPTY_TRACK;
          const effectiveB = t.b ?? b;
          const effectiveCs = t.cs?.length > 0 ? t.cs : cs;
          if (!effectiveB || !effectiveCs.length) return null;
          return (
            <>
              <div className="pts-phase-section">
                <PhaseLabel num={nextPhase()} done={t.mc !== null} label={UI.constractLabel} />
                <div className="pts-choices">
                  {MC.map(o => (
                    <ChoiceCard key={o.k} emoji={o.i} label={o.n} desc={o.d} selected={t.mc === o.k}
                      onClick={() => setTrack(activeTrack, { mc: o.k, sc: null, pt: [], wk: [] })} />
                  ))}
                </div>
              </div>

              {t.mc && (
                <div className="pts-phase-section">
                  <PhaseLabel num={nextPhase()} done={t.sc !== null} label={UI.scopeMnt} />
                  <div className="pts-choices">
                    {[{ i:"🏢", n: UI.scopeFullMnt, k:"full", d: UI.scopeFullMntDesc }, { i:"📐", n: UI.scopePartMnt, k:"partial", d: UI.scopePartDesc }].map(o => (
                      <ChoiceCard key={o.k} emoji={o.i} label={o.n} desc={o.d} selected={t.sc === o.k}
                        onClick={() => setTrack(activeTrack, { sc: o.k, pt: [], wk: [] })} />
                    ))}
                  </div>
                </div>
              )}

              {t.mc && t.sc === "partial" && (
                <div className="pts-phase-section">
                  <PhaseLabel num={nextPhase()} done={t.pt.length > 0} label={UI.partsLabel} />
                  {renderSearchBar("s8", UI.searchParts, srS8, setSrS8)}
                  <CountRow count={t.pt.length} onClear={() => setTrack(activeTrack, { pt: [] })} />
                  <GroupAccordion groups={getBuildingParts(effectiveB)} list={t.pt}
                    setList={v => setTrack(activeTrack, { pt: typeof v === "function" ? v(t.pt) : v })} pfx={`x${activeTrack}pg`}
                    grpOpen={grpOpen} setGrpOpen={setGrpOpen} onToggleAll={toggleGrpAll} />
                </div>
              )}

              {t.mc && t.sc && (
                <div className="pts-phase-section">
                  <PhaseLabel num={nextPhase()} done={t.wk.length > 0} label={UI.worksLabel} />
                  {renderSearchBar("s9", UI.searchWorks, srS9, setSrS9)}
                  <CountRow count={t.wk.length} onClear={() => setTrack(activeTrack, { wk: [] })} />
                  <WkAccordion isMnt={true} pfxKey="xwg"
                    list={t.wk}
                    setList={v => setTrack(activeTrack, { wk: typeof v === "function" ? v(t.wk) : v })}
                    grpOpen={grpOpen} setGrpOpen={setGrpOpen} srFilter={srS9}
                    onToggleAllWk={toggleWkGrpAll} />
                </div>
              )}
            </>
          );
        })()}

        {/* Non-construction: Contract Type (Maintenance) */}
        {c === "maintenance" && cs.length > 0 && (
          <div className="pts-phase-section">
            <PhaseLabel num={nextPhase()} done={mc !== null} label={UI.constractLabel} />
            <div className="pts-choices">
              {MC.map(o => (
                <ChoiceCard key={o.k} emoji={o.i} label={o.n} desc={o.d} selected={mc === o.k}
                  onClick={() => { setMc(o.k); resetFromMc(); }} />
              ))}
            </div>
          </div>
        )}

        {/* Non-construction: Scope */}
        {c !== "construction" && cs.length > 0 && (c !== "maintenance" || mc) && (
          <div className="pts-phase-section">
            <PhaseLabel num={nextPhase()} done={sc !== null} label={
              c === "maintenance" ? UI.scopeMnt : c === "renovation" ? UI.scopeRen : UI.scopeFit
            } />
            <div className="pts-choices">
              {scopeOptions.map(o => (
                <ChoiceCard key={o.k} emoji={o.i} label={o.n} desc={o.d} selected={sc === o.k}
                  onClick={() => { setSc(o.k); resetFromScope(); }} />
              ))}
            </div>
          </div>
        )}

        {/* Non-construction: Building Parts (Partial Scope) */}
        {c !== "construction" && sc === "partial" && (
          <div className="pts-phase-section">
            <PhaseLabel num={nextPhase()} done={pt.length > 0} label={UI.partsLabel} />
            {renderSearchBar("s4", UI.searchParts, srS4, setSrS4)}
            <CountRow count={pt.length} onClear={() => setPt([])} />
            <GroupAccordion
              groups={srS4
                ? getBuildingParts(b).map(g => ({ ...g, items: g.items.filter(x => x.toLowerCase().includes(srS4.toLowerCase())) })).filter(g => g.items.length > 0)
                : getBuildingParts(b)}
              list={pt} setList={setPt} pfx="pg"
              grpOpen={grpOpen} setGrpOpen={setGrpOpen} onToggleAll={toggleGrpAll} />
          </div>
        )}

        {/* Non-construction: Work Types */}
        {c !== "construction" && sc && (
          <div className="pts-phase-section">
            <PhaseLabel num={nextPhase()} done={wk.length > 0} label={UI.worksLabel} />
            {renderSearchBar("s5", UI.searchWorks, srS5, setSrS5)}
            <CountRow count={wk.length} onClear={() => setWk([])} />
            <WkAccordion isMnt={c === "maintenance"} pfxKey="wg"
              list={wk} setList={setWk}
              grpOpen={grpOpen} setGrpOpen={setGrpOpen} srFilter={srS5}
              onToggleAllWk={toggleWkGrpAll} />
          </div>
        )}

        {/* Summary Section */}
        {isReady && (
          <div className="pts-summary">
            <div className="pts-summary__header">
              <span className="pts-summary__title">{UI.summaryTitle}</span>
              <button type="button" className={`pts-fav-btn${favSaved ? " pts-fav-btn--saved" : ""}`}
                onClick={saveFavorite} title={UI.saveFav}>
                <FiBookmark size={14} />
                <span>{favSaved ? UI.favSaved : UI.saveFav}</span>
              </button>
            </div>
            <div className="pts-summary__tags">
              <span className="pts-summary__tag pts-summary__tag--permit">
                {p === "true" ? UI.permitWithLabel : UI.permitNoLabel}
              </span>
              {c && <span className="pts-summary__tag">{getCategoryLabel(c)}</span>}
              {b && <span className="pts-summary__tag">{getBuildingName(b)}</span>}
              {cs.slice(0, 3).map(x => <span key={x} className="pts-summary__tag pts-summary__tag--sub">{x}</span>)}
              {cs.length > 3 && <span className="pts-summary__tag pts-summary__tag--more">+{cs.length - 3}</span>}
              {mc && <span className="pts-summary__tag pts-summary__tag--mc">{mc === "periodic" ? UI.mcPeriodic : UI.mcOnDemand}</span>}
              {sc && <span className="pts-summary__tag pts-summary__tag--scope">{sc === "full" ? UI.scopeFull : UI.scopePartial}</span>}
              {pt.slice(0, 2).map(x => <span key={x} className="pts-summary__tag pts-summary__tag--part">{x}</span>)}
              {wk.slice(0, 2).map(x => <span key={x} className="pts-summary__tag pts-summary__tag--wk">{x}</span>)}
              
              {/* Extra Works Summary */}
              {ex.map(key => {
                const t = extraTracks[key] || {};
                const effB = t.b ?? (key === "maintenance" ? b : null);
                const effCs = (t.cs?.length > 0) ? t.cs : (key === "maintenance" ? cs : []);
                if (!effB) return null;
                const exIcons = { maintenance:"🔧", renovation:"🔄", fitout:"🎨" };
                return (
                  <React.Fragment key={key}>
                    <span className="pts-summary__tag pts-summary__tag--ex">{exIcons[key]} {UI.constrTabs[key]}</span>
                    <span className="pts-summary__tag">{getBuildingName(effB)}</span>
                    {effCs.slice(0, 2).map(x => <span key={`${key}-${x}`} className="pts-summary__tag pts-summary__tag--sub">{x}</span>)}
                    {t.mc && <span className="pts-summary__tag pts-summary__tag--mc">{t.mc === "periodic" ? UI.mcPeriodic : UI.mcOnDemand}</span>}
                    {t.sc && <span className="pts-summary__tag pts-summary__tag--scope">{t.sc === "full" ? UI.scopeFull : UI.scopePartial}</span>}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </WizardShell>
  );
}