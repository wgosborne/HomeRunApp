"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { NotificationBell } from "@/app/components/NotificationBell";
import { TabNavigation, type TabItem } from "@/app/components/TabNavigation";
import { TradesTab } from "./components/TradesTab";

interface League {
  id: string;
  name: string;
  commissionerId: string;
  draftStatus: string;
  draftStartedAt?: string;
  memberships: Array<{
    id: string;
    userId: string;
    role: string;
    teamName?: string;
    user?: {
      name: string;
      email: string;
    };
  }>;
}

type TabType = "draft" | "leaderboard" | "myteam" | "trades" | "players" | "settings";

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <div className="text-5xl mb-4">🚀</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{label}</h2>
      <p className="text-gray-600">Coming soon in Week 3</p>
    </div>
  );
}

interface StandingsEntry {
  rank: number;
  userId: string;
  userName: string;
  teamName: string;
  userImage: string | null;
  totalHomeruns: number;
  totalPoints: number;
  playerCount: number;
  players: Array<{
    playerId: string;
    playerName: string;
    position: string | null;
    homeruns: number;
    points: number;
  }>;
}

interface RosterEntry {
  playerId: string;
  playerName: string;
  position: string | null;
  homeruns: number;
  points: number;
  draftedRound: number | null;
  draftedPickNumber: number | null;
}

