"use client";
import { useState, useRef, useCallback } from "react";

const ACCENT = "#b8763a";

const ACCEPT_TYPES = "image/jpeg,image/png,image/webp,image/svg+xml,application/pdf,video/mp4,video/quicktime";

function getFileType(mimeType) {
  if (mimeType.startsWith("image/svg")) return "svg";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

function getTypeBadge(mimeType) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("video/")) return "MP4";
  if (mimeType === "image/svg+xml") return "SVG";
  const ext = mimeType.split("/")[1]?.toUpperCase();
  return ext || "FILE";
}

function Thumbnail({ att }) {
  const type = getFileType(att.mime_type || "");

  if (type === "image" || type === "svg") {
    return (
      <img
        src={att.localUrl || att.url}
        alt={att.file_name}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  if (type === "pdf") {
    return (
      <div style={{ width: "100%", height: "100%", background: "#f0f0f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
        </svg>
        <span style={{ fontSize: 9, color: "#666", textAlign: "center", padding: "0 4px", wordBreak: "break-all" }}>
          {att.file_name?.length > 10 ? att.file_name.slice(0, 10) + "…" : att.file_name}
        </span>
      </div>
    );
  }
  if (type === "video") {
    return (
      <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" opacity={0.7}>
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", textAlign: "center", padding: "0 4px", wordBreak: "break-all" }}>
          {att.file_name?.length > 10 ? att.file_name.slice(0, 10) + "…" : att.file_name}
        </span>
      </div>
    );
  }
  return <div style={{ width: "100%", height: "100%", background: "#eee" }} />;
}

export default function AttachmentPanel({ sessionId, onChange, maxFiles = 20 }) {
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const uploadingRef = useRef(false);

  const updateAtt = useCallback((tempId, updates) => {
    setAttachments(prev => prev.map(a => a.tempId === tempId ? { ...a, ...updates } : a));
  }, []);

  async function uploadFiles(files) {
    if (uploadingRef.current) return;
    uploadingRef.current = true;

    const fileArr = Array.from(files).slice(0, maxFiles - attachments.length);

    for (const file of fileArr) {
      const tempId = `${Date.now()}_${Math.random()}`;
      const localUrl = file.type.startsWith("image/") || file.type === "image/svg+xml"
        ? URL.createObjectURL(file)
        : null;

      setAttachments(prev => [...prev, {
        tempId,
        file_name: file.name,
        mime_type: file.type,
        file_type: getFileType(file.type),
        size_bytes: file.size,
        localUrl,
        status: "uploading",
        progress: 0,
        url: null,
        id: null,
        error: null,
      }]);

      await new Promise((resolve) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("session_id", sessionId);

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            updateAtt(tempId, { progress: Math.round((e.loaded / e.total) * 100) });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (result.error) {
                updateAtt(tempId, { status: "error", error: result.error });
              } else {
                updateAtt(tempId, { status: "done", url: result.url, id: result.id, progress: 100 });
              }
            } catch {
              updateAtt(tempId, { status: "error", error: "Błąd parsowania odpowiedzi" });
            }
          } else {
            updateAtt(tempId, { status: "error", error: `HTTP ${xhr.status}` });
          }
          resolve();
        };
        xhr.onerror = () => {
          updateAtt(tempId, { status: "error", error: "Błąd sieci" });
          resolve();
        };
        xhr.onloadend = resolve;
        xhr.open("POST", "/api/brand-media/attachments");
        xhr.send(formData);
      });
    }

    uploadingRef.current = false;

    setAttachments(prev => {
      const done = prev.filter(a => a.status === "done");
      onChange(done);
      return prev;
    });
  }

  async function removeAttachment(att) {
    if (att.status === "done" && att.id) {
      try {
        await fetch(`/api/brand-media/attachments?id=${att.id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Delete attachment error:", err);
      }
    }
    setAttachments(prev => {
      const next = prev.filter(a => a.tempId !== att.tempId);
      onChange(next.filter(a => a.status === "done"));
      return next;
    });
  }

  const canAdd = attachments.length < maxFiles;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#888" }}>Materiały źródłowe</span>
        <span style={{ fontSize: 11, color: "#aaa" }}>{attachments.length} / {maxFiles} plików</span>
      </div>

      {canAdd && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); uploadFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragging ? `2px dashed ${ACCENT}` : "1.5px dashed #ddd",
            background: isDragging ? "#fdf6ee" : "#fafafa",
            borderRadius: 10, padding: "20px 16px", textAlign: "center",
            cursor: "pointer", transition: "all 0.15s", marginBottom: 12,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isDragging ? ACCENT : "#ccc"} strokeWidth="1.5" style={{ marginBottom: 6 }}>
            <polyline points="16 16 12 12 8 16"/>
            <line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
          </svg>
          <div style={{ fontSize: 13, color: isDragging ? ACCENT : "#666" }}>
            Przeciągnij pliki lub kliknij aby wybrać
          </div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
            JPG, PNG, WebP, PDF, SVG, MP4 · Max {maxFiles} plików
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_TYPES}
        style={{ display: "none" }}
        onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
      />

      {attachments.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 80px)", gap: 8, flexWrap: "wrap" }}>
          {attachments.map(att => (
            <div
              key={att.tempId}
              title={att.error || att.file_name}
              style={{
                position: "relative", width: 80, height: 80,
                borderRadius: 6, overflow: "hidden",
                border: att.status === "error" ? "2px solid #ef4444" : `1px solid ${att.status === "uploading" ? ACCENT : "#ddd"}`,
                animation: att.status === "uploading" ? "attPulse 1.2s ease-in-out infinite" : "none",
                flexShrink: 0,
              }}
            >
              <Thumbnail att={att} />

              {/* Badge type */}
              <div style={{
                position: "absolute", top: 3, right: 3,
                background: "rgba(0,0,0,0.6)", color: "#fff",
                fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
              }}>
                {getTypeBadge(att.mime_type || "")}
              </div>

              {/* Remove button */}
              <button
                onClick={e => { e.stopPropagation(); removeAttachment(att); }}
                style={{
                  position: "absolute", top: 3, left: 3, width: 18, height: 18,
                  background: "rgba(0,0,0,0.55)", color: "#fff", border: "none",
                  borderRadius: "50%", cursor: "pointer", fontSize: 11, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ×
              </button>

              {/* Progress bar */}
              {att.status === "uploading" && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  height: 3, background: "rgba(255,255,255,0.3)",
                }}>
                  <div style={{
                    height: "100%", background: ACCENT,
                    width: `${att.progress}%`, transition: "width 0.1s",
                  }} />
                </div>
              )}

              {/* Error overlay */}
              {att.status === "error" && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(239,68,68,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 18 }}>⚠</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes attPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
