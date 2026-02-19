"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher-client";

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
          <h1 className="text-4xl font-bold text-gray-900">{league.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>{today}</span>
            <span>•</span>
            <span>Season starts March 27th</span>
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
              <ComingSoonTab label="Leaderboard" />
            )}
            {activeTab === "myteam" && (
              <ComingSoonTab label="My Team" />
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
