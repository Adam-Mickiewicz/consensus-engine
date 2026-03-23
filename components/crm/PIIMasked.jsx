"use client";
import { useState, useEffect } from "react";

/**
 * PIIMasked
 *
 * Props:
 *   clientId   string
 *   type       'email' | 'name'
 *   sessionId  string | null
 *   masked     string  — fallback masked value (e.g. "j***@gmail.com")
 */
function maskEmail(email) {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email[0] + "***";
  return local[0] + "***@" + domain;
}
function maskName(name) {
  if (!name) return "—";
  const parts = name.trim().split(" ");
  return parts.map((p, i) => i === parts.length - 1 ? p[0] + "." : p).join(" ");
}

const cache = new Map(); // clientId → { email, first_name, last_name, fetchedAt }

export default function PIIMasked({ clientId, type, sessionId, masked }) {
  const [plain, setPlain]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId || !clientId) { setPlain(null); return; }

    // Check in-memory cache
    const cached = cache.get(clientId);
    if (cached) {
      setPlain(type === "email" ? cached.email : `${cached.first_name ?? ""} ${cached.last_name ?? ""}`.trim());
      return;
    }

    setLoading(true);
    fetch(`/api/crm/pii?client_ids=${encodeURIComponent(clientId)}&session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(d => {
        const row = d.pii?.[0];
        if (row) {
          cache.set(clientId, { email: row.email, first_name: row.first_name, last_name: row.last_name });
          setPlain(type === "email" ? row.email : `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim());
        }
      })
      .catch(() => setPlain(null))
      .finally(() => setLoading(false));
  }, [sessionId, clientId, type]);

  // Clear when session expires
  useEffect(() => {
    if (!sessionId) setPlain(null);
  }, [sessionId]);

  if (loading) return <span style={{ color: "#64748b", fontSize: 11 }}>…</span>;

  if (plain) {
    return <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12 }}>{plain}</span>;
  }

  // Masked fallback
  const maskedVal = masked ?? (type === "email" ? maskEmail(null) : maskName(null));
  return <span style={{ color: "#64748b", fontStyle: "italic", fontSize: 12 }}>{maskedVal}</span>;
}
