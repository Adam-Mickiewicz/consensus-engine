"use client";
import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const ACCENT = "#b8763a";

const CHIP_TYPES = [
  { value: "produkt", label: "Produkt", color: "#2e7d32", bg: "#e8f5e9" },
  { value: "styl",    label: "Styl",    color: "#7b1fa2", bg: "#f3e5f5" },
  { value: "referencja", label: "Referencja", color: "#1565c0", bg: "#e3f2fd" },
];

function getChipType(val) {
  return CHIP_TYPES.find(t => t.value === val) || CHIP_TYPES[2];
}

export default function ReferencePanel({ onRefsChange, maxRefs = 4 }) {
  const [tab, setTab] = useState("upload");
  const [refs, setRefs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [skuSearch, setSkuSearch] = useState("");
  const [skuProducts, setSkuProducts] = useState([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [openTypeMenuId, setOpenTypeMenuId] = useState(null);
  const fileInputRef = useRef(null);

  function addRef(ref) {
    if (refs.length >= maxRefs) return;
    const newRefs = [...refs, ref];
    setRefs(newRefs);
    onRefsChange(newRefs);
  }

  function removeRef(id) {
    const newRefs = refs.filter(r => r.id !== id);
    setRefs(newRefs);
    onRefsChange(newRefs);
  }

  function updateRefType(id, type) {
    const newRefs = refs.map(r => r.id === id ? { ...r, type } : r);
    setRefs(newRefs);
    onRefsChange(newRefs);
    setOpenTypeMenuId(null);
  }

  async function handleFiles(files) {
    if (!files?.length) return;
    const file = files[0];

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError("Akceptuję tylko JPG, PNG lub WebP.");
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
      const filename = `ref_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await sb.storage
        .from("bms-references")
        .upload(filename, file, { contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = sb.storage
        .from("bms-references")
        .getPublicUrl(filename);

      addRef({
        id: filename,
        url: urlData.publicUrl,
        name: file.name,
        type: "referencja",
        source: "upload",
      });
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("Błąd uploadu: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function searchSku(q) {
    if (!q.trim()) { setSkuProducts([]); return; }
    setSkuLoading(true);
    try {
      const res = await fetch(`/api/crm/products?q=${encodeURIComponent(q)}&limit=12`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSkuProducts(data.products || data || []);
    } catch (err) {
      console.error("SKU search error:", err);
      setSkuProducts([]);
    } finally {
      setSkuLoading(false);
    }
  }

  const tabs = [
    { id: "upload", label: "Upload" },
    { id: "sku",    label: "Baza SKU" },
    { id: "drive",  label: "Google Drive" },
  ];

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 500, fontSize: 14, color: "#1a1a1a" }}>Zdjęcia referencyjne</span>
        <span style={{ fontSize: 12, color: "#999" }}>{refs.length}/{maxRefs}</span>
      </div>

      {/* Chips */}
      {refs.length > 0 && (
        <div style={{ padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: 8, borderBottom: "1px solid #eee" }}>
          {refs.map(ref => {
            const ct = getChipType(ref.type);
            return (
              <div key={ref.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9f9f9", border: "1px solid #eee", borderRadius: 8, padding: "4px 8px 4px 4px", position: "relative" }}>
                {ref.url && (
                  <img src={ref.url} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />
                )}
                <span style={{ fontSize: 12, color: "#333", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ref.name}
                </span>
                <button
                  onClick={() => setOpenTypeMenuId(openTypeMenuId === ref.id ? null : ref.id)}
                  style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: ct.bg, color: ct.color, border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  {ct.label} ▾
                </button>
                <button onClick={() => removeRef(ref.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>×</button>

                {openTypeMenuId === ref.id && (
                  <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 4, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", minWidth: 110 }}>
                    {CHIP_TYPES.map(t => (
                      <div key={t.value} onClick={() => updateRefType(ref.id, t.value)}
                        style={{ padding: "5px 10px", fontSize: 12, cursor: "pointer", color: t.color, borderRadius: 4, background: ref.type === t.value ? t.bg : "transparent" }}>
                        {t.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      {refs.length < maxRefs && (
        <>
          <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "8px 0", fontSize: 12, border: "none", background: "transparent", cursor: "pointer",
                color: tab === t.id ? ACCENT : "#888",
                borderBottom: `2px solid ${tab === t.id ? ACCENT : "transparent"}`,
                fontWeight: tab === t.id ? 600 : 400,
              }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 16 }}>
            {tab === "upload" && (
              <div>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? ACCENT : "#ddd"}`,
                    borderRadius: 8, padding: "24px 16px", textAlign: "center",
                    cursor: "pointer", background: dragOver ? "#fdf7f2" : "#fafafa",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🖼</div>
                  <div style={{ fontSize: 13, color: "#555" }}>
                    {uploading ? "Uploaduję..." : "Przeciągnij lub kliknij, by wybrać plik"}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>JPG, PNG, WebP · max 50MB</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={e => handleFiles(e.target.files)}
                />
                {uploadError && <div style={{ fontSize: 12, color: "#c62828", marginTop: 8 }}>{uploadError}</div>}
              </div>
            )}

            {tab === "sku" && (
              <div>
                <input
                  value={skuSearch}
                  onChange={e => { setSkuSearch(e.target.value); searchSku(e.target.value); }}
                  placeholder="Szukaj produktu..."
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, boxSizing: "border-box", outline: "none" }}
                />
                {skuLoading && <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>Szukam...</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
                  {skuProducts.map(p => (
                    <div key={p.id || p.ean} onClick={() => addRef({
                      id: `sku_${p.id || p.ean}`,
                      url: p.image_url || p.photo_url || "",
                      name: p.name || p.product_name || p.ean,
                      type: "produkt",
                      source: "sku",
                    })} style={{ cursor: "pointer", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                      {(p.image_url || p.photo_url) && (
                        <img src={p.image_url || p.photo_url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                      )}
                      <div style={{ padding: "4px 6px", fontSize: 10, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name || p.product_name || p.ean}
                      </div>
                    </div>
                  ))}
                  {!skuLoading && skuSearch && skuProducts.length === 0 && (
                    <div style={{ gridColumn: "1/-1", fontSize: 12, color: "#999", padding: "8px 0" }}>Brak wyników</div>
                  )}
                </div>
              </div>
            )}

            {tab === "drive" && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Google Drive</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>Wkrótce — wymaga połączenia OAuth</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
