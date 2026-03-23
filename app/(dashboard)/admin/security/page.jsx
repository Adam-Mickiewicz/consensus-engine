"use client";
import { useState, useEffect, useCallback } from "react";
import { useDarkMode } from "../../../hooks/useDarkMode";
import { supabase } from "../../../../lib/supabase";

// This page fetches directly from Supabase client-side via the API route
export default function SecurityPage() {
  const [dark] = useDarkMode();
  const t = {
    text:   dark ? "#e0ddd8" : "#0f172a",
    sub:    dark ? "#6a6560" : "#64748b",
    card:   dark ? "#111110" : "#ffffff",
    border: dark ? "#1e1e1e" : "#e2e8f0",
    bg:     dark ? "#0a0a0a" : "#f8fafc",
    accent: "#6366f1",
    head:   dark ? "#181816" : "#f7f5f2",
    red:    "#ef4444",
  };

  const [tab, setTab]       = useState("audit");
  const [audit, setAudit]   = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    const res  = await fetch("/api/admin/security?type=audit", {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error); return; }
    setAudit(json.audit ?? []);
    setSessions(json.sessions ?? []);
  }, []);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  const revokeSession = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    await fetch("/api/admin/security", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
      body: JSON.stringify({ session_id: id }),
    });
    loadAudit();
  };

  const exportCSV = () => {
    if (!audit.length) return;
    const header = "id,client_id,user_id,action,reason,ip_address,accessed_at";
    const rows   = audit.map(r =>
      [r.id, r.client_id, r.user_id ?? "", r.action ?? "view", `"${(r.reason ?? "").replace(/"/g, '""')}"`, r.ip_address ?? "", r.accessed_at].join(",")
    );
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `vault_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  const isExpired = (exp) => new Date(exp) < new Date();

  return (
    <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", maxWidth: 1000 }}>
      <h1 style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 24, color: t.text, margin: "0 0 6px" }}>Bezpieczeństwo</h1>
      <p style={{ fontSize: 13, color: t.sub, marginBottom: 28 }}>Audit log dostępu do danych osobowych i aktywne sesje PII</p>

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[["audit", "Audit log"], ["sessions", "Aktywne sesje PII"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "7px 16px", fontSize: 12, borderRadius: 6, border: `1px solid ${t.border}`, cursor: "pointer", background: tab === id ? t.accent + "22" : "transparent", color: tab === id ? t.accent : t.sub, fontWeight: tab === id ? 700 : 400 }}>
            {label}
          </button>
        ))}
        <button onClick={exportCSV} style={{ marginLeft: "auto", padding: "7px 14px", fontSize: 12, borderRadius: 6, border: `1px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.sub }}>
          ↓ Eksport CSV
        </button>
        <button onClick={loadAudit} style={{ padding: "7px 12px", fontSize: 12, borderRadius: 6, border: `1px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.sub }}>
          ↻
        </button>
      </div>

      {error && <div style={{ padding: "10px 14px", background: t.red + "11", border: `1px solid ${t.red}33`, borderRadius: 8, color: t.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24, color: t.sub, fontSize: 13 }}>Ładowanie…</div>
        ) : tab === "audit" ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: t.head }}>
                  {["Czas", "Klient", "Użytkownik", "Akcja", "IP", "Powód"].map(h => (
                    <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: t.sub, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: "8px 12px", color: t.sub, whiteSpace: "nowrap", borderBottom: `1px solid ${t.border}` }}>{fmtDate(r.accessed_at)}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{r.client_id}</td>
                    <td style={{ padding: "8px 12px", color: t.sub, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{r.user_id?.slice(0, 8) ?? "—"}</td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: r.action === "export" ? "#f59e0b22" : "#6366f122", color: r.action === "export" ? "#f59e0b" : t.accent }}>{r.action ?? "view"}</span>
                    </td>
                    <td style={{ padding: "8px 12px", color: t.sub, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{r.ip_address ?? "—"}</td>
                    <td style={{ padding: "8px 12px", color: t.sub, fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: `1px solid ${t.border}` }}>{r.reason ?? "—"}</td>
                  </tr>
                ))}
                {!audit.length && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: t.sub }}>Brak wpisów w audit logu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: t.head }}>
                {["Sesja", "Użytkownik", "Utworzona", "Wygasa", "IP", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: t.sub, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${t.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 10, color: t.sub, borderBottom: `1px solid ${t.border}` }}>{s.id.slice(0, 8)}…</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: t.text, borderBottom: `1px solid ${t.border}` }}>{s.user_id?.slice(0, 8) ?? "—"}</td>
                  <td style={{ padding: "8px 12px", color: t.sub, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{fmtDate(s.created_at)}</td>
                  <td style={{ padding: "8px 12px", color: t.sub, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{fmtDate(s.expires_at)}</td>
                  <td style={{ padding: "8px 12px", color: t.sub, fontSize: 11, borderBottom: `1px solid ${t.border}` }}>{s.ip_address ?? "—"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: isExpired(s.expires_at) ? "#64748b22" : "#22c55e22", color: isExpired(s.expires_at) ? t.sub : "#22c55e" }}>
                      {isExpired(s.expires_at) ? "wygasła" : "aktywna"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
                    {!isExpired(s.expires_at) && (
                      <button onClick={() => revokeSession(s.id)}
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: `1px solid ${t.red}44`, background: t.red + "11", color: t.red, cursor: "pointer" }}>
                        Unieważnij
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!sessions.length && (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: t.sub }}>Brak aktywnych sesji</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
