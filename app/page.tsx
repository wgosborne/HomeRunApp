"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Show loading state while checking authentication
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

      {/* Loading indicator */}
      <div className="relative z-10 text-center">
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          Loading...
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
      `}</style>
    </main>
  );
}
