"use client";
import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ce-theme") === "dark";
  });

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "ce-theme") setIsDark(e.newValue === "dark");
    };
    const onLocal = (e) => setIsDark(e.detail?.isDark ?? false);
    window.addEventListener("storage", onStorage);
    window.addEventListener("ce-theme-change", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ce-theme-change", onLocal);
    };
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("ce-theme", next ? "dark" : "light");
      window.dispatchEvent(new CustomEvent("ce-theme-change", { detail: { isDark: next } }));
      return next;
    });
  };

  return { isDark, toggleTheme };
}
