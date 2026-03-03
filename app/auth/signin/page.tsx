"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { redirectTo: "/dashboard" });
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay 1: Dark gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,13,26,0.30) 0%, rgba(6,13,26,0.15) 30%, rgba(6,13,26,0.50) 65%, rgba(6,13,26,0.85) 100%)",
        }}
      />

      {/* Overlay 2: Vignette */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(6,13,26,0.55) 100%)",
        }}
      />

      {/* Overlay 3: Red atmospheric glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(200,16,46,0.10) 0%, transparent 60%)",
        }}
      />

      {/* Content Card - Centered */}
      <div
        className="relative z-10 flex flex-col items-center w-full"
        style={{
          maxWidth: "420px",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        {/* Live Badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full mb-8 backdrop-blur-sm"
          style={{
            background: "rgba(200,16,46,0.18)",
            border: "1px solid rgba(200,16,46,0.4)",
          }}
        >
          {/* Pulsing dot */}
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: "#C8102E",
              animation: "pulse-badge 1.8s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "12px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.75)",
              fontWeight: 600,
            }}
          >
            2026 SEASON
          </span>
        </div>

        {/* App Name */}
        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(56px, 20vw, 96px)",
            letterSpacing: "6px",
            textShadow:
              "0 0 80px rgba(255,255,255,0.15), 0 4px 2px rgba(0,0,0,0.6)",
            lineHeight: 0.85,
            textAlign: "center",
            margin: 0,
            marginBottom: "1.5rem",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "#FFFFFF" }}>DINGER</span>
          <span style={{ color: "#C8102E" }}>Z</span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            textAlign: "center",
            marginBottom: "2rem",
            maxWidth: "100%",
          }}
        >
          Draft your crew. Track every home run. Compete all season long.
        </p>

        {/* Sign In Button */}
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 transition-all duration-200"
          style={{
            padding: "20px 28px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.95)",
            color: "#111",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            fontWeight: 600,
            opacity: isLoading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              (e.target as HTMLButtonElement).style.transform =
                "translateY(-3px) scale(1.01)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 12px 40px rgba(0,0,0,0.5)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 8px 32px rgba(0,0,0,0.4)";
            }
          }}
        >
          {/* Google G Icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "#1F2937" }}
          >
            <circle cx="12" cy="12" r="1" />
            <path d="M12 1v6m0 6v6" />
            <path d="M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24" />
            <path d="M1 12h6m6 0h6" />
            <path d="M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
          </svg>
          {isLoading ? "Signing in..." : "Sign In With Google"}
        </button>

        {/* Fine Print */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "12px",
            color: "rgba(255,255,255,0.22)",
            marginTop: "20px",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          By continuing you agree to our{" "}
          <a
            href="#"
            style={{
              color: "rgba(255,255,255,0.22)",
              textDecoration: "underline",
            }}
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="#"
            style={{
              color: "rgba(255,255,255,0.22)",
              textDecoration: "underline",
            }}
          >
            Privacy Policy
          </a>
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes pulse-badge {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </main>
  );
}
