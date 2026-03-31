"use client";
import { useState } from "react";
import { supabase } from "../../../../lib/supabase";

export default function TwoFASetupPage() {
  const dark = false;
  const t = {
    text:    dark ? "#e0ddd8" : "#0f172a",
    sub:     dark ? "#6a6560" : "#64748b",
    card:    dark ? "#111110" : "#ffffff",
    border:  dark ? "#1e1e1e" : "#e2e8f0",
    bg:      dark ? "#0a0a0a" : "#f8fafc",
    accent:  "#6366f1",
    green:   "#22c55e",
  };

  const [step, setStep]     = useState(1); // 1 | 2 | 3
  const [qrcode, setQrcode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const fetchQR = async () => {
    setLoading(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    const res  = await fetch("/api/auth/totp/setup", {
      method: "POST",
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error); return; }
    setQrcode(json.qrcode);
    setSecret(json.secret);
    setStep(2);
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setLoading(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    const res  = await fetch("/api/auth/totp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error); setCode(""); return; }
    setStep(3);
  };

  const card = { background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: "28px 32px", maxWidth: 480 };

  return (
    <div style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 24, color: t.text, margin: "0 0 6px" }}>
        Konfiguracja 2FA
      </h1>
      <p style={{ fontSize: 13, color: t.sub, marginBottom: 28 }}>
        Wymagane do odblokowania danych osobowych klientów
      </p>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: step >= s ? t.accent : t.border,
              color: step >= s ? "#fff" : t.sub,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>{step > s ? "✓" : s}</div>
            {s < 3 && <div style={{ width: 32, height: 2, background: step > s ? t.accent : t.border }} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 }}>
            Krok 1: Zainstaluj aplikację
          </div>
          <div style={{ fontSize: 13, color: t.sub, marginBottom: 20, lineHeight: 1.6 }}>
            Pobierz <strong>Google Authenticator</strong> lub <strong>Authy</strong> na telefon.<br />
            Następnie kliknij "Generuj QR code" aby skonfigurować.
          </div>
          <button
            onClick={fetchQR}
            disabled={loading}
            style={{ padding: "10px 22px", background: t.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Generuję…" : "Generuj QR code →"}
          </button>
          {error && <div style={{ marginTop: 12, color: "#ef4444", fontSize: 12 }}>{error}</div>}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && qrcode && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 }}>
            Krok 2: Zeskanuj kod QR
          </div>
          <div style={{ fontSize: 13, color: t.sub, marginBottom: 16 }}>
            Otwórz aplikację Authenticator → dodaj konto → zeskanuj:
          </div>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrcode} alt="QR Code" width={200} height={200} style={{ borderRadius: 8, border: `1px solid ${t.border}` }} />
          </div>
          <details style={{ marginBottom: 20 }}>
            <summary style={{ fontSize: 12, color: t.sub, cursor: "pointer" }}>Nie mogę skanować — pokaż sekret ręcznie</summary>
            <div style={{ marginTop: 8, fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, background: t.bg, padding: "8px 12px", borderRadius: 6, wordBreak: "break-all", color: t.text }}>
              {secret}
            </div>
          </details>
          <div style={{ fontSize: 13, color: t.text, marginBottom: 10, fontWeight: 600 }}>
            Wpisz 6-cyfrowy kod z aplikacji:
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); }}
            onKeyDown={e => e.key === "Enter" && verifyCode()}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "12px 0", textAlign: "center",
              fontSize: 28, fontWeight: 700, letterSpacing: 10,
              fontFamily: "var(--font-geist-mono), monospace",
              border: `2px solid ${error ? "#ef4444" : t.border}`,
              borderRadius: 10, background: t.bg, color: t.text, outline: "none",
              marginBottom: 12,
            }}
            placeholder="000000"
            autoFocus
          />
          <button
            onClick={verifyCode}
            disabled={loading || code.length < 6}
            style={{ padding: "10px 22px", background: t.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (loading || code.length < 6) ? 0.5 : 1 }}>
            {loading ? "Weryfikuję…" : "Potwierdź kod"}
          </button>
          {error && <div style={{ marginTop: 10, color: "#ef4444", fontSize: 12 }}>{error}</div>}
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.green, marginBottom: 8 }}>
            2FA skonfigurowane!
          </div>
          <div style={{ fontSize: 13, color: t.sub, marginBottom: 20 }}>
            Od teraz każdy dostęp do danych osobowych wymaga kodu z Authenticatora.
          </div>
          <a href="/crm" style={{ padding: "10px 22px", background: t.accent, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
            Wróć do CRM →
          </a>
        </div>
      )}
    </div>
  );
}
