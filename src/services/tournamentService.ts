import { v4 as uuidv4 } from 'uuid';
import { Tournament, Match, Participant } from '../types/bracket';

/**
 * Tournament Service - Contains all business logic for tournament management
 * Implements single-elimination bracket with standard bye handling
 * 
 * Bye Rule: Byes resolve after all played matches in that round finish.
 * Wild Card Rule: When a round completes, the highest-scoring losers fill
 * any single-participant matches in the next round to keep even pairings.
 * This is the standard approach used in most tournaments (NCAA, Wimbledon, etc.)
 */

/**
 * Generates the bracket structure for a given number of participants
 */
export function generateMatchStructure(participantCount: number): Match[] {
  if (participantCount < 2) return [];
  
  const rounds = Math.ceil(Math.log2(participantCount));
  const matches: Match[] = [];

  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    for (let position = 1; position <= matchesInRound; position++) {
      matches.push({
        id: uuidv4(),
        round,
        position,
        participant1: null,
        participant2: null,
        participant1Score: 0,
        participant2Score: 0,
        winner: null
      });
    }
  }

  return matches;
}

/**
 * Fisher-Yates shuffle for randomizing participants
 */
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Assigns participants to first-round matches
 * Supports two seeding modes:
 * - 'random': Shuffle participants randomly (default)
 * - 'seeded': Highest gamePoints get byes (like fantasy football playoffs)
 */
export function assignParticipantsToMatches(tournament: Tournament): Tournament {
  const participantCount = tournament.participants.length;
  if (participantCount < 2) {
    return {
      ...tournament,
      matches: [],
      totalRounds: 0,
      currentRound: 1
    };
  }

  const totalRounds = Math.ceil(Math.log2(participantCount));
  const matches = generateMatchStructure(participantCount);
  const firstRoundMatches = matches.filter(m => m.round === 1);
  
  // Get participants in the right order based on seeding mode
  const orderedParticipants = tournament.seedingMode === 'seeded'
    ? getSeededParticipants(tournament.participants)
    : shuffleArray([...tournament.participants]);

  // Calculate number of byes needed
  const bracketSize = Math.pow(2, totalRounds);
  const byeCount = bracketSize - participantCount;

  if (tournament.seedingMode === 'seeded' && byeCount > 0) {
    // SEEDED MODE: Highest gamePoints get byes
    // Standard bracket seeding: Rank 1 vs Rank 8, Rank 4 vs Rank 5, etc.
    assignSeededParticipants(firstRoundMatches, orderedParticipants, byeCount);
  } else {
    // RANDOM MODE: Just fill matches sequentially
    let participantIndex = 0;
    for (const match of firstRoundMatches) {
      if (participantIndex < orderedParticipants.length) {
        match.participant1 = orderedParticipants[participantIndex++];
      }
      if (participantIndex < orderedParticipants.length) {
        match.participant2 = orderedParticipants[participantIndex++];
      }
    }
  }

  return {
    ...tournament,
    matches,
    totalRounds,
    currentRound: 1
  };
}

/**
 * Sorts participants by gamePoints (highest first)
 * Falls back to name for stable ordering when tied
 */
