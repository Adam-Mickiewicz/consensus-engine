"use client";
import { useState, useEffect } from "react";

const ACCENT = "#b8763a";

export default function PresetPanel({ jobType, onApply, currentConfig = {} }) {
  const [presets, setPresets] = useState([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newPreset, setNewPreset] = useState({ name: "", description: "", is_shared: true, created_by: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetchPresets();
  }, [jobType]);

  async function fetchPresets() {
    try {
      const url = jobType ? `/api/brand-media/presets?job_type=${jobType}` : "/api/brand-media/presets";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPresets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("PresetPanel fetch error:", err);
    }
  }

  async function deletePreset(id, e) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/brand-media/presets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Delete preset error:", err);
    }
  }

  async function savePreset() {
    if (!newPreset.name.trim()) { setSaveError("Podaj nazwę presetu."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const body = {
        ...newPreset,
        job_type: jobType,
        model_id: currentConfig.model_id || null,
        params: currentConfig.params || {},
        prompt_template: currentConfig.prompt_template || "",
      };
      const res = await fetch("/api/brand-media/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchPresets();
      setShowSaveForm(false);
      setNewPreset({ name: "", description: "", is_shared: true, created_by: "" });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!presets.length && !showSaveForm) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: "#aaa" }}>Presety:</span>
        <button
          onClick={() => setShowSaveForm(true)}
          style={{
            fontSize: 12, padding: "4px 12px", border: `1px dashed ${ACCENT}`,
            borderRadius: 20, background: "transparent", color: ACCENT, cursor: "pointer",
          }}
        >
          + Zapisz obecne ustawienia
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#888", flexShrink: 0 }}>Presety:</span>

        {presets.map(preset => (
          <div
            key={preset.id}
            title={preset.description || preset.name}
            onClick={() => onApply(preset)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "#f5f0eb", border: "1px solid #e8ddd0",
              borderRadius: 20, padding: "4px 10px", fontSize: 12,
              cursor: "pointer", transition: "background 0.1s",
              userSelect: "none",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#eedfc8"}
            onMouseLeave={e => e.currentTarget.style.background = "#f5f0eb"}
          >
            <span>{preset.name}</span>
            <span
              onClick={e => deletePreset(preset.id, e)}
              style={{ fontSize: 10, color: "#aaa", cursor: "pointer", marginLeft: 2, lineHeight: 1 }}
              title="Usuń preset"
            >
              ×
            </span>
          </div>
        ))}

        <button
          onClick={() => setShowSaveForm(s => !s)}
          style={{
            fontSize: 12, padding: "4px 12px",
            border: `1px dashed ${ACCENT}`, borderRadius: 20,
            background: "transparent", color: ACCENT, cursor: "pointer",
          }}
        >
          + Zapisz obecne ustawienia
        </button>
      </div>

      {showSaveForm && (
        <div style={{
          marginTop: 12, padding: "14px 16px", background: "#fff",
          border: "1px solid #eee", borderRadius: 10,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Nazwa presetu *</div>
                <input
                  value={newPreset.name}
                  onChange={e => setNewPreset(p => ({ ...p, name: e.target.value }))}
                  placeholder="np. Pack shot białe tło"
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Opis (opcjonalnie)</div>
                <input
                  value={newPreset.description}
                  onChange={e => setNewPreset(p => ({ ...p, description: e.target.value }))}
                  placeholder="Krótki opis ustawień"
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Twoje imię</div>
                <input
                  value={newPreset.created_by}
                  onChange={e => setNewPreset(p => ({ ...p, created_by: e.target.value }))}
                  placeholder="Imię lub login"
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", cursor: "pointer", marginTop: 16, flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={newPreset.is_shared}
                  onChange={e => setNewPreset(p => ({ ...p, is_shared: e.target.checked }))}
                  style={{ accentColor: ACCENT }}
                />
                Udostępnij wszystkim
              </label>
            </div>

            {saveError && <div style={{ fontSize: 12, color: "#c62828" }}>{saveError}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setShowSaveForm(false); setSaveError(""); }}
                style={{ padding: "7px 14px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, background: "#fff", color: "#555", cursor: "pointer" }}
              >
                Anuluj
              </button>
              <button
                onClick={savePreset}
                disabled={saving}
                style={{
                  padding: "7px 16px", fontSize: 13, fontWeight: 600,
                  background: saving ? "#f0e8df" : ACCENT,
                  border: "none", borderRadius: 6, color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Zapisuję..." : "Zapisz preset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
