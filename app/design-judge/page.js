"use client";
import { useState, useEffect } from "react";
import { saveDesignReview, loadDesignReviews, deleteDesignReview } from "../../lib/supabase";
import Nav from "../components/Nav";

const accent = "#b8763a";

const fitColors = { excellent: "#0d9e6e", good: "#2563eb", poor: "#b8763a", not_suitable: "#b83020" };
const fitLabels = { excellent: "Doskonały fit", good: "Dobry fit", poor: "Słaby fit", not_suitable: "Nie pasuje" };

function ScoreRing({ score }) {
  const color = score >= 70 ? "#0d9e6e" : score >= 40 ? "#b8763a" : "#b83020";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
      <div style={{ color: "#bbb", fontSize: 11, marginTop: 2 }}>/ 100</div>
    </div>
  );
}

function HistoryCard({ review, onLoad, onDelete }) {
  const v = review.verdict;
  const score = v?.score ?? 0;
  const color = score >= 70 ? "#0d9e6e" : score >= 40 ? "#b8763a" : "#b83020";
  const fitColor = fitColors[v?.nadwyraz_fit] || "#888";

  return (
    <div
      style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e4de", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
      onClick={() => onLoad(review)}
    >
      {review.image_base64 ? (
        <img
          src={`data:image/jpeg;base64,${review.image_base64}`}
          alt={review.image_name}
          style={{ width: "100%", height: 140, objectFit: "cover", display: "block", background: "#f5f3ef" }}
        />
      ) : (
        <div style={{ width: "100%", height: 140, background: "#f5f3ef", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 32 }}>🖼</div>
      )}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color }}>{score}<span style={{ fontSize: 11, fontWeight: 400, color: "#bbb" }}>/100</span></div>
          <div style={{ background: fitColor + "15", color: fitColor, borderRadius: 20, padding: "2px 8px", fontSize: 9, fontWeight: 700 }}>
            {fitLabels[v?.nadwyraz_fit] || v?.nadwyraz_fit || "—"}
          </div>
        </div>
        <div style={{ color: "#555", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
          {review.image_name || "Projekt"}
        </div>
        <div style={{ color: "#aaa", fontSize: 10, marginBottom: 8 }}>
          {new Date(review.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(review.id); }}
          style={{ background: "none", border: "1px solid #eee", borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}
        >
          Usuń ✕
        </button>
      </div>
    </div>
  );
}

export default function DesignJudge() {
  const [tab, setTab] = useState("review");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", category: "good", product_type: "", target_audience: "", style_tags: "" });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab]);

  async function fetchHistory() {
    setHistoryLoading(true);
    const data = await loadDesignReviews().catch(() => []);
    setHistory(data);
    setHistoryLoading(false);
  }

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    // Read as base64 for saving to Supabase
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result.split(",")[1]);
    reader.readAsDataURL(f);
  }

  async function handleReview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brief", brief);
      const res = await fetch("/api/design/review", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.verdict);
      // Save to history
      await saveDesignReview({
        imageBase64,
        imageName: file.name,
        brief,
        verdict: data.verdict,
      }).catch(console.error);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function handleUploadFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setUploadFile(f);
    setUploadPreview(URL.createObjectURL(f));
    setUploadSuccess(false);
  }

  async function handleUpload() {
    if (!uploadFile || !uploadForm.title || !uploadForm.description) return;
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      Object.entries(uploadForm).forEach(([k, v]) => fd.append(k, v));
      const res = await fetch("/api/design/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setUploadSuccess(true);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadForm({ title: "", description: "", category: "good", product_type: "", target_audience: "", style_tags: "" });
    } catch (e) {
      setError(e.message);
    }
    setUploadLoading(false);
  }

  async function handleDeleteReview(id) {
    if (!window.confirm("Usunąć tę ocenę?")) return;
    await deleteDesignReview(id).catch(console.error);
    setHistory(prev => prev.filter(r => r.id !== id));
    if (selectedReview?.id === id) setSelectedReview(null);
  }

  function handleLoadReview(review) {
    setSelectedReview(review);
  }

  const s = {
    page: { minHeight: "100vh", background: "#f5f3ef", fontFamily: "var(--font-open-sans), system-ui, sans-serif", padding: 24 },
    header: { marginBottom: 28 },
    title: { color: "#1a1814", fontWeight: 400, fontSize: 28, marginBottom: 4, fontFamily: "var(--font-dm-serif), 'DM Serif Display', Georgia, serif", lineHeight: 1.2 },
    subtitle: { color: "#7a7570", fontSize: 13, fontFamily: "var(--font-open-sans), system-ui, sans-serif" },
    tabs: { display: "flex", gap: 8, marginBottom: 24 },
    tab: (active) => ({ padding: "8px 18px", borderRadius: 8, border: `1px solid ${active ? accent : "#ddd"}`, background: active ? accent + "15" : "#fff", color: active ? accent : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }),
    card: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e8e4de", marginBottom: 16 },
    label: { color: "#888", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6, display: "block" },
    input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12 },
    textarea: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 16, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12, minHeight: 80, resize: "vertical" },
    btn: { background: accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", width: "100%" },
  };

  return (
    <>
    <Nav current="/design-judge" />
    <div style={s.page}>
      <div style={s.header}>
        <a href="/" style={{ color: "#888", fontSize: 11, textDecoration: "none" }}>← Consensus Engine</a>
        <div style={s.title}>DESIGN JUDGE</div>
        <div style={s.subtitle}>Ocena projektów graficznych · Nadwyraz.com</div>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === "review")} onClick={() => setTab("review")}>Oceń projekt</button>
        <button style={s.tab(tab === "history")} onClick={() => setTab("history")}>
          Historia {history.length > 0 && tab !== "history" ? `(${history.length})` : ""}
        </button>
        <button style={s.tab(tab === "upload")} onClick={() => setTab("upload")}>Biblioteka</button>
      </div>

      {/* ── REVIEW TAB ── */}
      {tab === "review" && (
        <div>
          <div style={s.card}>
            <label style={s.label}>PROJEKT GRAFICZNY</label>
            <input type="file" accept="image/*" onChange={handleFile} style={{ marginBottom: 12, fontSize: 12 }} />
            {preview && <img src={preview} style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 300, objectFit: "contain" }} />}
            <label style={s.label}>BRIEF / KONTEKST (opcjonalnie)</label>
            <textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Dla kogo jest ten projekt? Jaki produkt? Jaki cel?" style={s.textarea} />
            <button onClick={handleReview} disabled={!file || loading} style={{ ...s.btn, opacity: !file || loading ? 0.5 : 1 }}>
              {loading ? "Oceniam..." : "▶ OCEŃ PROJEKT"}
            </button>
          </div>

          {error && <div style={{ color: "#b83020", padding: 12, background: "#fff0ee", borderRadius: 8, marginBottom: 16, fontSize: 12 }}>{error}</div>}

          {result && (
            <div>
              <div style={{ ...s.card, textAlign: "center" }}>
                <ScoreRing score={result.score} />
                <div style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 20, background: fitColors[result.nadwyraz_fit] + "15", color: fitColors[result.nadwyraz_fit], fontSize: 11, fontWeight: 700 }}>
                  {fitLabels[result.nadwyraz_fit] || result.nadwyraz_fit}
                </div>
                <p style={{ color: "#444", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>{result.verdict}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ ...s.card, marginBottom: 0 }}>
                  <div style={{ color: "#0d9e6e", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>✓ Mocne strony</div>
                  {(result.strengths || []).map((str, i) => <div key={i} style={{ color: "#555", fontSize: 11, marginBottom: 4 }}>• {str}</div>)}
                </div>
                <div style={{ ...s.card, marginBottom: 0 }}>
                  <div style={{ color: "#b83020", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>✗ Słabe strony</div>
                  {(result.weaknesses || []).map((w, i) => <div key={i} style={{ color: "#555", fontSize: 11, marginBottom: 4 }}>• {w}</div>)}
                </div>
              </div>
              <div style={s.card}>
                <div style={{ color: accent, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>→ Rekomendacja</div>
                <p style={{ color: "#444", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{result.recommendation}</p>
              </div>
              <div style={{ color: "#0d9e6e", fontSize: 11, textAlign: "center", marginTop: -8, marginBottom: 16 }}>
                ✓ Ocena zapisana w historii
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div>
          {selectedReview ? (
            /* Detail view of one review */
            <div>
              <button onClick={() => setSelectedReview(null)} style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "7px 14px", fontSize: 11, color: "#888", cursor: "pointer", fontFamily: "inherit", marginBottom: 16 }}>
                ← Wróć do historii
              </button>
              <div style={{ ...s.card, textAlign: "center" }}>
                {selectedReview.image_base64 && (
                  <img
                    src={`data:image/jpeg;base64,${selectedReview.image_base64}`}
                    alt={selectedReview.image_name}
                    style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8, marginBottom: 16 }}
                  />
                )}
                <div style={{ color: "#aaa", fontSize: 10, marginBottom: 8 }}>
                  {selectedReview.image_name} · {new Date(selectedReview.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                {selectedReview.brief && (
                  <div style={{ background: "#f5f3ef", borderRadius: 8, padding: "8px 12px", marginBottom: 16, color: "#777", fontSize: 11, textAlign: "left" }}>
                    <span style={{ fontWeight: 700 }}>Brief:</span> {selectedReview.brief}
                  </div>
                )}
                <ScoreRing score={selectedReview.verdict?.score ?? 0} />
                <div style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 20, background: fitColors[selectedReview.verdict?.nadwyraz_fit] + "15", color: fitColors[selectedReview.verdict?.nadwyraz_fit], fontSize: 11, fontWeight: 700 }}>
                  {fitLabels[selectedReview.verdict?.nadwyraz_fit] || selectedReview.verdict?.nadwyraz_fit}
                </div>
                <p style={{ color: "#444", fontSize: 13, lineHeight: 1.7, marginTop: 12, textAlign: "left" }}>{selectedReview.verdict?.verdict}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ ...s.card, marginBottom: 0 }}>
                  <div style={{ color: "#0d9e6e", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>✓ Mocne strony</div>
                  {(selectedReview.verdict?.strengths || []).map((str, i) => <div key={i} style={{ color: "#555", fontSize: 11, marginBottom: 4 }}>• {str}</div>)}
                </div>
                <div style={{ ...s.card, marginBottom: 0 }}>
                  <div style={{ color: "#b83020", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>✗ Słabe strony</div>
                  {(selectedReview.verdict?.weaknesses || []).map((w, i) => <div key={i} style={{ color: "#555", fontSize: 11, marginBottom: 4 }}>• {w}</div>)}
                </div>
              </div>
              <div style={s.card}>
                <div style={{ color: accent, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>→ Rekomendacja</div>
                <p style={{ color: "#444", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{selectedReview.verdict?.recommendation}</p>
              </div>
              <button onClick={() => handleDeleteReview(selectedReview.id)} style={{ background: "none", border: "1px solid #f0ddd5", borderRadius: 8, padding: "8px 16px", fontSize: 11, color: "#b83020", cursor: "pointer", fontFamily: "inherit" }}>
                Usuń tę ocenę ✕
              </button>
            </div>
          ) : (
            /* Grid of history cards */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ color: "#888", fontSize: 12 }}>
                  {historyLoading ? "Ładuję..." : `${history.length} ocen${history.length === 1 ? "a" : history.length < 5 ? "y" : ""}`}
                </div>
                <button onClick={fetchHistory} style={{ background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
                  ↺ Odśwież
                </button>
              </div>

              {historyLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#bbb" }}>Ładuję historię...</div>
              ) : history.length === 0 ? (
                <div style={{ ...s.card, textAlign: "center", padding: 48 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                  <div style={{ color: "#aaa", fontSize: 13 }}>Brak ocen w historii</div>
                  <div style={{ color: "#ccc", fontSize: 11, marginTop: 4 }}>Oceń projekt w zakładce "Oceń projekt"</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                  {history.map(review => (
                    <HistoryCard
                      key={review.id}
                      review={review}
                      onLoad={handleLoadReview}
                      onDelete={handleDeleteReview}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD TAB ── */}
      {tab === "upload" && (
        <div>
          <div style={s.card}>
            <label style={s.label}>OBRAZ</label>
            <input type="file" accept="image/*" onChange={handleUploadFile} style={{ marginBottom: 12, fontSize: 12 }} />
            {uploadPreview && <img src={uploadPreview} style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 250, objectFit: "contain" }} />}
            <label style={s.label}>TYTUŁ</label>
            <input value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="Nazwa projektu" style={s.input} />
            <label style={s.label}>OPIS (dlaczego dobry/zły?)</label>
            <textarea value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Opisz co jest dobre lub złe w tym projekcie i dlaczego..." style={s.textarea} />
            <label style={s.label}>KATEGORIA</label>
            <select value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))} style={{ ...s.input, marginBottom: 12 }}>
              <option value="good">Dobry projekt</option>
              <option value="bad">Zły projekt</option>
            </select>
            <label style={s.label}>TYP PRODUKTU</label>
            <input value={uploadForm.product_type} onChange={e => setUploadForm(f => ({ ...f, product_type: e.target.value }))} placeholder="np. whisky, kawa, kosmetyki" style={s.input} />
            <label style={s.label}>GRUPA DOCELOWA</label>
            <input value={uploadForm.target_audience} onChange={e => setUploadForm(f => ({ ...f, target_audience: e.target.value }))} placeholder="np. mężczyźni 30-45, koneserzy" style={s.input} />
            <label style={s.label}>TAGI STYLU (oddzielone przecinkami)</label>
            <input value={uploadForm.style_tags} onChange={e => setUploadForm(f => ({ ...f, style_tags: e.target.value }))} placeholder="np. minimalizm, ciemny, luksus" style={s.input} />
            <button onClick={handleUpload} disabled={!uploadFile || !uploadForm.title || !uploadForm.description || uploadLoading} style={{ ...s.btn, opacity: (!uploadFile || !uploadForm.title || !uploadForm.description || uploadLoading) ? 0.5 : 1 }}>
              {uploadLoading ? "Zapisuję..." : "↑ DODAJ DO BIBLIOTEKI"}
            </button>
            {uploadSuccess && <div style={{ color: "#0d9e6e", marginTop: 12, fontSize: 12, textAlign: "center" }}>✓ Dodano do biblioteki!</div>}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
      </>
  );
}