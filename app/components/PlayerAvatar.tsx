"use client";

import React, { useState } from "react";

export interface PlayerAvatarProps {
  mlbId: number | null | undefined;
  playerName: string;
  size?: "sm" | "md" | "lg";
  isYourPlayer?: boolean;
  className?: string;
  lazy?: boolean;
}

const sizeConfig = {
  sm: {
    pixels: 32,
    fontSize: "11px",
  },
  md: {
    pixels: 44,
    fontSize: "14px",
  },
  lg: {
    pixels: 64,
    fontSize: "18px",
  },
};

export function PlayerAvatar({
  mlbId,
  playerName,
  size = "md",
  isYourPlayer = false,
  className = "",
  lazy = false,
}: PlayerAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const config = sizeConfig[size];
  const pixels = config.pixels;

  // Extract initials: first letter of first word + first letter of last word
  const initials = playerName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const src =
    mlbId && !imgFailed
      ? `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${mlbId}/headshot/67/current`
      : null;

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    // Check if we got the generic silhouette (120px wide)
    // The generic silhouette MLB uses has a consistent natural width of 120px
    if (event.currentTarget.naturalWidth === 120) {
      setImgFailed(true);
    }
  };

  const handleError = () => {
    setImgFailed(true);
  };

  // Gradient backgrounds
  const gradientBg = isYourPlayer
    ? "linear-gradient(145deg, #7a1515, #CC3433)"
    : "linear-gradient(145deg, #0E3386, #1a52c4)";

  const boxShadow =
    "0 4px 12px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.15) inset";

  // Image element (only if we have mlbId and haven't failed)
  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={playerName}
        width={pixels}
        height={pixels}
        loading={lazy ? "lazy" : "eager"}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: `${pixels}px`,
          height: `${pixels}px`,
          borderRadius: "50%",
          objectFit: "cover",
          boxShadow,
          display: "block",
        }}
        className={className}
      />
    );
  }

  // Fallback: initials in circle
  return (
    <div
      style={{
        width: `${pixels}px`,
        height: `${pixels}px`,
        borderRadius: "50%",
        background: gradientBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: config.fontSize,
        fontWeight: 800,
        fontFamily: "'Exo 2', sans-serif",
        color: "white",
        boxShadow,
        flexShrink: 0,
      }}
      className={className}
    >
      {initials}
    </div>
  );
}
