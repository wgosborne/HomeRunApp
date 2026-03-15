/**
 * Player utility functions
 */

export interface PlayerStreakInput {
  homeruns: number;
  gamesPlayed: number;
  homerunsLast14Days: number;
  gamesPlayedLast14Days: number;
}

/**
 * Calculate hot/cold badge status based on homerun rates
 *
 * HOT: 14-day rate is more than 25% above season rate AND player has at least 5 games played
 * COLD: 14-day rate is more than 25% below season rate AND player has at least 5 games played
 * NEUTRAL: Everything else, player has 0 HRs, or fewer than 5 games played
 *
 * @param player Player with season and 14-day HR stats
 * @returns 'hot' | 'cold' | 'neutral'
 */
export function getHotColdStatus(player: PlayerStreakInput): 'hot' | 'cold' | 'neutral' {
  // Must have at least 5 games played to qualify for hot/cold
  if (player.gamesPlayed < 5 || player.homeruns === 0) {
    return 'neutral';
  }

  // Calculate season homerun rate
  const seasonRate = player.homeruns / Math.max(1, player.gamesPlayed);

  // Calculate 14-day homerun rate
  const rate14Day = player.homerunsLast14Days / Math.max(1, player.gamesPlayedLast14Days);

  // Hot: 14-day rate is more than 25% above season rate
  if (rate14Day > seasonRate * 1.25) {
    return 'hot';
  }

  // Cold: 14-day rate is more than 25% below season rate
  if (rate14Day < seasonRate * 0.75) {
    return 'cold';
  }

  // Everything else is neutral
  return 'neutral';
}
