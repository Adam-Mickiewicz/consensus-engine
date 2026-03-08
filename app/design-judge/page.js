"use client";
import { useState } from "react";

const accent = "#b8763a";

export default function DesignJudge() {
  const [tab, setTab] = useState("review");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", category: "good", product_type: "", target_audience: "", style_tags: "" });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
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

  const fitColors = { excellent: "#0d9e6e", good: "#2563eb", poor: "#b8763a", not_suitable: "#b83020" };
  const fitLabels = { excellent: "Doskonały fit", good: "Dobry fit", poor: "Słaby fit", not_suitable: "Nie pasuje" };

  const s = {
    page: { minHeight: "100vh", background: "#f5f3ef", fontFamily: "'IBM Plex Mono', monospace", padding: 24 },
    header: { marginBottom: 28 },
    title: { color: accent, fontWeight: 800, fontSize: 20, letterSpacing: 2, marginBottom: 4 },
    subtitle: { color: "#888", fontSize: 12 },
    tabs: { display: "flex", gap: 8, marginBottom: 24 },
    tab: (active) => ({ padding: "8px 18px", borderRadius: 8, border: `1px solid ${active ? accent : "#ddd"}`, background: active ? accent + "15" : "#fff", color: active ? accent : "#888", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }),
    card: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e8e4de", marginBottom: 16 },
    label: { color: "#888", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6, display: "block" },
    input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12 },
    textarea: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 16, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12, minHeight: 80, resize: "vertical" },
    btn: { background: accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", width: "100%" },
    score: (s) => ({ fontSize: 48, fontWeight: 900, color: s >= 70 ? "#0d9e6e" : s >= 40 ? "#b8763a" : "#b83020" }),
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <a href="/" style={{ color: "#888", fontSize: 11, textDecoration: "none" }}>← Consensus Engine</a>
        <div style={s.title}>DESIGN JUDGE</div>
        <div style={s.subtitle}>Ocena projektów graficznych · Nadwyraz.com</div>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === "review")} onClick={() => setTab("review")}>Oceń projekt</button>
        <button style={s.tab(tab === "upload")} onClick={() => setTab("upload")}>Biblioteka</button>
      </div>

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
                <div style={s.score(result.score)}>{result.score}/100</div>
                <div style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", borderRadius: 20, background: fitColors[result.nadwyraz_fit] + "15", color: fitColors[result.nadwyraz_fit], fontSize: 11, fontWeight: 700 }}>
                  {fitLabels[result.nadwyraz_fit] || result.nadwyraz_fit}
                </div>
                <p style={{ color: "#444", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>{result.verdict}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ ...s.card, marginBottom: 0 }}>
                  <div style={{ color: "#0d9e6e", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>✓ Mocne strony</div>
                  {(result.strengths || []).map((s, i) => <div key={i} style={{ color: "#555", fontSize: 11, marginBottom: 4 }}>• {s}</div>)}
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
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
