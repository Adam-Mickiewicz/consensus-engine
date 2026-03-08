"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const accent = "#b8763a";

  async function handleUpdate() {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage("Błąd: " + error.message);
    else { setMessage("Hasło zmienione!"); setTimeout(() => window.location.href = "/", 2000); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0eb", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ background: "#fff", border: "1px solid #e0d8ce", borderRadius: 16, padding: 40, width: 400 }}>
        <div style={{ color: accent, fontWeight: 800, fontSize: 18, marginBottom: 24 }}>NOWE HASŁO</div>
        {message && <div style={{ color: "#27ae60", fontSize: 11, marginBottom: 12 }}>{message}</div>}
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nowe hasło" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d8ce", fontFamily: "inherit", fontSize: 13, marginBottom: 16, boxSizing: "border-box" }} />
        <button onClick={handleUpdate} disabled={loading} style={{ width: "100%", padding: 12, borderRadius: 8, background: accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
          {loading ? "..." : "ZMIEŃ HASŁO"}
        </button>
      </div>
    </div>
  );
}
