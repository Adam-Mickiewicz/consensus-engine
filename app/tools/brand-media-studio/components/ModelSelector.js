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

export default function ModelSelector({ category, onModelChange, selectedModelId }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        const res = await fetch(`/api/brand-media/models?category=${category}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setModels(data.models || []);
        // Auto-select first non-coming_soon model
        if (data.models?.length && !selectedModelId) {
          const firstAvailable = data.models.find(m => !m.capabilities?.coming_soon) || data.models[0];
          onModelChange(firstAvailable);
        }
      } catch (err) {
        console.error('ModelSelector fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [category]);

  if (loading) {
    return (
      <div style={{ padding: '16px', color: '#888', fontSize: 13 }}>
        Ładowanie modeli...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', color: '#c62828', fontSize: 13 }}>
        Błąd ładowania modeli: {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Wybierz model
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {[...models].sort((a, b) => {
          const aLast = a.capabilities?.coming_soon ? 1 : 0;
          const bLast = b.capabilities?.coming_soon ? 1 : 0;
          return aLast - bLast;
        }).map((model) => {
          const isSelected = model.model_id === selectedModelId;
          const badgeStyle = BADGE_COLORS[model.badge_color] || BADGE_COLORS.amber;

          return (
            <div
              key={model.model_id}
              onClick={() => onModelChange(model)}
              style={{
                border: `2px solid ${isSelected ? ACCENT : '#e5e5e5'}`,
                borderRadius: 10,
                padding: '14px 16px',
                cursor: model.capabilities?.coming_soon ? 'default' : 'pointer',
                background: isSelected ? '#fdf7f2' : '#fff',
                transition: 'border-color 0.15s, background 0.15s',
                boxSizing: 'border-box',
                opacity: model.capabilities?.coming_soon ? 0.5 : 1,
                pointerEvents: model.capabilities?.coming_soon ? 'none' : 'auto',
                filter: model.capabilities?.coming_soon ? 'grayscale(0.5)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>
                  {model.model_name}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {model.capabilities?.extend && (
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      padding: '2px 6px', borderRadius: 10,
                      background: '#f0f7ff', color: '#1565c0',
                      letterSpacing: '0.03em',
                    }}>↗ Extend</span>
                  )}
                  {model.badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      padding: '2px 7px', borderRadius: 10,
                      background: badgeStyle.bg, color: badgeStyle.text,
                      letterSpacing: '0.04em',
                    }}>
                      {model.badge}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: ACCENT, fontWeight: 500 }}>
                ${model.price_per_unit.toFixed(2)} / {model.unit_label}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                {model.capabilities?.resolutions?.length > 0 && (
                  <span>{model.capabilities.resolutions.join(' · ')}</span>
                )}
                {model.capabilities?.durations?.length > 0 && (
                  <span> · {model.capabilities.durations[0]}–{model.capabilities.durations[model.capabilities.durations.length - 1]}s</span>
                )}
                {model.capabilities?.extend && (
                  <span> · extend do {model.capabilities.extend_max_seconds}s</span>
                )}
                <span> · {model.provider === 'google' ? 'Google' : 'OpenAI'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
