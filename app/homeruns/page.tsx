"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";

interface Homerun {
  playerName: string;
  mlbTeam: string;
  mlbId: number | null;
  hrNumber: number;
  leagueName: string;
  isYourPlayer: boolean;
  occurredAt: string;
}

export default function HomerunsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [homeruns, setHomeruns] = useState<Homerun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recent" | "player" | "league">("recent");

  useEffect(() => {
    if (!session) return;

    const fetchHomeruns = async () => {
      try {
        const res = await fetch("/api/homeruns/recent?limit=1000");
        if (res.ok) {
          const data = await res.json();
          setHomeruns(data);
        }
      } catch (error) {
        console.error("Error fetching homeruns:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeruns();
    const interval = setInterval(fetchHomeruns, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [session]);

  const sortedHomeruns = [...homeruns].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    } else if (sortBy === "player") {
      return a.playerName.localeCompare(b.playerName);
    } else {
      return a.leagueName.localeCompare(b.leagueName);
    }
  });

  const yourHomeruns = sortedHomeruns.filter((hr) => hr.isYourPlayer);
  const othersHomeruns = sortedHomeruns.filter((hr) => !hr.isYourPlayer);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f1923",
        color: "white",
        paddingTop: "20px",
        paddingBottom: "32px",
      }}
    >
      {/* Header */}
      <div
        className="dashboard-content"
        style={{
          paddingLeft: "18px",
          paddingRight: "18px",
          marginBottom: "32px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "16px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "32px",
            fontWeight: 800,
            margin: 0,
            marginBottom: "8px",
          }}
        >
          All Home Runs
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.6)",
            margin: 0,
          }}
        >
          {homeruns.length} homeruns across all your leagues
        </p>
      </div>

      {/* Sort controls */}
      <div
        className="dashboard-content"
        style={{
          paddingLeft: "18px",
          paddingRight: "18px",
          marginBottom: "24px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {(["recent", "player", "league"] as const).map((sort) => (
          <button
            key={sort}
            onClick={() => setSortBy(sort)}
            style={{
              backgroundColor:
                sortBy === sort
                  ? "#CC3433"
                  : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${
                sortBy === sort
                  ? "#CC3433"
                  : "rgba(255, 255, 255, 0.1)"
              }`,
              borderRadius: "8px",
              padding: "8px 14px",
              color: sortBy === sort ? "white" : "rgba(255, 255, 255, 0.6)",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "capitalize",
              transition: "all 0.2s",
            }}
          >
            {sort === "recent" && "Recent"}
            {sort === "player" && "Player"}
            {sort === "league" && "League"}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          className="dashboard-content"
          style={{
            paddingLeft: "18px",
            paddingRight: "18px",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          Loading homeruns...
        </div>
      ) : homeruns.length === 0 ? (
        <div
          className="dashboard-content"
          style={{
            paddingLeft: "18px",
            paddingRight: "18px",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <p>No homeruns yet. Create a league and start tracking!</p>
        </div>
      ) : (
        <>
          {/* Your Homeruns */}
          {yourHomeruns.length > 0 && (
            <div className="dashboard-content" style={{ paddingLeft: "18px", paddingRight: "18px", marginBottom: "32px" }}>
              <h2
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  backgroundColor: "rgba(204, 52, 51, 0.6)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  display: "inline-block",
                }}
              >
                Your Players
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                {yourHomeruns.map((hr, idx) => (
                  <HomerunItem key={idx} hr={hr} isYours={true} />
                ))}
              </div>
            </div>
          )}

          {/* Others' Homeruns */}
          {othersHomeruns.length > 0 && (
            <div className="dashboard-content" style={{ paddingLeft: "18px", paddingRight: "18px" }}>
              <h2
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  display: "inline-block",
                }}
              >
                League Opponents
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                {othersHomeruns.map((hr, idx) => (
                  <HomerunItem key={idx} hr={hr} isYours={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HomerunItem({ hr, isYours }: { hr: Homerun; isYours: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: isYours ? "rgba(204, 52, 51, 0.1)" : "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${
          isYours
            ? "rgba(204, 52, 51, 0.3)"
            : "rgba(255, 255, 255, 0.08)"
        }`,
        borderRadius: "12px",
        padding: "12px",
      }}
    >
      {/* Avatar */}
      {hr.mlbId ? (
        <Link href={`/player/${hr.mlbId}`}>
          <a>
            <PlayerAvatar mlbId={hr.mlbId} playerName={hr.playerName} size="sm" />
          </a>
        </Link>
      ) : (
        <PlayerAvatar mlbId={null} playerName={hr.playerName} size="sm" />
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/player/${hr.mlbId}`}>
          <a style={{ textDecoration: "none" }}>
            <p
              style={{
                margin: 0,
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                color: "white",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {hr.playerName}
            </p>
          </a>
        </Link>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "4px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            {hr.mlbTeam}
          </span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.4)",
            }}
          >
            {hr.leagueName}
          </span>
        </div>
      </div>

      {/* HR count and date */}
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "18px",
            fontWeight: 800,
            color: isYours ? "#CC3433" : "rgba(255, 255, 255, 0.7)",
            lineHeight: "1",
          }}
        >
          {hr.hrNumber}
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.4)",
            marginTop: "2px",
          }}
        >
          {new Date(hr.occurredAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
