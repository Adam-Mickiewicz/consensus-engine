"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const ACCENT = "#6366f1";

export default function TwoFactorModal({ dark, onSuccess, onClose }) {
  const bg  = dark ? "#111110" : "#ffffff";
  const bdr = dark ? "#2a2a28" : "#e2e8f0";
  const txt = dark ? "#e0ddd8" : "#0f172a";
  const sub = dark ? "#6a6560" : "#64748b";
  const hov = dark ? "#1a1a1a" : "#f8fafc";

  const [tab, setTab]       = useState("totp"); // totp | email
  const [code, setCode]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, [tab]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6) submitCode();
  }, [code]); // eslint-disable-line

  const submitCode = async () => {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;

      const endpoint = tab === "totp"
        ? "/api/auth/totp/verify"
        : "/api/auth/totp/email-otp";
      const body = tab === "totp"
        ? { code }
        : { action: "verify", code };

      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); setCode(""); return; }

      if (json.session_id) {
        // Store session in sessionStorage
        sessionStorage.setItem("pii_session_id",  json.session_id);
        sessionStorage.setItem("pii_expires_at",  json.expires_at);
        onSuccess(json.session_id, json.expires_at);
      } else if (json.mode === "setup") {
        onSuccess(null, null, "setup");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendEmailOtp = async () => {
    setEmailLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      const res = await fetch("/api/auth/totp/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
        body: JSON.stringify({ action: "send" }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setEmailSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setEmailLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    padding: "12px 0", textAlign: "center",
    fontSize: 28, fontWeight: 700, letterSpacing: 10,
    fontFamily: "var(--font-geist-mono), monospace",
    border: `2px solid ${error ? "#ef4444" : bdr}`,
    borderRadius: 10, background: hov, color: txt, outline: "none",
  };

  return (
    <>
      <style>{`
        .tfm-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px}
        .tfm-modal{background:${bg};border:1px solid ${bdr};border-radius:16px;padding:32px;width:100%;max-width:420px;font-family:var(--font-geist-sans),system-ui,sans-serif;box-shadow:0 12px 60px rgba(0,0,0,0.4)}
        .tfm-tabs{display:flex;gap:4px;background:${hov};border-radius:8px;padding:3px;margin-bottom:24px}
        .tfm-tab{flex:1;padding:7px;text-align:center;font-size:12px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:${sub};font-family:inherit}
        .tfm-tab.active{background:${bg};color:${txt};font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
      `}</style>
      <div className="tfm-backdrop" onClick={onClose}>
        <div className="tfm-modal" onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 20, color: txt, marginBottom: 6 }}>
            Weryfikacja 2FA
          </div>
          <div style={{ fontSize: 13, color: sub, marginBottom: 20 }}>
            Wymagana do odblokowania danych osobowych
          </div>

          <div className="tfm-tabs">
            <button className={"tfm-tab" + (tab === "totp" ? " active" : "")} onClick={() => { setTab("totp"); setCode(""); setError(null); }}>
              🔐 Authenticator
            </button>
            <button className={"tfm-tab" + (tab === "email" ? " active" : "")} onClick={() => { setTab("email"); setCode(""); setError(null); setEmailSent(false); }}>
              📧 Email OTP
            </button>
          </div>

          {tab === "totp" && (
            <>
              <div style={{ fontSize: 13, color: sub, marginBottom: 14 }}>
                Otwórz aplikację Google Authenticator i wpisz kod:
              </div>
              <input
                ref={inputRef}
                style={inputStyle}
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                disabled={loading}
              />
              <div style={{ marginTop: 14, textAlign: "center" }}>
                <a href="/admin/2fa-setup" style={{ fontSize: 12, color: ACCENT, textDecoration: "none" }}>
                  Nie mam skonfigurowanego Authenticatora →
                </a>
              </div>
            </>
          )}

          {tab === "email" && (
            <>
              {!emailSent ? (
                <>
                  <div style={{ fontSize: 13, color: sub, marginBottom: 16 }}>
                    Wyślemy jednorazowy kod na Twój adres email. Ważny przez 10 minut.
                  </div>
                  <button
                    onClick={sendEmailOtp}
                    disabled={emailLoading}
                    style={{
                      width: "100%", padding: "11px", borderRadius: 8,
                      background: ACCENT, color: "#fff", border: "none",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      opacity: emailLoading ? 0.6 : 1,
                    }}>
                    {emailLoading ? "Wysyłam…" : "Wyślij kod na email"}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: sub, marginBottom: 14 }}>
                    Kod wysłany. Wpisz 6 cyfr:
                  </div>
                  <input
                    ref={inputRef}
                    style={inputStyle}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    disabled={loading}
                  />
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <button onClick={() => { setEmailSent(false); setCode(""); }} style={{ fontSize: 12, color: sub, background: "none", border: "none", cursor: "pointer" }}>
                      Wyślij ponownie
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#ef444411", border: "1px solid #ef444433", borderRadius: 6, fontSize: 12, color: "#ef4444" }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: sub }}>
              Weryfikuję…
            </div>
          )}

          <button onClick={onClose} style={{ marginTop: 20, width: "100%", padding: "9px", borderRadius: 8, background: "none", border: `1px solid ${bdr}`, color: sub, fontSize: 12, cursor: "pointer" }}>
            Anuluj
          </button>
        </div>
      </div>
    </>
  );
}
