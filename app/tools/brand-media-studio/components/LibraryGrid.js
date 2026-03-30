"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT = "#b8763a";

function SkeletonCard() {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div style={{ aspectRatio: "16/9", background: "#f0f0f0", animation: "libSkeleton 1.4s ease-in-out infinite" }} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ height: 12, background: "#f0f0f0", borderRadius: 4, marginBottom: 8, animation: "libSkeleton 1.4s ease-in-out infinite" }} />
        <div style={{ height: 10, background: "#f0f0f0", borderRadius: 4, width: "60%", animation: "libSkeleton 1.4s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

function ExpiryBadge({ days }) {
  if (days === null || days === undefined || days > 7) return null;
  const isUrgent = days <= 3;
  return (
    <div style={{
      position: "absolute", top: 6, right: 6,
      background: isUrgent ? "#fee2e2" : "#fef9c3",
      color: isUrgent ? "#991b1b" : "#854d0e",
      fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
    }}>
      Wygasa za {days}d
    </div>
  );
}

function LibraryCard({ item, onDelete, onRerun, onExtend, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const expires = item.expires_in_days;
  const isVideo = item.job_type === "video";
  const title = item.title || (item.prompt ? item.prompt.slice(0, 40) + (item.prompt.length > 40 ? "…" : "") : "Bez tytułu");

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      {/* Preview */}
      <div style={{
        position: "relative",
        aspectRatio: isVideo ? "16/9" : "1/1",
        background: "#111",
        overflow: "hidden",
      }}>
        {isVideo && item.output_urls?.[0] ? (
          <video
            src={item.output_urls[0]}
            controls
            autoPlay
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : item.output_urls?.[0] || item.thumbnail_url ? (
          <img
            src={item.thumbnail_url || item.output_urls[0]}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13 }}>
            Brak podglądu
          </div>
        )}

        {/* Type badge */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: "rgba(0,0,0,0.6)", color: "#fff",
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
          pointerEvents: "none",
        }}>
          {isVideo ? "WIDEO" : "OBRAZ"}
        </div>

        <ExpiryBadge days={expires} />
      </div>

      {/* Metadata */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>
          {item.bms_model_config?.model_name || item.model_id}
          {item.params?.orientation && ` · ${item.params.orientation}`}
          {item.params?.duration && ` · ${item.params.duration}`}
        </div>

        {item.prompt && (
          <div
            onClick={() => setExpanded(e => !e)}
            style={{
              fontSize: 12, color: "#555", lineHeight: 1.45, marginBottom: 8, cursor: "pointer",
              overflow: expanded ? "visible" : "hidden",
              display: expanded ? "block" : "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {item.prompt}
          </div>
        )}

        {(item.actual_cost != null || item.estimated_cost != null) && (
          <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
            {item.actual_cost != null
              ? `$${Number(item.actual_cost).toFixed(2)}`
              : `~$${Number(item.estimated_cost).toFixed(2)}`
            }
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {item.output_urls?.[0] && (
            <a
              href={item.output_urls[0]}
              download
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 11,
                background: ACCENT, color: "#fff", textDecoration: "none", fontWeight: 500,
              }}
            >
              ⬇ Pobierz
            </a>
          )}

          <button
            onClick={() => onRerun(item)}
            style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11,
              background: "transparent", border: "1px solid #ddd", cursor: "pointer",
            }}
          >
            ↺ Re-run
          </button>

          {isVideo && (
            <button
              onClick={() => onExtend(item)}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 11,
                background: "transparent", border: `1px solid ${ACCENT}`,
                color: ACCENT, cursor: "pointer",
              }}
            >
              + Extend
            </button>
          )}

          <button
            onClick={() => onEdit(item)}
            style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11,
              background: "transparent", border: "1px solid #ddd", cursor: "pointer",
            }}
          >
            ✎ Edytuj tytuł
          </button>

          <button
            onClick={() => onDelete(item.id)}
            style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 11,
              background: "transparent", border: "1px solid #eee",
              color: "#999", cursor: "pointer", marginLeft: "auto",
            }}
          >
            🗑 Usuń
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ item, onSave, onClose }) {
  const [title, setTitle] = useState(item.title || "");
  const [tags, setTags] = useState((item.tags || []).join(", "));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/brand-media/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: item.id,
          title: title.trim(),
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSave({ ...item, title: title.trim(), tags: tags.split(",").map(t => t.trim()).filter(Boolean) });
    } catch (err) {
      console.error("Edit library item error:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 12, padding: 24, width: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 16 }}>Edytuj metadane</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Tytuł</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Dodaj tytuł..."
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Tagi (oddzielone przecinkami)</div>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2, tag3"
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Anuluj</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, background: saving ? "#f0e8df" : ACCENT, border: "none", borderRadius: 6, color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Zapisuję..." : "Zapisz"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RerunModal({ item, onClose, onSuccess }) {
  const [prompt, setPrompt] = useState(item.prompt || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const endpoint = item.job_type === "video"
        ? "/api/brand-media/generate-video"
        : "/api/brand-media/generate-image";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: item.model_id,
          prompt,
          music_mode: item.music_mode,
          music_brief: item.music_brief,
          params: item.params,
          reference_urls: item.reference_urls,
          estimated_cost: item.estimated_cost,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onClose();
      onSuccess("Job dodany do kolejki — sprawdź w Kolejce");
    } catch (err) {
      console.error("Re-run error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 12, padding: 24, width: 500, maxWidth: "90vw" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>
          Re-run {item.job_type === "video" ? "wideo" : "obrazu"}
        </h3>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{
            width: "100%", minHeight: 120, padding: 10,
            border: "1px solid #ddd", borderRadius: 8, fontSize: 13,
            resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 6, background: "transparent", cursor: "pointer" }}>
            Anuluj
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ padding: "8px 16px", background: ACCENT, color: "#fff", border: "none", borderRadius: 6, cursor: submitting ? "not-allowed" : "pointer" }}>
            {submitting ? "Dodaję..." : "Generuj ponownie"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LibraryGrid({ jobType: initialJobType = "all" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState(initialJobType);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [rerunItem, setRerunItem] = useState(null);
  const [toast, setToast] = useState(null);
  const searchTimer = useRef(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchItems = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        job_type: filterType,
        limit: "20",
        offset: String(currentOffset),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/brand-media/library?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(prev => reset ? (data.items || []) : [...prev, ...(data.items || [])]);
      setHasMore(data.has_more || false);
      if (reset) setOffset(0);
    } catch (err) {
      console.error("LibraryGrid fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, search, offset]);

  useEffect(() => { fetchItems(true); }, [filterType]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchItems(true), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => { if (offset > 0) fetchItems(false); }, [offset]);

  async function deleteItem(id) {
    if (!confirm("Usunąć ten element z biblioteki?")) return;
    try {
      await fetch(`/api/brand-media/jobs/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      showToast("Błąd usuwania: " + err.message, "error");
    }
  }

  function handleEditSave(updated) {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
    setEditingItem(null);
  }

  function handleExtend(item) {
    showToast("Funkcja Extend będzie dostępna wkrótce");
  }

  const filters = [
    { id: "all", label: "Wszystkie" },
    { id: "video", label: "Wideo" },
    { id: "image", label: "Obrazy" },
  ];

  return (
    <div>
      <style>{`
        @keyframes libSkeleton {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          background: toast.type === "success" ? ACCENT : "#ef4444",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toast.msg}
        </div>
      )}

      {editingItem && (
        <EditModal item={editingItem} onSave={handleEditSave} onClose={() => setEditingItem(null)} />
      )}

      {rerunItem && (
        <RerunModal
          item={rerunItem}
          onClose={() => setRerunItem(null)}
          onSuccess={showToast}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)}
              style={{
                padding: "6px 14px", fontSize: 13, border: `1px solid ${filterType === f.id ? ACCENT : "#ddd"}`,
                borderRadius: 20, background: filterType === f.id ? "#fdf7f2" : "#fff",
                color: filterType === f.id ? ACCENT : "#555", cursor: "pointer", fontWeight: filterType === f.id ? 600 : 400,
              }}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj po prompcie..."
          style={{ flex: 1, minWidth: 200, padding: "7px 12px", border: "1px solid #ddd", borderRadius: 20, fontSize: 13, outline: "none" }}
        />
      </div>

      {/* Grid */}
      {loading && items.length === 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🖼</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#555", marginBottom: 6 }}>Brak wygenerowanych materiałów</div>
          <div style={{ fontSize: 13 }}>Wygenerowane obrazy i wideo pojawią się tutaj przez 30 dni</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {items.map(item => (
              <LibraryCard
                key={item.id}
                item={item}
                onDelete={deleteItem}
                onRerun={setRerunItem}
                onExtend={handleExtend}
                onEdit={setEditingItem}
              />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                onClick={() => setOffset(o => o + 20)}
                disabled={loading}
                style={{
                  padding: "9px 24px", fontSize: 13, border: `1px solid ${ACCENT}`,
                  borderRadius: 20, background: "#fff", color: ACCENT, cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Ładowanie..." : "Załaduj więcej"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