function getSeededParticipants(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => {
    // Then by gamePoints (higher is better)
    if (a.gamePoints !== b.gamePoints) return b.gamePoints - a.gamePoints;
    
    // Finally alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Assigns participants to matches with proper bracket seeding
 * Highest gamePoints get byes, then standard bracket pairing (1v8, 4v5, 3v6, 2v7)
 */
function assignSeededParticipants(
  matches: Match[],
  seededParticipants: Participant[],
  byeCount: number
): void {
  const matchCount = matches.length;
  const bracketSize = matchCount * 2;
  
  // Create seed positions for the bracket
  // Standard seeding: position i gets seed positions that ensure top seeds meet late
  const seedPositions = generateBracketSeedPositions(bracketSize);
  
  // Assign participants to their seeded positions
  // Top seeds (0 to byeCount-1) get byes - they go in positions where opponent is empty
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const slot1Seed = seedPositions[i * 2];     // Seed for slot 1 (0-indexed)
    const slot2Seed = seedPositions[i * 2 + 1]; // Seed for slot 2 (0-indexed)
    
    // Assign participant to slot 1 if they exist
    if (slot1Seed < seededParticipants.length) {
      match.participant1 = seededParticipants[slot1Seed];
    }
    
    // Assign participant to slot 2 if they exist
    if (slot2Seed < seededParticipants.length) {
      match.participant2 = seededParticipants[slot2Seed];
    }
  }
}

/**
 * Generates standard bracket seed positions
 * For 8 players: [0,7,3,4,1,6,2,5] meaning Match1=Seed1vSeed8, Match2=Seed4vSeed5, etc.
 * This ensures top seeds are on opposite sides of the bracket
 */
function generateBracketSeedPositions(bracketSize: number): number[] {
  if (bracketSize === 2) return [0, 1];
  
  // Recursive construction of bracket positions
  const positions: number[] = [];
  const halfSize = bracketSize / 2;
  const upperHalf = generateBracketSeedPositions(halfSize);
  
  // Interleave: each match pairs a seed from upper half with its "complement"
  for (let i = 0; i < halfSize; i++) {
    positions.push(upperHalf[i]);
    positions.push(bracketSize - 1 - upperHalf[i]);
  }
  
  return positions;
}

/**
 * Processes bye matches within a single round
 * A bye occurs when a match has exactly one participant
 */
function processRoundByes(matches: Match[], round: number, totalRounds: number): void {
  const roundMatches = matches.filter(m => m.round === round);

  for (const match of roundMatches) {
    if (match.winner) continue;

    const hasP1 = match.participant1 !== null;
    const hasP2 = match.participant2 !== null;

    if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
      match.winner = hasP1 ? match.participant1 : match.participant2;
      advanceWinnerToNextRound(matches, match, totalRounds);
    }
  }
}

/**
 * Checks if all played matches in a round are complete
 */
function isRoundComplete(matches: Match[], round: number): boolean {
  const roundMatches = matches.filter(m => m.round === round);
  const playedMatches = roundMatches.filter(m => m.participant1 && m.participant2);

  if (playedMatches.length === 0) {
    return roundMatches.some(m => m.participant1 || m.participant2);
  }

  return playedMatches.every(m => m.winner);
}

/**
 * Checks if the next round has started (scores or winners entered)
 */
function hasNextRoundScores(matches: Match[], round: number): boolean {
  const nextRound = round + 1;
  const nextRoundMatches = matches.filter(m => m.round === nextRound);
  return nextRoundMatches.some(m =>
    m.winner ||
    m.participant1Score > 0 ||
    m.participant2Score > 0
  );
}

/**
 * Determines whether a round can be finalized
 */
export function canFinalizeRound(tournament: Tournament, round: number): boolean {
  if (round > tournament.totalRounds) return false;
  if (!isRoundComplete(tournament.matches, round)) return false;
  if (round < tournament.totalRounds && hasNextRoundScores(tournament.matches, round)) return false;
  return true;
}

/**
 * Advances currentRound if all matches in the round are complete
 */
function updateCurrentRound(tournament: Tournament, round: number): void {
  const roundMatches = tournament.matches.filter(m => m.round === round);
  const activeMatches = roundMatches.filter(m => m.participant1 || m.participant2);
  const allComplete = activeMatches.length > 0 && activeMatches.every(m => m.winner);

  if (allComplete && tournament.currentRound === round && round < tournament.totalRounds) {
    tournament.currentRound++;
  }
}

/**
 * Removes wild card assignments from a round (used to recompute after scores update)
 */
function clearWildCardsForRound(matches: Match[], round: number): void {
  const roundMatches = matches.filter(m => m.round === round && !m.winner);

  for (const match of roundMatches) {
    if (match.wildCardParticipant1) {
      match.participant1 = null;
      match.wildCardParticipant1 = false;
    }
    if (match.wildCardParticipant2) {
      match.participant2 = null;
      match.wildCardParticipant2 = false;
    }
  }
}

/**
 * Clears all assignments in the next round before rebuilding
 */
function clearNextRoundAssignments(matches: Match[], round: number): void {
  const roundMatches = matches.filter(m => m.round === round);

  for (const match of roundMatches) {
    match.participant1 = null;
    match.participant2 = null;
    match.participant1Score = 0;
    match.participant2Score = 0;
    match.winner = null;
    match.wildCardParticipant1 = false;
    match.wildCardParticipant2 = false;
  }
}

