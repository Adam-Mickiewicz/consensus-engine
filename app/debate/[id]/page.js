"use client";
import { useEffect, useState } from "react";
import { loadDebate } from "../../../lib/supabase";

export default function DebatePage({ params }) {
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebate(params.id).then(d => {
      setDebate(d);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", background: "#f5f4f0" }}>
      <div style={{ color: "#b8763a" }}>Ładowanie debaty...</div>
    </div>
  );

  if (!debate) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", background: "#f5f4f0" }}>
      <div style={{ color: "#b83020" }}>Nie znaleziono debaty.</div>
    </div>
  );

  // Przekieruj na główną z załadowaną debatą
  if (typeof window !== "undefined") {
    sessionStorage.setItem("loadDebate", JSON.stringify(debate));
    window.location.href = "/";
  }

  return null;
}