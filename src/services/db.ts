import { Tournament } from '../types/bracket';

const STORAGE_KEY = 'tournaments';

function readTournaments(): Tournament[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

function writeTournaments(tournaments: Tournament[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    throw error;
  }
}

function generateMatchStructure(participantCount: number) {
  const rounds = Math.ceil(Math.log2(participantCount));
  const matches = [];

  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    for (let position = 1; position <= matchesInRound; position++) {
      matches.push({
        id: `match_${round}_${position}`,
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

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function updateMatchesAfterParticipantChange(tournament: Tournament) {
  const participantCount = tournament.participants.length;
  const totalRounds = Math.ceil(Math.log2(participantCount));
  tournament.totalRounds = totalRounds;

  // Generate new match structure
  tournament.matches = generateMatchStructure(participantCount);

  // Assign participants to first round matches
  const shuffledParticipants = shuffleArray([...tournament.participants]);
  for (let i = 0; i < shuffledParticipants.length; i += 2) {
    const matchIndex = Math.floor(i / 2);
    if (matchIndex < tournament.matches.length) {
      const match = tournament.matches[matchIndex];
      match.participant1 = shuffledParticipants[i];
      if (i + 1 < shuffledParticipants.length) {
        match.participant2 = shuffledParticipants[i + 1];
      }
    }
  }

  tournament.currentRound = 1;
}

export const db = {
  getTournaments: async (): Promise<Tournament[]> => {
    return readTournaments();
  },

  createTournament: async (tournament: Omit<Tournament, 'id' | 'participants' | 'matches' | 'currentRound' | 'totalRounds'>): Promise<Tournament> => {
    const tournaments = readTournaments();
    const newTournament: Tournament = {
      id: `tournament_${Date.now()}`,
      ...tournament,
      participants: [],
      matches: [],
      currentRound: 1,
      totalRounds: 0
    };
    tournaments.push(newTournament);
    writeTournaments(tournaments);
    return newTournament;
  },

  deleteTournament: async (id: string): Promise<void> => {
    const tournaments = readTournaments();
    const filteredTournaments = tournaments.filter(t => t.id !== id);
    writeTournaments(filteredTournaments);
  },

  addParticipant: async (tournamentId: string, name: string): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const newParticipant = {
      id: `participant_${Date.now()}`,
      name,
      gamePoints: 0
    };

    tournament.participants.push(newParticipant);
    updateMatchesAfterParticipantChange(tournament);
    writeTournaments(tournaments);
    return tournament;
  },

  updateParticipant: async (tournamentId: string, participantId: string, name: string): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const participant = tournament.participants.find(p => p.id === participantId);
    if (!participant) throw new Error('Participant not found');

    participant.name = name;
    writeTournaments(tournaments);
    return tournament;
  },

  removeParticipant: async (tournamentId: string, participantId: string): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    tournament.participants = tournament.participants.filter(p => p.id !== participantId);
    updateMatchesAfterParticipantChange(tournament);
    writeTournaments(tournaments);
    return tournament;
  },

  updateMatch: async (tournamentId: string, matchId: string, participant1Score: number, participant2Score: number): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) throw new Error('Match not found');

    // Update scores based on game type
    match.participant1Score = participant1Score;
    match.participant2Score = participant2Score;

    // Update participant points based on game type
    if (tournament.usePointSystem) {
      switch (tournament.scoreType) {
        case 'kills':
          // For Fortnite, points are the number of kills
          if (match.participant1) match.participant1.gamePoints = participant1Score;
          if (match.participant2) match.participant2.gamePoints = participant2Score;
          break;
        case 'points':
        case 'gamePoints':
          // For 2K and Mario Kart, points are the actual score
          if (match.participant1) match.participant1.gamePoints = participant1Score;
          if (match.participant2) match.participant2.gamePoints = participant2Score;
          break;
      }
    }

    // Determine winner based on game type
    if (tournament.usePointSystem) {
      switch (tournament.scoreType) {
        case 'kills':
          // For Fortnite, winner is first to reach target kills
          if (tournament.targetScore) {
            if (participant1Score >= tournament.targetScore) {
              match.winner = match.participant1;
            } else if (participant2Score >= tournament.targetScore) {
              match.winner = match.participant2;
            }
          }
          break;
        case 'points':
        case 'gamePoints':
          // For 2K and Mario Kart, winner is highest score
          if (participant1Score === participant2Score) {
            match.winner = null; // Clear winner in case of tie
          } else if (participant1Score > participant2Score) {
            match.winner = match.participant1;
          } else {
            match.winner = match.participant2;
          }
          break;
      }
    } else {
      // Standard winner determination
      if (participant1Score === participant2Score) {
        match.winner = null; // Clear winner in case of tie
      } else if (participant1Score > participant2Score) {
        match.winner = match.participant1;
      } else {
        match.winner = match.participant2;
      }
    }

    // Handle winner progression and fill-in system
    if (match.winner) {
      const currentRoundMatches = tournament.matches.filter(m => m.round === match.round);
      const nextRoundMatches = tournament.matches.filter(m => m.round === match.round + 1);
      
      // Check if current round is complete
      const allMatchesComplete = currentRoundMatches.every(m => m.winner);
      
      if (allMatchesComplete) {
        // Find highest scoring loser for fill-in
        const losers = currentRoundMatches
          .map(m => {
            const loser = m.winner?.id === m.participant1?.id ? m.participant2 : m.participant1;
            const loserScore = m.winner?.id === m.participant1?.id ? m.participant2Score : m.participant1Score;
            return { participant: loser, score: loserScore };
          })
          .filter(l => l.participant)
          .sort((a, b) => b.score - a.score);

        const highestScoringLoser = losers[0]?.participant;

        // Progress winners and handle fill-ins
        currentRoundMatches.forEach(m => {
          if (m.winner) {
            const nextMatchPosition = Math.ceil(m.position / 2);
            const nextMatch = nextRoundMatches.find(nm => nm.position === nextMatchPosition);
            
            if (nextMatch) {
              if (m.position % 2 === 1) {
                nextMatch.participant1 = m.winner;
              } else {
                nextMatch.participant2 = m.winner;
              }
            }
          }
        });

        // Fill in any empty slots with highest scoring loser
        if (highestScoringLoser && nextRoundMatches.length > 0) {
          const emptySlots = nextRoundMatches.filter(m => !m.participant1 || !m.participant2);
          if (emptySlots.length > 0) {
            const matchToFill = emptySlots[0];
            if (!matchToFill.participant1) {
              matchToFill.participant1 = highestScoringLoser;
            } else if (!matchToFill.participant2) {
              matchToFill.participant2 = highestScoringLoser;
            }
          }
        }

        if (tournament.currentRound === tournament.totalRounds) {
          // If this is the final round and all matches are complete, don't increment the round
          // This ensures the winner banner stays visible
          const finalMatch = tournament.matches.find(m => m.round === tournament.totalRounds);
          if (finalMatch?.winner) {
            // Tournament is complete with a winner
            tournament.currentRound = tournament.totalRounds;
          }
        } else {
          tournament.currentRound++;
        }
      } else {
        // Just progress the winner if round isn't complete
        const matchPosition = match.position;
        const nextMatchIndex = Math.floor((matchPosition - 1) / 2);
        const nextMatch = nextRoundMatches[nextMatchIndex];
        
        if (nextMatch) {
          if (matchPosition % 2 === 1) {
            nextMatch.participant1 = match.winner;
          } else {
            nextMatch.participant2 = match.winner;
          }
        }
      }
    }

    writeTournaments(tournaments);
    return tournament;
  }
};
