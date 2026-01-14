import { v4 as uuidv4 } from 'uuid';
import { Tournament, Match, Participant } from '../types/bracket';

/**
 * Tournament Service - Contains all business logic for tournament management
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

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

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
  const shuffledParticipants = shuffleArray([...tournament.participants]);

  // Assign participants to first round matches
  const firstRoundMatches = matches.filter(m => m.round === 1);
  for (let i = 0; i < shuffledParticipants.length; i += 2) {
    const matchIndex = Math.floor(i / 2);
    if (matchIndex < firstRoundMatches.length) {
      firstRoundMatches[matchIndex].participant1 = shuffledParticipants[i];
      if (i + 1 < shuffledParticipants.length) {
        firstRoundMatches[matchIndex].participant2 = shuffledParticipants[i + 1];
      }
    }
  }

  // Don't auto-advance bye matches - the highest scoring loser will fill the TBD slot

  return {
    ...tournament,
    matches,
    totalRounds,
    currentRound: 1
  };
}

/**
 * Finds bye matches (matches with only one participant) and fills them
 * with the highest-scoring loser from completed matches
 */
export function fillByeMatchesWithHighestLoser(tournament: Tournament): void {
  const currentRoundMatches = tournament.matches.filter(m => m.round === tournament.currentRound);
  
  // Find bye matches (one participant only)
  const byeMatches = currentRoundMatches.filter(m => 
    (m.participant1 && !m.participant2) || (!m.participant1 && m.participant2)
  );
  
  if (byeMatches.length === 0) return;
  
  // Find completed matches (both participants, has winner)
  const completedMatches = currentRoundMatches.filter(m => 
    m.participant1 && m.participant2 && m.winner
  );
  
  // Check if all non-bye matches are complete
  const nonByeMatches = currentRoundMatches.filter(m => m.participant1 && m.participant2);
  const allNonByeMatchesComplete = nonByeMatches.every(m => m.winner);
  
  if (!allNonByeMatchesComplete) return;
  
  // Collect all losers with their scores
  const losers = completedMatches
    .map(m => {
      const isP1Winner = m.winner?.id === m.participant1?.id;
      const loser = isP1Winner ? m.participant2 : m.participant1;
      const loserScore = isP1Winner ? m.participant2Score : m.participant1Score;
      return { participant: loser, score: loserScore };
    })
    .filter(l => l.participant);
  
  if (losers.length === 0) return;
  
  // Sort based on scoring mode to find the "best" loser
  if (tournament.scoringMode === 'lower_score') {
    losers.sort((a, b) => a.score - b.score); // Lower is better
  } else {
    losers.sort((a, b) => b.score - a.score); // Higher is better
  }
  
  // Fill bye matches with highest scoring losers
  let loserIndex = 0;
  for (const byeMatch of byeMatches) {
    if (loserIndex >= losers.length) break;
    
    const highestScoringLoser = losers[loserIndex].participant;
    if (!highestScoringLoser) continue;
    
    // Fill the empty slot
    if (!byeMatch.participant1) {
      byeMatch.participant1 = highestScoringLoser;
    } else if (!byeMatch.participant2) {
      byeMatch.participant2 = highestScoringLoser;
    }
    
    loserIndex++;
  }
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
      // Higher score wins (2K, Madden, FIFA, Mario Kart points, etc.)
      if (participant1Score === participant2Score) return null; // Tie - no winner yet
      return participant1Score > participant2Score ? match.participant1 : match.participant2;

    case 'lower_score':
      // Lower score wins (Racing positions - 1st is better than 2nd)
      if (participant1Score === participant2Score) return null;
      if (participant1Score === 0 && participant2Score === 0) return null;
      // If one is 0, they haven't finished
      if (participant1Score === 0) return match.participant2;
      if (participant2Score === 0) return match.participant1;
      return participant1Score < participant2Score ? match.participant1 : match.participant2;

    case 'best_of':
      // First to reach target score wins (Fortnite rounds, Smash sets, fighting games)
      if (!targetScore) {
        // Fallback to higher score if no target
        if (participant1Score === participant2Score) return null;
        return participant1Score > participant2Score ? match.participant1 : match.participant2;
      }
      if (participant1Score >= targetScore) {
        return match.participant1;
      }
      if (participant2Score >= targetScore) {
        return match.participant2;
      }
      return null; // No winner yet - need more rounds

    default:
      // Default to higher score
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
  const { scoringMode, targetScore, scoreLabel } = tournament;
  const p1Score = match.participant1Score;
  const p2Score = match.participant2Score;

  if (!match.participant1 || !match.participant2) {
    return 'Waiting for participants';
  }

  if (match.winner) {
    return `${match.winner.name} wins!`;
  }

  if (p1Score === 0 && p2Score === 0) {
    return 'Match not started';
  }

  switch (scoringMode) {
    case 'best_of':
      const needed = targetScore || 2;
      const maxRounds = (needed * 2) - 1;
      return `Best of ${maxRounds} (First to ${needed} ${scoreLabel})`;

    case 'lower_score':
      return 'Lower position wins';

    case 'higher_score':
    default:
      if (p1Score === p2Score) {
        return `Tied ${p1Score}-${p2Score}`;
      }
      return `${scoreLabel}: ${p1Score} - ${p2Score}`;
  }
}

