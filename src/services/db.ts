import { v4 as uuidv4 } from 'uuid';
import { Tournament, ScoringMode, SeedingMode } from '../types/bracket';
import {
  assignParticipantsToMatches,
  determineWinner,
  finalizeRoundIfComplete,
  refreshPlayInMatches
} from './tournamentService';

// API Configuration
const API_BASE_URL = 'https://1ajifbu21d.execute-api.us-east-2.amazonaws.com/prod';

// Local storage keys for fallback/caching
const STORAGE_KEY = 'tournaments';
const ACTIVE_TOURNAMENT_KEY = 'activeTournamentId';

/**
 * API helper for making requests
 */
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Cache tournaments locally for offline access
 */
function cacheLocally(tournaments: Tournament[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.warn('Failed to cache locally:', error);
  }
}

/**
 * Get cached tournaments from localStorage
 */
function getCachedTournaments(): Tournament[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
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
  /**
   * Get all tournaments from DynamoDB
   */
  getTournaments: async (): Promise<Tournament[]> => {
    try {
      const tournaments = await apiRequest<Tournament[]>('/tournaments');
      // Normalize tournaments with default values for new fields
      const normalized = tournaments.map(tournament => ({
        ...tournament,
        isStarted: tournament.isStarted ?? (tournament.matches?.length ?? 0) > 0,
        seedingMode: tournament.seedingMode ?? 'random', // Default for existing tournaments
        finalizedRounds: tournament.finalizedRounds ?? []
      }));
      // Cache locally for offline access
      cacheLocally(normalized);
      return normalized;
    } catch (error) {
      console.warn('API unavailable, using cached data:', error);
      // Fallback to local cache if API is unavailable
      return getCachedTournaments();
    }
  },

  /**
   * Create a new tournament
   */
  createTournament: async (tournament: {
    name: string;
    game: string;
    scoringMode: ScoringMode;
    scoreLabel: string;
    targetScore?: number;
    seedingMode?: SeedingMode;
  }): Promise<Tournament> => {
    const now = Date.now();
    const newTournament: Tournament = {
      id: uuidv4(),
      ...tournament,
      seedingMode: tournament.seedingMode || 'random', // Default to random
      isStarted: false,
      participants: [],
      matches: [],
      currentRound: 1,
      totalRounds: 0,
      finalizedRounds: [],
      createdAt: now,
      updatedAt: now
    };

    await apiRequest<Tournament>('/tournaments', {
      method: 'POST',
      body: JSON.stringify(newTournament),
    });

    return newTournament;
  },

  /**
   * Delete a tournament
   */
  deleteTournament: async (id: string): Promise<void> => {
    await apiRequest(`/tournaments/${id}`, {
      method: 'DELETE',
    });

    // Clear active tournament if it was deleted
    if (getActiveTournamentId() === id) {
      setActiveTournamentId(null);
    }
  },

  /**
   * Add a participant to a tournament
   */
  addParticipant: async (tournamentId: string, name: string): Promise<Tournament> => {
    const tournaments = await db.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.isStarted) return tournament;

    const newParticipant = {
      id: uuidv4(),
      name: name.trim(),
      gamePoints: 0
    };

    const updatedTournament = {
      ...tournament,
      participants: [...tournament.participants, newParticipant],
      updatedAt: Date.now()
    };

    await apiRequest<Tournament>(`/tournaments/${tournamentId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTournament),
    });

    return updatedTournament;
  },

  /**
   * Update a participant's name
   */
  updateParticipant: async (
    tournamentId: string, 
    participantId: string, 
    name: string
  ): Promise<Tournament> => {
    const tournaments = await db.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const participant = tournament.participants.find(p => p.id === participantId);
    if (!participant) throw new Error('Participant not found');

    // Update participant name
    const updatedParticipants = tournament.participants.map(p =>
      p.id === participantId ? { ...p, name: name.trim() } : p
    );

    // Update participant name in all matches
    const updatedMatches = tournament.matches.map(match => ({
      ...match,
      participant1: match.participant1?.id === participantId 
        ? { ...match.participant1, name: name.trim() } 
        : match.participant1,
      participant2: match.participant2?.id === participantId 
        ? { ...match.participant2, name: name.trim() } 
        : match.participant2,
      winner: match.winner?.id === participantId 
        ? { ...match.winner, name: name.trim() } 
        : match.winner,
    }));

    const updatedTournament = {
      ...tournament,
      participants: updatedParticipants,
      matches: updatedMatches,
      updatedAt: Date.now()
    };

    await apiRequest<Tournament>(`/tournaments/${tournamentId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTournament),
    });

    return updatedTournament;
  },

  /**
   * Remove a participant
   */
  removeParticipant: async (
    tournamentId: string, 
    participantId: string
  ): Promise<Tournament> => {
    const tournaments = await db.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.isStarted) return tournament;

    const updatedTournament = {
      ...tournament,
      participants: tournament.participants.filter(p => p.id !== participantId),
      matches: [],
      currentRound: 1,
      totalRounds: 0,
      updatedAt: Date.now()
    };

    await apiRequest<Tournament>(`/tournaments/${tournamentId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTournament),
    });

    return updatedTournament;
  },

  /**
   * Start a tournament
   */
  startTournament: async (tournamentId: string): Promise<Tournament> => {
    const tournaments = await db.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.isStarted) return tournament;
    if (tournament.participants.length < 2) return tournament;

    const startedTournament = {
      ...assignParticipantsToMatches(tournament),
      isStarted: true,
      updatedAt: Date.now()
    };

    await apiRequest<Tournament>(`/tournaments/${tournamentId}`, {
      method: 'PUT',
      body: JSON.stringify(startedTournament),
    });

    return startedTournament;
  },

  /**
   * Update a match score
   */
  updateMatch: async (
    tournamentId: string,
    matchId: string,
    participant1Score: number,
    participant2Score: number
  ): Promise<Tournament> => {
    const tournaments = await db.getTournaments();
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

    if (
      match.round < tournament.totalRounds &&
      !match.wildCardParticipant1 &&
      !match.wildCardParticipant2
    ) {
      refreshPlayInMatches(tournament, match.round);
    }

    const updatedTournament = {
      ...tournament,
      updatedAt: Date.now()
    };

    await apiRequest<Tournament>(`/tournaments/${tournamentId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTournament),
    });

    return updatedTournament;
  },

  /**
   * Update tournament scoring settings (pre-start only)
   */
  updateTournamentSettings: async (
    tournamentId: string,
    scoringMode: ScoringMode,
    targetScore?: number
  ): Promise<Tournament> => {
    const tournaments = await db.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.isStarted) return tournament;

    const updatedTournament = {
      ...tournament,
      scoringMode,
      targetScore: scoringMode === 'best_of' ? targetScore : undefined,
      updatedAt: Date.now()
    };

    await apiRequest<Tournament>(`/tournaments/${tournamentId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTournament),
    });

    return updatedTournament;
  },

  /**
   * Finalize a round (manual action)
   */
  finalizeRound: async (
    tournamentId: string,
    round: number
  ): Promise<Tournament> => {
    const tournaments = await db.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const didFinalize = finalizeRoundIfComplete(tournament, round);
    if (!didFinalize) return tournament;

    const updatedTournament = {
      ...tournament,
      updatedAt: Date.now()
    };

    await apiRequest<Tournament>(`/tournaments/${tournamentId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTournament),
    });

    return updatedTournament;
  },

  /**
   * Reset a tournament
   */
  resetTournament: async (tournamentId: string): Promise<Tournament> => {
    const tournaments = await db.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    // Reset all participant points
    const resetParticipants = tournament.participants.map(p => ({
      ...p,
      gamePoints: 0
    }));

    const resetTournament = {
      ...tournament,
      participants: resetParticipants,
      isStarted: false,
      matches: [],
      currentRound: 1,
      totalRounds: 0,
      finalizedRounds: [],
      updatedAt: Date.now()
    };

    await apiRequest<Tournament>(`/tournaments/${tournamentId}`, {
      method: 'PUT',
      body: JSON.stringify(resetTournament),
    });

    return resetTournament;
  },

  /**
   * Import tournaments (merge with existing)
   */
  importTournaments: async (newTournaments: Tournament[]): Promise<Tournament[]> => {
    const existingTournaments = await db.getTournaments();
    
    // Merge - new tournaments with same ID replace old ones
    const mergedMap = new Map<string, Tournament>();
    existingTournaments.forEach(t => mergedMap.set(t.id, t));
    
    for (const t of newTournaments) {
      const normalized = {
        ...t,
        isStarted: t.isStarted ?? (t.matches?.length ?? 0) > 0,
      finalizedRounds: t.finalizedRounds ?? [],
        updatedAt: Date.now()
      };
      mergedMap.set(t.id, normalized);
      
      // Save each to DynamoDB
      await apiRequest<Tournament>('/tournaments', {
        method: 'POST',
        body: JSON.stringify(normalized),
      });
    }
    
    return Array.from(mergedMap.values());
  },

  /**
   * Export tournaments
   */
  exportTournaments: async (): Promise<string> => {
    const tournaments = await db.getTournaments();
    return JSON.stringify(tournaments, null, 2);
  }
};
