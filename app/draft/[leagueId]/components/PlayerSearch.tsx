"use client";

import { useEffect, useState } from "react";

interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  homeRuns?: number;
  rank?: number;
}

interface PlayerSearchProps {
  leagueId: string;
  onPlayerSelected: (player: Player) => void;
  isCurrentPicker: boolean;
  isLoading?: boolean;
  onLoadingComplete?: () => void;
}

export function PlayerSearch({
  leagueId,
  onPlayerSelected,
  isCurrentPicker,
  isLoading = false,
  onLoadingComplete,
}: PlayerSearchProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available players when component mounts or when picker changes
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/draft/${leagueId}/available`);

        if (!response.ok) {
          throw new Error("Failed to fetch available players");
        }

        const data = await response.json();
        setPlayers(data.availablePlayers || []);
        setFilteredPlayers(data.availablePlayers || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch players"
        );
      } finally {
        setLoading(false);
        onLoadingComplete?.();
      }
    };

    fetchPlayers();
  }, [leagueId, onLoadingComplete]);

  // Filter players based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlayers(players);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = players.filter(
      (player) =>
        player.name.toLowerCase().includes(term) ||
        player.team.toLowerCase().includes(term)
    );

    setFilteredPlayers(filtered);
  }, [searchTerm, players]);

  if (loading || isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center text-gray-500">Loading available players...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-3 sm:p-4 border-b">
        <input
          type="text"
          placeholder="Search player name or team..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={!isCurrentPicker}
          className="w-full px-3 py-2 sm:py-3 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px]"
        />
        <div className="mt-2 text-xs sm:text-sm text-gray-600">
          {filteredPlayers.length} available • {players.length} total
        </div>
      </div>

      <div className="overflow-y-auto max-h-[60vh] sm:max-h-96">
        {filteredPlayers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No players found</div>
        ) : (
          <div className="space-y-2 p-3 sm:p-4 divide-y sm:divide-y-0">
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => onPlayerSelected(player)}
                disabled={!isCurrentPicker}
                className="w-full p-3 sm:p-4 hover:bg-blue-50 disabled:bg-gray-50 disabled:cursor-not-allowed text-left transition-colors rounded-lg sm:rounded-none border border-gray-200 sm:border-none hover:border-blue-300 sm:hover:border-transparent disabled:border-gray-200 min-h-[56px] flex items-center"
              >
                <div className="flex justify-between items-start gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      #{player.rank || "?"} {player.name}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {player.position} • {player.team}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm sm:text-base font-semibold text-blue-600">
                      {player.homeRuns || 0} HR
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
