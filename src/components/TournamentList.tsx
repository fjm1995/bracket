import React, { useState, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { ConfirmModal, InputModal } from './Modal';
import { GAME_RULES, GameType, Tournament } from '../types/bracket';
import { validateTournamentName, validateParticipantName, getBestOfDescription } from '../services/tournamentService';

// Wrapper to fix AnimatePresence TypeScript issue with React 19
const AnimatePresenceWrapper = AnimatePresence as React.FC<{
  children?: React.ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  initial?: boolean;
}>;

interface NewTournament {
  name: string;
  game: GameType;
}

interface TournamentCardProps {
  tournament: Tournament;
  isActive: boolean;
  onSelect: () => void;
  onMinimize: () => void;
  onDelete: () => void;
  onAddParticipant: () => void;
  onReset: () => void;
}

const TournamentCard = memo(function TournamentCard({
  tournament,
  isActive,
  onSelect,
  onMinimize,
  onDelete,
  onAddParticipant,
  onReset
}: TournamentCardProps) {
  const hasWinner = tournament.matches.some(m => m.round === tournament.totalRounds && m.winner);

  const scoringModeLabel = useMemo(() => {
    switch (tournament.scoringMode) {
      case 'best_of':
        return tournament.targetScore ? getBestOfDescription(tournament.targetScore) : 'Best of X';
      case 'lower_score':
        return 'Lower wins';
      case 'higher_score':
      default:
        return 'Higher wins';
    }
  }, [tournament.scoringMode, tournament.targetScore]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`card relative transition-all duration-200 hover:shadow-xl ${
        isActive
          ? 'ring-2 ring-blue-500 transform scale-[1.02] bg-blue-50'
          : hasWinner
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200'
          : 'bg-white hover:border-gray-200'
      }`}
    >
      {hasWinner && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          Complete!
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 truncate pr-2">{tournament.name}</h3>
          <span className="badge badge-info flex-shrink-0">{tournament.game}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{tournament.participants.length} players</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Round {tournament.currentRound}/{tournament.totalRounds || '—'}</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 flex items-center space-x-2">
          <span className="bg-gray-100 px-2 py-0.5 rounded">{tournament.scoreLabel}</span>
          <span>•</span>
          <span>{scoringModeLabel}</span>
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={onAddParticipant}
            className="btn-outline-primary text-sm w-full flex items-center justify-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Player</span>
          </button>
          
          {isActive ? (
            <button
              onClick={onMinimize}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Minimize Bracket
            </button>
          ) : (
            <button
              onClick={onSelect}
              className="btn-primary text-sm w-full"
            >
              View Bracket
            </button>
          )}

          <div className="flex space-x-2">
            <button
              onClick={onReset}
              className="flex-1 text-orange-600 hover:text-orange-800 text-sm font-medium px-3 py-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              title="Reset all matches"
            >
              Reset
            </button>
            <button
              onClick={onDelete}
              className="flex-1 text-red-600 hover:text-red-800 text-sm font-medium px-3 py-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Group games by category for better organization
const GAME_CATEGORIES = {
  'Sports': ['NBA 2K', 'Madden NFL', 'EA FC (FIFA)', 'Rocket League', 'MLB The Show', 'NHL'],
  'Fighting/Battle': ['Fortnite (Box Fights)', 'Fortnite (Kill Race)', 'Super Smash Bros', 'Mortal Kombat', 'Street Fighter', 'Tekken'],
  'Shooters': ['Call of Duty (1v1)', 'Call of Duty (Search)', 'Apex Legends', 'Valorant', 'Counter-Strike 2'],
  'Racing': ['Mario Kart', 'Gran Turismo', 'Forza'],
  'Other': ['Chess', 'Mario Party', 'Tetris', 'Custom Game']
};

export function TournamentList() {
  const { state, dispatch, activeTournament } = useTournament();
  const [newTournament, setNewTournament] = useState<NewTournament>({
    name: '',
    game: 'NBA 2K'
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; tournamentId: string | null }>({
    isOpen: false,
    tournamentId: null
  });
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; tournamentId: string | null }>({
    isOpen: false,
    tournamentId: null
  });
  const [addParticipantModal, setAddParticipantModal] = useState<{ isOpen: boolean; tournamentId: string | null }>({
    isOpen: false,
    tournamentId: null
  });
  const [participantError, setParticipantError] = useState<string | undefined>(undefined);

  const selectedGameConfig = GAME_RULES[newTournament.game];

  const handleCreateTournament = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateTournamentName(newTournament.name);
    if (!validation.valid) {
      setNameError(validation.error || null);
      return;
    }

    setIsCreating(true);
    setNameError(null);

    try {
      const gameConfig = GAME_RULES[newTournament.game];
      await dispatch({
        type: 'CREATE_TOURNAMENT',
        payload: {
          name: newTournament.name.trim(),
          game: newTournament.game,
          scoringMode: gameConfig.scoringMode,
          scoreLabel: gameConfig.scoreLabel,
          targetScore: gameConfig.targetScore
        }
      });
      setNewTournament({ name: '', game: 'NBA 2K' });
    } finally {
      setIsCreating(false);
    }
  }, [newTournament, dispatch]);

  const handleDeleteTournament = useCallback(async () => {
    if (deleteModal.tournamentId) {
      await dispatch({ type: 'DELETE_TOURNAMENT', payload: deleteModal.tournamentId });
    }
  }, [deleteModal.tournamentId, dispatch]);

  const handleResetTournament = useCallback(async () => {
    if (resetModal.tournamentId) {
      await dispatch({ type: 'RESET_TOURNAMENT', payload: resetModal.tournamentId });
    }
  }, [resetModal.tournamentId, dispatch]);

  const handleAddParticipant = useCallback(async (name: string) => {
    if (!addParticipantModal.tournamentId) return;

    const tournament = state.tournaments.find(t => t.id === addParticipantModal.tournamentId);
    if (!tournament) return;

    const validation = validateParticipantName(name, tournament.participants);
    if (!validation.valid) {
      setParticipantError(validation.error);
      return;
    }

    await dispatch({
      type: 'ADD_PARTICIPANT',
      payload: { tournamentId: addParticipantModal.tournamentId, name }
    });
    setAddParticipantModal({ isOpen: false, tournamentId: null });
    setParticipantError(undefined);
  }, [addParticipantModal.tournamentId, state.tournaments, dispatch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Tournaments</h2>
          <p className="text-blue-400 text-sm">
            {state.tournaments.length} tournament{state.tournaments.length !== 1 ? 's' : ''}
          </p>
        </div>
        {activeTournament && (
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: null })}
            className="text-blue-300 hover:text-blue-200 text-sm font-medium flex items-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Show All</span>
          </button>
        )}
      </div>

      {/* Create Tournament Form */}
      <form onSubmit={handleCreateTournament} className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Create New Tournament</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tournament Name
              </label>
              <input
                type="text"
                value={newTournament.name}
                onChange={(e) => {
                  setNewTournament({ ...newTournament, name: e.target.value });
                  setNameError(null);
                }}
                placeholder="Enter tournament name"
                className={`bracket-input ${nameError ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Game Type
              </label>
              <select
                value={newTournament.game}
                onChange={(e) => setNewTournament({ ...newTournament, game: e.target.value as GameType })}
                className="bracket-input"
              >
                {Object.entries(GAME_CATEGORIES).map(([category, games]) => (
                  <optgroup key={category} label={category}>
                    {games.map((game) => (
                      <option key={game} value={game}>{game}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Game Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">{selectedGameConfig.name}</h4>
                <p className="text-sm text-blue-700 mb-2">{selectedGameConfig.description}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedGameConfig.scoreLabel}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedGameConfig.scoringMode === 'best_of' 
                      ? `First to ${selectedGameConfig.targetScore}` 
                      : selectedGameConfig.scoringMode === 'lower_score' 
                      ? 'Lower wins' 
                      : 'Higher wins'}
                  </span>
                </div>
                <p className="text-xs text-blue-600 italic">
                  Example: {selectedGameConfig.example}
                </p>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2"
            disabled={!newTournament.name.trim() || isCreating}
          >
            {isCreating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full loading-spinner" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
            <span>{isCreating ? 'Creating...' : 'Create Tournament'}</span>
          </button>
        </div>
      </form>

      {/* Tournament List */}
      {state.tournaments.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Active Tournaments</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            <AnimatePresenceWrapper mode="popLayout">
              {state.tournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  isActive={state.activeTournamentId === tournament.id}
                  onSelect={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: tournament.id })}
                  onMinimize={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: null })}
                  onDelete={() => setDeleteModal({ isOpen: true, tournamentId: tournament.id })}
                  onAddParticipant={() => setAddParticipantModal({ isOpen: true, tournamentId: tournament.id })}
                  onReset={() => setResetModal({ isOpen: true, tournamentId: tournament.id })}
                />
              ))}
            </AnimatePresenceWrapper>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No tournaments yet</h3>
            <p className="text-gray-500">Create your first tournament above to get started!</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, tournamentId: null })}
        onConfirm={handleDeleteTournament}
        title="Delete Tournament"
        message="Are you sure you want to delete this tournament? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={resetModal.isOpen}
        onClose={() => setResetModal({ isOpen: false, tournamentId: null })}
        onConfirm={handleResetTournament}
        title="Reset Tournament"
        message="Are you sure you want to reset this tournament? All match progress will be lost, but participants will be kept."
        confirmText="Reset"
        variant="warning"
      />

      {/* Add Participant Modal */}
      <InputModal
        isOpen={addParticipantModal.isOpen}
        onClose={() => {
          setAddParticipantModal({ isOpen: false, tournamentId: null });
          setParticipantError(undefined);
        }}
        onSubmit={handleAddParticipant}
        title="Add Participant"
        label="Participant Name"
        placeholder="Enter participant name"
        submitText="Add"
        error={participantError}
      />
    </div>
  );
}
