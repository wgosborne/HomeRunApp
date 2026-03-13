"use client";

export interface TeamLogoProps {
  name: string;
  logo: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { pixels: 24, fontSize: "10px" },
  md: { pixels: 32, fontSize: "12px" },
  lg: { pixels: 44, fontSize: "14px" },
};

export function TeamLogo({ name, logo, size = "md" }: TeamLogoProps) {
  const config = sizeConfig[size];
  const pixels = config.pixels;
  const abbr = name.split(" ").slice(-1)[0].substring(0, 3).toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {logo ? (
        <img
          src={logo}
          alt={name}
          width={pixels}
          height={pixels}
          onError={(e) => {
            // Fallback: hide image on error, show initials
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          style={{
            width: `${pixels}px`,
            height: `${pixels}px`,
            borderRadius: "4px",
            objectFit: "contain",
            background: "rgba(255,255,255,0.05)",
          }}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: config.fontSize,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {abbr}
        </span>
      </div>
    </div>
  );
}
