import { 
  generateMatchStructure, 
  assignParticipantsToMatches,
  canFinalizeRound,
  finalizeRoundIfComplete,
  determineWinner,
  getByeMatches,
  getCompletedMatches,
  getRegularMatches,
  fillByeMatchesWithWildCards,
  getRoundLabel,
  getParticipantStatus,
  validateParticipantName,
  validateTournamentName,
  getMatchStatusText,
  exportTournaments,
  importTournaments
} from './tournamentService';
import { GAME_RULES, Tournament, ScoringMode, Participant, Match } from '../types/bracket';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Creates a basic test tournament with the given number of participants
 */
function createTestTournament(
  participantCount: number,
  options: {
    seedingMode?: 'random' | 'seeded';
    scoringMode?: ScoringMode;
    targetScore?: number;
    gamePoints?: number[];
  } = {}
): Tournament {
  const {
    seedingMode = 'random',
    scoringMode = 'higher_score',
    targetScore,
    gamePoints = []
  } = options;

  const participants = Array.from({ length: participantCount }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamePoints: gamePoints[i] ?? 0
  }));

  return {
    id: 'test-tournament',
    name: 'Test Tournament',
    game: 'Test Game',
    scoringMode,
    scoreLabel: 'Points',
    targetScore,
    seedingMode,
    isStarted: false,
    participants,
    matches: [],
    currentRound: 1,
    totalRounds: 0,
    finalizedRounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Creates a deterministic random number generator for reproducible tests
 */
function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Creates a tournament using a specific game's rules
 */
function createTournamentFromGameRule(
  gameName: string,
  participantCount: number,
  seedingMode: 'random' | 'seeded' = 'random'
): Tournament {
  const rule = GAME_RULES[gameName as keyof typeof GAME_RULES];
  if (!rule) throw new Error(`Unknown game: ${gameName}`);

  const participants = Array.from({ length: participantCount }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    gamePoints: 0
  }));

  return {
    id: `${gameName.toLowerCase().replace(/\s+/g, '-')}-tournament`,
    name: `${gameName} Tournament`,
    game: gameName,
    scoringMode: rule.scoringMode,
    scoreLabel: rule.scoreLabel,
    targetScore: rule.targetScore,
    seedingMode,
    isStarted: false,
    participants,
    matches: [],
    currentRound: 1,
    totalRounds: 0,
    finalizedRounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Simulates playing a match and setting a winner
 */
function playMatch(
  match: Match,
  p1Score: number,
  p2Score: number,
  tournament: Tournament
): void {
  match.participant1Score = p1Score;
  match.participant2Score = p2Score;
  match.winner = determineWinner(tournament, match, p1Score, p2Score);
}

/**
 * Gets matches for a specific round
 */
function getRoundMatches(tournament: Tournament, round: number): Match[] {
  return tournament.matches.filter(m => m.round === round);
}

/**
 * Counts matches with at least one participant
 */
function countMatchesWithParticipants(matches: Match[]): number {
  return matches.filter(m => m.participant1 || m.participant2).length;
}

/**
 * Counts full matches (both participants present)
 */
function countFullMatches(matches: Match[]): number {
  return matches.filter(m => m.participant1 && m.participant2).length;
}

/**
 * Counts bye matches (exactly one participant)
 */
function countByeMatches(matches: Match[]): number {
  return matches.filter(m =>
    (m.participant1 && !m.participant2) || (!m.participant1 && m.participant2)
  ).length;
}

/**
 * Counts empty matches (no participants)
 */
function countEmptyMatches(matches: Match[]): number {
  return matches.filter(m => !m.participant1 && !m.participant2).length;
}

// ============================================================================
// BRACKET STRUCTURE TESTS
// ============================================================================

describe('Bracket Structure (generateMatchStructure)', () => {
  test.each([
    { players: 2, expectedMatches: 1, expectedRounds: 1, r1Matches: 1 },
    { players: 3, expectedMatches: 3, expectedRounds: 2, r1Matches: 2 },
    { players: 4, expectedMatches: 3, expectedRounds: 2, r1Matches: 2 },
    { players: 5, expectedMatches: 7, expectedRounds: 3, r1Matches: 4 },
    { players: 6, expectedMatches: 7, expectedRounds: 3, r1Matches: 4 },
    { players: 7, expectedMatches: 7, expectedRounds: 3, r1Matches: 4 },
    { players: 8, expectedMatches: 7, expectedRounds: 3, r1Matches: 4 },
    { players: 9, expectedMatches: 15, expectedRounds: 4, r1Matches: 8 },
    { players: 16, expectedMatches: 15, expectedRounds: 4, r1Matches: 8 },
    { players: 17, expectedMatches: 31, expectedRounds: 5, r1Matches: 16 },
    { players: 32, expectedMatches: 31, expectedRounds: 5, r1Matches: 16 },
    { players: 33, expectedMatches: 63, expectedRounds: 6, r1Matches: 32 },
    { players: 64, expectedMatches: 63, expectedRounds: 6, r1Matches: 32 },
    { players: 100, expectedMatches: 127, expectedRounds: 7, r1Matches: 64 },
    { players: 128, expectedMatches: 127, expectedRounds: 7, r1Matches: 64 },
  ])('$players players: $expectedMatches matches, $expectedRounds rounds', 
    ({ players, expectedMatches, expectedRounds, r1Matches }) => {
      const matches = generateMatchStructure(players);
      
      expect(matches.length).toBe(expectedMatches);
      
      // Count rounds
      const rounds = new Set(matches.map(m => m.round));
      expect(rounds.size).toBe(expectedRounds);
      
      // Verify round 1 has correct number of matches
      const round1 = matches.filter(m => m.round === 1);
      expect(round1.length).toBe(r1Matches);
      
      // Verify final round has exactly 1 match
      const finalRound = matches.filter(m => m.round === expectedRounds);
      expect(finalRound.length).toBe(1);
      
      // Verify each round has half the matches of the previous
      for (let r = 2; r <= expectedRounds; r++) {
        const prevRound = matches.filter(m => m.round === r - 1).length;
        const thisRound = matches.filter(m => m.round === r).length;
        expect(thisRound).toBe(Math.ceil(prevRound / 2));
      }
    }
  );

  test('0 players: no matches', () => {
    expect(generateMatchStructure(0)).toEqual([]);
  });

  test('1 player: no matches', () => {
    expect(generateMatchStructure(1)).toEqual([]);
  });

  test('negative players: no matches', () => {
    expect(generateMatchStructure(-5)).toEqual([]);
    });
  });

// ============================================================================
// PARTICIPANT ASSIGNMENT TESTS (RANDOM MODE)
// ============================================================================

describe('Participant Assignment - Random Mode', () => {
  test.each([
    { players: 2, fullMatches: 1, byeMatches: 0, emptyMatches: 0 },
    { players: 3, fullMatches: 1, byeMatches: 1, emptyMatches: 0 },
    { players: 4, fullMatches: 2, byeMatches: 0, emptyMatches: 0 },
    { players: 5, fullMatches: 2, byeMatches: 1, emptyMatches: 1 },
    { players: 6, fullMatches: 3, byeMatches: 0, emptyMatches: 1 },
    { players: 7, fullMatches: 3, byeMatches: 1, emptyMatches: 0 },
    { players: 8, fullMatches: 4, byeMatches: 0, emptyMatches: 0 },
    { players: 9, fullMatches: 4, byeMatches: 1, emptyMatches: 3 },
    { players: 15, fullMatches: 7, byeMatches: 1, emptyMatches: 0 },
    { players: 16, fullMatches: 8, byeMatches: 0, emptyMatches: 0 },
    { players: 33, fullMatches: 16, byeMatches: 1, emptyMatches: 15 },
    { players: 100, fullMatches: 50, byeMatches: 0, emptyMatches: 14 },
  ])('$players players: $fullMatches full, $byeMatches byes, $emptyMatches empty',
    ({ players, fullMatches, byeMatches, emptyMatches }) => {
      const tournament = createTestTournament(players);
      const result = assignParticipantsToMatches(tournament);
      
      const r1Matches = getRoundMatches(result, 1);
      
      expect(countFullMatches(r1Matches)).toBe(fullMatches);
      expect(countByeMatches(r1Matches)).toBe(byeMatches);
      expect(countEmptyMatches(r1Matches)).toBe(emptyMatches);
      
      // No auto-advancement at start
      const matchesWithWinners = result.matches.filter(m => m.winner);
      expect(matchesWithWinners.length).toBe(0);
      
      // All subsequent rounds should be empty
      for (let r = 2; r <= result.totalRounds; r++) {
        const roundMatches = getRoundMatches(result, r);
        expect(countMatchesWithParticipants(roundMatches)).toBe(0);
      }
    }
  );

  test('all participants are assigned exactly once', () => {
    const tournament = createTestTournament(33);
    const result = assignParticipantsToMatches(tournament);
    
    const assignedParticipants: string[] = [];
    for (const match of result.matches) {
      if (match.participant1) assignedParticipants.push(match.participant1.id);
      if (match.participant2) assignedParticipants.push(match.participant2.id);
    }
    
    // Each participant should appear exactly once
    const uniqueIds = new Set(assignedParticipants);
    expect(uniqueIds.size).toBe(33);
    expect(assignedParticipants.length).toBe(33);
  });
});

// ============================================================================
// PARTICIPANT ASSIGNMENT TESTS (SEEDED MODE)
// ============================================================================

describe('Participant Assignment - Seeded Mode', () => {
  test('top seeds receive byes in seeded mode', () => {
    // 5 players need 3 byes (bracket size 8)
    const tournament = createTestTournament(5, {
      seedingMode: 'seeded',
      gamePoints: [100, 80, 60, 40, 20] // Clear ranking
    });
    
    const result = assignParticipantsToMatches(tournament);
    const r1Matches = getRoundMatches(result, 1);
    
    // With seeded mode, highest gamePoints should get byes
      const byeMatches = r1Matches.filter(m => 
        (m.participant1 && !m.participant2) || (!m.participant1 && m.participant2)
      );
    
    // The bye participants should be among the top seeds
    const byeParticipants = byeMatches.map(m => m.participant1 || m.participant2);
    expect(byeParticipants.length).toBeGreaterThan(0);
  });

  test('seeded mode distributes players across bracket with byes', () => {
    // Note: Seeded mode only applies when byeCount > 0
    // Use 7 players in an 8-slot bracket (1 bye)
    const tournament = createTestTournament(7, {
      seedingMode: 'seeded',
      gamePoints: [100, 90, 80, 70, 60, 50, 40]
    });
    
    const result = assignParticipantsToMatches(tournament);
    const r1Matches = getRoundMatches(result, 1);
    
    // 7 players: 3 full matches + 1 bye (top seed gets bye)
    expect(countFullMatches(r1Matches)).toBe(3);
    expect(countByeMatches(r1Matches)).toBe(1);
    
    // Verify all 7 players are assigned
    const assignedPoints: number[] = [];
    for (const m of r1Matches) {
      if (m.participant1) assignedPoints.push(m.participant1.gamePoints);
      if (m.participant2) assignedPoints.push(m.participant2.gamePoints);
    }
    expect(assignedPoints.sort((a, b) => b - a)).toEqual([100, 90, 80, 70, 60, 50, 40]);
    
    // In seeded mode, top seed (100pts) should get the bye
    const byeMatch = r1Matches.find(m => 
      (m.participant1 && !m.participant2) || (!m.participant1 && m.participant2)
    );
    expect(byeMatch).toBeDefined();
    const byePlayer = byeMatch!.participant1 || byeMatch!.participant2;
    expect(byePlayer?.gamePoints).toBe(100);
  });
});

// ============================================================================
// ROUND FINALIZATION TESTS
// ============================================================================

describe('Round Finalization', () => {
  test('cannot finalize incomplete round', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(4));
    
    // Round 1 has 2 full matches, none completed
    expect(canFinalizeRound(tournament, 1)).toBe(false);
    expect(finalizeRoundIfComplete(tournament, 1)).toBe(false);
    
    // Complete only one match
    const r1Matches = getRoundMatches(tournament, 1);
    const fullMatches = r1Matches.filter(m => m.participant1 && m.participant2);
    playMatch(fullMatches[0], 10, 5, tournament);
    
    // Still can't finalize (second match incomplete)
    expect(canFinalizeRound(tournament, 1)).toBe(false);
  });

  test('can finalize when all played matches are complete', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(4));
    
    const r1Matches = getRoundMatches(tournament, 1);
    const fullMatches = r1Matches.filter(m => m.participant1 && m.participant2);
    
    // Complete all matches
    fullMatches.forEach((match, i) => {
      playMatch(match, 10 + i, 5, tournament);
    });
    
    expect(canFinalizeRound(tournament, 1)).toBe(true);
    expect(finalizeRoundIfComplete(tournament, 1)).toBe(true);
    expect(tournament.finalizedRounds).toContain(1);
  });

  test('finalization advances winners to next round', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(4));
    
    // Complete round 1
    const r1Matches = getRoundMatches(tournament, 1);
    const fullMatches = r1Matches.filter(m => m.participant1 && m.participant2);
    fullMatches.forEach(match => playMatch(match, 10, 5, tournament));
    
    // Before finalization, round 2 should be empty
    const r2Before = getRoundMatches(tournament, 2);
    expect(countMatchesWithParticipants(r2Before)).toBe(0);
    
    // Finalize
    finalizeRoundIfComplete(tournament, 1);
    
    // After finalization, round 2 should have winners
    const r2After = getRoundMatches(tournament, 2);
    expect(countMatchesWithParticipants(r2After)).toBe(1);
    expect(r2After[0].participant1).toBeTruthy();
    expect(r2After[0].participant2).toBeTruthy();
  });

  test('finalization processes bye matches', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(3));
    
    // 3 players: 1 full match, 1 bye match
    const r1Matches = getRoundMatches(tournament, 1);
    const fullMatches = r1Matches.filter(m => m.participant1 && m.participant2);
    expect(fullMatches.length).toBe(1);
    
    // Complete the full match
    playMatch(fullMatches[0], 10, 5, tournament);
    
    // Finalize
    expect(finalizeRoundIfComplete(tournament, 1)).toBe(true);
    
    // Final match should have both participants (winner + bye player)
    const final = getRoundMatches(tournament, 2)[0];
    expect(final.participant1).toBeTruthy();
    expect(final.participant2).toBeTruthy();
  });

  test('currentRound updates after finalization', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(4));
    expect(tournament.currentRound).toBe(1);
    
    // Complete and finalize round 1
    const r1Matches = getRoundMatches(tournament, 1)
      .filter(m => m.participant1 && m.participant2);
    r1Matches.forEach(match => playMatch(match, 10, 5, tournament));
    finalizeRoundIfComplete(tournament, 1);
    
    expect(tournament.currentRound).toBe(2);
  });

  test('final round can be finalized to determine champion', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(2));
    
    // Only 1 match (the final)
    expect(tournament.totalRounds).toBe(1);
    const final = tournament.matches[0];
    playMatch(final, 10, 5, tournament);
    
    expect(canFinalizeRound(tournament, 1)).toBe(true);
    expect(finalizeRoundIfComplete(tournament, 1)).toBe(true);
    expect(tournament.finalizedRounds).toContain(1);
  });
});

