"use client";
import { useState, useEffect } from "react";
import { useDarkMode } from "../../../hooks/useDarkMode";

export default function AdminUsersPage() {
  const [dark] = useDarkMode();
  const t = {
    text:   dark ? "#e0ddd8" : "#0f172a",
    sub:    dark ? "#6a6560" : "#64748b",
    card:   dark ? "#111110" : "#ffffff",
    border: dark ? "#1e1e1e" : "#e2e8f0",
    bg:     dark ? "#0a0a0a" : "#f8fafc",
    accent: "#6366f1",
    head:   dark ? "#181816" : "#f7f5f2",
  };

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/users");
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error); return; }
    setUsers(json.users ?? []);
  };

  useEffect(() => { load(); }, []);

  const setRole = async (userId, role) => {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_role", user_id: userId, role }),
    });
    load();
  };

  const invite = async () => {
    if (!inviteEmail) return;
    setInviting(true); setInviteMsg(null);
    const res  = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", email: inviteEmail }),
    });
    const json = await res.json();
    setInviting(false);
    setInviteMsg(res.ok ? "✓ Zaproszenie wysłane" : `Błąd: ${json.error}`);
    if (res.ok) { setInviteEmail(""); load(); }
  };

  const roleBadge = (role) => {
    const color = role === "admin" ? "#6366f1" : "#64748b";
    return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: color + "22", color, fontWeight: 700, textTransform: "uppercase" }}>{role}</span>;
  };

  return (
    <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", maxWidth: 900 }}>
      <h1 style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 24, color: t.text, margin: "0 0 6px" }}>Użytkownicy</h1>
      <p style={{ fontSize: 13, color: t.sub, marginBottom: 28 }}>Zarządzanie dostępem i rolami</p>

      {/* Invite */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          placeholder="email@nadwyraz.com"
          style={{ flex: 1, minWidth: 220, padding: "8px 12px", border: `1px solid ${t.border}`, borderRadius: 7, background: t.bg, color: t.text, fontSize: 13, outline: "none" }}
        />
        <button onClick={invite} disabled={inviting || !inviteEmail}
          style={{ padding: "8px 18px", background: t.accent, color: "#fff", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (inviting || !inviteEmail) ? 0.5 : 1 }}>
          {inviting ? "Wysyłam…" : "+ Zaproś użytkownika"}
        </button>
        {inviteMsg && <span style={{ fontSize: 12, color: inviteMsg.startsWith("✓") ? "#22c55e" : "#ef4444" }}>{inviteMsg}</span>}
      </div>

      {/* Table */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24, color: t.sub, fontSize: 13 }}>Ładowanie…</div>
        ) : error ? (
          <div style={{ padding: 24, color: "#ef4444", fontSize: 13 }}>{error}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: t.head }}>
                {["Email", "Rola", "2FA", "Ostatnie logowanie", "Akcje"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: t.sub, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${t.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: "10px 14px", color: t.text, borderBottom: `1px solid ${t.border}` }}>{u.email}</td>
                  <td style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}` }}>{roleBadge(u.role)}</td>
                  <td style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}` }}>
                    {u.totp_verified
                      ? <span style={{ color: "#22c55e", fontSize: 12 }}>✓ aktywne</span>
                      : <span style={{ color: t.sub, fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", color: t.sub, fontSize: 12, borderBottom: `1px solid ${t.border}` }}>
                    {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("pl-PL") : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}` }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {u.role !== "admin" ? (
                        <button onClick={() => setRole(u.id, "admin")}
                          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: `1px solid ${t.accent}44`, background: t.accent + "11", color: t.accent, cursor: "pointer" }}>
                          → Admin
                        </button>
                      ) : (
                        <button onClick={() => setRole(u.id, "viewer")}
                          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, border: `1px solid ${t.border}`, background: "none", color: t.sub, cursor: "pointer" }}>
                          → Viewer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
