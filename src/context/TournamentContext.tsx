import React, { createContext, useContext, useCallback, useMemo, useEffect, useState } from 'react';
import { Tournament, TournamentState, TournamentAction } from '../types/bracket';
import { db, getActiveTournamentId, setActiveTournamentId } from '../services/db';

const initialState: TournamentState = {
  tournaments: [],
  activeTournamentId: null,
  isLoading: true,
  error: null
};

interface TournamentContextValue {
  state: TournamentState;
  dispatch: (action: TournamentAction) => Promise<void>;
  activeTournament: Tournament | null;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TournamentState>(initialState);

  // Memoized active tournament lookup
  const activeTournament = useMemo(() => {
    if (!state.activeTournamentId) return null;
    return state.tournaments.find(t => t.id === state.activeTournamentId) || null;
  }, [state.tournaments, state.activeTournamentId]);

  // Load tournaments on mount
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const tournaments = await db.getTournaments();
        const savedActiveId = getActiveTournamentId();
        
        // Verify the saved active tournament still exists
        const validActiveId = tournaments.find(t => t.id === savedActiveId) 
          ? savedActiveId 
          : null;

        setState(prev => ({
          ...prev,
          tournaments,
          activeTournamentId: validActiveId,
          isLoading: false
        }));
      } catch (error) {
        console.error('Failed to load tournaments:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load tournaments'
        }));
      }
    };

    loadTournaments();
  }, []);

  const dispatch = useCallback(async (action: TournamentAction) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      switch (action.type) {
        case 'SET_LOADING': {
          setState(prev => ({ ...prev, isLoading: action.payload }));
          break;
        }

        case 'SET_ERROR': {
          setState(prev => ({ ...prev, error: action.payload }));
          break;
        }

        case 'CREATE_TOURNAMENT': {
          const newTournament = await db.createTournament(action.payload);
          setState(prev => ({
            ...prev,
            tournaments: [...prev.tournaments, newTournament],
            activeTournamentId: newTournament.id
          }));
          setActiveTournamentId(newTournament.id);
          break;
        }

        case 'DELETE_TOURNAMENT': {
          await db.deleteTournament(action.payload);
          setState(prev => ({
            ...prev,
            tournaments: prev.tournaments.filter(t => t.id !== action.payload),
            activeTournamentId: prev.activeTournamentId === action.payload 
              ? null 
              : prev.activeTournamentId
          }));
          if (state.activeTournamentId === action.payload) {
            setActiveTournamentId(null);
          }
          break;
        }

        case 'UPDATE_PARTICIPANT': {
          const tournament = await db.updateParticipant(
            action.payload.tournamentId,
            action.payload.participantId,
            action.payload.name
          );
          setState(prev => ({
            ...prev,
            tournaments: prev.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'REMOVE_PARTICIPANT': {
          const tournament = await db.removeParticipant(
            action.payload.tournamentId,
            action.payload.participantId
          );
          setState(prev => ({
            ...prev,
            tournaments: prev.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'ADD_PARTICIPANT': {
          const tournament = await db.addParticipant(
            action.payload.tournamentId,
            action.payload.name
          );
          setState(prev => ({
            ...prev,
            tournaments: prev.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'UPDATE_MATCH': {
          const tournament = await db.updateMatch(
            action.payload.tournamentId,
            action.payload.matchId,
            action.payload.participant1Score,
            action.payload.participant2Score
          );
          setState(prev => ({
            ...prev,
            tournaments: prev.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'SET_ACTIVE_TOURNAMENT': {
          setState(prev => ({
            ...prev,
            activeTournamentId: action.payload
          }));
          setActiveTournamentId(action.payload);
          break;
        }

        case 'SET_TOURNAMENTS': {
          setState(prev => ({
            ...prev,
            tournaments: action.payload
          }));
          break;
        }

        case 'RESET_TOURNAMENT': {
          const tournament = await db.resetTournament(action.payload);
          setState(prev => ({
            ...prev,
            tournaments: prev.tournaments.map(t =>
              t.id === tournament.id ? tournament : t
            )
          }));
          break;
        }

        case 'IMPORT_TOURNAMENTS': {
          const merged = await db.importTournaments(action.payload);
          setState(prev => ({
            ...prev,
            tournaments: merged
          }));
          break;
        }

        default:
          console.warn('Unknown action type:', action);
      }
    } catch (error) {
      console.error('Error in dispatch:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
    }
  }, [state.activeTournamentId]);

  const contextValue = useMemo(() => ({
    state,
    dispatch,
    activeTournament
  }), [state, dispatch, activeTournament]);

  return (
    <TournamentContext.Provider value={contextValue}>
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