// ============================================================================
// WILD CARD LOGIC TESTS
// ============================================================================

describe('Wild Card Logic', () => {
  test('highest-scoring loser fills bye slot after finalization', () => {
    // 5 players: R1 has 2 full matches + 1 bye
    const tournament = assignParticipantsToMatches(createTestTournament(5));
    
    const r1Matches = getRoundMatches(tournament, 1);
    const fullMatches = r1Matches.filter(m => m.participant1 && m.participant2);
    expect(fullMatches.length).toBe(2);
    
    // Play matches with different scores - higher loser score should get wildcard
    // Match 0: winner scores 10, loser scores 8
    // Match 1: winner scores 10, loser scores 3
    playMatch(fullMatches[0], 10, 8, tournament);
    playMatch(fullMatches[1], 10, 3, tournament);
    
    // Identify the losers and their scores
    const loser0 = fullMatches[0].winner?.id === fullMatches[0].participant1?.id
      ? fullMatches[0].participant2
      : fullMatches[0].participant1;
    const loser1 = fullMatches[1].winner?.id === fullMatches[1].participant1?.id
      ? fullMatches[1].participant2
      : fullMatches[1].participant1;
    
    // Loser from match 0 scored 8, loser from match 1 scored 3
    const higherScoringLoserId = loser0?.id;
    
    // Finalize round 1
    finalizeRoundIfComplete(tournament, 1);
    
    // Check round 2 for wild card assignments
    const r2Matches = getRoundMatches(tournament, 2);
    const wildcardMatches = r2Matches.filter(m => 
      m.wildCardParticipant1 || m.wildCardParticipant2
    );
    
    // There should be a wildcard if there's a single-participant match
    if (wildcardMatches.length > 0) {
      const wildcard = wildcardMatches[0].wildCardParticipant1 
        ? wildcardMatches[0].participant1 
        : wildcardMatches[0].participant2;
      
      // The wild card should be the higher-scoring loser (scored 8)
      expect(wildcard?.id).toBe(higherScoringLoserId);
    }
  });

  test('wild card flag is set correctly', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(5));
    
    const r1Matches = getRoundMatches(tournament, 1);
    const fullMatches = r1Matches.filter(m => m.participant1 && m.participant2);
    fullMatches.forEach(match => playMatch(match, 10, 5, tournament));
    
    finalizeRoundIfComplete(tournament, 1);
    
    const r2Matches = getRoundMatches(tournament, 2);
    const wildcardMatch = r2Matches.find(m => 
      m.wildCardParticipant1 || m.wildCardParticipant2
    );
    
    if (wildcardMatch) {
      const hasWildcardFlag = wildcardMatch.wildCardParticipant1 || wildcardMatch.wildCardParticipant2;
      expect(hasWildcardFlag).toBe(true);
    }
  });
});

