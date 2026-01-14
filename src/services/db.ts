import { v4 as uuidv4 } from 'uuid';
import { Tournament, ScoringMode } from '../types/bracket';
import {
  assignParticipantsToMatches,
  determineWinner,
  progressWinnerToNextRound
} from './tournamentService';

const STORAGE_KEY = 'tournaments';
const ACTIVE_TOURNAMENT_KEY = 'activeTournamentId';

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

export function getActiveTournamentId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TOURNAMENT_KEY);
  } catch {
    return null;
  }
}

export function setActiveTournamentId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_TOURNAMENT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_TOURNAMENT_KEY);
    }
  } catch (error) {
    console.error('Error saving active tournament:', error);
  }
}

export const db = {
  getTournaments: async (): Promise<Tournament[]> => {
    // Simulate async for consistency
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(readTournaments());
      }, 100);
    });
  },

  createTournament: async (tournament: {
    name: string;
    game: string;
    scoringMode: ScoringMode;
    scoreLabel: string;
    targetScore?: number;
  }): Promise<Tournament> => {
    const tournaments = readTournaments();
    const now = Date.now();
    const newTournament: Tournament = {
      id: uuidv4(),
      ...tournament,
      participants: [],
      matches: [],
      currentRound: 1,
      totalRounds: 0,
      createdAt: now,
      updatedAt: now
    };
    tournaments.push(newTournament);
    writeTournaments(tournaments);
    return newTournament;
  },

  deleteTournament: async (id: string): Promise<void> => {
    const tournaments = readTournaments();
    const filteredTournaments = tournaments.filter(t => t.id !== id);
    writeTournaments(filteredTournaments);
    
    // Clear active tournament if it was deleted
    if (getActiveTournamentId() === id) {
      setActiveTournamentId(null);
    }
  },

  addParticipant: async (tournamentId: string, name: string): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const newParticipant = {
      id: uuidv4(),
      name: name.trim(),
      gamePoints: 0
    };

    tournament.participants.push(newParticipant);
    const updatedTournament = assignParticipantsToMatches(tournament);
    
    // Update in array
    const index = tournaments.findIndex(t => t.id === tournamentId);
    tournaments[index] = { ...updatedTournament, updatedAt: Date.now() };
    
    writeTournaments(tournaments);
    return tournaments[index];
  },

  updateParticipant: async (tournamentId: string, participantId: string, name: string): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const participant = tournament.participants.find(p => p.id === participantId);
    if (!participant) throw new Error('Participant not found');

    participant.name = name.trim();
    
    // Update participant name in all matches
    tournament.matches.forEach(match => {
      if (match.participant1?.id === participantId) {
        match.participant1.name = name.trim();
      }
      if (match.participant2?.id === participantId) {
        match.participant2.name = name.trim();
      }
      if (match.winner?.id === participantId) {
        match.winner.name = name.trim();
      }
    });
    
    tournament.updatedAt = Date.now();
    writeTournaments(tournaments);
    return tournament;
  },

  removeParticipant: async (tournamentId: string, participantId: string): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    tournament.participants = tournament.participants.filter(p => p.id !== participantId);
    const updatedTournament = assignParticipantsToMatches(tournament);
    
    const index = tournaments.findIndex(t => t.id === tournamentId);
    tournaments[index] = { ...updatedTournament, updatedAt: Date.now() };
    
    writeTournaments(tournaments);
    return tournaments[index];
  },

  updateMatch: async (
    tournamentId: string,
    matchId: string,
    participant1Score: number,
    participant2Score: number
  ): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const match = tournament.matches.find(m => m.id === matchId);
    if (!match) throw new Error('Match not found');

    // Update scores
    match.participant1Score = participant1Score;
    match.participant2Score = participant2Score;

    // Update participant gamePoints
    if (match.participant1) {
      const participant = tournament.participants.find(p => p.id === match.participant1!.id);
      if (participant) {
        participant.gamePoints = participant1Score;
        match.participant1.gamePoints = participant1Score;
      }
    }
    if (match.participant2) {
      const participant = tournament.participants.find(p => p.id === match.participant2!.id);
      if (participant) {
        participant.gamePoints = participant2Score;
        match.participant2.gamePoints = participant2Score;
      }
    }

    // Determine winner
    match.winner = determineWinner(tournament, match, participant1Score, participant2Score);

    // Progress winner to next round
    progressWinnerToNextRound(tournament, match);

    tournament.updatedAt = Date.now();
    writeTournaments(tournaments);
    return tournament;
  },

  resetTournament: async (tournamentId: string): Promise<Tournament> => {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    // Reset all participant points
    tournament.participants.forEach(p => {
      p.gamePoints = 0;
    });

    // Regenerate matches
    const updatedTournament = assignParticipantsToMatches(tournament);
    
    const index = tournaments.findIndex(t => t.id === tournamentId);
    tournaments[index] = { ...updatedTournament, updatedAt: Date.now() };
    
    writeTournaments(tournaments);
    return tournaments[index];
  },

  importTournaments: async (newTournaments: Tournament[]): Promise<Tournament[]> => {
    const existingTournaments = readTournaments();
    
    // Merge - new tournaments with same ID replace old ones
    const mergedMap = new Map<string, Tournament>();
    existingTournaments.forEach(t => mergedMap.set(t.id, t));
    newTournaments.forEach(t => mergedMap.set(t.id, { ...t, updatedAt: Date.now() }));
    
    const merged = Array.from(mergedMap.values());
    writeTournaments(merged);
    return merged;
  },

  exportTournaments: async (): Promise<string> => {
    const tournaments = readTournaments();
    return JSON.stringify(tournaments, null, 2);
  }
};