/**
 * Advances winners from a completed round into the next round
 */
function advanceRoundWinners(tournament: Tournament, round: number): void {
  const roundMatches = tournament.matches.filter(m => m.round === round);

  for (const match of roundMatches) {
    if (!match.winner) continue;
    if (!match.participant1 || !match.participant2) continue;
    advanceWinnerToNextRound(tournament.matches, match, tournament.totalRounds);
  }
}

type RoundLoser = { participant: Participant; score: number; matchId: string };

/**
 * Gets losers from a completed round, sorted by their match score (highest first)
 */
function getRoundLosers(matches: Match[], round: number): RoundLoser[] {
  return matches
    .filter(m => m.round === round && m.participant1 && m.participant2 && m.winner)
    .map(m => {
      const winnerIsP1 = m.winner!.id === m.participant1!.id;
      return {
        participant: winnerIsP1 ? m.participant2! : m.participant1!,
        score: winnerIsP1 ? m.participant2Score : m.participant1Score,
        matchId: m.id
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.participant.name.localeCompare(b.participant.name);
    });
}

/**
 * Helper function to advance a winner to the next round match
 */
function advanceWinnerToNextRound(
  matches: Match[],
  match: Match,
  totalRounds: number
): void {
  if (!match.winner || match.round >= totalRounds) return;

  const nextRoundMatches = matches.filter(m => m.round === match.round + 1);
  const nextMatchPosition = Math.ceil(match.position / 2);
  const nextMatch = nextRoundMatches.find(nm => nm.position === nextMatchPosition);

  if (nextMatch) {
    if (match.position % 2 === 1) {
      nextMatch.participant1 = match.winner;
    } else {
      nextMatch.participant2 = match.winner;
    }
  }
}

/**
 * Gets all bye matches (matches with only one participant) in a round
 * Note: With auto-advance, bye matches should already have winners set
 */
export function getByeMatches(tournament: Tournament, round: number): Match[] {
  return tournament.matches.filter(m => 
    m.round === round && 
    ((m.participant1 && !m.participant2) || (!m.participant1 && m.participant2))
  );
}

/**
 * Gets all completed matches (both participants, has winner) in a round
 */
export function getCompletedMatches(tournament: Tournament, round: number): Match[] {
  return tournament.matches.filter(m => 
    m.round === round && 
    m.participant1 && 
    m.participant2 && 
    m.winner
  );
}

/**
 * Gets all regular matches (both participants) in a round
 */
export function getRegularMatches(tournament: Tournament, round: number): Match[] {
  return tournament.matches.filter(m => 
    m.round === round && 
    m.participant1 && 
    m.participant2
  );
}

/**
 * Attempts to fill bye matches with wild card opponents
 * Uses highest-scoring losers from completed rounds to fill single-participant matches
 */
export function fillByeMatchesWithWildCards(tournament: Tournament, round?: number): boolean {
  let didFill = false;
  const startRound = round ?? 1;
  const endRound = round ?? (tournament.totalRounds - 1);

  for (let currentRound = startRound; currentRound <= endRound; currentRound++) {
    const roundMatches = tournament.matches.filter(m => m.round === currentRound);
    const activeMatches = roundMatches.filter(m => m.participant1 || m.participant2);
    if (activeMatches.length === 0) continue;

    if (!isRoundComplete(tournament.matches, currentRound)) continue;

    const losers = getRoundLosers(tournament.matches, currentRound);
    const usedLosers = new Set<string>();
    const nextRoundMatches = tournament.matches.filter(m => m.round === currentRound + 1);

    // Fill single-participant matches with highest scoring losers
    for (const match of nextRoundMatches) {
      if (match.winner) continue;

      const hasP1 = !!match.participant1;
      const hasP2 = !!match.participant2;
      const isSingle = (hasP1 && !hasP2) || (!hasP1 && hasP2);
      if (!isSingle) continue;

      const candidate = losers.find(loser => !usedLosers.has(loser.participant.id));
      if (!candidate) break;

      if (hasP1 && !hasP2) {
        match.participant2 = candidate.participant;
        match.wildCardParticipant2 = true;
      } else if (!hasP1 && hasP2) {
        match.participant1 = candidate.participant;
        match.wildCardParticipant1 = true;
      }

      usedLosers.add(candidate.participant.id);
      didFill = true;
    }
  }

  return didFill;
}

/**
 * Finalizes a round once all played matches are complete
 */
export function finalizeRoundIfComplete(tournament: Tournament, round: number): boolean {
  if (!canFinalizeRound(tournament, round)) {
    return false;
  }

  const nextRound = round + 1;

  if (round < tournament.totalRounds) {
    clearNextRoundAssignments(tournament.matches, nextRound);
    advanceRoundWinners(tournament, round);
    processRoundByes(tournament.matches, round, tournament.totalRounds);
    clearWildCardsForRound(tournament.matches, nextRound);
    fillByeMatchesWithWildCards(tournament, round);
    updateCurrentRound(tournament, round);
  }

  tournament.finalizedRounds = tournament.finalizedRounds ?? [];
  if (!tournament.finalizedRounds.includes(round)) {
    tournament.finalizedRounds.push(round);
  }

  return true;
}

/**
 * Determines the winner based on scoring mode
 */
export function determineWinner(
  tournament: Tournament,
  match: Match,
  participant1Score: number,
  participant2Score: number
): Participant | null {
  if (!match.participant1 || !match.participant2) return null;

  const { scoringMode, targetScore } = tournament;

  switch (scoringMode) {
    case 'higher_score':
      if (participant1Score === participant2Score) return null;
      return participant1Score > participant2Score ? match.participant1 : match.participant2;

    case 'lower_score':
      if (participant1Score === participant2Score) return null;
      if (participant1Score === 0 && participant2Score === 0) return null;
      if (participant1Score === 0) return match.participant2;
      if (participant2Score === 0) return match.participant1;
      return participant1Score < participant2Score ? match.participant1 : match.participant2;

    case 'best_of':
      if (!targetScore) {
        if (participant1Score === participant2Score) return null;
        return participant1Score > participant2Score ? match.participant1 : match.participant2;
      }
      if (participant1Score >= targetScore) return match.participant1;
      if (participant2Score >= targetScore) return match.participant2;
      return null;

    default:
      if (participant1Score === participant2Score) return null;
      return participant1Score > participant2Score ? match.participant1 : match.participant2;
  }
}

/**
 * Gets display text for match status
 */
export function getMatchStatusText(
  tournament: Tournament,
  match: Match
): string {
  const { scoringMode, targetScore } = tournament;
  const p1Score = match.participant1Score;
  const p2Score = match.participant2Score;

  if (!match.participant1 || !match.participant2) {
    return 'Awaiting opponent';
  }

  if (match.winner) {
    return `${match.winner.name} advances`;
  }

  if (p1Score === 0 && p2Score === 0) {
    return 'Not started';
  }

  switch (scoringMode) {
    case 'best_of':
      const needed = targetScore || 2;
      const maxRounds = (needed * 2) - 1;
      return `Best of ${maxRounds}`;

    case 'lower_score':
      return p1Score === p2Score ? 'Tied' : 'In progress';

    case 'higher_score':
    default:
      return p1Score === p2Score ? 'Tied' : 'In progress';
  }
}

/**
 * Progresses a winner to the next round
 */
export function progressWinnerToNextRound(
  tournament: Tournament,
  match: Match
): void {
  if (!match.winner) return;

  const nextRoundMatches = tournament.matches.filter(m => m.round === match.round + 1);

  if (nextRoundMatches.length === 0) return;

  // Progress winner to next round
  const nextMatchPosition = Math.ceil(match.position / 2);
  const nextMatch = nextRoundMatches.find(nm => nm.position === nextMatchPosition);

  if (nextMatch) {
    if (match.position % 2 === 1) {
      nextMatch.participant1 = match.winner;
    } else {
      nextMatch.participant2 = match.winner;
    }
  }

  updateCurrentRound(tournament, match.round);
}

/**
 * Checks if a match is waiting for a wild card opponent
 */
export function isWaitingForWildCard(tournament: Tournament, match: Match): boolean {
  if (!match.participant1 || !match.participant2) {
    return !isRoundComplete(tournament.matches, match.round);
  }
  return false;
}

/**
 * Gets wild card candidate info for display
 */
export function getWildCardCandidate(tournament: Tournament, round: number): {
  participant: Participant;
  score: number;
  fromMatch: string;
} | null {
  const roundMatches = tournament.matches.filter(m => m.round === round);
  const activeMatches = roundMatches.filter(m => m.participant1 || m.participant2);
  if (activeMatches.length === 0 || !isRoundComplete(tournament.matches, round)) {
    return null;
  }

  const losers = getRoundLosers(tournament.matches, round);
  if (losers.length === 0) return null;

  const candidate = losers[0];

  return {
    participant: candidate.participant,
    score: candidate.score,
    fromMatch: candidate.matchId
  };
}

/**
 * Validates participant name
 */
export function validateParticipantName(
  name: string,
  existingParticipants: Participant[]
): { valid: boolean; error?: string } {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmedName.length > 50) {
    return { valid: false, error: 'Name must be less than 50 characters' };
  }

  const isDuplicate = existingParticipants.some(
    p => p.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    return { valid: false, error: 'This name is already taken' };
  }

  return { valid: true };
}

