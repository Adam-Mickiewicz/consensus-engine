import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | register | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const accent = "#b8763a";

  async function handleSubmit() {
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/";
    } else if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Sprawdź email i potwierdź konto!");
    } else if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth/update-password"
      });
      if (error) setError(error.message);
      else setMessage("Link do resetu hasła wysłany na email!");
    }
    setLoading(false);
  }

  const s = {
    page: { minHeight: "100vh", background: "#f5f0eb", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
    box: { background: "#fff", border: "1px solid #e0d8ce", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400 },
    title: { color: accent, fontWeight: 800, fontSize: 22, letterSpacing: 2, marginBottom: 4 },
    sub: { color: "#888", fontSize: 11, marginBottom: 32 },
    label: { color: "#666", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6, display: "block" },
    input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d8ce", fontFamily: "inherit", fontSize: 13, marginBottom: 16, boxSizing: "border-box", outline: "none" },
    btn: { width: "100%", padding: "12px", borderRadius: 8, background: accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, letterSpacing: 1 },
    link: { background: "none", border: "none", cursor: "pointer", color: accent, fontFamily: "inherit", fontSize: 11, textDecoration: "underline" },
    error: { color: "#c0392b", fontSize: 11, marginBottom: 12, padding: "8px 12px", background: "#fdf2f2", borderRadius: 6 },
    success: { color: "#27ae60", fontSize: 11, marginBottom: 12, padding: "8px 12px", background: "#f2fdf6", borderRadius: 6 },
  };

  return (
    <div style={s.page}>
      <div style={s.box}>
        <div style={s.title}>CONSENSUS ENGINE</div>
        <div style={s.sub}>
          {mode === "login" && "Zaloguj się do swojego konta"}
          {mode === "register" && "Utwórz nowe konto"}
          {mode === "reset" && "Resetuj hasło"}
        </div>

        {error && <div style={s.error}>{error}</div>}
        {message && <div style={s.success}>{message}</div>}

        <label style={s.label}>EMAIL</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="twoj@email.com" onKeyDown={e => e.key === "Enter" && handleSubmit()} />

        {mode !== "reset" && <>
          <label style={s.label}>HASŁO</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </>}

        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? "..." : mode === "login" ? "ZALOGUJ" : mode === "register" ? "ZAREJESTRUJ" : "WYŚLIJ LINK"}
        </button>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {mode === "login" && <>
            <button style={s.link} onClick={() => setMode("register")}>Nie masz konta? Zarejestruj się</button>
            <button style={s.link} onClick={() => setMode("reset")}>Zapomniałem hasła</button>
          </>}
          {mode === "register" && <button style={s.link} onClick={() => setMode("login")}>Masz już konto? Zaloguj się</button>}
          {mode === "reset" && <button style={s.link} onClick={() => setMode("login")}>Wróć do logowania</button>}
        </div>
      </div>
    </div>
  );
}
