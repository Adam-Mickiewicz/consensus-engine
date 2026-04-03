'use client';
import { useState } from 'react';

export default function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <span style={{ fontSize: 12, color: '#999', cursor: 'help' }}>ⓘ</span>
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff', padding: '8px 12px', borderRadius: 6,
          fontSize: 12, lineHeight: 1.5, maxWidth: 320, width: 'max-content', zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pointerEvents: 'none', whiteSpace: 'normal',
        }}>
          {text}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid #1a1a1a' }} />
        </div>
      )}
    </span>
  );
}
