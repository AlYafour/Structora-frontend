import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Custom Hook for managing tab state in ProjectView
 * Reads tab from URL query parameter on initial mount only (no re-render loop)
 */
export function useProjectTabs(defaultTab = "overview") {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabRef = useRef(searchParams.get("tab") || defaultTab);
  const cleaned = useRef(false);
  const [activeTab, setActiveTab] = useState(initialTabRef.current);

  // Clean up URL on first access only (synchronous-safe via ref)
  if (!cleaned.current && searchParams.get("tab")) {
    cleaned.current = true;
    // Use queueMicrotask to avoid setState-during-render
    queueMicrotask(() => setSearchParams({}, { replace: true }));
  }

  return { activeTab, setActiveTab };
}
