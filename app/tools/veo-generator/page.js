"use client";
import { useState, useRef } from "react";
import Nav from "../../components/Nav";

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 — Poziomy (YouTube, desktop)" },
  { value: "9:16", label: "9:16 — Pionowy (Reels, TikTok)" },
  { value: "1:1", label: "1:1 — Kwadrat" },
];

const DURATIONS = [
  { value: 5, label: "5 sekund" },
  { value: 6, label: "6 sekund" },
  { value: 7, label: "7 sekund" },
  { value: 8, label: "8 sekund" },
];

export default function VeoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState(null); // { base64, mimeType, preview }
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [status, setStatus] = useState(null); // null | "generating" | "polling" | "done" | "error"
  const [statusMsg, setStatusMsg] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [operationName, setOperationName] = useState(null);
  const pollRef = useRef(null);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setImage({ base64, mimeType: file.type, preview: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  const startGeneration = async () => {
    if (!prompt.trim()) { setStatusMsg("Wpisz prompt!"); setStatus("error"); return; }
    setStatus("generating");
    setStatusMsg("Wysyłam żądanie do VEO 2...");
    setVideoUrl(null);

    const body = {
      model: "veo-2.0-flash-exp",
      prompt: { text: prompt },
      config: {
        aspectRatio,
        durationSeconds: duration,
        numberOfVideos: 1,
      },
    };

    if (image) {
      body.image = {
        bytesBase64Encoded: image.base64,
        mimeType: image.mimeType,
      };
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-flash-exp:generateVideo?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
      if (!data.name) throw new Error("Brak operation name w odpowiedzi");

      setOperationName(data.name);
      setStatus("polling");
      setStatusMsg("Generowanie w toku — VEO pracuje (może potrwać 2-5 minut)...");
      pollStatus(data.name);
    } catch (e) {
      setStatus("error");
      setStatusMsg("Błąd: " + e.message);
    }
  };

  const pollStatus = (opName) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${GEMINI_KEY}`
        );
        const data = await res.json();
        if (data.done) {
          clearInterval(pollRef.current);
          if (data.error) {
            setStatus("error");
            setStatusMsg("Błąd generowania: " + data.error.message);
          } else {
            const videos = data.response?.generatedSamples || data.response?.videos || [];
            if (videos.length > 0) {
              const vid = videos[0];
              const url = vid.video?.uri || vid.uri || null;
              setVideoUrl(url);
              setStatus("done");
              setStatusMsg("Wideo gotowe!");
            } else {
              setStatus("error");
              setStatusMsg("Brak wideo w odpowiedzi: " + JSON.stringify(data.response));
            }
          }
        } else {
          setStatusMsg("Generowanie w toku... (" + new Date().toLocaleTimeString("pl-PL") + ")");
        }
      } catch (e) {
        clearInterval(pollRef.current);
        setStatus("error");
        setStatusMsg("Błąd pollingu: " + e.message);
      }
    }, 10000);
  };

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #e8e4de", borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", outline: "none", background: "#fafaf8" };
  const labelStyle = { fontSize: "11px", color: "#888", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 };

  return (
    <>
      <Nav current="/tools/veo-generator" />
      <div style={{ minHeight: "100vh", background: "#f5f2ee", fontFamily: "system-ui, sans-serif", padding: "32px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>

          {/* HEADER */}
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: "#1a1814", margin: "0 0 6px 0" }}>🎬 VEO 2 Generator</h1>
            <p style={{ fontSize: 13, color: "#7a7570", margin: 0 }}>Generuj wideo AI przez Google VEO 2 — tekst lub obraz + prompt</p>
          </div>

          {/* PROMPT */}
          <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
            <label style={labelStyle}>Prompt (opisz wideo)</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={4}
              placeholder="np. Slow motion shot of a blooming flower in morning light, cinematic, 4K..."
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {/* OBRAZ REFERENCYJNY */}
          <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
            <label style={labelStyle}>Obraz referencyjny (opcjonalny — image-to-video)</label>
            {image && (
              <div style={{ marginBottom: "12px", position: "relative", display: "inline-block" }}>
                <img src={image.preview} alt="" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", display: "block" }} />
                <button onClick={() => setImage(null)} style={{ position: "absolute", top: "6px", right: "6px", background: "#cc0000", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            )}
            <label style={{ display: "block", cursor: "pointer" }}>
              <div style={{ border: "2px dashed #e8e4de", borderRadius: "8px", padding: "16px", textAlign: "center", fontSize: "12px", color: "#aaa", background: "#fafaf8" }}>
                {image ? "Kliknij aby zmienić obraz" : "📁 Kliknij aby wybrać obraz (JPG, PNG, WebP)"}
              </div>
              <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
            </label>
          </div>

          {/* USTAWIENIA */}
          <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: "14px", padding: "20px", marginBottom: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Format (aspect ratio)</label>
              <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} style={inputStyle}>
                {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Długość wideo</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={inputStyle}>
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>

          {/* PRZYCISK */}
          <button
            onClick={startGeneration}
            disabled={status === "generating" || status === "polling"}
            style={{ width: "100%", padding: "14px", background: (status === "generating" || status === "polling") ? "#ccc" : "#1a1a1a", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: (status === "generating" || status === "polling") ? "default" : "pointer", marginBottom: "20px" }}
          >
            {status === "generating" ? "⏳ Wysyłanie..." : status === "polling" ? "⏳ Generowanie wideo..." : "🎬 Generuj wideo"}
          </button>

          {/* STATUS */}
          {statusMsg && (
            <div style={{ background: status === "error" ? "#fff0f0" : status === "done" ? "#e8f8ee" : "#fff8ee", border: `1px solid ${status === "error" ? "#f5c0c0" : status === "done" ? "#a8d8b8" : "#f0d8a0"}`, borderRadius: "10px", padding: "14px 16px", fontSize: "13px", color: status === "error" ? "#cc0000" : status === "done" ? "#2d7a4f" : "#8a6000", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{status === "polling" ? "⏳" : status === "done" ? "✅" : status === "error" ? "❌" : "ℹ️"}</span>
              <span>{statusMsg}</span>
            </div>
          )}

          {/* WYNIK */}
          {videoUrl && (
            <div style={{ background: "#fff", border: "1px solid #e8e4de", borderRadius: "14px", padding: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", marginBottom: "12px" }}>🎬 Wygenerowane wideo</div>
              <video controls style={{ width: "100%", borderRadius: "8px", display: "block", marginBottom: "12px" }} src={videoUrl} />
              <a href={videoUrl} download="veo-video.mp4" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", background: "#1a1a1a", color: "#fff", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                ⬇️ Pobierz wideo
              </a>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
