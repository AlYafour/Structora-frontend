// Unified hook for managing site plan data
import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { toInputDateUnified } from "../../../utils/formatters/date";
import { EMPTY_OWNER, generateOwnerUid } from "../wizard/components/OwnerForm";
import { sqm2ft, ft2sqm } from "../../../utils/calculations/area";

const INITIAL_FORM = {
  application_number: "",
  application_date: "",
  site_plan_file: null,
  municipality: "",
  zone: "",
  sector: "",
  road_name: "",
  plot_area_sqm: "",
  plot_area_sqft: "",
  land_no: "",
  plot_address: "",
  construction_status: "",
  allocation_type: "",
  land_use: "",
  base_district: "",
  overlay_district: "",
  allocation_date: "",
  latitude: "",
  longitude: "",
  project_no: "",
  project_name: "",
  developer_name: "",
  source_of_project: "",
  source_of_project_en: "",
  notes: "",
};

export default function useSitePlan(projectId, setup) {
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    land_use: "",
  });

  const [owners, setOwners] = useState([{ ...EMPTY_OWNER, _uid: generateOwnerUid() }]);
  const [rightHolders, setRightHolders] = useState([]);
  const [existingId, setExistingId] = useState(null);
  const [isView, setIsView] = useState(false);
  const [lock, setLock] = useState(false);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Reset values when opening a new project (projectId = null)
  useEffect(() => {
    if (!projectId) {
      // New project - reset all values to defaults
      setForm({
        ...INITIAL_FORM,
        land_use: "",
      });
      setOwners([{ ...EMPTY_OWNER, _uid: generateOwnerUid() }]);
      setRightHolders([]);
      setExistingId(null);
      setIsView(false);
      setLock(false);
    }
  }, [projectId]); // Only projectId

  // Update land_use when projectType changes for a new project
  useEffect(() => {
    if (!projectId && setup?.projectType) {
      setForm((prev) => ({
        ...prev,
        land_use: "",
      }));
    }
  }, [projectId, setup?.projectType]);

  // Load data from backend
  useEffect(() => {
    if (!projectId) return;

    let mounted = true;

    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);
        if (!mounted) return;

        if (Array.isArray(data) && data.length > 0) {
          const s = data[0];

          setExistingId(s.id);

          // Use known fields only - prevents adding objects like owners and siteplan_snapshot
          setForm({
            application_number: s.application_number || "",
            application_date: toInputDateUnified(s.application_date),
            site_plan_file: null, // Always null when loading
            municipality: s.municipality || "",
            zone: s.zone || "",
            sector: s.sector || "",
            road_name: s.road_name || "",
            plot_area_sqm: s.plot_area_sqm || "",
            plot_area_sqft: s.plot_area_sqft || "",
            land_no: s.land_no || "",
            plot_address: s.plot_address || "",
            construction_status: s.construction_status || "",
            allocation_type: s.allocation_type || "Residential",
            land_use: s.land_use || (""),
            base_district: s.base_district || "",
            overlay_district: s.overlay_district || "",
            allocation_date: toInputDateUnified(s.allocation_date),
            latitude: s.latitude || "",
            longitude: s.longitude || "",
            project_no: s.project_no || "",
            project_name: s.project_name || "",
            developer_name: s.developer_name || "",
            source_of_project: s.source_of_project || "",
            source_of_project_en: s.source_of_project_en || "",
            notes: s.notes || "",
          });

          // ========= Load owners =========
          if (s.owners && Array.isArray(s.owners) && s.owners.length > 0) {
            const loadedOwners = s.owners.map((o, idx, arr) => ({
              ...EMPTY_OWNER,
              ...o,

              _uid: o._uid || generateOwnerUid(), // Stable key for React rendering
              id: o.id, // Very important - must be preserved during updates

              owner_name_ar: o.owner_name_ar || o.owner_name || "",
              owner_name_en: o.owner_name_en || "",
              id_number: o.id_number || "",
              nationality: o.nationality || "",
              phone: o.phone || "",
              email: o.email || "",
              right_hold_type: o.right_hold_type || "Ownership",
              share_possession: o.share_possession || "",

              id_issue_date: toInputDateUnified(o.id_issue_date),
              id_expiry_date: toInputDateUnified(o.id_expiry_date),

              share_percent:
                arr.length === 1 ? "100" : String(o.share_percent ?? 0),

              // Preserve id_attachment as URL string (not File object)
              // This is important - when it's a URL string, the file exists on the server
              id_attachment:
                typeof o.id_attachment === "string" &&
                o.id_attachment.trim() !== ""
                  ? o.id_attachment
                  : null,
            }));


            setOwners(loadedOwners);

            // Notify other steps
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("siteplan-owners-loaded", {
                  detail: { projectId, owners: loadedOwners },
                })
              );
            }
          } else {
            setOwners([{ ...EMPTY_OWNER, _uid: generateOwnerUid() }]);
          }

          // ========= Load right holders =========
          if (s.right_holders && Array.isArray(s.right_holders) && s.right_holders.length > 0) {
            setRightHolders(s.right_holders.map((rh) => ({
              ...rh,
              _uid: `rh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            })));
          } else {
            setRightHolders([]);
          }
        } else {
          setForm({
            ...INITIAL_FORM,
            land_use:
              setup?.projectType === "commercial"
                ? "Investment"
                : "Residential",
          });
          setOwners([{ ...EMPTY_OWNER, _uid: generateOwnerUid() }]);
          setRightHolders([]);
          setExistingId(null);
        }
      } catch (err) {
        // Silent error handling
        if (mounted) {
          setForm({
            ...INITIAL_FORM,
            land_use:
              setup?.projectType === "commercial"
                ? "Investment"
                : "Residential",
          });
          setOwners([{ ...EMPTY_OWNER, _uid: generateOwnerUid() }]);
          setRightHolders([]);
          setExistingId(null);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [projectId, setup?.projectType]);

  // sqm → sqft
  const onSqmChange = (v) => {
    if (lock) return;
    setLock(true);
    setF("plot_area_sqm", v);
    setF("plot_area_sqft", v ? sqm2ft(v).toFixed(2) : "");
    setLock(false);
  };

  // sqft → sqm
  const onSqftChange = (v) => {
    if (lock) return;
    setLock(true);
    setF("plot_area_sqft", v);
    setF("plot_area_sqm", v ? ft2sqm(v).toFixed(2) : "");
    setLock(false);
  };

  // Manage owners
  const addOwner = () =>
    setOwners((prev) => [...prev, { ...EMPTY_OWNER, _uid: generateOwnerUid(), share_percent: "0" }]);

  const removeOwner = (i) =>
    setOwners((prev) => prev.filter((_, idx) => idx !== i));

  const updateOwner = (i, key, value) =>
    setOwners((prev) => {
      const x = [...prev];
      // Preserve all existing data including id
      // When updating id_attachment, preserve id if it exists
      const updatedOwner = { ...x[i], [key]: value };
      // If id exists in the original owner, preserve it
      if (x[i].id !== undefined) {
        updatedOwner.id = x[i].id;
      }
      x[i] = updatedOwner;
      return x;
    });

  // Manage right holders
  const addRightHolder = () =>
    setRightHolders((prev) => [
      ...prev,
      { _uid: `rh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name_ar: "", name_en: "", license_no: "", right_hold_type: "Ownership", share_and_acquisition: "", total_shares: "" },
    ]);

  const removeRightHolder = (i) =>
    setRightHolders((prev) => prev.filter((_, idx) => idx !== i));

  const updateRightHolder = (i, key, value) =>
    setRightHolders((prev) => {
      const x = [...prev];
      x[i] = { ...x[i], [key]: value };
      return x;
    });

  return {
    form,
    setForm,
    setF,
    owners,
    setOwners,
    rightHolders,
    setRightHolders,
    existingId,
    setExistingId,
    isView,
    setIsView,
    onSqmChange,
    onSqftChange,
    addOwner,
    removeOwner,
    updateOwner,
    addRightHolder,
    removeRightHolder,
    updateRightHolder,
  };
}
