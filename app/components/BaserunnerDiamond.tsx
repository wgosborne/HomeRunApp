"use client";

export interface BaserunnerDiamondProps {
  first: boolean;
  second: boolean;
  third: boolean;
  outs: number;
}

export function BaserunnerDiamond({ first, second, third, outs }: BaserunnerDiamondProps) {
  const baseSize = 12;
  const occupied = "rgba(204,52,51,0.8)";
  const empty = "rgba(255,255,255,0.15)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      {/* Diamond SVG */}
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        {/* Diamond outline (infield) */}
        <path
          d="M 20 5 L 35 20 L 20 35 L 5 20 Z"
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />

        {/* Home plate (bottom) */}
        <circle cx="20" cy="35" r="2.5" fill="rgba(255,255,255,0.3)" />

        {/* First base (right) */}
        <circle cx="35" cy="20" r={baseSize / 2} fill={first ? occupied : empty} />

        {/* Second base (top) */}
        <circle cx="20" cy="5" r={baseSize / 2} fill={second ? occupied : empty} />

        {/* Third base (left) */}
        <circle cx="5" cy="20" r={baseSize / 2} fill={third ? occupied : empty} />
      </svg>

      {/* Outs display */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
          fontFamily: "'Exo 2', sans-serif",
          minWidth: "28px",
        }}
      >
        <div style={{ fontSize: "16px", fontWeight: 800, color: "white", lineHeight: "1" }}>
          {outs ?? "-"}
        </div>
        <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px" }}>
          {(outs ?? 0) !== 1 ? "OUTS" : "OUT"}
        </div>
      </div>
    </div>
  );
}
