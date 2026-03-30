"use client";

const ACCENT = "#b8763a";

export default function CostEstimator({ model, params = {} }) {
  if (!model) {
    return (
      <div style={{ fontSize: 13, color: "#aaa" }}>
        Wybierz model, aby zobaczyć szacowany koszt.
      </div>
    );
  }

  let cost = 0;
  let breakdown = "";

  if (model.category === "video") {
    const duration = parseInt(params.duration) || 5;
    const variants = parseInt(params.variants) || 1;
    cost = model.price_per_unit * duration * variants;
    breakdown = `${model.price_per_unit.toFixed(2)} × ${duration}s × ${variants} wariant${variants > 1 ? "y" : ""}`;
  } else if (model.category === "image") {
    const variants = parseInt(params.variants) || 1;
    cost = model.price_per_unit * variants;
    breakdown = `${model.price_per_unit.toFixed(2)} × ${variants} obraz${variants > 1 ? "y" : ""}`;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: "#888" }}>Szacowany koszt:</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: ACCENT }}>${cost.toFixed(2)}</span>
      <span style={{ fontSize: 11, color: "#bbb" }}>({breakdown})</span>
    </div>
  );
}
