"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { pusherClient } from "@/lib/pusher-client";
import { NotificationBell } from "@/app/components/NotificationBell";

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
    user?: {
      name: string;
      email: string;
    };
  }>;
}

type TabType = "draft" | "leaderboard" | "myteam" | "players" | "settings";

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
    return <div className="p-8 text-center">Loading standings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Team
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Manager
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                Homeruns
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                Players
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {standings.map((entry) => (
              <React.Fragment key={entry.userId}>
                <tr
                  onClick={() =>
                    setExpandedUserId(
                      expandedUserId === entry.userId ? null : entry.userId
                    )
                  }
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                    #{entry.rank}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {entry.teamName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {entry.userName}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                    {entry.totalHomeruns}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {entry.playerCount}
                  </td>
                </tr>
                {expandedUserId === entry.userId && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Players
                        </h4>
                        {entry.players.map((player) => (
                          <div
                            key={player.playerId}
                            className="flex justify-between items-center p-3 bg-white rounded border border-gray-200"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {player.playerName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {player.position || "N/A"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {player.homeruns} HR
                              </p>
                              <p className="text-xs text-gray-600">
                                {player.points} pts
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
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
    return <div className="p-8 text-center">Loading your team...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Team Summary */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Team Stats</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-indigo-100 text-sm">Players</p>
            <p className="text-3xl font-bold">{roster.length}</p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">Total Homeruns</p>
            <p className="text-3xl font-bold">{totalHomeruns}</p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">Total Points</p>
            <p className="text-3xl font-bold">
              {roster.reduce((sum, p) => sum + p.points, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Roster List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Roster</h3>
        {roster.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              You haven't drafted any players yet. Start the draft to build your team!
            </p>
          </div>
        ) : (
          roster.map((player) => (
            <div
              key={player.playerId}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {player.playerName}
                  </h4>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>{player.position || "N/A"}</span>
                    {player.draftedRound && (
                      <span>
                        Drafted: Round {player.draftedRound}, Pick{" "}
                        {player.draftedPickNumber}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600">
                    {player.homeruns} HR
                  </div>
                  <div className="text-sm text-gray-600">{player.points} pts</div>
                </div>
              </div>
            </div>
          ))
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
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Draft Lobby</h3>
          <p className="text-gray-600 mb-4">
            {isCommissioner
              ? "Start the draft when all members have joined."
              : "Waiting for the commissioner to start the draft..."}
          </p>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Joined Members ({league.memberships.length})</h4>
            <div className="space-y-2">
              {league.memberships.map((member) => (
                <div key={member.id} className="flex items-center p-3 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-900">{member.user?.name || "Unknown"}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {isCommissioner && (
            <button
              onClick={startDraft}
              disabled={!hasEnoughMembers || loading}
              className="w-full px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? "Starting..." : hasEnoughMembers ? "Start Draft" : `Start Draft (need ${2 - league.memberships.length} more members)`}
            </button>
          )}
        </div>
      )}

      {isDraftActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-900 mb-2">Draft In Progress</h3>
          <p className="text-blue-700 mb-4">The draft is currently active. Enter the draft room to make your picks.</p>
          <button
            onClick={() => router.push(`/draft/${leagueId}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Enter Draft Room
          </button>
        </div>
      )}

      {isDraftComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-green-900 mb-2">Draft Complete</h3>
          <p className="text-green-700">All members have completed their picks. Check out your team on the My Team tab.</p>
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  league,
  isCommissioner,
  leagueId,
}: {
  league: League;
  isCommissioner: boolean;
  leagueId: string;
}) {
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInviteLink(`${window.location.origin}/join/${leagueId}`);
  }, [leagueId]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <input
              type="text"
              value={league.name}
              readOnly
              className="w-full px-4 py-2 border rounded bg-gray-50"
            />
          </div>
          {isCommissioner && (
            <p className="text-sm text-gray-500">Commissioner controls only</p>
          )}
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
      <div className="max-w-5xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Back to Leagues
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{league.name}</h1>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>{today}</span>
                <span>•</span>
                <span>Season starts March 27th</span>
              </div>
            </div>
            <NotificationBell leagueId={leagueId} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {(["draft", "leaderboard", "myteam", "players", "settings"] as TabType[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium text-sm transition ${
                    activeTab === tab
                      ? "text-indigo-600 border-b-2 border-indigo-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab === "draft" && "Draft"}
                  {tab === "leaderboard" && "Leaderboard"}
                  {tab === "myteam" && "My Team"}
                  {tab === "players" && "Players"}
                  {tab === "settings" && "Settings"}
                </button>
              )
            )}
          </div>

          {/* Tab Content */}
          <div className="p-6">
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
            {activeTab === "players" && (
              <ComingSoonTab label="Players" />
            )}
            {activeTab === "settings" && (
              <SettingsTab
                league={league}
                isCommissioner={isCommissioner}
                leagueId={leagueId}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
