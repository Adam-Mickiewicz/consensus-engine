"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const ACCENT = "#b8763a";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: type === "error" ? "#c62828" : "#2e7d32",
      color: "#fff", padding: "10px 18px", borderRadius: 8,
      fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }}>
      {msg}
    </div>
  );
}

export default function AdminUsersPage() {
  const [authUser, setAuthUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [savingRole, setSavingRole] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [pendingPerms, setPendingPerms] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getJwt = useCallback(async () => {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const fetchData = useCallback(async () => {
    const jwt = await getJwt();
    if (!jwt) { setIsAdmin(false); setLoading(false); return; }

    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (res.status === 401 || res.status === 403) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError("Błąd ładowania danych");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setUsers(data.users ?? []);
    setTools(data.tools ?? []);
    setIsAdmin(true);
    setLoading(false);
  }, [getJwt]);

  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getUser().then(({ data: { user } }) => setAuthUser(user));
    fetchData();
  }, [fetchData]);

  async function patchRole(userId, role) {
    const key = `role_${userId}`;
    setSavingRole(s => ({ ...s, [key]: true }));
    try {
      const jwt = await getJwt();
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ user_id: userId, role }),
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } finally {
      setSavingRole(s => ({ ...s, [key]: false }));
    }
  }

  const handleSavePerms = async (userId) => {
    setSaving(true);
    try {
      const jwt = await getJwt();
      const results = await Promise.all(
        Object.entries(pendingPerms).map(([tool, can_access]) =>
          fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({ user_id: userId, tool, can_access }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        showToast(`Błąd zapisu (${failed.length} operacji)`, "error");
        return;
      }
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        return { ...u, tool_permissions: { ...pendingPerms } };
      }));
      setEditingUser(null);
      showToast("Uprawnienia zapisane!");
    } catch (e) {
      showToast("Błąd zapisu: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  async function deleteUser(userId, email) {
    if (!confirm(`Usunąć użytkownika ${email}? Tej operacji nie można cofnąć.`)) return;
    const jwt = await getJwt();
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    } else {
      const d = await res.json();
      alert("Błąd: " + d.error);
    }
  }

  async function inviteUser(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const jwt = await getJwt();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ action: "invite", email: inviteEmail.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setInviteMsg({ ok: true, text: `Zaproszenie wysłane do ${inviteEmail}` });
        setInviteEmail("");
        fetchData();
      } else {
        setInviteMsg({ ok: false, text: d.error });
      }
    } finally {
      setInviting(false);
    }
  }

  if (loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#888", fontSize: 14 }}>
      Ładowanie...
    </div>
  );

  if (isAdmin === false) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 16, color: "#c62828" }}>Brak dostępu. Wymagana rola admin.</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 60, textAlign: "center", color: "#c62828" }}>{error}</div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <Toast msg={toast?.msg} type={toast?.type} />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1a1a" }}>
          Panel administratora
        </h1>
        <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
          Zarządzanie użytkownikami i uprawnieniami do narzędzi
        </p>
      </div>

      {/* Invite form */}
      <div style={{
        background: "#fffbf7", border: `1px solid ${ACCENT}30`,
        borderRadius: 10, padding: "16px 20px", marginBottom: 28,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#333" }}>
          Zaproś nowego użytkownika
        </div>
        <form onSubmit={inviteUser} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="adres@email.com"
            required
            style={{
              flex: 1, maxWidth: 320, padding: "8px 12px", borderRadius: 6,
              border: "1px solid #ddd", fontSize: 13, outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={inviting}
            style={{
              padding: "8px 18px", borderRadius: 6, border: "none",
              background: inviting ? "#ccc" : ACCENT, color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: inviting ? "not-allowed" : "pointer",
            }}
          >
            {inviting ? "Wysyłanie..." : "Wyślij zaproszenie"}
          </button>
        </form>
        {inviteMsg && (
          <div style={{ marginTop: 8, fontSize: 12, color: inviteMsg.ok ? "#2e7d32" : "#c62828" }}>
            {inviteMsg.text}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Wszyscy", count: users.length, color: "#555" },
          { label: "Adminowie", count: users.filter(u => u.role === "admin").length, color: "#c62828" },
          { label: "Edytorzy", count: users.filter(u => u.role === "editor").length, color: "#1565c0" },
          { label: "Widzowie", count: users.filter(u => u.role === "viewer").length, color: "#888" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#fff", border: "1px solid #eee", borderRadius: 8,
            padding: "10px 16px", fontSize: 12,
          }}>
            <div style={{ color: "#888" }}>{s.label}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: s.color }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
              <th style={th}>Email</th>
              <th style={th}>Rola</th>
              <th style={th}>Dostęp do narzędzi</th>
              <th style={th}>TOTP</th>
              <th style={th}>Ostatnie logowanie</th>
              <th style={th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.id === authUser?.id;
              const accessCount = Object.values(u.tool_permissions || {}).filter(Boolean).length;

              return (
                <>
                  <tr key={u.id} style={{ borderBottom: editingUser === u.id ? "none" : "1px solid #f5f5f5" }}>
                    {/* Email */}
                    <td style={td}>
                      <div style={{ fontWeight: 500, color: "#1a1a1a" }}>{u.email}</div>
                      {isSelf && <div style={{ fontSize: 10, color: ACCENT, marginTop: 1 }}>To jesteś Ty</div>}
                    </td>

                    {/* Role */}
                    <td style={td}>
                      <select
                        value={u.role}
                        disabled={isSelf || savingRole[`role_${u.id}`]}
                        onChange={e => patchRole(u.id, e.target.value)}
                        style={{
                          padding: "4px 8px", borderRadius: 5, fontSize: 12,
                          border: "1px solid #ddd", background: "#fff",
                          cursor: isSelf ? "not-allowed" : "pointer",
                          color: u.role === "admin" ? "#c62828" : u.role === "editor" ? "#1565c0" : "#555",
                          fontWeight: 600, opacity: isSelf ? 0.6 : 1,
                        }}
                      >
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>

                    {/* Tool permissions summary */}
                    <td style={td}>
                      <span style={{ fontSize: 12, color: "#555" }}>
                        {accessCount} / {tools.length} narzędzi
                      </span>
                      <button
                        onClick={() => {
                          if (editingUser === u.id) {
                            setEditingUser(null);
                            return;
                          }
                          const current = u.tool_permissions || {};
                          setPendingPerms(tools.reduce((acc, t) => ({
                            ...acc, [t.tool_id]: current[t.tool_id] ?? true,
                          }), {}));
                          setEditingUser(u.id);
                        }}
                        style={{
                          marginLeft: 8, padding: "3px 10px",
                          border: "1px solid #ddd", borderRadius: 6,
                          fontSize: 11, background: editingUser === u.id ? "#f5f5f5" : "transparent",
                          cursor: "pointer", color: "#555",
                        }}
                      >
                        {editingUser === u.id ? "Zwiń" : "Edytuj"}
                      </button>
                    </td>

                    {/* TOTP */}
                    <td style={td}>
                      <span style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 10,
                        background: u.totp_verified ? "#e8f5e9" : "#f5f5f5",
                        color: u.totp_verified ? "#2e7d32" : "#aaa",
                      }}>
                        {u.totp_verified ? "✓ aktywny" : "brak"}
                      </span>
                    </td>

                    {/* Last sign in */}
                    <td style={td}>
                      <span style={{ color: "#888", fontSize: 11 }}>
                        {u.last_sign_in
                          ? new Date(u.last_sign_in).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={td}>
                      {!isSelf && (
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          style={{
                            fontSize: 11, color: "#c62828", border: "1px solid #f0b8b8",
                            borderRadius: 4, padding: "3px 8px", background: "none", cursor: "pointer",
                          }}
                        >
                          Usuń
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Permissions editor row */}
                  {editingUser === u.id && (
                    <tr key={`${u.id}_perms`}>
                      <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid #f5f5f5" }}>
                        <div style={{
                          padding: "16px 20px",
                          background: "#fafafa",
                          borderTop: "1px solid #eee",
                        }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600,
                            color: "#555", marginBottom: 12,
                          }}>
                            Dostęp do narzędzi — {u.email}
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 32px", marginBottom: 16 }}>
                            {tools.map(t => (
                              <label key={t.tool_id} style={{
                                display: "flex", alignItems: "center", gap: 8,
                                cursor: "pointer", fontSize: 13, color: "#1a1a1a",
                                minWidth: 220,
                              }}>
                                <input
                                  type="checkbox"
                                  checked={pendingPerms[t.tool_id] ?? true}
                                  onChange={e => setPendingPerms(prev => ({
                                    ...prev,
                                    [t.tool_id]: e.target.checked,
                                  }))}
                                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: ACCENT }}
                                />
                                {t.tool_name}
                                <span style={{ fontSize: 11, color: "#aaa" }}>({t.category})</span>
                              </label>
                            ))}
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handleSavePerms(u.id)}
                              disabled={saving}
                              style={{
                                padding: "7px 16px",
                                background: saving ? "#ccc" : ACCENT,
                                color: "#fff", border: "none",
                                borderRadius: 6, fontSize: 13,
                                cursor: saving ? "default" : "pointer",
                                fontWeight: 600,
                              }}
                            >
                              {saving ? "Zapisuję..." : "Zapisz uprawnienia"}
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              style={{
                                padding: "7px 16px", background: "transparent",
                                border: "1px solid #ddd", borderRadius: 6,
                                fontSize: 13, cursor: "pointer", color: "#555",
                              }}
                            >
                              Anuluj
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>
            Brak użytkowników
          </div>
        )}
      </div>
    </div>
  );
}

const th = {
  padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 11,
  color: "#888", letterSpacing: "0.05em", textTransform: "uppercase",
};
const td = { padding: "12px 16px", verticalAlign: "top" };