function LeaderboardTab({ leagueId }: { leagueId: string }) {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchStandings();
    const interval = setInterval(fetchStandings, 5000);
    return () => clearInterval(interval);
  }, [leagueId]);

  // Subscribe to homerun events via Pusher
  useEffect(() => {
    const channel = pusherClient.subscribe(`league-${leagueId}`);

    const handleHomerun = () => {
      console.log("Homerun event received, refreshing standings");
      fetchStandings();
    };

    channel.bind("homerun", handleHomerun);

    return () => {
      channel.unbind("homerun", handleHomerun);
    };
  }, [leagueId]);

  const fetchStandings = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/standings`);
      if (res.ok) {
        const data = await res.json();
        setStandings(data);
      }
    } catch (error) {
      console.error("Failed to fetch standings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-600">Loading standings...</div>;
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {standings.map((entry) => (
        <div key={entry.userId} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
          {/* Main Card - Clickable Header */}
          <button
            onClick={() =>
              setExpandedUserId(
                expandedUserId === entry.userId ? null : entry.userId
              )
            }
            className="w-full p-4 md:p-6 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 md:gap-4">
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg md:text-xl">#{entry.rank}</span>
              </div>

              {/* Team Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base md:text-lg truncate">
                  {entry.teamName}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 truncate">
                  {entry.userName}
                </p>
              </div>

              {/* Points - Prominent on Mobile */}
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl md:text-3xl font-bold text-indigo-600">
                  {entry.totalHomeruns}
                </div>
                <p className="text-xs md:text-sm text-gray-600">HR</p>
              </div>

              {/* Expand Indicator */}
              <div className="flex-shrink-0 ml-2 md:ml-3">
                <svg
                  className={`w-5 h-5 md:w-6 md:h-6 text-gray-400 transition-transform ${
                    expandedUserId === entry.userId ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            </div>

            {/* Mobile Hidden Info */}
            <div className="hidden md:flex gap-6 mt-3 text-sm text-gray-600 pt-3 border-t border-gray-100">
              <div>
                <span className="text-gray-500">Players:</span>{" "}
                <span className="font-medium text-gray-900">{entry.playerCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Points:</span>{" "}
                <span className="font-medium text-gray-900">{entry.totalPoints}</span>
              </div>
            </div>
          </button>

          {/* Expanded Content */}
          {expandedUserId === entry.userId && (
            <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-6">
              <h4 className="font-semibold text-gray-900 mb-3 md:mb-4">
                Players ({entry.playerCount})
              </h4>
              <div className="space-y-2 md:space-y-3">
                {entry.players.length === 0 ? (
                  <p className="text-gray-600 text-sm py-4 text-center">
                    No players drafted yet
                  </p>
                ) : (
                  entry.players.map((player) => (
                    <div
                      key={player.playerId}
                      className="bg-white p-3 md:p-4 rounded border border-gray-200 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {player.playerName}
                          </p>
                          <p className="text-xs md:text-sm text-gray-600">
                            {player.position || "N/A"}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="font-semibold text-indigo-600 text-sm md:text-base">
                            {player.homeruns} HR
                          </p>
                          <p className="text-xs text-gray-600">
                            {player.points} pts
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {standings.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No standings data available yet</p>
        </div>
      )}
    </div>
  );
}

function MyTeamTab({ leagueId }: { leagueId: string }) {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHomeruns, setTotalHomeruns] = useState(0);

  useEffect(() => {
    fetchRoster();
    const interval = setInterval(fetchRoster, 5000);
    return () => clearInterval(interval);
  }, [leagueId]);

  // Subscribe to homerun events via Pusher
  useEffect(() => {
    const channel = pusherClient.subscribe(`league-${leagueId}`);

    const handleHomerun = () => {
      console.log("Homerun event received, refreshing roster");
      fetchRoster();
    };

    channel.bind("homerun", handleHomerun);

    return () => {
      channel.unbind("homerun", handleHomerun);
    };
  }, [leagueId]);

  const fetchRoster = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/roster`);
      if (res.ok) {
        const data: RosterEntry[] = await res.json();
        setRoster(data);
        setTotalHomeruns(data.reduce((sum, p) => sum + p.homeruns, 0));
      }
    } catch (error) {
      console.error("Failed to fetch roster:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-600">Loading your team...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Team Summary */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow p-4 md:p-6 text-white">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Team Stats</h3>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="text-center md:text-left">
            <p className="text-indigo-100 text-xs md:text-sm">Players</p>
            <p className="text-2xl md:text-3xl font-bold">{roster.length}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-indigo-100 text-xs md:text-sm">Homeruns</p>
            <p className="text-2xl md:text-3xl font-bold">{totalHomeruns}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-indigo-100 text-xs md:text-sm">Points</p>
            <p className="text-2xl md:text-3xl font-bold">
              {roster.reduce((sum, p) => sum + p.points, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Roster List */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
          Roster ({roster.length})
        </h3>
        {roster.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 md:p-8 text-center">
            <p className="text-gray-600 text-sm md:text-base">
              You haven't drafted any players yet. Start the draft to build your team!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {roster.map((player) => (
              <div
                key={player.playerId}
                className="bg-white rounded-lg shadow p-3 md:p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                      {player.playerName}
                    </h4>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-600">
                      <span>{player.position || "N/A"}</span>
                      {player.draftedRound && (
                        <span className="hidden md:inline">
                          Drafted: Round {player.draftedRound}, Pick{" "}
                          {player.draftedPickNumber}
                        </span>
                      )}
                      {player.draftedRound && (
                        <span className="md:hidden">
                          R{player.draftedRound}P{player.draftedPickNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg md:text-xl font-bold text-indigo-600">
                      {player.homeruns} HR
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">{player.points} pts</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DraftTab({
  league,
  leagueId,
  isCommissioner,
  router,
}: {
  league: League;
  leagueId: string;
  isCommissioner: boolean;
  router: any;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startDraft = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/draft/${leagueId}/start`, {
        method: "POST",
      });
      if (res.ok) {
        // Redirect to draft room
        router.push(`/draft/${leagueId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to start draft");
      }
    } catch (error) {
      setError("Failed to start draft");
    } finally {
      setLoading(false);
    }
  };

  const isDraftPending = league.draftStatus === "pending";
  const isDraftActive = league.draftStatus === "active" || league.draftStatus === "paused";
  const isDraftComplete = league.draftStatus === "complete";
  const hasEnoughMembers = league.memberships.length >= 2;

  return (
    <div className="space-y-6">
      {isDraftPending && (
        <div className="bg-white rounded-lg shadow p-4 md:p-6 space-y-4 md:space-y-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">Draft Lobby</h3>
            <p className="text-sm md:text-base text-gray-600">
              {isCommissioner
                ? "Start the draft when all members have joined."
                : "Waiting for the commissioner to start the draft..."}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">
              Joined Members ({league.memberships.length})
            </h4>
            <div className="space-y-2">
              {league.memberships.map((member) => (
                <div key={member.id} className="flex items-center p-3 bg-gray-50 rounded min-h-[44px]">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                  <span className="text-gray-900 text-sm md:text-base truncate">
                    {member.user?.name || "Unknown"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {isCommissioner && (
            <button
              onClick={startDraft}
              disabled={!hasEnoughMembers || loading}
              className="w-full px-4 md:px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-semibold text-sm md:text-base min-h-[44px]"
            >
              {loading ? "Starting..." : hasEnoughMembers ? "Start Draft" : `Start Draft (need ${2 - league.memberships.length} more members)`}
            </button>
          )}
        </div>
      )}

      {isDraftActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-blue-900 mb-2">Draft In Progress</h3>
            <p className="text-blue-700 text-sm md:text-base">
              The draft is currently active. Enter the draft room to make your picks.
            </p>
          </div>
          <button
            onClick={() => router.push(`/draft/${leagueId}`)}
            className="w-full px-4 md:px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm md:text-base min-h-[44px]"
          >
            Enter Draft Room
          </button>
        </div>
      )}

      {isDraftComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-green-900 mb-2">Draft Complete</h3>
          <p className="text-green-700 text-sm md:text-base">
            All members have completed their picks. Check out your team on the My Team tab.
          </p>
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  league,
  isCommissioner,
  leagueId,
  session,
}: {
  league: League;
  isCommissioner: boolean;
  leagueId: string;
  session: any;
}) {
  const router = useRouter();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(league.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [teamSuccess, setTeamSuccess] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  useEffect(() => {
    setInviteLink(`${window.location.origin}/join/${leagueId}`);
  }, [leagueId]);

  useEffect(() => {
    setEditName(league.name);
  }, [league.name]);

  useEffect(() => {
    // Find current user's team name from memberships
    if (session?.user?.id) {
      const userMembership = league.memberships.find(
        (m) => m.user?.email === session.user.email
      );
      if (userMembership) {
        setEditTeamName(userMembership.teamName || "");
      }
    }
  }, [league.memberships, session?.user?.id, session?.user?.email]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditName = async () => {
    setError("");
    setSuccess("");

    if (!editName.trim()) {
      setError("League name cannot be empty");
      return;
    }

    if (editName.trim().length > 100) {
      setError("League name must be 100 characters or less");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        setSuccess("League name updated successfully");
        setIsEditing(false);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update league name");
      }
    } catch (error) {
      setError("Failed to update league name");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(league.name);
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  const handleEditTeamName = async () => {
    setTeamError("");
    setTeamSuccess("");

    if (!editTeamName.trim()) {
      setTeamError("Team name cannot be empty");
      return;
    }

    if (editTeamName.trim().length > 100) {
      setTeamError("Team name must be 100 characters or less");
      return;
    }

    setSavingTeam(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: editTeamName.trim() }),
      });

      if (res.ok) {
        setTeamSuccess("Team name updated successfully");
        setIsEditingTeam(false);
        setTimeout(() => setTeamSuccess(""), 3000);
      } else {
        const data = await res.json();
        setTeamError(data.error || "Failed to update team name");
      }
    } catch (error) {
      setTeamError("Failed to update team name");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleCancelEditTeam = () => {
    const userMembership = league.memberships.find(
      (m) => m.user?.email === session?.user?.email
    );
    setEditTeamName(userMembership?.teamName || "");
    setIsEditingTeam(false);
    setTeamError("");
    setTeamSuccess("");
  };

  const handleDeleteLeague = async () => {
    setDeleteError("");

    if (deleteConfirmName !== league.name) {
      setDeleteError(`Please type the league name exactly: "${league.name}"`);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowDeleteModal(false);
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete league");
      }
    } catch (error) {
      setDeleteError("Failed to delete league");
    } finally {
      setDeleting(false);
    }
  };

  const handleLeaveLeague = async () => {
    setLeaveError("");
    setLeaving(true);

    try {
      const res = await fetch(`/api/leagues/${leagueId}/members/${session?.user?.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowLeaveModal(false);
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else {
        const data = await res.json();
        setLeaveError(data.error || "Failed to leave league");
      }
    } catch (error) {
      setLeaveError("Failed to leave league");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* League Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">League Info</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League Name
            </label>
            {isEditing && isCommissioner ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter new league name"
                  maxLength={100}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditName}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-medium text-sm"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:bg-gray-200 font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={league.name}
                  readOnly
                  className="flex-1 px-4 py-2 border rounded bg-gray-50"
                />
                {isCommissioner && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium text-sm whitespace-nowrap"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-600 mt-2">{success}</p>
            )}
          </div>
          {isCommissioner && (
            <p className="text-sm text-gray-500">You are the commissioner and can edit league settings</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Team Name
            </label>
            {isEditingTeam ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter your team name"
                  maxLength={100}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditTeamName}
                    disabled={savingTeam}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-medium text-sm"
                  >
                    {savingTeam ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEditTeam}
                    disabled={savingTeam}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:bg-gray-200 font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTeamName || ""}
                  readOnly
                  className="flex-1 px-4 py-2 border rounded bg-gray-50"
                />
                <button
                  onClick={() => setIsEditingTeam(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium text-sm whitespace-nowrap"
                >
                  Edit
                </button>
              </div>
            )}
            {teamError && (
              <p className="text-sm text-red-600 mt-2">{teamError}</p>
            )}
            {teamSuccess && (
              <p className="text-sm text-green-600 mt-2">{teamSuccess}</p>
            )}
          </div>
        </div>
      </div>

      {/* Invite Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Invite Members</h3>
        <p className="text-gray-600 mb-4">Share this link to invite other players:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 px-4 py-2 border rounded bg-gray-50 font-mono text-sm"
          />
          <button
            onClick={copyInviteLink}
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Members ({league.memberships.length})</h3>
        <div className="space-y-2">
          {league.memberships.map((member) => (
            <div
              key={member.id}
              className="flex justify-between items-center py-3 px-3 bg-gray-50 rounded"
            >
              <div>
                <p className="font-semibold text-gray-900">{member.user?.name || "Unknown"}</p>
                <p className="text-xs text-gray-600">{member.user?.email}</p>
              </div>
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                {member.role === "commissioner" ? "Commissioner" : "Member"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isCommissioner && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ℹ️ Member management available before draft starts
          </p>
        </div>
      )}

      {/* Leave/Delete Buttons */}
      <div className="space-y-4">
        {!isCommissioner && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Leave League</h3>
            <p className="text-gray-600 mb-4">
              {league.memberships.length === 1
                ? "You are the only member in this league. Leaving will delete it."
                : "Leaving will remove you from this league and all your data."}
            </p>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
            >
              Leave League
            </button>
          </div>
        )}

        {isCommissioner && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete League</h3>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. All league data, drafts, and member rosters will be permanently deleted.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
            >
              Delete League
            </button>
          </div>
        )}
      </div>

      {/* Delete League Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete League</h3>
            <p className="text-red-600 font-semibold mb-4">
              This action cannot be undone.
            </p>
            <p className="text-gray-600 mb-6">
              All league data, including drafts, rosters, and trades, will be permanently deleted. All members will be removed from the league.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To confirm, type the league name: <span className="font-bold">{league.name}</span>
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Type league name here"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmName("");
                  setDeleteError("");
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLeague}
                disabled={deleting || deleteConfirmName !== league.name}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 font-medium"
              >
                {deleting ? "Deleting..." : "Delete League"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave League Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Leave League</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to leave "{league.name}"?
            </p>

            {isCommissioner && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Note:</span> You are the commissioner. Leaving will promote another member to commissioner.
                </p>
              </div>
            )}

            {leaveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {leaveError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveError("");
                }}
                disabled={leaving}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveLeague}
                disabled={leaving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 font-medium"
              >
                {leaving ? "Leaving..." : "Yes, Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeagueHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("draft");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeague();
      const interval = setInterval(fetchLeague, 5000); // Refresh every 5s
      return () => clearInterval(interval);
    }
  }, [status, leagueId]);

  // Pusher subscription for draft start events
  useEffect(() => {
    const channel = pusherClient.subscribe(`draft-${leagueId}`);

    const handleDraftStarted = () => {
      console.log("Draft started, redirecting to draft room");
      setTimeout(() => {
        router.push(`/draft/${leagueId}`);
      }, 500);
    };

    channel.bind("draft:started", handleDraftStarted);

    return () => {
      channel.unbind("draft:started", handleDraftStarted);
    };
  }, [leagueId, router]);

  const fetchLeague = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}`);
      if (res.ok) {
        const data = await res.json();
        setLeague(data);
        setIsCommissioner(data.commissionerId === session?.user?.id);
      }
    } catch (error) {
      console.error("Failed to fetch league:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!league) {
    return <div className="p-8 text-center">League not found</div>;
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 sm:mb-6 text-indigo-600 hover:text-indigo-700 font-medium text-sm md:text-base min-h-[44px] flex items-center"
        >
          ← Back to Leagues
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 truncate">
                {league.name}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2 text-xs sm:text-sm text-gray-600">
                <span>{today}</span>
                <span className="hidden sm:inline">•</span>
                <span>Season starts March 27th</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <NotificationBell leagueId={leagueId} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation
          tabs={[
            { id: "draft", label: "Draft" },
            { id: "leaderboard", label: "Leaderboard" },
            { id: "myteam", label: "My Team" },
            { id: "trades", label: "Trades" },
            { id: "players", label: "Players" },
            { id: "settings", label: "Settings" },
          ] as TabItem[]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        />

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            {activeTab === "draft" && (
              <DraftTab
                league={league}
                leagueId={leagueId}
                isCommissioner={isCommissioner}
                router={router}
              />
            )}
            {activeTab === "leaderboard" && (
              <LeaderboardTab leagueId={leagueId} />
            )}
            {activeTab === "myteam" && (
              <MyTeamTab leagueId={leagueId} />
            )}
            {activeTab === "trades" && (
              <TradesTab leagueId={leagueId} />
            )}
            {activeTab === "players" && (
              <ComingSoonTab label="Players" />
            )}
            {activeTab === "settings" && (
              <SettingsTab
                league={league}
                isCommissioner={isCommissioner}
                leagueId={leagueId}
                session={session}
              />
            )}
        </div>
      </div>
    </main>
  );
}
