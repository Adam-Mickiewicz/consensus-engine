"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import Nav from "../../../components/Nav";

const ACCENT = "#b8763a";

const FORMAT_OPTIONS = [
  { id: "1:1",  label: "Post kwadratowy", dims: "1080×1080" },
  { id: "9:16", label: "Stories / Reels",  dims: "1080×1920" },
  { id: "3:4",  label: "Post pionowy",     dims: "1080×1440" },
  { id: "16:9", label: "Poziomy / YouTube", dims: "1920×1080" },
  { id: "4:3",  label: "Poziomy klasyczny", dims: "1440×1080" },
];

export default function RepurposePage() {
  const [sourceImage, setSourceImage] = useState(null); // { url, name }
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedFormats, setSelectedFormats] = useState(["1:1", "9:16", "3:4", "16:9"]);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [processing, setProcessing] = useState(false);
  const [outputs, setOutputs] = useState([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  function toggleFormat(id) {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }

  async function handleFile(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Akceptuję tylko JPG, PNG lub WebP.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Plik jest za duży (max 50MB).");
      return;
    }
    setError("");

    // Use object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setSourceImage({ url: objectUrl, name: file.name, file });
    setOutputs([]);
  }

  function useUrl() {
    if (!sourceUrl.trim()) return;
    setSourceImage({ url: sourceUrl.trim(), name: sourceUrl.trim().split("/").pop() });
    setOutputs([]);
    setError("");
  }

  async function handleRepurpose() {
    if (!sourceImage) { setError("Wybierz lub wklej URL zdjęcia."); return; }
    if (selectedFormats.length === 0) { setError("Wybierz co najmniej jeden format."); return; }

    setProcessing(true);
    setError("");
    setOutputs([]);

    try {
      let imageUrl = sourceImage.url;

      // If it's a local file (blob URL), we need to upload it first
      if (sourceImage.file) {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const ext = sourceImage.file.name.split(".").pop();
        const filename = `repurpose_src_${Date.now()}.${ext}`;
        const { error: uploadErr } = await sb.storage
          .from("bms-references")
          .upload(filename, sourceImage.file, { contentType: sourceImage.file.type });
        if (uploadErr) throw new Error(uploadErr.message);

        const { data: urlData } = sb.storage.from("bms-references").getPublicUrl(filename);
        imageUrl = urlData.publicUrl;
      }

      const res = await fetch("/api/brand-media/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          formats: selectedFormats,
          background_color: bgColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setOutputs(data.outputs || []);
    } catch (err) {
      console.error("repurpose error:", err);
      setError("Błąd: " + err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function downloadAll() {
    for (const out of outputs) {
      const a = document.createElement("a");
      a.href = out.url;
      a.download = `repurpose_${out.format.replace(":", "x")}.jpg`;
      a.target = "_blank";
      a.click();
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f6", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <Nav current="/tools/brand-media-studio" />

      <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
          <Link href="/tools/brand-media-studio" style={{ color: "#aaa", textDecoration: "none" }}>Brand Media Studio</Link>
          {" / "}
          <span style={{ color: "#555" }}>Repurpose formatów</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "#1a1a1a" }}>🔄 Repurpose formatów</h1>
          <span style={{ fontSize: 12, color: "#2e7d32", background: "#e8f5e9", padding: "3px 10px", borderRadius: 10, fontWeight: 600 }}>
            $0.00 — lokalnie
          </span>
        </div>

        {/* Step 1: Source image */}
        <div style={{ marginBottom: 20, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            1. Zdjęcie źródłowe
          </div>

          {!sourceImage ? (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? ACCENT : "#ddd"}`, borderRadius: 8,
                  padding: "36px 20px", textAlign: "center", cursor: "pointer",
                  background: dragOver ? "#fdf7f2" : "#fafafa", transition: "all 0.15s", marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
                <div style={{ fontSize: 13, color: "#555" }}>Przeciągnij lub kliknij, by wybrać zdjęcie</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>JPG, PNG, WebP · max 50MB</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="...lub wklej URL zdjęcia"
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none" }}
                />
                <button onClick={useUrl} style={{
                  padding: "8px 16px", background: "#f5f5f5", border: "1px solid #ddd",
                  borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#555",
                }}>
                  Użyj URL
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <img src={sourceImage.url} alt="Źródło" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#333", marginBottom: 8 }}>{sourceImage.name}</div>
                <button onClick={() => { setSourceImage(null); setOutputs([]); }}
                  style={{ fontSize: 12, color: "#c62828", background: "none", border: "1px solid #f0b8b8", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                  Zmień zdjęcie
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Formats */}
        <div style={{ marginBottom: 20, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            2. Wybierz formaty wyjściowe
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FORMAT_OPTIONS.map(f => (
              <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={selectedFormats.includes(f.id)} onChange={() => toggleFormat(f.id)}
                  style={{ width: 16, height: 16, accentColor: ACCENT }} />
                <span style={{ fontWeight: 500, fontSize: 13, color: "#1a1a1a", width: 50 }}>{f.id}</span>
                <span style={{ fontSize: 13, color: "#555" }}>{f.label}</span>
                <span style={{ fontSize: 11, color: "#aaa" }}>{f.dims}px</span>
              </label>
            ))}
          </div>
        </div>

        {/* Step 3: Options */}
        <div style={{ marginBottom: 20, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            3. Opcje
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>Kolor tła:</div>
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
              style={{ width: 40, height: 32, borderRadius: 4, border: "1px solid #ddd", cursor: "pointer", padding: 2 }} />
            <span style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>{bgColor}</span>
          </div>
        </div>

        {/* Action */}
        {error && <div style={{ marginBottom: 12, fontSize: 13, color: "#c62828", background: "#fce4ec", borderRadius: 6, padding: "8px 12px" }}>{error}</div>}
        <button
          onClick={handleRepurpose}
          disabled={processing || !sourceImage}
          style={{
            width: "100%", padding: "12px", fontSize: 14, fontWeight: 600,
            background: (processing || !sourceImage) ? "#f0e8df" : ACCENT,
            border: "none", borderRadius: 8, color: "#fff",
            cursor: (processing || !sourceImage) ? "not-allowed" : "pointer", marginBottom: 24,
          }}
        >
          {processing ? "Przetwarzam..." : "🔄 Repurpose"}
        </button>

        {/* Results */}
        {outputs.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Wyniki ({outputs.length} formatów)
              </div>
              <button onClick={downloadAll} style={{
                padding: "6px 14px", fontSize: 12, background: ACCENT,
                border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 500,
              }}>
                Pobierz wszystkie
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {outputs.map(out => (
                <div key={out.format} style={{ border: "1px solid #eee", borderRadius: 8, overflow: "hidden" }}>
                  <img src={out.url} alt={out.format} style={{ width: "100%", aspectRatio: "1", objectFit: "contain", background: "#f9f9f9" }} />
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{out.format}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>{out.width}×{out.height}px</div>
                    <a href={out.url} download={`repurpose_${out.format.replace(":", "x")}.jpg`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", textAlign: "center", padding: "4px 0", fontSize: 12, color: "#2e7d32", border: "1px solid #c8e6c9", borderRadius: 4, textDecoration: "none" }}>
                      Pobierz
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
