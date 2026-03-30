"use client";
import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const ACCENT = "#b8763a";

const GENRES = ["Ambient", "Upbeat", "Ciepły-akustyczny", "Cinematic", "Electronic", "Jazz", "Lo-fi"];
const TEMPOS = ["Wolne", "Umiarkowane", "Szybkie"];

export default function MusicPanel({ modelCapabilities = {}, onMusicChange }) {
  const [mode, setMode] = useState("none");
  const [genre, setGenre] = useState("Ambient");
  const [tempo, setTempo] = useState("Umiarkowane");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  function emit(overrides = {}) {
    const config = {
      mode,
      genre,
      tempo,
      description,
      uploadedFile,
      ...overrides,
    };
    onMusicChange(config);
  }

  function setModeAndEmit(newMode) {
    setMode(newMode);
    emit({ mode: newMode });
  }

  async function handleMusicFile(files) {
    if (!files?.length) return;
    const file = files[0];

    if (!["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"].includes(file.type) &&
        !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      setUploadError("Akceptuję tylko MP3, WAV lub M4A.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Plik jest za duży (max 50MB).");
      return;
    }

    setUploadError("");
    setUploading(true);

    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const ext = file.name.split(".").pop();
      const filename = `music_${Date.now()}.${ext}`;

      const { error: uploadErr } = await sb.storage
        .from("bms-references")
        .upload(filename, file, { contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = sb.storage
        .from("bms-references")
        .getPublicUrl(filename);

      const fileInfo = { name: file.name, url: urlData.publicUrl, filename };
      setUploadedFile(fileInfo);
      emit({ uploadedFile: fileInfo, mode: "upload" });
    } catch (err) {
      console.error("Music upload error:", err);
      setUploadError("Błąd uploadu: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  const modes = [
    { id: "none",   label: "Bez muzyki" },
    { id: "auto",   label: "Auto (AI)" },
    { id: "brief",  label: "Brief muzyczny" },
    { id: "upload", label: "Upload pliku" },
  ];

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <span style={{ fontWeight: 500, fontSize: 14, color: "#1a1a1a" }}>Muzyka / Podkład</span>
      </div>

      {/* Mode selector */}
      <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #eee" }}>
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setModeAndEmit(m.id)}
            style={{
              padding: "6px 14px", fontSize: 12, border: `1px solid ${mode === m.id ? ACCENT : "#ddd"}`,
              borderRadius: 20, background: mode === m.id ? "#fdf7f2" : "#fff",
              color: mode === m.id ? ACCENT : "#555", cursor: "pointer", fontWeight: mode === m.id ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {mode === "none" && (
          <div style={{ fontSize: 13, color: "#888" }}>Wideo zostanie wygenerowane bez podkładu muzycznego.</div>
        )}

        {mode === "auto" && (
          modelCapabilities.music ? (
            <div style={{ background: "#f0f7f0", border: "1px solid #c8e6c9", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#2e7d32" }}>
              Veo 3 automatycznie dopasuje muzykę na podstawie stylu wideo. Brak dodatkowego kosztu.
            </div>
          ) : (
            <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#f57f17" }}>
              Wybrany model nie obsługuje generowania muzyki. Użyj Veo 3 lub prześlij własny plik.
            </div>
          )
        )}

        {mode === "brief" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Gatunek</div>
              <select
                value={genre}
                onChange={e => { setGenre(e.target.value); emit({ genre: e.target.value }); }}
                style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, width: "100%", outline: "none" }}
              >
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Tempo</div>
              <div style={{ display: "flex", gap: 8 }}>
                {TEMPOS.map(t => (
                  <button key={t} onClick={() => { setTempo(t); emit({ tempo: t }); }}
                    style={{
                      flex: 1, padding: "7px 0", fontSize: 12, border: `1px solid ${tempo === t ? ACCENT : "#ddd"}`,
                      borderRadius: 6, background: tempo === t ? "#fdf7f2" : "#fff",
                      color: tempo === t ? ACCENT : "#555", cursor: "pointer",
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Dodatkowy opis</div>
              <textarea
                value={description}
                onChange={e => { setDescription(e.target.value); emit({ description: e.target.value }); }}
                placeholder="np. 'ciepłe brzmienie gitarowe, kojarzące się z jesiennym wieczorem przy książce'"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, resize: "vertical", minHeight: 64, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ fontSize: 11, color: "#aaa", background: "#f9f9f9", borderRadius: 6, padding: "8px 10px" }}>
              Brief zostanie dołączony do promptu wideo jako instrukcja muzyczna.
            </div>
          </div>
        )}

        {mode === "upload" && (
          <div>
            {!uploadedFile ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleMusicFile(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? ACCENT : "#ddd"}`,
                  borderRadius: 8, padding: "24px 16px", textAlign: "center",
                  cursor: "pointer", background: dragOver ? "#fdf7f2" : "#fafafa",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>🎵</div>
                <div style={{ fontSize: 13, color: "#555" }}>
                  {uploading ? "Uploaduję..." : "Przeciągnij lub kliknij, by wybrać plik audio"}
                </div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>MP3, WAV, M4A · max 50MB</div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f9f9f9", borderRadius: 8, padding: "10px 14px" }}>
                <span style={{ fontSize: 20 }}>🎵</span>
                <span style={{ flex: 1, fontSize: 13, color: "#333" }}>{uploadedFile.name}</span>
                <button onClick={() => { setUploadedFile(null); emit({ uploadedFile: null }); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 16 }}>×</button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a" style={{ display: "none" }}
              onChange={e => handleMusicFile(e.target.files)} />
            {uploadError && <div style={{ fontSize: 12, color: "#c62828", marginTop: 8 }}>{uploadError}</div>}
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 10, background: "#fff8e1", borderRadius: 6, padding: "8px 10px" }}>
              Plik zostanie przycięty do długości wideo. Uwaga: Veo 3 może zastąpić uploadowaną muzykę własną.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
