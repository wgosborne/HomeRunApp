"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { pusherClient } from "@/lib/pusher-client";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";

interface Trade {
  id: string;
  leagueId: string;
  ownerId: string;
  receiverId: string;
  ownerPlayerId: string;
  ownerPlayerName: string;
  ownerPlayerMlbId?: number | null;
  receiverPlayerId: string;
  receiverPlayerName: string;
  receiverPlayerMlbId?: number | null;
  status: "pending" | "accepted" | "rejected" | "expired";
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    image?: string;
  };
  receiver: {
    id: string;
    name: string;
    image?: string;
  };
}

type TradeFilter = "pending" | "completed" | "all";

export function TradesTab({
  leagueId,
  isSeasonEnded = false,
}: {
  leagueId: string;
  isSeasonEnded?: boolean;
}) {
  const { data: session } = useSession();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TradeFilter>("all");
  const [showProposalForm, setShowProposalForm] = useState(false);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 20000);
    return () => clearInterval(interval);
  }, [leagueId]);

  useEffect(() => {
    const channel = pusherClient.subscribe(`league-${leagueId}`);

    const handleTradeUpdate = () => {
      fetchTrades();
    };

    channel.bind("trade-proposed", handleTradeUpdate);
    channel.bind("trade-accepted", handleTradeUpdate);
    channel.bind("trade-rejected", handleTradeUpdate);
    channel.bind("trade-expired", handleTradeUpdate);

    return () => {
      channel.unbind("trade-proposed", handleTradeUpdate);
      channel.unbind("trade-accepted", handleTradeUpdate);
      channel.unbind("trade-rejected", handleTradeUpdate);
      channel.unbind("trade-expired", handleTradeUpdate);
    };
  }, [leagueId]);

  const fetchTrades = async () => {
    try {
      const res = await fetch(`/api/trades/${leagueId}`);
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
        setError("");
      }
    } catch (err) {
      console.error("Failed to fetch trades:", err);
      setError("Failed to load trades");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (tradeId: string) => {
    try {
      const res = await fetch(`/api/trades/${leagueId}/${tradeId}/accept`, {
        method: "POST",
      });

      if (res.ok) {
        setError("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to accept trade");
      }
    } catch (err) {
      setError("Failed to accept trade");
    }
  };

  const handleReject = async (tradeId: string) => {
    try {
      const res = await fetch(`/api/trades/${leagueId}/${tradeId}/reject`, {
        method: "POST",
      });

      if (res.ok) {
        setError("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reject trade");
      }
    } catch (err) {
      setError("Failed to reject trade");
    }
  };

  const getFilteredTrades = () => {
    switch (filter) {
      case "pending":
        return trades.filter((t) => t.status === "pending");
      case "completed":
        return trades.filter((t) =>
          ["accepted", "rejected", "expired"].includes(t.status)
        );
      default:
        return trades;
    }
  };

  const filteredTrades = getFilteredTrades();
  const pendingTrades = trades.filter((t) => t.status === "pending");
  const myPendingTrades = pendingTrades.filter(
    (t) => t.receiverId === session?.user?.id && t.status === "pending"
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return { bg: "rgba(127, 191, 107, 0.1)", border: "1px solid rgba(127, 191, 107, 0.3)", text: "#7FBF6B" };
      case "rejected":
        return { bg: "rgba(200, 16, 46, 0.1)", border: "1px solid rgba(200, 16, 46, 0.3)", text: "#C8102E" };
      case "expired":
        return { bg: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", text: "rgba(255, 255, 255, 0.6)" };
      case "pending":
        return { bg: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", text: "#FFFFFF" };
      default:
        return { bg: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)", text: "#FFFFFF" };
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
      return "Expired";
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  if (loading) {
    return <div className="py-8 text-center" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Loading trades...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: "rgba(200, 16, 46, 0.1)",
            borderLeft: "3px solid #C8102E",
            color: "#C8102E",
          }}
          className="p-4 rounded text-sm"
        >
          {error}
        </div>
      )}

      {/* Season Ended Lock Message */}
      {isSeasonEnded && (
        <div
          style={{
            borderRadius: "12px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            The season has ended. Trade history is read-only.
          </p>
        </div>
      )}

      {/* Header with Action */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: "#FFFFFF" }}>
          Trades
        </h2>
        {!isSeasonEnded && (
          <button
            onClick={() => setShowProposalForm(!showProposalForm)}
            className="px-4 py-2 rounded font-semibold text-sm transition"
            style={{
              backgroundColor: showProposalForm ? "rgba(200, 16, 46, 0.3)" : "#C8102E",
              color: showProposalForm ? "#FFFFFF" : "#0D1F3C",
            }}
          >
            {showProposalForm ? "Cancel" : "Propose Trade"}
          </button>
        )}
      </div>

      {/* Proposal Form */}
      {!isSeasonEnded && showProposalForm && (
        <TradeProposalForm
          leagueId={leagueId}
          onSuccess={() => {
            setShowProposalForm(false);
            fetchTrades();
          }}
          onError={setError}
        />
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(["all", "pending", "completed"] as TradeFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded text-sm font-medium transition"
            style={{
              backgroundColor: filter === f ? "#C8102E" : "#162749",
              color: filter === f ? "#0D1F3C" : "#FFFFFF",
              border: filter === f ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            {f === "all" ? "All" : f === "pending" ? "Pending" : "Completed"} (
            {f === "all"
              ? trades.length
              : f === "pending"
                ? pendingTrades.length
                : trades.length - pendingTrades.length}
            )
          </button>
        ))}
      </div>

      {/* Pending Trades Alert */}
      {myPendingTrades.length > 0 && (
        <div
          style={{
            backgroundColor: "rgba(200, 16, 46, 0.1)",
            borderLeft: "3px solid #C8102E",
          }}
          className="p-4 rounded"
        >
          <p style={{ color: "#FFFFFF" }} className="font-semibold text-sm">
            You have {myPendingTrades.length} trade proposal{myPendingTrades.length === 1 ? "" : "s"} awaiting your response
          </p>
        </div>
      )}

      {/* Trades List */}
      {filteredTrades.length === 0 ? (
        <div
          style={{
            backgroundColor: "#162749",
            borderLeft: "4px solid rgba(200, 16, 46, 0.3)",
          }}
          className="p-8 rounded text-center"
        >
          <p style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            {filter === "pending"
              ? "No pending trades"
              : filter === "completed"
                ? "No completed trades"
                : "No trades yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrades.map((trade) => {
            const statusColor = getStatusColor(trade.status);
            return (
              <div
                key={trade.id}
                style={{
                  backgroundColor: "#162749",
                  border: statusColor.border,
                  borderLeft: "4px solid #C8102E",
                }}
                className="p-6 rounded"
              >
                {/* Trade Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#FFFFFF" }}>
                      {trade.owner.name} vs {trade.receiver.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-3 py-1 rounded text-xs font-semibold"
                      style={{ backgroundColor: statusColor.text ? statusColor.text : "#C8102E", color: "#0D1F3C" }}
                    >
                      {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                    </span>
                    {trade.status === "pending" && (
                      <p style={{ color: "#C8102E" }} className="text-xs font-medium">
                        {formatTimeRemaining(trade.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Trade Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  {/* Owner's Offer */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                      {trade.owner.name} offers
                    </p>
                    <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)" }} className="p-3 rounded flex items-center gap-2">
                      <PlayerAvatar mlbId={trade.ownerPlayerMlbId} playerName={trade.ownerPlayerName} size="md" isYourPlayer={trade.ownerId === session?.user?.id} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="font-semibold text-sm" style={{ color: "#FFFFFF", wordWrap: "break-word" }}>
                          {trade.ownerPlayerName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <div style={{ color: "rgba(255, 255, 255, 0.4)" }}>↔</div>
                  </div>

                  {/* Receiver's Offer */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                      {trade.receiver.name} offers
                    </p>
                    <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.15)" }} className="p-3 rounded flex items-center gap-2">
                      <PlayerAvatar mlbId={trade.receiverPlayerMlbId} playerName={trade.receiverPlayerName} size="md" isYourPlayer={trade.receiverId === session?.user?.id} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="font-semibold text-sm" style={{ color: "#FFFFFF", wordWrap: "break-word" }}>
                          {trade.receiverPlayerName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {trade.status === "pending" && trade.receiverId === session?.user?.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(trade.id)}
                      className="flex-1 px-4 py-2 rounded font-semibold text-sm transition"
                      style={{
                        backgroundColor: "#7FBF6B",
                        color: "#0D1F3C",
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(trade.id)}
                      className="flex-1 px-4 py-2 rounded font-semibold text-sm transition"
                      style={{
                        backgroundColor: "#C8102E",
                        color: "#0D1F3C",
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {/* Timestamp */}
                <div
                  className="mt-4 pt-4 text-xs"
                  style={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", color: "rgba(255, 255, 255, 0.5)" }}
                >
                  Proposed on {new Date(trade.createdAt).toLocaleDateString()} at{" "}
                  {new Date(trade.createdAt).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TradeProposalFormProps {
  leagueId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function TradeProposalForm({
  leagueId,
  onSuccess,
  onError,
}: TradeProposalFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);
  const [leagueMembers, setLeagueMembers] = useState<any[]>([]);
  const [receiverRoster, setReceiverRoster] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    receiverId: "",
    ownerPlayerId: "",
    ownerPlayerName: "",
    ownerPlayerMlbId: null as number | null,
    receiverPlayerId: "",
    receiverPlayerName: "",
    receiverPlayerMlbId: null as number | null,
  });

  useEffect(() => {
    fetchRosterAndMembers();
  }, [leagueId]);

  useEffect(() => {
    if (formData.receiverId) {
      fetchReceiverRoster();
    }
  }, [formData.receiverId]);

  const fetchRosterAndMembers = async () => {
    try {
      const [rosterRes, leagueRes] = await Promise.all([
        fetch(`/api/leagues/${leagueId}/roster`),
        fetch(`/api/leagues/${leagueId}`),
      ]);

      if (rosterRes.ok && leagueRes.ok) {
        const rosterData = await rosterRes.json();
        const leagueData = await leagueRes.json();

        setRoster(rosterData);
        setLeagueMembers(
          leagueData.memberships.filter(
            (m: any) => m.userId !== session?.user?.id
          )
        );
      }
    } catch (err) {
      onError("Failed to load roster and members");
    }
  };

  const fetchReceiverRoster = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/roster?userId=${formData.receiverId}`);
      if (res.ok) {
        const data = await res.json();
        setReceiverRoster(data);
      }
    } catch (err) {
      console.error("Failed to fetch receiver roster:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/trades/${leagueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: formData.receiverId,
          ownerPlayerId: formData.ownerPlayerId,
          ownerPlayerName: formData.ownerPlayerName,
          ownerPlayerMlbId: formData.ownerPlayerMlbId,
          receiverPlayerId: formData.receiverPlayerId,
          receiverPlayerName: formData.receiverPlayerName,
          receiverPlayerMlbId: formData.receiverPlayerMlbId,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        onError(data.error || "Failed to propose trade");
      }
    } catch (err) {
      onError("Failed to propose trade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#162749",
        borderLeft: "4px solid #C8102E",
      }}
      className="p-6 rounded-lg"
    >
      <h3 className="text-lg font-bold mb-4" style={{ color: "#FFFFFF" }}>
        Propose a Trade
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Receiver */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Trade with
          </label>
          <select
            value={formData.receiverId}
            onChange={(e) =>
              setFormData({ ...formData, receiverId: e.target.value })
            }
            className="w-full px-4 py-2 rounded text-sm"
            style={{
              backgroundColor: "#0D1F3C",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
            required
          >
            <option value="">Select a team member</option>
            {leagueMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user?.name || "Unknown"}
              </option>
            ))}
          </select>
        </div>

        {/* Your Player */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Your Player
          </label>
          <select
            value={formData.ownerPlayerId}
            onChange={(e) => {
              const player = roster.find((p) => p.playerId === e.target.value);
              setFormData({
                ...formData,
                ownerPlayerId: e.target.value,
                ownerPlayerName: player?.playerName || "",
                ownerPlayerMlbId: player?.mlbId || null,
              });
            }}
            className="w-full px-4 py-2 rounded text-sm"
            style={{
              backgroundColor: "#0D1F3C",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
            required
          >
            <option value="">Select a player to trade</option>
            {roster.map((player) => (
              <option key={player.playerId} value={player.playerId}>
                {player.playerName}
              </option>
            ))}
          </select>
        </div>

        {/* Receiver's Player */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            {formData.receiverId
              ? leagueMembers.find((m) => m.userId === formData.receiverId)
                  ?.user?.name + "'s Player"
              : "Their Player"}
          </label>
          <select
            value={formData.receiverPlayerId}
            onChange={(e) => {
              const player = receiverRoster.find(
                (p) => p.playerId === e.target.value
              );
              setFormData({
                ...formData,
                receiverPlayerId: e.target.value,
                receiverPlayerName: player?.playerName || "",
                receiverPlayerMlbId: player?.mlbId || null,
              });
            }}
            className="w-full px-4 py-2 rounded text-sm"
            style={{
              backgroundColor: "#0D1F3C",
              color: "#FFFFFF",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
            required
            disabled={!formData.receiverId}
          >
            <option value="">
              {formData.receiverId
                ? "Select a player"
                : "Select receiver first"}
            </option>
            {receiverRoster.map((player) => (
              <option key={player.playerId} value={player.playerId}>
                {player.playerName}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 rounded font-semibold text-sm transition"
            style={{
              backgroundColor: loading ? "rgba(200, 16, 46, 0.3)" : "#C8102E",
              color: "#0D1F3C",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Proposing..." : "Propose Trade"}
          </button>
        </div>
      </form>
    </div>
  );
}
