"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

const accent = "#b8763a";

const s = {
  page: { minHeight: "100vh", background: "#f5f0eb", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  box: { background: "#fff", border: "1px solid #e0d8ce", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400 },
  title: { color: accent, fontWeight: 800, fontSize: 22, letterSpacing: 2, marginBottom: 4 },
  sub: { color: "#888", fontSize: 11, marginBottom: 32 },
  label: { color: "#666", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d8ce", fontFamily: "inherit", fontSize: 13, marginBottom: 16, boxSizing: "border-box", outline: "none" },
  btn: { width: "100%", padding: "12px", borderRadius: 8, background: accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, letterSpacing: 1 },
  error: { color: "#c0392b", fontSize: 11, marginBottom: 12, padding: "8px 12px", background: "#fdf2f2", borderRadius: 6 },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={s.title}>CONSENSUS ENGINE</div>
        <div style={s.sub}>Zaloguj się, aby kontynuować</div>

        {error && <div style={s.error}>{error}</div>}

        <label style={s.label}>EMAIL</label>
        <input
          style={s.input}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="twoj@email.com"
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

        <label style={s.label}>HASŁO</label>
        <input
          style={s.input}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

        <button style={s.btn} onClick={handleLogin} disabled={loading}>
          {loading ? "..." : "ZALOGUJ"}
        </button>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <a href="/auth" style={{ color: accent, fontSize: 11, fontFamily: "inherit" }}>
            Rejestracja / reset hasła →
          </a>
        </div>
      </div>
    </div>
  );
}
