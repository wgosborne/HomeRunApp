"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: "#0B3B7F",
        backgroundImage: "linear-gradient(135deg, #0B3B7F 0%, #0A2F5F 100%)"
      }}>

      {/* Wrigley Field Scoreboard */}
      <div className="relative z-10 scoreboard-frame"
        style={{
          width: "100%",
          maxWidth: "700px",
          filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.6))"
        }}>

        {/* ARCHED TOP SECTION - Pixelated arch with "WRIGLEY FIELD" */}
        <div style={{
          backgroundColor: "#C41E3A",
          padding: "0",
          position: "relative",
          borderTopLeftRadius: "60px 40px",
          borderTopRightRadius: "60px 40px",
          overflow: "hidden"
        }}>
          {/* Pixelated stepped arch effect */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingTop: "20px",
            paddingBottom: "16px",
            backgroundColor: "#C41E3A",
            position: "relative"
          }}>
            <div style={{
              fontSize: "32px",
              fontWeight: "900",
              color: "#FFFACD",
              fontFamily: "Arial Black, sans-serif",
              letterSpacing: "4px",
              textShadow: "3px 3px 0px rgba(0, 0, 0, 0.4)",
              textTransform: "uppercase",
              textAlign: "center",
              lineHeight: "1.1"
            }} className="scoreboard-title">
              WRIGLEY FIELD
            </div>
          </div>

          {/* "HOME OF" text */}
          <div style={{
            textAlign: "center",
            fontSize: "18px",
            fontWeight: "bold",
            color: "#FFFACD",
            fontFamily: "Arial Black, sans-serif",
            letterSpacing: "2px",
            paddingBottom: "12px",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.3)"
          }}>
            HOME OF
          </div>
        </div>

        {/* Red section with horizontal stripes and "CHICAGO CUBS" */}
        <div style={{
          backgroundColor: "#C41E3A",
          padding: "0",
          position: "relative"
        }}>
          {/* White stripe above */}
          <div style={{
            height: "6px",
            background: "repeating-linear-gradient(90deg, #FFF 0px, #FFF 30px, #E8E8E8 30px, #E8E8E8 60px)",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)"
          }} />

          {/* CHICAGO CUBS with stripes behind */}
          <div style={{
            textAlign: "center",
            paddingTop: "8px",
            paddingBottom: "8px",
            position: "relative"
          }}>
            <div style={{
              fontSize: "28px",
              fontWeight: "900",
              color: "#FFFACD",
              fontFamily: "Arial Black, sans-serif",
              letterSpacing: "3px",
              textShadow: "3px 3px 0px rgba(0, 0, 0, 0.4)",
              textTransform: "uppercase"
            }}>
              CHICAGO CUBS
            </div>
          </div>

          {/* White stripe below */}
          <div style={{
            height: "6px",
            background: "repeating-linear-gradient(90deg, #FFF 0px, #FFF 30px, #E8E8E8 30px, #E8E8E8 60px)",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)"
          }} />
        </div>

        {/* BLACK SCOREBOARD DISPLAY SECTION */}
        <div style={{
          backgroundColor: "#1a1a1a",
          padding: "16px",
          minHeight: "100px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "12px"
        }} className="arcade-text">
          {/* Score display rows */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "20px",
            alignItems: "center",
            fontSize: "16px",
            fontFamily: "Courier New, monospace",
            fontWeight: "bold",
            color: "#FFEB3B",
            letterSpacing: "2px",
            textShadow: "2px 2px 0px #000"
          }}>
            <div style={{ textAlign: "right" }}>FANTASY</div>
            <div style={{ fontSize: "20px", color: "#FFEB3B" }}>⚾</div>
            <div style={{ textAlign: "left" }}>LEAGUE</div>
          </div>

          {/* Second row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "20px",
            alignItems: "center",
            fontSize: "16px",
            fontFamily: "Courier New, monospace",
            fontWeight: "bold",
            color: "#FFEB3B",
            letterSpacing: "2px",
            textShadow: "2px 2px 0px #000"
          }}>
            <div style={{ textAlign: "right" }}>TRACKER</div>
            <div style={{ fontSize: "14px", color: "#FFEB3B" }}>|</div>
            <div style={{ textAlign: "left" }}>2026</div>
          </div>
        </div>

        {/* White stripe separator */}
        <div style={{
          height: "6px",
          background: "repeating-linear-gradient(90deg, #FFF 0px, #FFF 30px, #E8E8E8 30px, #E8E8E8 60px)",
          boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)"
        }} />

        {/* RED BOTTOM SECTION */}
        <div style={{
          backgroundColor: "#B01030",
          height: "30px",
          boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)"
        }} />
      </div>

      {/* Sign-in button below scoreboard */}
      <div className="mt-16 text-center relative z-10">
        <button
          onClick={() => signIn('google', { redirectTo: '/dashboard' })}
          className="inline-block px-10 py-4 font-bold text-lg tracking-wider uppercase transition-all duration-100 relative button-press"
          style={{
            backgroundColor: "#C41E3A",
            color: "#FFFACD",
            border: "4px solid #FFFACD",
            borderBottomColor: "#888",
            borderRightColor: "#888",
            fontFamily: "Arial Black, sans-serif",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 6px 0 rgba(0, 0, 0, 0.5)",
            letterSpacing: "2px",
            textShadow: "2px 2px 0px rgba(0, 0, 0, 0.4)",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 0 0 2px rgba(0, 0, 0, 0.2), 0 3px 0 rgba(0, 0, 0, 0.5)";
            e.currentTarget.style.transform = "translateY(3px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 6px 0 rgba(0, 0, 0, 0.5)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          SIGN IN WITH GOOGLE
        </button>
        <p className="text-sm mt-6" style={{ color: "#FFFACD", fontFamily: "Arial, sans-serif", fontSize: "13px", letterSpacing: "1px" }}>
          Build your fantasy baseball league today
        </p>
      </div>

      {/* Decorative elements - subtle baseball references */}
      <div className="absolute top-12 left-12 opacity-20" style={{
        width: "40px",
        height: "40px",
        border: "3px solid #FFFACD",
        borderRadius: "50%",
        animation: "pixelBounce 4s ease-in-out infinite"
      }} />
      <div className="absolute bottom-12 right-12 opacity-20" style={{
        width: "50px",
        height: "50px",
        border: "3px solid #FFFACD",
        borderRadius: "50%",
        animation: "pixelBounce 4s ease-in-out infinite 1s"
      }} />
    </main>
  );
}
