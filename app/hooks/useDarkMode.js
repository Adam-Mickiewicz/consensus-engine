"use client";
import { useState, useEffect } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(localStorage.getItem("ce-theme") === "dark");
    const onStorage = (e) => { if (e.key === "ce-theme") setDark(e.newValue === "dark"); };
    const onLocal = (e) => setDark(e.detail === "dark");
    window.addEventListener("storage", onStorage);
    window.addEventListener("ce-theme-change", onLocal);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("ce-theme-change", onLocal); };
  }, []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    localStorage.setItem("ce-theme", next);
    window.dispatchEvent(new CustomEvent("ce-theme-change", { detail: next }));
    setDark(!dark);
  };
  return [dark, toggle];
}