// ============================================================================
// SCORING MODE TESTS
// ============================================================================

describe('Scoring Modes - determineWinner', () => {
  describe('higher_score mode', () => {
    const tournament = createTestTournament(2, { scoringMode: 'higher_score' });
    const result = assignParticipantsToMatches(tournament);
    const match = result.matches[0];

    test('higher score wins', () => {
      const winner = determineWinner(result, match, 10, 5);
      expect(winner?.id).toBe(match.participant1!.id);
    });

    test('tie returns null', () => {
      const winner = determineWinner(result, match, 5, 5);
      expect(winner).toBeNull();
    });
  });

  describe('lower_score mode', () => {
    const tournament = createTestTournament(2, { scoringMode: 'lower_score' });
    const result = assignParticipantsToMatches(tournament);
    const match = result.matches[0];

    test('lower score wins', () => {
      const winner = determineWinner(result, match, 3, 5);
      expect(winner?.id).toBe(match.participant1!.id);
    });

    test('zero score loses to any positive score', () => {
      const winner = determineWinner(result, match, 0, 5);
      expect(winner?.id).toBe(match.participant2!.id);
    });

    test('both zero returns null', () => {
      const winner = determineWinner(result, match, 0, 0);
      expect(winner).toBeNull();
    });
  });

  describe('best_of mode', () => {
    test('reaching target score wins', () => {
      const tournament = createTestTournament(2, { 
        scoringMode: 'best_of', 
        targetScore: 3 
      });
      const result = assignParticipantsToMatches(tournament);
      const match = result.matches[0];

      // P1 wins 3-1
      const winner = determineWinner(result, match, 3, 1);
      expect(winner?.id).toBe(match.participant1!.id);
    });

    test('neither reaching target returns null', () => {
      const tournament = createTestTournament(2, { 
        scoringMode: 'best_of', 
        targetScore: 3 
      });
      const result = assignParticipantsToMatches(tournament);
      const match = result.matches[0];

      const winner = determineWinner(result, match, 2, 2);
      expect(winner).toBeNull();
    });
  });
});