/**
 * Validates tournament name
 */
export function validateTournamentName(name: string): { valid: boolean; error?: string } {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: 'Tournament name cannot be empty' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }

  return { valid: true };
}

/**
 * Gets participant status in tournament
 */
export function getParticipantStatus(
  participant: Participant,
  tournament: Tournament
): 'eliminated' | 'advanced' | 'playing' | 'waiting' | 'champion' | 'bye' {
  const participantMatches = tournament.matches.filter(
    m => m.participant1?.id === participant.id || m.participant2?.id === participant.id
  );

  // Check if tournament champion
  const finalMatch = tournament.matches.find(m => m.round === tournament.totalRounds);
  if (finalMatch?.winner?.id === participant.id) {
    return 'champion';
  }

  // Check current round matches
  const currentRoundMatch = participantMatches.find(m => m.round === tournament.currentRound);
  
  // Check if eliminated (lost a match)
  const wasEliminated = participantMatches.some(m => 
    m.winner && 
    m.winner.id !== participant.id && 
    m.participant1 && 
    m.participant2 // Only count as elimination if both participants were present (not a bye)
  );
  
  if (wasEliminated) {
    return 'eliminated';
  }

  // Check if they had a bye (won a match where opponent was null)
  const hadBye = participantMatches.some(m => 
    m.winner?.id === participant.id && 
    (!m.participant1 || !m.participant2)
  );

  // Check if in current round
  if (currentRoundMatch) {
    if (currentRoundMatch.winner?.id === participant.id) {
      return 'advanced';
    }
    return 'playing';
  }

  // Check if advanced past current round (includes bye advancement)
  const futureRoundMatch = participantMatches.find(m => m.round > tournament.currentRound);
  if (futureRoundMatch) {
    return hadBye ? 'bye' : 'waiting';
  }

  return 'waiting';
}

/**
 * Gets round label (Final, Semi-Finals, etc.)
 */
export function getRoundLabel(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round;
  
  switch (roundsFromEnd) {
    case 0:
      return 'Final';
    case 1:
      return 'Semi-Finals';
    case 2:
      return 'Quarter-Finals';
    default:
      return `Round ${round}`;
  }
}

/**
 * Export tournaments to JSON
 */
export function exportTournaments(tournaments: Tournament[]): string {
  return JSON.stringify(tournaments, null, 2);
}

/**
 * Import tournaments from JSON
 */
export function importTournaments(jsonString: string): Tournament[] {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) {
      throw new Error('Invalid format: expected an array of tournaments');
    }
    data.forEach((t: any, index: number) => {
      if (!t.id || !t.name || !t.game) {
        throw new Error(`Invalid tournament at index ${index}`);
      }
    });
    return data;
  } catch (error) {
    throw new Error(`Failed to parse tournaments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets the required score description for best-of modes
 */
export function getBestOfDescription(targetScore: number): string {
  const maxGames = (targetScore * 2) - 1;
  return `Best of ${maxGames}`;
}
