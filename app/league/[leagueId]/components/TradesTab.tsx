"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { pusherClient } from "@/lib/pusher-client";

interface Trade {
  id: string;
  leagueId: string;
  ownerId: string;
  receiverId: string;
  ownerPlayerName: string;
  receiverPlayerName: string;
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

export function TradesTab({ leagueId }: { leagueId: string }) {
  const { data: session } = useSession();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TradeFilter>("all");
  const [showProposalForm, setShowProposalForm] = useState(false);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [leagueId]);

  // Subscribe to trade events via Pusher
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
        // Trades will update via Pusher
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
        // Trades will update via Pusher
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
        return "bg-green-50 border-green-200";
      case "rejected":
        return "bg-red-50 border-red-200";
      case "expired":
        return "bg-gray-50 border-gray-200";
      case "pending":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
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
    return <div className="p-8 text-center text-gray-600">Loading trades...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Header with Action */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Trades</h2>
        <button
          onClick={() => setShowProposalForm(!showProposalForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium"
        >
          {showProposalForm ? "Cancel" : "Propose Trade"}
        </button>
      </div>

      {/* Proposal Form */}
      {showProposalForm && (
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
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "all"
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          All ({trades.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "pending"
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Pending ({pendingTrades.length})
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "completed"
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Completed (
          {trades.length -
            pendingTrades.length})
        </button>
      </div>

      {/* Pending Trades Awaiting My Response */}
      {myPendingTrades.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 font-semibold">
            You have {myPendingTrades.length} trade proposal
            {myPendingTrades.length === 1 ? "" : "s"} awaiting your response
          </p>
        </div>
      )}

      {/* Trades List */}
      {filteredTrades.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">
            {filter === "pending"
              ? "No pending trades"
              : filter === "completed"
                ? "No completed trades"
                : "No trades yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrades.map((trade) => (
            <div
              key={trade.id}
              className={`border rounded-lg p-6 transition ${getStatusColor(
                trade.status
              )}`}
            >
              {/* Trade Status */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {trade.owner.name} vs {trade.receiver.name}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                      trade.status
                    )}`}
                  >
                    {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {trade.status === "pending" && (
                    <span className="text-orange-600 font-medium">
                      {formatTimeRemaining(trade.expiresAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Trade Details */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Owner's Offer */}
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">
                    {trade.owner.name} offers
                  </p>
                  <div className="bg-white bg-opacity-50 rounded p-3">
                    <p className="font-semibold text-gray-900">
                      {trade.ownerPlayerName}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="text-2xl text-gray-400">↔</div>
                </div>

                {/* Receiver's Offer */}
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">
                    {trade.receiver.name} offers
                  </p>
                  <div className="bg-white bg-opacity-50 rounded p-3">
                    <p className="font-semibold text-gray-900">
                      {trade.receiverPlayerName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {trade.status === "pending" &&
                trade.receiverId === session?.user?.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(trade.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(trade.id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}

              {/* Timestamp */}
              <div className="mt-4 pt-4 border-t border-gray-200 border-opacity-50">
                <p className="text-xs text-gray-600">
                  Proposed on{" "}
                  {new Date(trade.createdAt).toLocaleDateString()} at{" "}
                  {new Date(trade.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
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
    receiverPlayerId: "",
    receiverPlayerName: "",
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
          receiverPlayerId: formData.receiverPlayerId,
          receiverPlayerName: formData.receiverPlayerName,
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
    <div className="bg-white rounded-lg shadow p-6 border-2 border-indigo-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Propose a Trade</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select Receiver */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trade with
          </label>
          <select
            value={formData.receiverId}
            onChange={(e) =>
              setFormData({ ...formData, receiverId: e.target.value })
            }
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-indigo-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
              });
            }}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-indigo-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
              });
            }}
            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-indigo-500"
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
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? "Proposing..." : "Propose Trade"}
          </button>
        </div>
      </form>
    </div>
  );
}