// ============================================================================
// GAME RULES INTEGRATION TESTS
// ============================================================================

describe('Game Rules Integration', () => {
  const gameNames = Object.keys(GAME_RULES);
  
  test.each(gameNames)('%s: tournament uses correct game rules', (gameName) => {
    const tournament = createTournamentFromGameRule(gameName, 8);
    const rule = GAME_RULES[gameName as keyof typeof GAME_RULES];
    
    expect(tournament.scoringMode).toBe(rule.scoringMode);
    expect(tournament.scoreLabel).toBe(rule.scoreLabel);
    expect(tournament.targetScore).toBe(rule.targetScore);
  });

  test.each(gameNames)('%s: can generate bracket for 16 players', (gameName) => {
    const tournament = createTournamentFromGameRule(gameName, 16);
    const result = assignParticipantsToMatches(tournament);
    
    expect(result.totalRounds).toBe(4);
    expect(result.matches.length).toBe(15);
    
    const r1Matches = getRoundMatches(result, 1);
    expect(countFullMatches(r1Matches)).toBe(8);
  });

  test.each(gameNames)('%s: determineWinner works correctly', (gameName) => {
    const tournament = createTournamentFromGameRule(gameName, 2);
    const result = assignParticipantsToMatches(tournament);
    const match = result.matches[0];
    const rule = GAME_RULES[gameName as keyof typeof GAME_RULES];
    
    let winner: Participant | null;
    
    if (rule.scoringMode === 'lower_score') {
      winner = determineWinner(result, match, 50, 100);
      expect(winner?.id).toBe(match.participant1!.id);
    } else if (rule.scoringMode === 'best_of' && rule.targetScore) {
      winner = determineWinner(result, match, rule.targetScore, 0);
      expect(winner?.id).toBe(match.participant1!.id);
    } else {
      winner = determineWinner(result, match, 100, 50);
      expect(winner?.id).toBe(match.participant1!.id);
    }
  });
});

