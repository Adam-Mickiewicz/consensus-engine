"use client";
import { useState, useEffect } from "react";

const ACCENT = "#b8763a";

const BADGE_COLORS = {
  green:  { bg: "#e8f5e9", text: "#2e7d32" },
  purple: { bg: "#f3e5f5", text: "#7b1fa2" },
  red:    { bg: "#fce4ec", text: "#c62828" },
  amber:  { bg: "#fff8e1", text: "#f57f17" },
  gray:   { bg: "#eee",    text: "#888" },
};

function defaultParams(model, category) {
  const cap = model.capabilities || {};
  const firstDur = cap.durations?.[0] || cap.max_duration || 4;
  return {
    orientation: cap.orientations?.[0] || "1:1",
    resolution:  cap.resolutions?.[0]  || "",
    duration:    category === "video" ? `${firstDur}s` : firstDur,
    quality:     cap.quality?.[0]      || "",
    variants:    "1",
  };
}

function ToggleGroup({ options, value, onChange, labelFn }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "4px 10px", fontSize: 11,
            border: `1px solid ${String(value) === String(opt) ? ACCENT : "#ddd"}`,
            borderRadius: 5,
            background: String(value) === String(opt) ? "#fdf7f2" : "#fff",
            color: String(value) === String(opt) ? ACCENT : "#555",
            cursor: "pointer",
            fontWeight: String(value) === String(opt) ? 600 : 400,
          }}
        >
          {labelFn ? labelFn(opt) : opt}
        </button>
      ))}
    </div>
  );
}

