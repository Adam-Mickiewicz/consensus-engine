'use client';
import { useState } from 'react';

export default function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3 }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <span style={{ fontSize: 11, color: '#9a9490', cursor: 'help', lineHeight: 1 }}>ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1814', color: '#f0ece6', padding: '7px 11px', borderRadius: 5,
          fontSize: 12, whiteSpace: 'normal', maxWidth: 280, zIndex: 200,
          boxShadow: '0 3px 12px rgba(0,0,0,0.25)', lineHeight: 1.5,
          pointerEvents: 'none', display: 'block', textAlign: 'left',
        }}>
          {text}
        </span>
      )}
    </span>
  );
}
