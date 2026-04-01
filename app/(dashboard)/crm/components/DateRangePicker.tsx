'use client';
import { useState, useEffect } from 'react';

interface DateRange { from: string; to: string; label: string; }
interface DateRangeProps { onChange: (range: DateRange) => void; defaultPreset?: string; }

const PRESETS = [
  { label: 'Ostatnie 30d', days: 30 as number | string },
  { label: 'Ostatnie 90d', days: 90 as number | string },
  { label: 'Ostatnie 180d', days: 180 as number | string },
  { label: 'Ten rok (YTD)', days: 'ytd' as number | string },
  { label: 'Ostatnie 12m', days: 365 as number | string },
  { label: 'Cała historia', days: 'all' as number | string },
  { label: 'Custom...', days: 'custom' as number | string },
];

function getDateRange(preset: typeof PRESETS[0], customFrom: string, customTo: string): { from: string; to: string } {
  const to = new Date().toISOString().split('T')[0];
  if (preset.days === 'all') return { from: '2017-01-01', to };
  if (preset.days === 'ytd') {
    const from = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    return { from, to };
  }
  if (preset.days === 'custom') return { from: customFrom, to: customTo };
  const from = new Date(Date.now() - (preset.days as number) * 86400000).toISOString().split('T')[0];
  return { from, to };
}

export default function DateRangePicker({ onChange, defaultPreset = 'Ostatnie 90d' }: DateRangeProps) {
  const [activePreset, setActivePreset] = useState(defaultPreset);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    const preset = PRESETS.find(p => p.label === activePreset) || PRESETS[1];
    if (preset.days === 'custom') {
      if (customFrom && customTo) onChange({ from: customFrom, to: customTo, label: 'Custom' });
      return;
    }
    const range = getDateRange(preset, customFrom, customTo);
    onChange({ ...range, label: activePreset });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreset, customFrom, customTo]);

  function handlePreset(label: string) {
    setActivePreset(label);
    if (label === 'Custom...') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }
  }

  const activeRange = (() => {
    const preset = PRESETS.find(p => p.label === activePreset);
    if (!preset || preset.days === 'custom') return null;
    return getDateRange(preset, customFrom, customTo);
  })();

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: 4,
    fontSize: 12,
    border: `1px solid ${active ? '#b8763a' : '#e8e0d8'}`,
    cursor: 'pointer',
    background: active ? '#b8763a' : '#fff',
    color: active ? '#fff' : '#1a1a1a',
    fontFamily: 'IBM Plex Mono, monospace',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d8', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b6b6b', marginRight: 4, fontFamily: 'IBM Plex Mono, monospace' }}>Zakres:</span>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => handlePreset(p.label)} style={pillStyle(activePreset === p.label)}>
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace' }}>Od:</span>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #e8e0d8', borderRadius: 4, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }} />
          <span style={{ fontSize: 12, color: '#6b6b6b', fontFamily: 'IBM Plex Mono, monospace' }}>Do:</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #e8e0d8', borderRadius: 4, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }} />
        </div>
      )}
      {activeRange && (
        <div style={{ fontSize: 11, color: '#6b6b6b', marginTop: 6, fontFamily: 'IBM Plex Mono, monospace' }}>
          {new Date(activeRange.from).toLocaleDateString('pl-PL')} – {new Date(activeRange.to).toLocaleDateString('pl-PL')}
        </div>
      )}
    </div>
  );
}
