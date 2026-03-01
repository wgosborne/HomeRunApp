"use client";

import { useEffect, useState } from "react";

interface RosterEntry {
  playerId: string;
  playerName: string;
  position: string | null;
  homeruns: number;
  points: number;
  draftedRound: number | null;
  draftedPickNumber: number | null;
}

interface TeamRoster {
  userId: string;
  userName: string;
  teamName: string;
  roster: RosterEntry[];
  isLoading: boolean;
}

interface DraftTeamsRosterProps {
  leagueId: string;
  members: Array<{
    userId: string;
    userName: string;
    teamName: string;
  }>;
  currentPickerId?: string;
}

export function DraftTeamsRoster({
  leagueId,
  members,
  currentPickerId,
}: DraftTeamsRosterProps) {
  const [teams, setTeams] = useState<TeamRoster[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(
    currentPickerId || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize teams with empty rosters
    const initialTeams = members.map((member) => ({
      userId: member.userId,
      userName: member.userName,
      teamName: member.teamName,
      roster: [],
      isLoading: true,
    }));
    setTeams(initialTeams);

    // Fetch rosters for all members
    const fetchAllRosters = async () => {
      try {
        const rosterPromises = members.map((member) =>
          fetch(`/api/leagues/${leagueId}/roster?userId=${member.userId}`)
            .then((res) => res.json())
            .then((roster) => ({
              userId: member.userId,
              roster: roster || [],
            }))
            .catch(() => ({
              userId: member.userId,
              roster: [],
            }))
        );

        const rosters = await Promise.all(rosterPromises);

        // Update teams with fetched rosters
        const updatedTeams = initialTeams.map((team) => {
          const rosterData = rosters.find((r) => r.userId === team.userId);
          return {
            ...team,
            roster: rosterData?.roster || [],
            isLoading: false,
          };
        });

        setTeams(updatedTeams);
      } catch (error) {
        console.error("Failed to fetch rosters", error);
        setTeams(initialTeams.map((t) => ({ ...t, isLoading: false })));
      } finally {
        setLoading(false);
      }
    };

    fetchAllRosters();
    // Only fetch once when component mounts - don't refetch on every parent render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  // Update expanded team when currentPickerId changes
  useEffect(() => {
    if (currentPickerId) {
      setExpandedTeam(currentPickerId);
    }
  }, [currentPickerId]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">Team Rosters</h3>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Loading rosters...
          </div>
        ) : teams.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No teams yet
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.userId} className="border-b last:border-b-0">
              {/* Team Header - Accordion Toggle */}
              <button
                onClick={() =>
                  setExpandedTeam(
                    expandedTeam === team.userId ? null : team.userId
                  )
                }
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  expandedTeam === team.userId ? "bg-blue-50" : ""
                } ${team.userId === currentPickerId ? "bg-blue-100" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {team.userName}
                    </div>
                    <div className="text-xs text-gray-600">{team.teamName}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-600">
                      {team.roster.length} players
                    </span>
                    <span
                      className={`transform transition-transform ${
                        expandedTeam === team.userId ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </div>
                </div>
                {team.userId === currentPickerId && (
                  <div className="text-xs font-semibold text-blue-600 mt-1">
                    Currently picking
                  </div>
                )}
              </button>

              {/* Team Roster - Expanded Content */}
              {expandedTeam === team.userId && (
                <div className="bg-gray-50 divide-y">
                  {team.isLoading ? (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Loading roster...
                    </div>
                  ) : team.roster.length === 0 ? (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      No players drafted yet
                    </div>
                  ) : (
                    team.roster.map((player) => (
                      <div key={player.playerId} className="p-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {player.playerName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {player.position} • R{player.draftedRound}P
                          {player.draftedPickNumber}
                        </div>
                        {player.homeruns > 0 && (
                          <div className="text-xs font-semibold text-blue-600 mt-1">
                            {player.homeruns} HR
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
