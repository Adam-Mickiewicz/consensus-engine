"use client";
import { useState, useEffect } from "react";
import Nav from "../../components/Nav";

const ACCENT = "#b8763a";
function Label({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 1.2, marginBottom: 5, textTransform: "uppercase", fontFamily: "monospace" }}>{children}</div>;
}
function Field({ label, children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><Label>{label}</Label>{children}</div>;
}
function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width: "100%", background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#1a1a1a", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />;
}
function Section({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "10px 16px", background: "#f9f7f5", borderBottom: "1px solid #e0dbd4", fontSize: 12, fontWeight: 700, color: "#555", fontFamily: "monospace" }}>{title}</div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

export default function BrandSettings() {
  const [settings, setSettings] = useState({
    brand_description: "",
    tone_of_voice: "",
    target_audiences: [],
    campaign_examples: [],
    reference_links: [],
    uploaded_files: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [newAudience, setNewAudience] = useState("");
  const [newExample, setNewExample] = useState({ title: "", description: "" });
  const [newLink, setNewLink] = useState({ url: "", note: "" });

  useEffect(() => {
    fetch("/api/brand-settings").then(r => r.json()).then(d => {
      if (!d.error) setSettings(d);
      setLoading(false);
    });
  }, []);

  const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/brand-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_description: settings.brand_description,
        tone_of_voice: settings.tone_of_voice,
        target_audiences: settings.target_audiences,
        campaign_examples: settings.campaign_examples,
        reference_links: settings.reference_links,
        uploaded_files: settings.uploaded_files,
      }),
    });
    const data = await res.json();
    setSaving(false);
    setSaveMsg(data.error ? "❌ " + data.error : "✅ Zapisano!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const uploadFile = async (file) => {
    setUploadingFile(true);
    try {
      const supabaseUrl = "https://dayrmhsdpcgakbsfjkyp.supabase.co";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const fileName = `brand/${Date.now()}-${file.name}`;
      const res = await fetch(`${supabaseUrl}/storage/v1/object/brief-references/${fileName}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${supabaseKey}`, "Content-Type": file.type },
        body: file,
      });
      if (res.ok) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/brief-references/${fileName}`;
        set("uploaded_files", [...(settings.uploaded_files || []), { name: file.name, url: publicUrl, type: file.type }]);
      } else { alert("Błąd uploadu"); }
    } catch(e) { alert("Błąd: " + e.message); }
    setUploadingFile(false);
  };

  if (loading) return <div style={{ padding: 40, color: "#aaa" }}>Ładowanie...</div>;

  return (
    <>
    <Nav current="/tools/brand-settings" />
    <div style={{ minHeight: "100vh", background: "#f5f2ee", fontFamily: "'IBM Plex Mono', monospace", display: "flex" }}>
      {/* SIDEBAR */}
      <div style={{ width: 220, minWidth: 220, background: "#0f0f0f", borderRight: "1px solid #1a1a1a", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 8, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: ACCENT, fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>CONSENSUS</div>
          <div style={{ color: "#444", fontSize: 10, letterSpacing: 1 }}>ENGINE v1.0</div>
        </div>
        <div style={{ color: "#444", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>NAWIGACJA</div>
        
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>🏷️ Ustawienia marki</div>
              <div style={{ fontSize: 12, color: "#888" }}>Kontekst stały dla wszystkich czatów AI w aplikacji</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith("✅") ? "#2d7a4f" : "#cc0000" }}>{saveMsg}</span>}
              <button onClick={save} disabled={saving} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Zapisuję..." : "💾 Zapisz"}
              </button>
            </div>
          </div>

          {/* OPIS MARKI */}
          <Section title="OPIS MARKI">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Kim jesteśmy — opis marki">
                <Textarea value={settings.brand_description} onChange={v => set("brand_description", v)}
                  placeholder="Nadwyraz.com to polska marka produkująca skarpety z wyjątkowymi wzorami flat-design, dziane z przędzy LEGS..." rows={5} />
              </Field>
              <Field label="Tone of voice / sposób komunikacji">
                <Textarea value={settings.tone_of_voice} onChange={v => set("tone_of_voice", v)}
                  placeholder="Jak mówimy do klientów? Jakim językiem? Co jest dla nas ważne w komunikacji?..." rows={4} />
              </Field>
            </div>
          </Section>

          {/* GRUPY DOCELOWE */}
          <Section title="GRUPY DOCELOWE">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(settings.target_audiences || []).map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, background: "#f9f7f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#333", lineHeight: 1.5 }}>{a}</div>
                  <button onClick={() => set("target_audiences", settings.target_audiences.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "1px solid #eee", borderRadius: 6, padding: "6px 10px", color: "#ccc", cursor: "pointer", fontSize: 14 }}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <textarea value={newAudience} onChange={e => setNewAudience(e.target.value)} rows={2}
                  placeholder="np. Kobiety 25-40 lat, zainteresowane modą i prezentami, kupują online..."
                  style={{ flex: 1, background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontFamily: "inherit", resize: "vertical" }} />
                <button onClick={() => { if (newAudience.trim()) { set("target_audiences", [...(settings.target_audiences || []), newAudience.trim()]); setNewAudience(""); } }}
                  style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }}>+</button>
              </div>
            </div>
          </Section>

          {/* PRZYKŁADY KAMPANII */}
          <Section title="PRZYKŁADY DOBRYCH KAMPANII">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(settings.campaign_examples || []).map((ex, i) => (
                <div key={i} style={{ background: "#f9f7f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "10px 12px", display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{ex.title}</div>
                    <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>{ex.description}</div>
                  </div>
                  <button onClick={() => set("campaign_examples", settings.campaign_examples.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16, alignSelf: "flex-start" }}>×</button>
                </div>
              ))}
              <div style={{ background: "#fafafa", border: "1px dashed #ddd", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={newExample.title} onChange={e => setNewExample(p => ({ ...p, title: e.target.value }))} placeholder="Nazwa kampanii..."
                  style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: "inherit" }} />
                <textarea value={newExample.description} onChange={e => setNewExample(p => ({ ...p, description: e.target.value }))} rows={2}
                  placeholder="Co było w tej kampanii dobre? Jakie wyniki? Co można powtórzyć?..."
                  style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", resize: "vertical" }} />
                <button onClick={() => { if (newExample.title.trim()) { set("campaign_examples", [...(settings.campaign_examples || []), { ...newExample }]); setNewExample({ title: "", description: "" }); } }}
                  style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer", alignSelf: "flex-start", fontFamily: "inherit" }}>+ Dodaj przykład</button>
              </div>
            </div>
          </Section>

          {/* LINKI DO MATERIAŁÓW */}
          <Section title="LINKI DO MATERIAŁÓW (brandbook, prezentacje, etc.)">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(settings.reference_links || []).map((link, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", background: "#f9f7f5", border: "1px solid #e0dbd4", borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ flex: 1 }}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1a5ca8", display: "block", marginBottom: 2 }}>{link.url}</a>
                    {link.note && <div style={{ fontSize: 11, color: "#888" }}>{link.note}</div>}
                  </div>
                  <button onClick={() => set("reference_links", settings.reference_links.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
              <div style={{ background: "#fafafa", border: "1px dashed #ddd", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} placeholder="https://..."
                  style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: "inherit" }} />
                <input value={newLink.note} onChange={e => setNewLink(p => ({ ...p, note: e.target.value }))} placeholder="Opis (np. Brandbook 2025, Prezentacja dla inwestorów)..."
                  style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: "inherit" }} />
                <button onClick={() => { if (newLink.url.trim()) { set("reference_links", [...(settings.reference_links || []), { ...newLink }]); setNewLink({ url: "", note: "" }); } }}
                  style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer", alignSelf: "flex-start", fontFamily: "inherit" }}>+ Dodaj link</button>
              </div>
            </div>
          </Section>

          {/* UPLOAD PLIKÓW */}
          <Section title="UPLOAD PLIKÓW (PDF, grafiki)">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(settings.uploaded_files || []).map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", background: "#f0f7ff", border: "1px solid #c8e0f8", borderRadius: 6, padding: "8px 12px" }}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12, color: "#1a5ca8" }}>📄 {f.name}</a>
                  <button onClick={() => set("uploaded_files", settings.uploaded_files.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f9f7f5", border: "2px dashed #ddd", borderRadius: 8, padding: "14px 20px", cursor: "pointer", fontSize: 12, color: "#888" }}>
                <input type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={e => Array.from(e.target.files).forEach(uploadFile)} style={{ display: "none" }} />
                {uploadingFile ? "⏳ Uploading..." : "📎 Kliknij aby dodać pliki (PDF, DOCX, grafiki)"}
              </label>
            </div>
          </Section>

          <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 32 }}>
            {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith("✅") ? "#2d7a4f" : "#cc0000", alignSelf: "center", marginRight: 12 }}>{saveMsg}</span>}
            <button onClick={save} disabled={saving} style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "Zapisuję..." : "💾 Zapisz ustawienia"}
            </button>
          </div>
        </div>
      </div>
    </div>
      </>
  );
}