export default function ModelSelector({ category, selectedModels, onModelsChange }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSettings, setOpenSettings] = useState(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        const res = await fetch(`/api/brand-media/models?category=${category}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data.models || [];
        setModels(list);
        if (!(selectedModels?.length)) {
          const first = list.find(m => !m.capabilities?.coming_soon);
          if (first) onModelsChange([{ model: first, params: defaultParams(first, category) }]);
        }
      } catch (err) {
        console.error("ModelSelector fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div style={{ padding: "16px", color: "#888", fontSize: 13 }}>Ładowanie modeli...</div>;
  if (error) return <div style={{ padding: "16px", color: "#c62828", fontSize: 13 }}>Błąd: {error}</div>;

  const sorted = [...models].sort((a, b) =>
    (a.capabilities?.coming_soon ? 1 : 0) - (b.capabilities?.coming_soon ? 1 : 0)
  );

  function isSelected(modelId) {
    return (selectedModels || []).some(s => s.model.model_id === modelId);
  }

  function getEntry(modelId) {
    return (selectedModels || []).find(s => s.model.model_id === modelId);
  }

  function addModel(model) {
    if (model.capabilities?.coming_soon) return;
    if (isSelected(model.model_id)) return;
    onModelsChange([...(selectedModels || []), { model, params: defaultParams(model, category) }]);
  }

  function removeModel(modelId) {
    onModelsChange((selectedModels || []).filter(s => s.model.model_id !== modelId));
    if (openSettings === modelId) setOpenSettings(null);
  }

  function updateParam(modelId, key, val) {
    onModelsChange((selectedModels || []).map(s =>
      s.model.model_id === modelId ? { ...s, params: { ...s.params, [key]: val } } : s
    ));
  }

  const items = [];

  sorted.forEach(model => {
    const selected     = isSelected(model.model_id);
    const entry        = getEntry(model.model_id);
    const comingSoon   = model.capabilities?.coming_soon;
    const badgeStyle   = BADGE_COLORS[model.badge_color] || BADGE_COLORS.amber;
    const settingsOpen = openSettings === model.model_id;

    items.push(
      <div
        key={model.model_id}
        onClick={() => !selected && addModel(model)}
        style={{
          border: `${selected ? "1.5px" : "1px"} solid ${selected ? ACCENT : "#e5e5e5"}`,
          borderRadius: 10,
          padding: "14px 16px",
          cursor: comingSoon ? "default" : selected ? "default" : "pointer",
          background: selected ? "#fdf6ee" : "#fff",
          transition: "border-color 0.15s, background 0.15s",
          boxSizing: "border-box",
          opacity: comingSoon ? 0.5 : 1,
          pointerEvents: comingSoon ? "none" : "auto",
          filter: comingSoon ? "grayscale(0.5)" : "none",
          position: "relative",
        }}
      >
        {/* Checkbox top-left when selected */}
        {selected && (
          <div
            onClick={e => { e.stopPropagation(); removeModel(model.model_id); }}
            style={{
              position: "absolute", top: 8, left: 8,
              width: 16, height: 16,
              background: ACCENT, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", zIndex: 1,
            }}
          >
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingLeft: selected ? 22 : 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>
            {model.model_name}
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {model.capabilities?.extend && !comingSoon && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 10, background: "#f0f7ff", color: "#1565c0" }}>↗ Extend</span>
            )}
            {model.badge && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: badgeStyle.bg, color: badgeStyle.text }}>
                {model.badge}
              </span>
            )}
            {selected && (
              <button
                onClick={e => { e.stopPropagation(); setOpenSettings(settingsOpen ? null : model.model_id); }}
                style={{
                  padding: "2px 8px", fontSize: 10, borderRadius: 6,
                  border: `1px solid ${settingsOpen ? ACCENT : "#ddd"}`,
                  background: settingsOpen ? "#fdf7f2" : "#fff",
                  color: settingsOpen ? ACCENT : "#666",
                  cursor: "pointer", fontWeight: 500,
                }}
              >⚙ Ustawienia</button>
            )}
          </div>
        </div>

        {/* Price */}
        <div style={{ fontSize: 13, color: ACCENT, fontWeight: 500, paddingLeft: selected ? 22 : 0 }}>
          ${parseFloat(model.price_per_unit).toFixed(2)} / {model.unit_label}
        </div>

        {/* Info */}
        <div style={{ fontSize: 11, color: "#999", marginTop: 4, paddingLeft: selected ? 22 : 0 }}>
          {model.capabilities?.resolutions?.length > 0 && (
            <span>{model.capabilities.resolutions.join(" · ")}</span>
          )}
          {model.capabilities?.durations?.length > 0 && (
            <span> · {model.capabilities.durations[0]}–{model.capabilities.durations[model.capabilities.durations.length - 1]}s</span>
          )}
          {model.capabilities?.extend && (
            <span> · extend do {model.capabilities.extend_max_seconds}s</span>
          )}
          <span> · {model.provider === "google" ? "Google" : "OpenAI"}</span>
        </div>
      </div>
    );

    // Inline settings panel — spans full grid width
    if (settingsOpen && entry) {
      const cap = model.capabilities || {};
      const p   = entry.params;

      items.push(
        <div
          key={`settings-${model.model_id}`}
          style={{
            gridColumn: "1 / -1",
            background: "#fdf8f3",
            border: `0.5px solid ${ACCENT}`,
            borderRadius: 8,
            padding: 16,
            marginTop: -4,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12, color: ACCENT }}>
            Ustawienia dla {model.model_name}
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {cap.orientations?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>Orientacja</div>
                <ToggleGroup
                  options={cap.orientations}
                  value={p.orientation}
                  onChange={v => updateParam(model.model_id, "orientation", v)}
                />
              </div>
            )}

            {cap.resolutions?.length > 1 && (
              <div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>Rozdzielczość</div>
                <ToggleGroup
                  options={cap.resolutions}
                  value={p.resolution}
                  onChange={v => updateParam(model.model_id, "resolution", v)}
                />
              </div>
            )}

            {cap.durations?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>Długość</div>
                <ToggleGroup
                  options={cap.durations}
                  value={parseInt(p.duration)}
                  onChange={v => updateParam(model.model_id, "duration", `${v}s`)}
                  labelFn={d => `${d}s`}
                />
              </div>
            )}

            {cap.quality?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>Jakość</div>
                <ToggleGroup
                  options={cap.quality}
                  value={p.quality}
                  onChange={v => updateParam(model.model_id, "quality", v)}
                />
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 6, fontWeight: 500 }}>Warianty</div>
              <ToggleGroup
                options={["1", "2", "4"]}
                value={String(p.variants)}
                onChange={v => updateParam(model.model_id, "variants", v)}
              />
            </div>
          </div>

          <button
            onClick={() => setOpenSettings(null)}
            style={{
              marginTop: 12, padding: "5px 14px",
              border: "0.5px solid #ddd", borderRadius: 6,
              fontSize: 12, background: "transparent", cursor: "pointer",
            }}
          >Gotowe</button>
        </div>
      );
    }
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Model</span>
        <span style={{ fontSize: 12, color: "#888", background: "#f5f0eb", padding: "3px 10px", borderRadius: 12 }}>
          🔀 Możesz wybrać więcej niż 1 model — wyniki pojawią się obok siebie
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {items}
      </div>
    </div>
  );
}
