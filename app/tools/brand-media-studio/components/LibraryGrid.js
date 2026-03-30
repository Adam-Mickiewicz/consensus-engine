"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const ACCENT = "#b8763a";

function SkeletonCard() {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ aspectRatio: "1", background: "#f0f0f0", animation: "libSkeleton 1.4s ease-in-out infinite" }} />
      <div style={{ padding: "10px 12px" }}>
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

function LibraryCard({ item, onDelete, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const videoRef = useRef(null);

  const expires = item.expires_in_days;
  const title = item.title || (item.prompt ? item.prompt.slice(0, 40) + (item.prompt.length > 40 ? "…" : "") : "Bez tytułu");

  function handleMouseEnter() {
    setHovered(true);
    if (videoRef.current) videoRef.current.play().catch(() => {});
  }
  function handleMouseLeave() {
    setHovered(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  }

  return (
    <div
      style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden", background: "#fff" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Preview */}
      <div style={{ position: "relative", aspectRatio: "1", background: "#f5f5f5", overflow: "hidden" }}>
        {item.job_type === "video" && item.output_urls?.[0] ? (
          <video
            ref={videoRef}
            src={item.output_urls[0]}
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <img
            src={item.thumbnail_url || item.output_urls?.[0] || ""}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {/* Type badge */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: "rgba(0,0,0,0.55)", color: "#fff",
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
        }}>
          {item.job_type === "video" ? "WIDEO" : "OBRAZ"}
        </div>

        <ExpiryBadge days={expires} />

        {/* Hover overlay */}
        {hovered && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {item.output_urls?.[0] && (
              <a
                href={item.output_urls[0]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ padding: "6px 10px", background: "rgba(255,255,255,0.9)", borderRadius: 6, fontSize: 12, color: "#1a1a1a", textDecoration: "none", fontWeight: 500 }}
              >
                ⬇ Pobierz
              </a>
            )}
            <button
              onClick={e => { e.stopPropagation(); onEdit(item); }}
              style={{ padding: "6px 10px", background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 6, fontSize: 12, color: "#1a1a1a", cursor: "pointer", fontWeight: 500 }}
            >
              ✎ Edytuj
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(item.id); }}
              style={{ padding: "6px 10px", background: "rgba(239,68,68,0.85)", border: "none", borderRadius: 6, fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 500 }}
            >
              🗑 Usuń
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{item.model_name || item.model_id}</div>
        {item.prompt && (
          <div
            onClick={() => setExpanded(e => !e)}
            style={{
              fontSize: 11, color: "#666", lineHeight: 1.4, marginBottom: 4, cursor: "pointer",
              overflow: expanded ? "visible" : "hidden",
              display: expanded ? "block" : "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {item.prompt}
          </div>
        )}
        {item.actual_cost && (
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>${Number(item.actual_cost).toFixed(2)}</div>
        )}
        {item.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
            {item.tags.map(tag => (
              <span key={tag} style={{ fontSize: 10, background: "#f0f0f0", color: "#666", padding: "1px 6px", borderRadius: 10 }}>{tag}</span>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: expires <= 0 ? "#ef4444" : "#aaa" }}>
          {expires > 0 ? `Usunięty za ${expires} dni` : "Wygasło"}
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
        body: JSON.stringify({ job_id: item.id, title: title.trim(), tags: tags.split(",").map(t => t.trim()).filter(Boolean) }),
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
        onClick={e => e.stopPropagation()}>
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

export default function LibraryGrid({ jobType: initialJobType = "all" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState(initialJobType);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const searchTimer = useRef(null);

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

  useEffect(() => {
    fetchItems(true);
  }, [filterType]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchItems(true), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  function loadMore() {
    const nextOffset = offset + 20;
    setOffset(nextOffset);
  }

  useEffect(() => {
    if (offset > 0) fetchItems(false);
  }, [offset]);

  async function deleteItem(id) {
    if (!confirm("Usunąć ten element z biblioteki?")) return;
    try {
      await fetch(`/api/brand-media/jobs/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error("Delete library item error:", err);
    }
  }

  function handleEditSave(updated) {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
    setEditingItem(null);
  }

  const filters = [
    { id: "all", label: "Wszystkie" },
    { id: "image", label: "Obrazy" },
    { id: "video", label: "Wideo" },
  ];

  return (
    <div>
      <style>{`
        @keyframes libSkeleton {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {editingItem && (
        <EditModal item={editingItem} onSave={handleEditSave} onClose={() => setEditingItem(null)} />
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🖼</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#555", marginBottom: 6 }}>Brak wygenerowanych materiałów</div>
          <div style={{ fontSize: 13 }}>Wygenerowane obrazy i wideo pojawią się tutaj przez 30 dni</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {items.map(item => (
              <LibraryCard
                key={item.id}
                item={item}
                onDelete={deleteItem}
                onEdit={setEditingItem}
              />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                onClick={loadMore}
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
