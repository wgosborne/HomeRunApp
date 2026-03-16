"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNavigation } from "@/app/components/BottomNavigation";
import { getCached, setCached } from "@/lib/client-cache";

const LEAGUES_CACHE_KEY = "leagues-list";
const LEAGUES_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface League {
  id: string;
  name: string;
  commissionerId: string;
  userRole: string;
  teamName?: string;
  memberships: any[];
  draftStatus?: string;
  seasonEndedAt?: string;
  userRank?: number;
}

// Header component
const Header = () => (
  <header
    className="sticky top-0 z-50"
    style={{
      backgroundColor: "#0f1923",
      paddingTop: "18px",
      paddingBottom: "14px",
    }}
  >
    <div
      className="flex justify-between items-center mb-1 dashboard-content"
      style={{ height: "24px", paddingLeft: "18px", paddingRight: "18px" }}
    >
      <div className="flex items-baseline gap-0">
        <span
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "24px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "1px",
            textTransform: "uppercase",
            textShadow: "0 2px 12px rgba(14,51,134,0.4)",
          }}
        >
          DINGER
        </span>
        <span
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "24px",
            fontWeight: 800,
            color: "#CC3433",
            letterSpacing: "1px",
            textShadow: "0 2px 12px rgba(204,52,51,0.5)",
          }}
        >
          Z
        </span>
      </div>
      <div style={{ width: "24px" }} />
    </div>

    <div
      style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(204,52,51,0.5), transparent)",
        margin: "16px 0 0",
      }}
    />
  </header>
);

// Section header component
const SectionHeader = ({
  label,
  action,
  onAction,
}: {
  label: string;
  action?: string;
  onAction?: () => void;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: "10px",
      paddingBottom: "6px",
      marginBottom: "13px",
    }}
  >
    <span
      style={{
        fontFamily: "'Exo 2', sans-serif",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "3px",
        textTransform: "uppercase",
        color: "#FFFFFF",
        backgroundColor: "rgba(204, 52, 51, 0.6)",
        paddingLeft: "10px",
        paddingRight: "10px",
        paddingTop: "6px",
        paddingBottom: "6px",
        borderRadius: "6px",
        textShadow: "0 0 16px rgba(204,52,51,0.35), 0 0 32px rgba(204,52,51,0.15)",
      }}
    >
      {label}
    </span>
    {action && (
      <button
        onClick={onAction}
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "12px",
          fontWeight: 600,
          color: "#FFFFFF",
          backgroundColor: "rgba(204, 52, 51, 0.6)",
          paddingLeft: "12px",
          paddingRight: "12px",
          paddingTop: "6px",
          paddingBottom: "6px",
          borderRadius: "6px",
          textShadow: "0 0 20px rgba(204,52,51,0.4)",
          border: "none",
          cursor: "pointer",
        }}
      >
        {action}
      </button>
    )}
  </div>
);

// League card component
const LeagueCard = ({
  league,
  isCommissioner,
}: {
  league: League;
  isCommissioner: boolean;
}) => {
  return (
    <div
      className="flex"
      style={{
        borderRadius: "14px",
        backgroundColor: "rgba(255,255,255,0.04)",
        border: isCommissioner
          ? "1px solid rgba(204,52,51,0.18)"
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: isCommissioner
          ? `
              0 2px 0 rgba(255,255,255,0.05) inset,
              0 -1px 0 rgba(0,0,0,0.3) inset,
              0 4px 8px rgba(0,0,0,0.3),
              0 10px 28px rgba(0,0,0,0.25),
              0 20px 48px rgba(0,0,0,0.15),
              0 0 30px rgba(204,52,51,0.06)
            `
          : `
              0 2px 0 rgba(255,255,255,0.05) inset,
              0 -1px 0 rgba(0,0,0,0.3) inset,
              0 4px 8px rgba(0,0,0,0.3),
              0 10px 28px rgba(0,0,0,0.25),
              0 20px 48px rgba(0,0,0,0.15)
            `,
        marginBottom: "9px",
        overflow: "hidden",
      }}
    >
      {/* Accent stripe */}
      <div
        style={{
          width: "4px",
          backgroundColor: isCommissioner ? "#CC3433" : "#0E3386",
          boxShadow: isCommissioner ? "2px 0 12px rgba(204,52,51,0.4)" : "none",
        }}
      />

      {/* Card body */}
      <div
        style={{
          flex: 1,
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left side */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "white",
              textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              marginBottom: "4px",
            }}
          >
            {league.name}
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: isCommissioner ? "#FF6B6B" : "#7DC5E8",
            }}
          >
            {isCommissioner ? "Commissioner" : "Member"}
          </div>
          <div
            className="league-extra"
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.65)",
              marginTop: "4px",
            }}
          >
            {league.memberships.length} members · {league.draftStatus || "pending"}
          </div>
        </div>

        {/* Right side */}
        <div style={{ marginLeft: "16px", textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "42px",
              fontWeight: 800,
              color: isCommissioner ? "#CC3433" : "#0E3386",
              lineHeight: "1",
            }}
          >
            {league.userRank || 1}
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "9px",
              color: "rgba(255,255,255,0.2)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginTop: "2px",
            }}
          >
            rank
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LeagueTabPage() {
  const { status } = useSession();
  const router = useRouter();

  // Initialize from cache if available
  const cachedLeagues = getCached<League[]>(LEAGUES_CACHE_KEY, LEAGUES_TTL_MS);
  const [leagues, setLeagues] = useState<League[]>(cachedLeagues || []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      // Only fetch if cache is stale (prefetch may have populated it)
      if (!cachedLeagues) {
        fetchLeagues();
      }
    }
  }, [status, cachedLeagues]);

  const fetchLeagues = async () => {
    try {
      const res = await fetch("/api/leagues");
      if (res.ok) {
        const data = await res.json();
        setLeagues(data);
        setCached(LEAGUES_CACHE_KEY, data);
      }
    } catch (error) {
      console.error("Failed to fetch leagues:", error);
    }
  };

  // Only show loading if auth is still resolving AND we have no cached data
  if (status === "loading" && !cachedLeagues) {
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
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "15px", marginBottom: "12px", fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        overflowX: "hidden",
        position: "relative",
      }}
      className="noise-texture"
    >
      {/* Semi-opaque overlay for content readability */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 25, 35, 0.75)",
          backdropFilter: "blur(2px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Header />

      {/* Main content */}
      <div
        className="dashboard-content"
        style={{
          paddingBottom: "120px",
          paddingLeft: "16px",
          paddingRight: "16px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* My leagues section */}
        <SectionHeader
          label="My Leagues"
          action="+ Create"
          onAction={() => router.push("/league/create")}
        />
        {leagues.length > 0 ? (
          <div className="leagues-grid">
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => router.push(`/league/${league.id}`)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  marginBottom: "9px",
                }}
              >
                <LeagueCard
                  league={league}
                  isCommissioner={league.userRole === "commissioner"}
                />
              </button>
            ))}
          </div>
        ) : (
          <div
            style={{
              borderRadius: "14px",
              padding: "24px",
              textAlign: "center",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              No leagues yet. Create one to get started!
            </p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </main>
  );
}
