"use client";
import { useDarkMode } from "../../../../hooks/useDarkMode";
import { getCustomer } from "../../../../../lib/crm/mockData";
import { use, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../../../lib/supabase";

const LIGHT = {
  surface: "#ffffff", border: "#ddd9d2",
  text: "#1a1814", textSub: "#7a7570", accent: "#b8763a",
  hover: "#eeecea", kpi: "#faf9f7",
};
const DARK = {
  surface: "#111110", border: "#1e1e1e",
  text: "#e0ddd8", textSub: "#6a6560", accent: "#b8763a",
  hover: "#1a1a1a", kpi: "#0d0d0c",
};

const SEG_COLORS: Record<string, string> = {
  Diamond: "#60a5fa", Platinum: "#a78bfa", Gold: "#fbbf24",
  Returning: "#34d399", New: "#f87171",
};
const RISK_COLORS: Record<string, string> = {
  OK: "#34d399", Risk: "#fbbf24", HighRisk: "#f97316", Lost: "#f87171",
};

const MONTHS_PL: Record<string, string> = {
  '01': 'stycznia', '02': 'lutego', '03': 'marca', '04': 'kwietnia', '05': 'maja',
  '06': 'czerwca', '07': 'lipca', '08': 'sierpnia', '09': 'września', '10': 'października',
  '11': 'listopada', '12': 'grudnia',
};

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_PL[m]} ${y}`;
}

function buildNextBestAction(customer: NonNullable<ReturnType<typeof getCustomer>>) {
  if (customer.risk_level === 'Lost') {
    return `Klient nieaktywny od ponad roku. Wyślij spersonalizowaną ofertę powitalną z 15% rabatem na produkty z kategorii "${customer.ulubiony_swiat}". Użyj tematu nawiązującego do ostatnio przeglądanych tagów.`;
  }
  if (customer.risk_level === 'HighRisk') {
    return `Klient wykazuje oznaki rezygnacji. Zaproponuj limitowaną edycję z obszaru "${customer.ulubiony_swiat}" lub wyślij newsletter z kuratowaną listą nowości zgodnych z jego DNA zakupowym.`;
  }
  if (customer.is_early_adopter) {
    return `Early Adopter — powiadom o nadchodzących premierach produktowych z wyprzedzeniem 7 dni. Zaoferuj przedsprzedaż dla stałych klientów.`;
  }
  if (customer.top_okazje.includes('Dzień Matki') && new Date().getMonth() >= 3 && new Date().getMonth() <= 4) {
    return `Zbliża się Dzień Matki — historycznie kupuje prezenty w tym okresie. Wyślij personalizowaną ofertę min. 3 tygodnie przed 26 maja.`;
  }
  if (customer.buyer_type === 'promo_hunter') {
    return `Klient reaguje głównie na promocje. Zaproponuj bundle produktowy z progiem darmowej dostawy lub flash sale na produkty z segmentu "${customer.ulubiony_swiat}".`;
  }
  return `Klient lojalny i aktywny. Rozważ zaproszenie do programu ambasadorskiego lub early-access na nowe kolekcje z kategorii "${customer.ulubiony_swiat}".`;
}

// ─── Reveal Modal ─────────────────────────────────────────────────────────────
// Email nigdy nie trafia do stanu rodzica — istnieje wyłącznie w tym komponencie
// przez czas otwarcia modala. Po zamknięciu ref jest zerowany.
function RevealModal({
  clientId,
  onClose,
  dark,
}: {
  clientId: string;
  onClose: () => void;
  dark: boolean;
}) {
  const t = dark ? DARK : LIGHT;

  // reason to pole kontrolowane
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "revealed">("form");

  // Email przechowywany w ref (nie w state) — React nie re-renderuje po zmianie,
  // a zawartość znika razem z komponentem przy odmontowaniu/zamknięciu.
  const emailRef = useRef<string | null>(null);
  // Osobny state tylko do wymuszenia jednego re-renderu przy ujawnieniu
  const [revealed, setRevealed] = useState(false);

  // Zeruj ref przy odmontowaniu
  useEffect(() => {
    return () => {
      emailRef.current = null;
    };
  }, []);

  const handleReveal = useCallback(async () => {
    if (!reason.trim()) {
      setError("Powód odkrycia jest wymagany.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token ?? null;

      const res = await fetch("/api/crm/reveal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { "Authorization": `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ client_id: clientId, reason: reason.trim() }),
        // Blokuj cache po stronie przeglądarki
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Nieznany błąd serwera.");
        return;
      }

      // Zapisz do ref, nie do state — nie pojawi się w React DevTools ani snapshots
      emailRef.current = json.email;
      setRevealed(true);
      setStep("revealed");
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }, [clientId, reason]);

  const handleClose = useCallback(() => {
    // Jawne wyzerowanie przed zamknięciem
    emailRef.current = null;
    setRevealed(false);
    onClose();
  }, [onClose]);

  return (
    <>
      <style>{`
        .rv-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .rv-modal { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 14px; padding: 28px 32px; width: 100%; max-width: 460px; font-family: var(--font-geist-sans), system-ui, sans-serif; box-shadow: 0 8px 40px rgba(0,0,0,0.18); }
        .rv-title { font-family: var(--font-dm-serif), serif; font-size: 20px; color: ${t.text}; margin: 0 0 6px; }
        .rv-desc { font-size: 13px; color: ${t.textSub}; margin: 0 0 22px; line-height: 1.5; }
        .rv-label { font-size: 11px; color: ${t.textSub}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; display: block; }
        .rv-textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid ${t.border}; border-radius: 8px; background: ${t.kpi}; color: ${t.text}; font-size: 13px; font-family: var(--font-geist-sans), system-ui, sans-serif; resize: vertical; min-height: 80px; outline: none; }
        .rv-textarea:focus { border-color: ${t.accent}; }
        .rv-error { margin-top: 10px; padding: 8px 12px; background: #f8717122; border: 1px solid #f8717144; border-radius: 6px; font-size: 12px; color: #f87171; }
        .rv-footer { display: flex; align-items: center; gap: 10px; margin-top: 20px; }
        .rv-btn { padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.15s; }
        .rv-btn-primary { background: ${t.accent}; color: #fff; }
        .rv-btn-primary:hover { opacity: 0.87; }
        .rv-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .rv-btn-ghost { background: transparent; color: ${t.textSub}; border: 1px solid ${t.border}; }
        .rv-btn-ghost:hover { background: ${t.hover}; color: ${t.text}; }
        .rv-audit-note { margin-top: 14px; font-size: 11px; color: ${t.textSub}; display: flex; align-items: center; gap: 6px; }
        .rv-revealed-box { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
        .rv-revealed-label { font-size: 10px; color: ${t.textSub}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .rv-revealed-value { font-size: 14px; color: ${t.text}; font-family: var(--font-geist-mono), monospace; word-break: break-all; }
        .rv-once-note { font-size: 11px; color: #f97316; margin-top: 8px; }
      `}</style>

      <div className="rv-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
        <div className="rv-modal" onClick={e => e.stopPropagation()}>
          {step === "form" ? (
            <>
              <div className="rv-title">Odkryj tożsamość klienta</div>
              <div className="rv-desc">
                Identyfikator: <strong>{clientId}</strong>
                <br />
                Odkrycie tożsamości jest operacją audytowaną. Podaj uzasadnienie,
                które zostanie zapisane w logu systemowym.
              </div>

              <label className="rv-label" htmlFor="rv-reason">Powód odkrycia *</label>
              <textarea
                id="rv-reason"
                className="rv-textarea"
                placeholder="np. Weryfikacja zamówienia zwrotnego, kontakt z klientem ws. reklamacji..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                maxLength={500}
                autoFocus
              />

              {error && <div className="rv-error">⚠ {error}</div>}

              <div className="rv-footer">
                <button
                  className="rv-btn rv-btn-primary"
                  onClick={handleReveal}
                  disabled={loading || !reason.trim()}
                >
                  {loading ? "Weryfikuję…" : "Odkryj tożsamość"}
                </button>
                <button className="rv-btn rv-btn-ghost" onClick={handleClose}>
                  Anuluj
                </button>
              </div>

              <div className="rv-audit-note">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Każde odkrycie jest logowane z Twoim ID użytkownika i datą.
              </div>
            </>
          ) : (
            <>
              <div className="rv-title">Tożsamość odkryta</div>
              <div className="rv-desc">
                Akcja zarejestrowana w logu audytu. Dane widoczne jednorazowo —
                po zamknięciu tego okna nie są możliwe do odtworzenia bez ponownej akcji.
              </div>

              <div className="rv-revealed-box">
                <div className="rv-revealed-label">Identyfikator tożsamości (vault)</div>
                {revealed && emailRef.current ? (
                  <div className="rv-revealed-value">{emailRef.current}</div>
                ) : (
                  <div style={{ color: LIGHT.textSub, fontSize: 13 }}>Brak danych w vault dla tego klienta.</div>
                )}
              </div>

              <div className="rv-once-note">
                ⚠ Ten identyfikator jest widoczny tylko teraz. Nie jest zapisany w przeglądarce.
              </div>

              <div className="rv-footer">
                <button className="rv-btn rv-btn-ghost" onClick={handleClose}>
                  Zamknij
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [dark] = useDarkMode();
  const t = (dark ? DARK : LIGHT) as typeof LIGHT;

  const [isAdmin, setIsAdmin] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  // Sprawdź uprawnienia admin po stronie klienta (readonly — nie ujawnia nic wrażliwego)
  useEffect(() => {
    async function checkAdminPermission() {
      try {
        const { data, error } = await supabase
          .from("user_permissions")
          .select("access_level")
          .eq("category", "admin")
          .eq("access_level", "write")
          .limit(1);
        if (!error && data && data.length > 0) {
          setIsAdmin(true);
        }
      } catch {
        // Brak połączenia z Supabase — ukryj przycisk (fail-safe)
        setIsAdmin(false);
      }
    }
    checkAdminPermission();
  }, []);

  const customer = getCustomer(id) || getCustomer('NZ-DEMO001');

  if (!customer) {
    return (
      <div style={{ fontFamily: "var(--font-geist-sans)", color: t.text, padding: 24 }}>
        <h1 style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 24, marginBottom: 8 }}>Klient nie znaleziony</h1>
        <p style={{ color: t.textSub, fontSize: 14 }}>ID: {id}</p>
      </div>
    );
  }

  const totalOrders = customer.orders.length;
  const sortedOrders = [...customer.orders].sort((a, b) => b.date.localeCompare(a.date));
  const cyclicOccasions = customer.top_okazje.filter(occ => {
    const years = [...new Set(customer.orders.filter(o => o.occasion === occ).map(o => o.date.slice(0, 4)))];
    return years.length >= 2;
  });
  const nextBestAction = buildNextBestAction(customer);

  return (
    <>
      <style>{`
        .cp-wrap { font-family: var(--font-geist-sans), system-ui, sans-serif; max-width: 900px; }
        .cp-section { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: ${t.textSub}; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid ${t.border}; }
        .cp-block { margin-bottom: 28px; }
        .cp-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; overflow: hidden; }
        .cp-header { background: ${t.kpi}; border: 1px solid ${t.border}; border-radius: 10px; padding: 24px 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
        .cp-header-name { font-family: var(--font-dm-serif), serif; font-size: 28px; color: ${t.text}; margin: 0 0 4px; }
        .cp-identity { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .cp-id-pill { font-family: var(--font-geist-mono), monospace; font-size: 12px; color: ${t.textSub}; background: ${t.hover}; border: 1px solid ${t.border}; border-radius: 6px; padding: 3px 9px; letter-spacing: 0.04em; }
        .cp-reveal-btn { display: flex; align-items: center; gap: 6px; padding: 5px 13px; border-radius: 6px; background: transparent; border: 1px solid ${t.accent}; color: ${t.accent}; font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font-geist-sans), system-ui, sans-serif; transition: background 0.12s; }
        .cp-reveal-btn:hover { background: ${t.accent}22; }
        .cp-audit-hint { font-size: 10px; color: ${t.textSub}; margin-top: 2px; }
        .cp-header-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .cp-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .cp-kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .cp-kpi { text-align: center; padding: 14px; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 8px; }
        .cp-kpi-val { font-family: var(--font-dm-serif), serif; font-size: 22px; color: ${t.text}; }
        .cp-kpi-label { font-size: 11px; color: ${t.textSub}; margin-top: 2px; }
        .cp-pill { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; background: ${t.hover}; color: ${t.text}; border: 1px solid ${t.border}; margin: 3px; }
        .cp-pillar { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; background: ${t.accent}22; color: ${t.accent}; border: 1px solid ${t.accent}44; margin: 3px; }
        .cp-order-row { padding: 14px 18px; border-bottom: 1px solid ${t.border}; }
        .cp-order-row:last-child { border-bottom: none; }
        .cp-order-head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; flex-wrap: wrap; }
        .cp-order-date { font-size: 12px; color: ${t.textSub}; min-width: 120px; }
        .cp-order-amount { font-weight: 700; color: ${t.text}; font-size: 14px; }
        .cp-flag { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 600; }
        .cp-order-products { font-size: 12px; color: ${t.textSub}; }
        .cp-nba { background: ${t.accent}11; border: 1px solid ${t.accent}44; border-radius: 10px; padding: 20px 24px; }
        .cp-nba-title { font-size: 12px; color: ${t.accent}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .cp-nba-text { font-size: 14px; color: ${t.text}; line-height: 1.6; }
        .cp-cyclic-row { padding: 12px 18px; border-bottom: 1px solid ${t.border}; display: flex; align-items: center; gap: 12px; font-size: 13px; }
        .cp-cyclic-row:last-child { border-bottom: none; }
        @media (max-width: 640px) { .cp-header { flex-direction: column; } }
      `}</style>

      {showReveal && (
        <RevealModal
          clientId={customer.id}
          onClose={() => setShowReveal(false)}
          dark={dark as boolean}
        />
      )}

      <div className="cp-wrap">
        {/* Header */}
        <div className="cp-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cp-header-name">{customer.name}</div>

            {/* Identyfikator — email zawsze zamaskowany */}
            <div className="cp-identity">
              <span className="cp-id-pill">{customer.id}</span>
              {isAdmin ? (
                <div>
                  <button
                    className="cp-reveal-btn"
                    onClick={() => setShowReveal(true)}
                    aria-label="Odkryj tożsamość klienta"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Odkryj tożsamość
                  </button>
                  <div className="cp-audit-hint">Każde odkrycie jest logowane</div>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: t.textSub }}>
                  Tożsamość chroniona — tylko admin
                </span>
              )}
            </div>

            <div className="cp-header-badges">
              <span className="cp-badge" style={{
                background: SEG_COLORS[customer.segment] + "22",
                color: SEG_COLORS[customer.segment],
                border: `1px solid ${SEG_COLORS[customer.segment]}44`,
              }}>{customer.segment}</span>
              <span className="cp-badge" style={{
                background: RISK_COLORS[customer.risk_level] + "22",
                color: RISK_COLORS[customer.risk_level],
                border: `1px solid ${RISK_COLORS[customer.risk_level]}44`,
              }}>{customer.risk_level}</span>
              {customer.is_early_adopter && (
                <span className="cp-badge" style={{ background: "#60a5fa22", color: "#60a5fa", border: "1px solid #60a5fa44" }}>Early Adopter</span>
              )}
              {customer.buyer_type === 'promo_hunter' && (
                <span className="cp-badge" style={{ background: "#f8717122", color: "#f87171", border: "1px solid #f8717144" }}>Promo Hunter</span>
              )}
              {customer.winback_priority && (
                <span className="cp-badge" style={{ background: "#f9731622", color: "#f97316", border: "1px solid #f9731644" }}>⚡ Winback Priority</span>
              )}
            </div>
          </div>

          <div>
            <div className="cp-kpis">
              <div className="cp-kpi">
                <div className="cp-kpi-val" style={{ color: t.accent }}>{customer.ltv.toLocaleString('pl-PL')} zł</div>
                <div className="cp-kpi-label">LTV</div>
              </div>
              <div className="cp-kpi">
                <div className="cp-kpi-val">{totalOrders}</div>
                <div className="cp-kpi-label">Zamówień</div>
              </div>
              <div className="cp-kpi">
                <div className="cp-kpi-val" style={{ fontSize: 14 }}>{customer.first_purchase_date.slice(0, 7)}</div>
                <div className="cp-kpi-label">Pierwszy zakup</div>
              </div>
              <div className="cp-kpi">
                <div className="cp-kpi-val" style={{ fontSize: 14 }}>{customer.last_purchase_date.slice(0, 7)}</div>
                <div className="cp-kpi-label">Ostatni zakup</div>
              </div>
            </div>
          </div>
        </div>

        {/* DNA taksonomiczne */}
        <div className="cp-block">
          <div className="cp-section">DNA Taksonomiczne</div>
          <div className="cp-card" style={{ padding: "18px 20px" }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: t.textSub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ulubiony świat
              </div>
              <span className="cp-pillar" style={{ fontSize: 14, padding: "6px 14px" }}>
                {customer.ulubiony_swiat}
              </span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: t.textSub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Tagi granularne
              </div>
              <div>
                {customer.top_tags_granularne.map(tag => (
                  <span key={tag} className="cp-pill">{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: t.textSub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Filary marki
              </div>
              <div>
                {customer.top_filary_marki.map(p => (
                  <span key={p} className="cp-pillar">{p}</span>
                ))}
              </div>
            </div>
            {customer.top_okazje.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: t.textSub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Okazje zakupowe
                </div>
                <div>
                  {customer.top_okazje.map(occ => (
                    <span key={occ} className="cp-pill">{occ}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cykliczne okazje */}
        {cyclicOccasions.length > 0 && (
          <div className="cp-block">
            <div className="cp-section">Okazje Cykliczne</div>
            <div className="cp-card">
              {cyclicOccasions.map(occ => {
                const years = [...new Set(customer.orders.filter(o => o.occasion === occ).map(o => o.date.slice(0, 4)))].sort();
                return (
                  <div key={occ} className="cp-cyclic-row">
                    <span style={{ fontSize: 18 }}>🔁</span>
                    <div>
                      <div style={{ color: t.text, fontWeight: 600, fontSize: 13 }}>
                        Kupuje <span style={{ color: t.accent }}>{occ}</span> co roku
                      </div>
                      <div style={{ fontSize: 11, color: t.textSub }}>
                        Aktywny od {years[0]} — lata: {years.join(', ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next best action */}
        <div className="cp-block">
          <div className="cp-nba">
            <div className="cp-nba-title">⚡ Next Best Action</div>
            <div className="cp-nba-text">{nextBestAction}</div>
          </div>
        </div>

        {/* Purchase timeline */}
        <div className="cp-block">
          <div className="cp-section">Timeline zakupów ({totalOrders} zamówień)</div>
          <div className="cp-card">
            {sortedOrders.map(order => (
              <div key={order.id} className="cp-order-row">
                <div className="cp-order-head">
                  <span className="cp-order-date">{fmtDate(order.date)}</span>
                  <span className="cp-order-amount">{order.amount.toLocaleString('pl-PL')} zł</span>
                  {order.is_promo && (
                    <span className="cp-flag" style={{ background: "#f8717122", color: "#f87171" }}>PROMO</span>
                  )}
                  {order.is_new_product && (
                    <span className="cp-flag" style={{ background: "#60a5fa22", color: "#60a5fa" }}>NOWOŚĆ</span>
                  )}
                  {order.occasion && (
                    <span className="cp-flag" style={{ background: `${t.accent}22`, color: t.accent }}>
                      🎁 {order.occasion}
                    </span>
                  )}
                </div>
                <div className="cp-order-products">{order.products.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
