import { Tournament } from '../types/bracket';
import { db } from './db';

export const apiService = {
  getTournaments: async (): Promise<Tournament[]> => {
    try {
      return await db.getTournaments();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  createTournament: async (tournament: { 
    name: string; 
    game: string;
    usePointSystem: boolean;
    scoreType: 'points' | 'kills' | 'gamePoints';
    targetScore?: number;
  }): Promise<Tournament> => {
    try {
      return await db.createTournament(tournament);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  deleteTournament: async (id: string): Promise<void> => {
    try {
      await db.deleteTournament(id);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  addParticipant: async (tournamentId: string, name: string): Promise<Tournament> => {
    try {
      return await db.addParticipant(tournamentId, name);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  updateParticipant: async (tournamentId: string, participantId: string, name: string): Promise<Tournament> => {
    try {
      return await db.updateParticipant(tournamentId, participantId, name);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  removeParticipant: async (tournamentId: string, participantId: string): Promise<Tournament> => {
    try {
      return await db.removeParticipant(tournamentId, participantId);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  updateMatch: async (
    tournamentId: string,
    matchId: string,
    participant1Score: number,
    participant2Score: number
  ): Promise<Tournament> => {
    try {
      return await db.updateMatch(tournamentId, matchId, participant1Score, participant2Score);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};
