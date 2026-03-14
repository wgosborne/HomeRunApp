"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/app/components/LoadingScreen";

interface League {
  id: string;
  name: string;
  commissionerId: string;
  memberships: Array<{
    id: string;
    userId: string;
    user?: {
      name: string;
    };
  }>;
}

export default function JoinLeaguePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      // Set invite cookie and redirect to sign-in with callback
      setInviteCookieAndSignIn();
    }
  }, [status, leagueId]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeagueAndCheckMembership();
    }
  }, [status, leagueId]);

  const setInviteCookieAndSignIn = async () => {
    try {
      // Set the invite cookie
      await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      });

      // Redirect to sign-in with callback URL
      const callbackUrl = `/join/${leagueId}`;
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Failed to set invite cookie:", error);
      router.push("/");
    }
  };

  const fetchLeagueAndCheckMembership = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}`);
      if (!res.ok) {
        setError("League not found");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setLeague(data);

      // Check if current user is already a member
      const isMember = data.memberships.some(
        (m: any) => m.userId === session?.user?.id
      );

      if (isMember) {
        // Auto-redirect if already a member
        setTimeout(() => {
          router.push(`/league/${leagueId}`);
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to fetch league:", error);
      setError("Failed to load league");
    } finally {
      setLoading(false);
    }
  };

  const joinLeague = async () => {
    setJoining(true);
    setError("");
    try {
      // Retry logic for iOS Safari session timing issues
      let retries = 3;
      let lastError = null;

      while (retries > 0) {
        try {
          const res = await fetch(`/api/leagues/${leagueId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });

          if (res.ok) {
            // Clear the invite cookie
            await fetch("/api/invite", { method: "GET" });

            // Successfully joined, redirect to league home
            router.push(`/league/${leagueId}`);
            return;
          } else if (res.status === 409) {
            // Already a member - this is success, just redirect
            // (happens when join succeeds but redirect fails on first attempt)
            await fetch("/api/invite", { method: "GET" });
            router.push(`/league/${leagueId}`);
            return;
          } else if (res.status === 401) {
            // Unauthorized - session might not be ready yet on iOS
            lastError = "Session not ready, retrying...";
            retries--;
            if (retries > 0) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
          } else {
            const data = await res.json();
            setError(data.error || "Failed to join league");
            return;
          }
        } catch (err) {
          lastError = err;
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }
      }

      // All retries failed
      setError(lastError instanceof Error ? lastError.message : "Failed to join league after retries");
    } finally {
      setJoining(false);
    }
  };

  if (status === "loading" || loading) {
    return <LoadingScreen />;
  }

  if (!league) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden"
        style={{
          backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15, 25, 35, 0.6)",
            pointerEvents: "none",
          }}
        />
        <div
          className="flex flex-col items-center w-full relative z-10"
          style={{
            maxWidth: "420px",
            paddingLeft: "20px",
            paddingRight: "20px",
          }}
        >
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
            League not found
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center justify-center gap-3 transition-all duration-200"
            style={{
              padding: "20px 28px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.95)",
              color: "#111",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              border: "none",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform =
                "translateY(-3px) scale(1.01)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 12px 40px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 8px 32px rgba(0,0,0,0.4)";
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 25, 35, 0.6)",
          pointerEvents: "none",
        }}
      />

      <div
        className="flex flex-col items-center w-full relative z-10"
        style={{
          maxWidth: "420px",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
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

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(220, 38, 38, 0.2)",
              border: "1px solid rgba(220, 38, 38, 0.5)",
              marginBottom: "1.5rem",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#FCA5A5",
                margin: 0,
              }}
            >
              {error}
            </p>
          </div>
        )}

        <div
          style={{
            backgroundColor: "rgba(200, 16, 46, 0.35)",
            padding: "4px 12px",
            borderRadius: "6px",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              fontWeight: 300,
              color: "#FFFFFF",
              lineHeight: 1.6,
              textAlign: "center",
              margin: 0,
              maxWidth: "100%",
            }}
          >
            You've been invited to join
          </p>
        </div>

        <h2
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(24px, 6vw, 36px)",
            letterSpacing: "3px",
            color: "#FFFFFF",
            textAlign: "center",
            margin: 0,
            marginBottom: "2rem",
            textTransform: "uppercase",
          }}
        >
          {league.name}
        </h2>

        <button
          onClick={joinLeague}
          disabled={joining}
          className="w-full flex items-center justify-center gap-3 transition-all duration-200"
          style={{
            padding: "20px 28px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.95)",
            color: "#111",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            border: "none",
            cursor: joining ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            fontWeight: 600,
            opacity: joining ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!joining) {
              (e.target as HTMLButtonElement).style.transform =
                "translateY(-3px) scale(1.01)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 12px 40px rgba(0,0,0,0.5)";
            }
          }}
          onMouseLeave={(e) => {
            if (!joining) {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 8px 32px rgba(0,0,0,0.4)";
            }
          }}
        >
          {joining ? "Joining..." : "Join League"}
        </button>

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
          League: {league.memberships.length} member{league.memberships.length !== 1 ? "s" : ""}
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
      `}</style>
    </main>
  );
}
