"use client";

import { useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher-client";

interface DraftOrder {
  round: number;
  pickNumber: number;
  pickerName: string;
  pickerUserId: string;
  playerName: string | null;
  timestamp: number | null;
}

interface DraftOrderTabProps {
  leagueId: string;
  currentPickNumber: number;
  completedPicks: number;
  totalPicks: number;
  memberCount: number;
  members: Array<{
    userId: string;
    userName: string;
    teamName: string;
  }>;
}

export function DraftOrderTab({
  leagueId,
  currentPickNumber,
  completedPicks,
  totalPicks,
  memberCount,
  members,
}: DraftOrderTabProps) {
  const [draftOrder, setDraftOrder] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Build draft order based on snake draft rules
  const buildDraftOrder = (total: number, numTeams: number) => {
    const order: DraftOrder[] = [];
    let pickNum = 1;

    for (let round = 1; round <= Math.ceil(total / numTeams); round++) {
      // Forward pass for odd rounds
      if (round % 2 === 1) {
        for (let i = 0; i < numTeams && pickNum <= total; i++) {
          const member = members[i];
          order.push({
            round,
            pickNumber: pickNum,
            pickerName: member.userName,
            pickerUserId: member.userId,
            playerName: null,
            timestamp: null,
          });
          pickNum++;
        }
      } else {
        // Reverse pass for even rounds (snake)
        for (let i = numTeams - 1; i >= 0 && pickNum <= total; i--) {
          const member = members[i];
          order.push({
            round,
            pickNumber: pickNum,
            pickerName: member.userName,
            pickerUserId: member.userId,
            playerName: null,
            timestamp: null,
          });
          pickNum++;
        }
      }
    }

    return order;
  };

  // Initialize and fetch picks
  useEffect(() => {
    const fetchPicks = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/draft/${leagueId}/picks`);
        if (!response.ok) {
          throw new Error("Failed to fetch picks");
        }
        const picks = await response.json();

        // Build the base order
        const order = buildDraftOrder(totalPicks, memberCount);

        // Fill in player names from picks
        const pickMap = new Map(
          picks.map((pick: any) => [
            pick.pickNumber,
            pick.playerName as string | null,
          ])
        );

        const filledOrder = order.map((item) => ({
          ...item,
          playerName: pickMap.get(item.pickNumber) || null,
        })) as DraftOrder[];

        setDraftOrder(filledOrder);
      } catch (error) {
        console.error("Failed to fetch draft picks:", error);
        // Still show the order even if fetch fails
        setDraftOrder(buildDraftOrder(totalPicks, memberCount));
      } finally {
        setLoading(false);
      }
    };

    fetchPicks();
  }, [leagueId, totalPicks, memberCount, members]);

  // Subscribe to pick updates via Pusher
  useEffect(() => {
    const channel = pusherClient.subscribe(`draft-${leagueId}`);

    const handlePickMade = (data: any) => {
      setDraftOrder((prev) =>
        prev.map((item) =>
          item.pickNumber === data.pickNumber
            ? { ...item, playerName: data.playerName }
            : item
        )
      );
    };

    channel.bind("pick-made", handlePickMade);

    return () => {
      channel.unbind("pick-made", handlePickMade);
    };
  }, [leagueId]);

  if (loading) {
    return (
      <div
        style={{
          padding: "16px",
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        Loading draft order...
      </div>
    );
  }

  // Group picks by round
  const picksByRound = new Map<number, DraftOrder[]>();
  draftOrder.forEach((pick) => {
    if (!picksByRound.has(pick.round)) {
      picksByRound.set(pick.round, []);
    }
    picksByRound.get(pick.round)!.push(pick);
  });

  return (
    <div
      style={{
        padding: "16px",
        overflowY: "auto",
        maxHeight: "calc(100vh - 300px)",
      }}
    >
      {Array.from(picksByRound.entries()).map(([round, picks]) => (
        <div key={round} style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              textShadow: "0 0 16px rgba(204,52,51,0.35), 0 0 32px rgba(204,52,51,0.15)",
              marginBottom: "12px",
            }}
          >
            Round {round}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {picks.map((pick) => {
              const isCompleted = pick.pickNumber <= completedPicks;
              const isCurrent = pick.pickNumber === currentPickNumber;

              let bgColor = "rgba(255,255,255,0.04)";
              let borderColor = "rgba(255,255,255,0.07)";
              let indicator = "";

              if (isCurrent) {
                bgColor = "rgba(204,52,51,0.2)";
                borderColor = "rgba(204,52,51,0.5)";
                indicator = "●";
              } else if (isCompleted) {
                bgColor = "rgba(34,197,94,0.1)";
                borderColor = "rgba(34,197,94,0.3)";
                indicator = "✓";
              }

              return (
                <div
                  key={pick.pickNumber}
                  style={{
                    padding: "12px",
                    backgroundColor: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: "8px",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: isCurrent
                          ? "#CC3433"
                          : isCompleted
                            ? "#22c55e"
                            : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {indicator || "○"}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Exo 2', sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: isCurrent ? "#CC3433" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      #{pick.pickNumber}
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: isCurrent ? "#CC3433" : "white",
                      marginBottom: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {pick.playerName || pick.pickerName.split(" ")[0]}
                  </div>

                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.4)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {pick.playerName ? pick.pickerName : "Pending"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
