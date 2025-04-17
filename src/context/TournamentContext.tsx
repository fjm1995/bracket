import React, { createContext, useContext } from 'react';
import { Tournament } from '../types/bracket';
import { apiService } from '../services/api';

interface TournamentState {
  tournaments: Tournament[];
  activeTournamentId: string | null;
}

type TournamentAction =
  | { type: 'CREATE_TOURNAMENT'; payload: { 
      name: string; 
      game: string;
      usePointSystem: boolean;
      scoreType: 'points' | 'kills' | 'gamePoints';
      targetScore?: number;
    } }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'ADD_PARTICIPANT'; payload: { tournamentId: string; name: string } }
  | { type: 'UPDATE_MATCH'; payload: { tournamentId: string; matchId: string; participant1Score: number; participant2Score: number } }
  | { type: 'SET_ACTIVE_TOURNAMENT'; payload: string | null }
  | { type: 'SET_TOURNAMENTS'; payload: Tournament[] }
  | { type: 'UPDATE_PARTICIPANT'; payload: { tournamentId: string; participantId: string; name: string } }
  | { type: 'REMOVE_PARTICIPANT'; payload: { tournamentId: string; participantId: string } };

const TournamentContext = createContext<{
  state: TournamentState;
  dispatch: React.Dispatch<TournamentAction>;
} | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<TournamentState>({
    tournaments: [],
    activeTournamentId: null
  });

  const dispatch = React.useCallback(async (action: TournamentAction) => {
    try {
      switch (action.type) {
        case 'CREATE_TOURNAMENT': {
          const newTournament = await apiService.createTournament(action.payload);
          setState(prevState => ({
            ...prevState,
            tournaments: [...prevState.tournaments, newTournament],
            activeTournamentId: newTournament.id
          }));
          break;
        }

        case 'DELETE_TOURNAMENT': {
          await apiService.deleteTournament(action.payload);
          setState(prevState => ({
            ...prevState,
            tournaments: prevState.tournaments.filter(t => t.id !== action.payload),
            activeTournamentId: prevState.activeTournamentId === action.payload ? null : prevState.activeTournamentId
          }));
          break;
        }

        case 'UPDATE_PARTICIPANT': {
          const tournament = await apiService.updateParticipant(
            action.payload.tournamentId,
            action.payload.participantId,
            action.payload.name
          );
          setState(prevState => ({
            ...prevState,
            tournaments: prevState.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'REMOVE_PARTICIPANT': {
          const tournament = await apiService.removeParticipant(
            action.payload.tournamentId,
            action.payload.participantId
          );
          setState(prevState => ({
            ...prevState,
            tournaments: prevState.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'ADD_PARTICIPANT': {
          const tournament = await apiService.addParticipant(
            action.payload.tournamentId,
            action.payload.name
          );
          setState(prevState => ({
            ...prevState,
            tournaments: prevState.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'UPDATE_MATCH': {
          const tournament = await apiService.updateMatch(
            action.payload.tournamentId,
            action.payload.matchId,
            action.payload.participant1Score,
            action.payload.participant2Score
          );
          setState(prevState => ({
            ...prevState,
            tournaments: prevState.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'SET_ACTIVE_TOURNAMENT':
          setState(prevState => ({
            ...prevState,
            activeTournamentId: action.payload
          }));
          break;

        case 'SET_TOURNAMENTS':
          setState(prevState => ({
            ...prevState,
            tournaments: action.payload
          }));
          break;

        default:
          console.warn('Unknown action type:', action);
      }
    } catch (error) {
      console.error('Error in dispatch:', error);
    }
  }, []);

  React.useEffect(() => {
    const loadTournaments = async () => {
      try {
        const tournaments = await apiService.getTournaments();
        setState(prevState => ({ ...prevState, tournaments }));
      } catch (error) {
        console.error('Failed to load tournaments:', error);
      }
    };
    loadTournaments();
  }, []);

  return (
    <TournamentContext.Provider value={{ state, dispatch }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
