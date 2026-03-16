"use client";

import { useState, useEffect } from "react";

/**
 * Consistent full-screen loading indicator used throughout the app
 * Features: Dark blurred background, centered text, 24px font
 * 200ms delay prevents flash if data arrives quickly
 */
export function LoadingScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        position: "relative",
      }}
    >
      {/* Semi-opaque overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 25, 35, 0.75)",
          pointerEvents: "none",
        }}
      />

      {/* Loading text */}
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "15px", marginBottom: "12px", fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
      </div>
    </div>
  );
}
