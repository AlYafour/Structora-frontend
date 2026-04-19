import { useEffect, useState, useCallback } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Read from localStorage if available, otherwise default to 'light'
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    const root = document.documentElement; // <html>
    if (theme === "dark") {
      root.classList.add("theme-dark");
    } else {
      root.classList.remove("theme-dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme, setTheme };
}