export function progressWinnerToNextRound(
  tournament: Tournament,
  match: Match
): void {
  if (!match.winner) return;

  const currentRoundMatches = tournament.matches.filter(m => m.round === match.round);
  const nextRoundMatches = tournament.matches.filter(m => m.round === match.round + 1);

  if (nextRoundMatches.length === 0) return;

  // First, progress this winner to next round
  const nextMatchPosition = Math.ceil(match.position / 2);
  const nextMatch = nextRoundMatches.find(nm => nm.position === nextMatchPosition);

  if (nextMatch) {
    if (match.position % 2 === 1) {
      nextMatch.participant1 = match.winner;
    } else {
      nextMatch.participant2 = match.winner;
    }
  }

  // After each match completion, try to fill bye matches with highest-scoring losers
  fillByeMatchesWithHighestLoser(tournament);

  // Check if all matches in current round are complete
  const allMatchesComplete = currentRoundMatches.every(m => m.winner);

  if (allMatchesComplete) {
    // Collect all losers with their scores from this round
    const losers = currentRoundMatches
      .filter(m => m.participant1 && m.participant2) // Only matches that had both participants
      .map(m => {
        const isP1Winner = m.winner?.id === m.participant1?.id;
        const loser = isP1Winner ? m.participant2 : m.participant1;
        const loserScore = isP1Winner ? m.participant2Score : m.participant1Score;
        return { participant: loser, score: loserScore };
      })
      .filter(l => l.participant);

    // Sort based on scoring mode to find the "best" loser
    if (tournament.scoringMode === 'lower_score') {
      losers.sort((a, b) => a.score - b.score); // Lower is better
    } else {
      losers.sort((a, b) => b.score - a.score); // Higher is better
    }

    const highestScoringLoser = losers[0]?.participant;

    // Fill any empty slots in next round with highest scoring loser
    if (highestScoringLoser) {
      for (const nextRoundMatch of nextRoundMatches) {
        if (!nextRoundMatch.participant1) {
          nextRoundMatch.participant1 = highestScoringLoser;
          break;
        } else if (!nextRoundMatch.participant2) {
          nextRoundMatch.participant2 = highestScoringLoser;
          break;
        }
      }
    }

    // Advance round if not final
    if (tournament.currentRound < tournament.totalRounds) {
      tournament.currentRound++;
    }
  }
}

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
    return { valid: false, error: 'A participant with this name already exists' };
  }

  return { valid: true };
}

export function validateTournamentName(name: string): { valid: boolean; error?: string } {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: 'Tournament name cannot be empty' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Tournament name must be at least 2 characters' };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Tournament name must be less than 100 characters' };
  }

  return { valid: true };
}

export function getParticipantStatus(
  participant: Participant,
  tournament: Tournament
): 'eliminated' | 'advanced' | 'playing' | 'waiting' | 'winner' {
  const participantMatches = tournament.matches.filter(
    m => m.participant1?.id === participant.id || m.participant2?.id === participant.id
  );

  // Check if tournament winner
  const finalMatch = tournament.matches.find(m => m.round === tournament.totalRounds);
  if (finalMatch?.winner?.id === participant.id) {
    return 'winner';
  }

  // Check if eliminated
  const lostMatch = participantMatches.find(m => m.winner && m.winner.id !== participant.id);
  if (lostMatch) {
    return 'eliminated';
  }

  // Check if in current round
  const currentRoundMatch = participantMatches.find(m => m.round === tournament.currentRound);
  if (currentRoundMatch) {
    if (currentRoundMatch.winner?.id === participant.id) {
      return 'advanced';
    }
    return 'playing';
  }

  return 'waiting';
}

export function exportTournaments(tournaments: Tournament[]): string {
  return JSON.stringify(tournaments, null, 2);
}

export function importTournaments(jsonString: string): Tournament[] {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) {
      throw new Error('Invalid format: expected an array of tournaments');
    }
    // Basic validation
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
  return `Best of ${maxGames} (First to ${targetScore})`;
}
