"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const TwoFactorModal = dynamic(() => import("./TwoFactorModal"), { ssr: false });

/**
 * PIIAccessButton
 *
 * Props:
 *   dark        boolean
 *   onUnlocked  (sessionId, expiresAt) => void
 *   label?      string  (button label override)
 *   size?       'sm' | 'md'
 */
export default function PIIAccessButton({ dark, onUnlocked, label, size = "md" }) {
  const [showModal, setShowModal]   = useState(false);
  const [sessionId, setSessionId]   = useState(null);
  const [expiresAt, setExpiresAt]   = useState(null);
  const [remaining, setRemaining]   = useState(null); // seconds

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const sid = sessionStorage.getItem("pii_session_id");
    const exp = sessionStorage.getItem("pii_expires_at");
    if (sid && exp && new Date(exp) > new Date()) {
      setSessionId(sid);
      setExpiresAt(exp);
      onUnlocked?.(sid, exp);
    }
  }, []); // eslint-disable-line

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const secs = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (secs <= 0) {
        setSessionId(null);
        setExpiresAt(null);
        setRemaining(null);
        sessionStorage.removeItem("pii_session_id");
        sessionStorage.removeItem("pii_expires_at");
        onUnlocked?.(null, null);
      } else {
        setRemaining(secs);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onUnlocked]);

  const handleSuccess = (sid, exp) => {
    setShowModal(false);
    if (sid) {
      setSessionId(sid);
      setExpiresAt(exp);
      onUnlocked?.(sid, exp);
    }
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const accent = "#6366f1";
  const green  = "#22c55e";
  const pad    = size === "sm" ? "5px 12px" : "8px 18px";
  const fs     = size === "sm" ? 12 : 13;

  if (sessionId && remaining) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{
          padding: pad, borderRadius: 8, background: green + "18",
          border: `1px solid ${green}44`, color: green,
          fontSize: fs, fontWeight: 600,
        }}>
          🔓 Odblokowane · {fmtTime(remaining)}
        </span>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: pad, borderRadius: 8,
          background: accent + "18",
          border: `1px solid ${accent}44`,
          color: accent, fontSize: fs, fontWeight: 600,
          cursor: "pointer",
        }}>
        🔒 {label ?? "Odblokuj dane osobowe"}
      </button>

      {showModal && (
        <TwoFactorModal
          dark={dark}
          onSuccess={handleSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