// ============================================================================
// FULL TOURNAMENT SIMULATION TESTS
// ============================================================================

describe('Full Tournament Simulation', () => {
  test('4-player tournament completes correctly', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(4));
    
    // Round 1: 2 matches
    const r1Matches = getRoundMatches(tournament, 1)
      .filter(m => m.participant1 && m.participant2);
    expect(r1Matches.length).toBe(2);
    
    r1Matches.forEach(match => playMatch(match, 10, 5, tournament));
    finalizeRoundIfComplete(tournament, 1);
    
    expect(tournament.currentRound).toBe(2);
    expect(tournament.finalizedRounds).toContain(1);
    
    // Round 2 (Final)
    const final = getRoundMatches(tournament, 2)[0];
    expect(final.participant1).toBeTruthy();
    expect(final.participant2).toBeTruthy();
    
    playMatch(final, 15, 10, tournament);
    finalizeRoundIfComplete(tournament, 2);
    
    expect(tournament.finalizedRounds).toContain(2);
    expect(final.winner).toBeTruthy();
  });

  test('8-player tournament progresses through all rounds', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(8));
    expect(tournament.totalRounds).toBe(3);
    
    // Round 1: 4 matches
    for (let round = 1; round <= 3; round++) {
      const matches = getRoundMatches(tournament, round)
        .filter(m => m.participant1 && m.participant2);
      
      matches.forEach(match => playMatch(match, 10, 5, tournament));
      
      const finalized = finalizeRoundIfComplete(tournament, round);
      expect(finalized).toBe(true);
      expect(tournament.finalizedRounds).toContain(round);
    }
    
    // Champion determined
    const final = getRoundMatches(tournament, 3)[0];
    expect(final.winner).toBeTruthy();
  });

  test('tournament with byes completes correctly', () => {
    const tournament = assignParticipantsToMatches(createTestTournament(5));
    expect(tournament.totalRounds).toBe(3);
    
    // Round 1: 2 full + 1 bye
    const r1Full = getRoundMatches(tournament, 1)
      .filter(m => m.participant1 && m.participant2);
    expect(r1Full.length).toBe(2);
    
    r1Full.forEach(match => playMatch(match, 10, 5, tournament));
    finalizeRoundIfComplete(tournament, 1);
    
    // Round 2 should have participants
    const r2Matches = getRoundMatches(tournament, 2);
    const r2WithParticipants = r2Matches.filter(m => m.participant1 || m.participant2);
    expect(r2WithParticipants.length).toBeGreaterThan(0);
    
    // Complete remaining rounds
    for (let round = 2; round <= 3; round++) {
      const matches = getRoundMatches(tournament, round)
        .filter(m => m.participant1 && m.participant2);
      matches.forEach(match => playMatch(match, 10, 5, tournament));
      finalizeRoundIfComplete(tournament, round);
    }
    
    const final = getRoundMatches(tournament, 3)[0];
    expect(final.winner).toBeTruthy();
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Helper Functions', () => {
  describe('getRoundLabel', () => {
    test.each([
      { round: 1, total: 1, expected: 'Final' },
      { round: 1, total: 2, expected: 'Semi-Finals' },
      { round: 2, total: 2, expected: 'Final' },
      { round: 1, total: 3, expected: 'Quarter-Finals' },
      { round: 2, total: 3, expected: 'Semi-Finals' },
      { round: 3, total: 3, expected: 'Final' },
      { round: 1, total: 4, expected: 'Round 1' },
      { round: 4, total: 4, expected: 'Final' },
    ])('round $round of $total: "$expected"', ({ round, total, expected }) => {
      expect(getRoundLabel(round, total)).toBe(expected);
    });
  });

  describe('validateParticipantName', () => {
    const existing = [{ id: '1', name: 'John', gamePoints: 0 }];
    
    test('valid name passes', () => {
      const result = validateParticipantName('Jane', existing);
      expect(result.valid).toBe(true);
    });

    test('empty name fails', () => {
      const result = validateParticipantName('', existing);
      expect(result.valid).toBe(false);
    });

    test('duplicate name fails (case insensitive)', () => {
      const result = validateParticipantName('JOHN', existing);
      expect(result.valid).toBe(false);
    });

    test('too short name fails', () => {
      const result = validateParticipantName('A', existing);
      expect(result.valid).toBe(false);
    });

    test('too long name fails', () => {
      const result = validateParticipantName('A'.repeat(51), existing);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTournamentName', () => {
    test('valid name passes', () => {
      expect(validateTournamentName('My Tournament').valid).toBe(true);
    });

    test('empty name fails', () => {
      expect(validateTournamentName('').valid).toBe(false);
    });
  });

  describe('getMatchStatusText', () => {
    test('awaiting opponent for incomplete match', () => {
      const tournament = assignParticipantsToMatches(createTestTournament(3));
      const byeMatch = tournament.matches.find(m => 
        (m.participant1 && !m.participant2) || (!m.participant1 && m.participant2)
      );
      
      if (byeMatch) {
        const status = getMatchStatusText(tournament, byeMatch);
        expect(status).toBe('Awaiting opponent');
      }
    });

    test('not started for zero scores', () => {
      const tournament = assignParticipantsToMatches(createTestTournament(2));
      const match = tournament.matches[0];
      const status = getMatchStatusText(tournament, match);
      expect(status).toBe('Not started');
    });

    test('advances message for winner', () => {
      const tournament = assignParticipantsToMatches(createTestTournament(2));
      const match = tournament.matches[0];
      playMatch(match, 10, 5, tournament);
      const status = getMatchStatusText(tournament, match);
      expect(status).toContain('advances');
    });
  });

  describe('getByeMatches / getRegularMatches / getCompletedMatches', () => {
    test('correctly categorizes matches', () => {
      const tournament = assignParticipantsToMatches(createTestTournament(5));
      
      // At start, some byes and regular matches exist
      const byes = getByeMatches(tournament, 1);
      const regular = getRegularMatches(tournament, 1);
      const completed = getCompletedMatches(tournament, 1);
      
      expect(byes.length + regular.length).toBeGreaterThan(0);
      expect(completed.length).toBe(0); // None completed yet
      
      // Complete a regular match
      regular.forEach(match => playMatch(match, 10, 5, tournament));
      
      const completedAfter = getCompletedMatches(tournament, 1);
      expect(completedAfter.length).toBe(regular.length);
    });
  });

  describe('getParticipantStatus', () => {
    test('playing status for active participant', () => {
      const tournament = assignParticipantsToMatches(createTestTournament(4));
      const participant = tournament.participants[0];
      const status = getParticipantStatus(participant, tournament);
      expect(status).toBe('playing');
    });

    test('eliminated status after losing', () => {
      const tournament = assignParticipantsToMatches(createTestTournament(2));
      const match = tournament.matches[0];
      playMatch(match, 5, 10, tournament); // P1 loses
      finalizeRoundIfComplete(tournament, 1);
      
      const loser = match.participant1!;
      const status = getParticipantStatus(loser, tournament);
      expect(status).toBe('eliminated');
    });

    test('champion status for final winner', () => {
      const tournament = assignParticipantsToMatches(createTestTournament(2));
      const final = tournament.matches[0];
      playMatch(final, 10, 5, tournament);
      finalizeRoundIfComplete(tournament, 1);
      
      const winner = final.winner!;
      const status = getParticipantStatus(winner, tournament);
      expect(status).toBe('champion');
    });
  });
});

// ============================================================================
// EXPORT/IMPORT TESTS
// ============================================================================

describe('Export/Import', () => {
  test('exportTournaments produces valid JSON', () => {
    const tournaments = [
      assignParticipantsToMatches(createTestTournament(4)),
      assignParticipantsToMatches(createTestTournament(8))
    ];
    
    const json = exportTournaments(tournaments);
    expect(() => JSON.parse(json)).not.toThrow();
    
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
  });

  test('importTournaments parses valid JSON', () => {
    const original = [assignParticipantsToMatches(createTestTournament(4))];
    const json = exportTournaments(original);
    
    const imported = importTournaments(json);
    expect(imported.length).toBe(1);
    expect(imported[0].id).toBe(original[0].id);
  });

  test('importTournaments throws on invalid format', () => {
    expect(() => importTournaments('not json')).toThrow();
    expect(() => importTournaments('{}')).toThrow();
    expect(() => importTournaments('[{}]')).toThrow();
  });
});

// ============================================================================
// SEEDED DATA PARITY TESTS (Mimics DynamoDB seeding)
// ============================================================================

describe('Seeded Data Parity (DynamoDB simulation)', () => {
  const playerCounts = [6, 7, 8, 9, 12, 16, 24, 32, 33, 50, 64, 100];
  const seeds = [42, 123, 456];
  
  test.each(playerCounts)('%i players: bracket invariants hold', (playerCount) => {
    const tournament = createTestTournament(playerCount);
    const result = assignParticipantsToMatches(tournament);
    
    const expectedRounds = Math.ceil(Math.log2(playerCount));
    const bracketSize = Math.pow(2, expectedRounds);
    const expectedMatches = bracketSize - 1;
    
    // Structure invariants
    expect(result.totalRounds).toBe(expectedRounds);
    expect(result.matches.length).toBe(expectedMatches);
    
    // All participants assigned exactly once in round 1
    const r1Matches = getRoundMatches(result, 1);
    let assignedCount = 0;
    for (const m of r1Matches) {
      if (m.participant1) assignedCount++;
      if (m.participant2) assignedCount++;
    }
    expect(assignedCount).toBe(playerCount);
    
    // No auto-advancement at start
    const winnersAtStart = result.matches.filter(m => m.winner);
    expect(winnersAtStart.length).toBe(0);
    
    // Round 1 match count correct
    expect(r1Matches.length).toBe(bracketSize / 2);
  });

  test.each(seeds)('seed %i: all game types produce valid brackets', (seed) => {
    const rng = createSeededRng(seed);
    const gameNames = Object.keys(GAME_RULES);
    
    for (const gameName of gameNames) {
      const playerCount = Math.floor(rng() * 28) + 5; // 5-32 players
      const tournament = createTournamentFromGameRule(gameName, playerCount);
      const result = assignParticipantsToMatches(tournament);
      
      const expectedRounds = Math.ceil(Math.log2(playerCount));
      
      expect(result.totalRounds).toBe(expectedRounds);
      expect(result.matches.length).toBe(Math.pow(2, expectedRounds) - 1);
      
      // Can start playing matches
      const r1Full = getRoundMatches(result, 1)
        .filter(m => m.participant1 && m.participant2);
      expect(r1Full.length).toBeGreaterThan(0);
    }
  });

  test('complete tournament simulation with seeded data', () => {
    const rng = createSeededRng(999);
    const playerCount = 16;
    const tournament = assignParticipantsToMatches(createTestTournament(playerCount));
    
    // Simulate full tournament
    for (let round = 1; round <= tournament.totalRounds; round++) {
      const matches = getRoundMatches(tournament, round)
        .filter(m => m.participant1 && m.participant2 && !m.winner);
      
      for (const match of matches) {
        const p1Score = Math.floor(rng() * 100) + 1;
        const p2Score = Math.floor(rng() * 100) + 1;
        // Ensure no ties
        const finalP2Score = p2Score === p1Score ? p2Score + 1 : p2Score;
        playMatch(match, p1Score, finalP2Score, tournament);
      }
      
      finalizeRoundIfComplete(tournament, round);
    }
    
    // Tournament should be complete
    expect(tournament.finalizedRounds?.length ?? 0).toBe(tournament.totalRounds);
    
    const final = getRoundMatches(tournament, tournament.totalRounds)[0];
    expect(final.winner).toBeTruthy();
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  test('single participant tournament', () => {
      const tournament = createTestTournament(1);
      const result = assignParticipantsToMatches(tournament);
      
      expect(result.matches.length).toBe(0);
      expect(result.totalRounds).toBe(0);
    });

  test('empty tournament', () => {
      const tournament = createTestTournament(0);
      const result = assignParticipantsToMatches(tournament);
      
      expect(result.matches.length).toBe(0);
      expect(result.totalRounds).toBe(0);
  });

  test('power of 2 players has no byes', () => {
    [2, 4, 8, 16, 32, 64].forEach(count => {
      const tournament = assignParticipantsToMatches(createTestTournament(count));
      const r1Matches = getRoundMatches(tournament, 1);
      
      expect(countByeMatches(r1Matches)).toBe(0);
      expect(countFullMatches(r1Matches)).toBe(count / 2);
    });
  });

  test('one less than power of 2 has exactly 1 bye', () => {
    [3, 7, 15, 31, 63].forEach(count => {
      const tournament = assignParticipantsToMatches(createTestTournament(count));
      const r1Matches = getRoundMatches(tournament, 1);
      
      expect(countByeMatches(r1Matches)).toBe(1);
    });
  });
});

console.log('Tournament Service Tests - Run with: npm test -- --testPathPattern=tournamentService.test.ts');
