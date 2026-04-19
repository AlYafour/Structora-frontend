// Unified functions for localStorage operations
export function loadSavedList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch { /* localStorage parse fallback */
    return [];
  }
}

export function saveToList(key, item) {
  const list = loadSavedList(key);
  // Search for existing item by name and license
  const existingIndex = list.findIndex(
    x => x.name === item.name && x.license === item.license
  );
  
  if (existingIndex >= 0) {
    // If it exists, update it (especially name_en)
    list[existingIndex] = {
      ...list[existingIndex],
      ...item, // Update all data including name_en
    };
  } else {
    // If it doesn't exist, add it
    list.push(item);
  }
  
  localStorage.setItem(key, JSON.stringify(list));
  return list;
}

