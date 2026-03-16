"use client";

// Skeleton loaders with shimmer animation for each tab

export function ScoresSkeleton() {
  return (
    <div style={{ paddingLeft: "18px", paddingRight: "18px" }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ marginBottom: "12px" }}>
          {/* Two team rows */}
          {Array.from({ length: 2 }).map((_, j) => (
            <div
              key={j}
              className="shimmer"
              style={{
                height: "32px",
                borderRadius: "8px",
                marginBottom: j === 0 ? "8px" : "0",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LeaguesSkeleton() {
  return (
    <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="shimmer"
          style={{
            height: "100px",
            borderRadius: "14px",
            marginBottom: "9px",
          }}
        />
      ))}
    </div>
  );
}

export function HRLeadersSkeleton() {
  return (
    <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
      {/* Search bar skeleton */}
      <div
        className="shimmer"
        style={{
          height: "40px",
          borderRadius: "8px",
          marginBottom: "24px",
          marginTop: "24px",
        }}
      />
      {/* Player rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="shimmer"
          style={{
            height: "60px",
            borderRadius: "10px",
            marginBottom: "12px",
          }}
        />
      ))}
    </div>
  );
}
