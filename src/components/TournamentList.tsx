import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { ConfirmModal, InputModal, Modal } from './Modal';
import { ParticipantForm } from './ParticipantForm';
import { GAME_RULES, GameType, Tournament, ScoringMode } from '../types/bracket';
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
  // Custom game options
  customGameName: string;
  customScoringMode: ScoringMode;
  customScoreLabel: string;
  customTargetScore: number;
}

interface TournamentCardProps {
  tournament: Tournament;
  isActive: boolean;
  compact?: boolean;
  onSelect: () => void;
  onMinimize: () => void;
  onDelete: () => void;
  onManagePlayers: () => void;
  onStart: () => void;
  onReset: () => void;
}

// Compact card for when another tournament is being viewed
const CompactTournamentCard = memo(function CompactTournamentCard({
  tournament,
  onSelect,
  onDelete,
  onReset
}: {
  tournament: Tournament;
  onSelect: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  const hasWinner = tournament.matches.some(m => m.round === tournament.totalRounds && m.winner);
  const isComplete = (tournament.finalizedRounds ?? []).includes(tournament.totalRounds);
  const progress = isComplete 
    ? 100 
    : tournament.matches.length > 0 
      ? (tournament.matches.filter(m => m.winner).length / tournament.matches.length) * 100 
      : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 p-3 rounded-apple-lg border transition-all ${
        hasWinner 
          ? 'bg-gradient-to-r from-amber-50 to-white border-amber-200' 
          : 'bg-white border-apple-gray-200 hover:border-apple-gray-300'
      }`}
    >
      {/* Status indicator */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        hasWinner ? 'bg-apple-green' : tournament.isStarted ? 'bg-apple-blue' : 'bg-apple-gray-300'
      }`} />
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-apple-gray-900 truncate">{tournament.name}</span>
          {hasWinner && (
            <span className="text-xs text-apple-green font-semibold">✓</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-apple-gray-500">
          <span>{tournament.game}</span>
          <span>•</span>
          <span>{tournament.participants.length} players</span>
          {tournament.isStarted && (
            <>
              <span>•</span>
              <span>{Math.round(progress)}%</span>
            </>
          )}
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {tournament.isStarted ? (
          <button
            onClick={onSelect}
            className="px-3 py-1.5 text-xs font-medium text-apple-blue bg-apple-blue/10 rounded-apple hover:bg-apple-blue/20 transition-colors"
          >
            View
          </button>
        ) : (
          <button
            onClick={onSelect}
            className="px-3 py-1.5 text-xs font-medium text-apple-gray-600 bg-apple-gray-100 rounded-apple hover:bg-apple-gray-200 transition-colors"
          >
            Open
          </button>
        )}
      </div>
    </motion.div>
  );
});

// Active tournament header bar (shown when bracket is visible)
const ActiveTournamentBar = memo(function ActiveTournamentBar({
  tournament,
  onMinimize,
  onManagePlayers,
  onStart
}: {
  tournament: Tournament;
  onMinimize: () => void;
  onManagePlayers: () => void;
  onStart: () => void;
}) {
  const hasWinner = tournament.matches.some(m => m.round === tournament.totalRounds && m.winner);
  const isComplete = (tournament.finalizedRounds ?? []).includes(tournament.totalRounds);
  const progress = isComplete 
    ? 100 
    : tournament.matches.length > 0 
      ? (tournament.matches.filter(m => m.winner).length / tournament.matches.length) * 100 
      : 0;
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

  const canStart = !tournament.isStarted && tournament.participants.length >= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-apple-xl border shadow-sm overflow-hidden ${
        hasWinner 
          ? 'bg-gradient-to-r from-amber-50 via-white to-amber-50 border-amber-200' 
          : 'bg-white border-apple-gray-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
        {/* Tournament Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            hasWinner ? 'bg-amber-100' : 'bg-apple-blue/10'
          }`}>
            {hasWinner ? (
              <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 3h14v2h-1v2.6a6.5 6.5 0 01-2.1 4.78L12 16.28l-3.9-3.9A6.5 6.5 0 016 7.6V5H5V3z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-apple-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-apple-gray-900 truncate">{tournament.name}</h3>
              {hasWinner && (
                <span className="badge-green text-xs">Complete</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-apple-gray-500">
              <span className="badge-blue text-xs">{tournament.game}</span>
              <span className="badge-gray text-xs">{scoringModeLabel}</span>
              <span>Round {tournament.currentRound}/{tournament.totalRounds}</span>
              {tournament.isStarted && (
                <span>{Math.round(progress)}%</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!tournament.isStarted && (
            <button
              type="button"
              onClick={onStart}
              className={`btn-primary btn-sm ${!canStart ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canStart}
              title={canStart ? 'Start tournament' : 'Add at least 2 players to start'}
            >
              Start
            </button>
          )}
          <button
            onClick={onManagePlayers}
            className="p-2 text-apple-gray-500 hover:text-apple-gray-700 hover:bg-apple-gray-100 rounded-apple transition-colors"
            title="Manage"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
          <button
            onClick={onMinimize}
            className="px-3 py-1.5 text-sm font-medium text-apple-gray-600 bg-apple-gray-100 rounded-apple hover:bg-apple-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            All Tournaments
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-apple-gray-100">
        <div 
          className={`h-full transition-all duration-500 ${hasWinner ? 'bg-amber-400' : 'bg-apple-blue'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
});

const TournamentCard = memo(function TournamentCard({
  tournament,
  isActive,
  compact,
  onSelect,
  onMinimize,
  onDelete,
  onManagePlayers,
  onStart,
  onReset
}: TournamentCardProps) {
  const hasWinner = tournament.matches.some(m => m.round === tournament.totalRounds && m.winner);
  const isComplete = (tournament.finalizedRounds ?? []).includes(tournament.totalRounds);
  const progress = isComplete 
    ? 100 
    : tournament.matches.length > 0 
      ? (tournament.matches.filter(m => m.winner).length / tournament.matches.length) * 100 
      : 0;

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
      className={`card relative transition-all duration-300 ${
        isActive
          ? 'ring-2 ring-apple-blue shadow-apple-lg'
          : hasWinner
          ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50/30'
          : 'hover:shadow-apple-md'
      }`}
    >
      {/* Completion Badge */}
      {hasWinner && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="flex items-center gap-1 px-3 py-1 bg-apple-green text-white text-xs font-bold rounded-full shadow-sm">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Complete
          </div>
        </div>
      )}
      
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-apple-gray-900 truncate pr-4">
              {tournament.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="badge-blue text-xs">{tournament.game}</span>
              <span className="badge-gray text-xs">{scoringModeLabel}</span>
            </div>
          </div>
        </div>
        
        {/* Stats - More compact */}
        <div className="flex items-center gap-4 py-2.5 border-y border-apple-gray-100 text-sm">
          <div>
            <span className="text-apple-gray-500">{tournament.participants.length}</span>
            <span className="text-apple-gray-400 ml-1">players</span>
          </div>
          <div className="w-px h-4 bg-apple-gray-200" />
          {tournament.isStarted ? (
            <div>
              <span className="text-apple-gray-500">Round {tournament.currentRound}</span>
              <span className="text-apple-gray-400">/{tournament.totalRounds}</span>
            </div>
          ) : (
            <span className="text-apple-gray-400">Not started</span>
          )}
          {tournament.isStarted && (
            <>
              <div className="w-px h-4 bg-apple-gray-200" />
              <span className="text-apple-gray-500">{Math.round(progress)}%</span>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {tournament.isStarted && tournament.matches.length > 0 && (
          <div className="mt-3">
            <div className="progress-track h-1.5">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions - Streamlined */}
        <div className="mt-4 space-y-2">
          {!tournament.isStarted ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={onStart}
                  disabled={tournament.participants.length < 2}
                  className={`flex-1 ${
                    tournament.participants.length < 2 
                      ? 'btn-secondary opacity-50 cursor-not-allowed text-sm' 
                      : 'btn-primary text-sm'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  </svg>
                  {tournament.participants.length < 2 
                    ? `Need ${2 - tournament.participants.length} more`
                    : 'Start'
                  }
                </button>
              </div>
              <button
                onClick={onManagePlayers}
                className="w-full btn-ghost text-sm"
              >
                Manage
              </button>
            </>
          ) : (
            <>
              {isActive ? (
                <button onClick={onMinimize} className="w-full btn-secondary text-sm">
                  Minimize Bracket
                </button>
              ) : (
                <button onClick={onSelect} className="w-full btn-primary text-sm">
                  View Bracket
                </button>
              )}
              <button
                onClick={onManagePlayers}
                className="w-full btn-ghost text-sm"
              >
                Manage
              </button>
            </>
          )}

          {/* Secondary Actions - Inline */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onReset}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-apple-orange bg-apple-orange/10 
                       rounded-apple hover:bg-apple-orange/20 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={onDelete}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-apple-red bg-apple-red/10 
                       rounded-apple hover:bg-apple-red/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Group games by category
const GAME_CATEGORIES = {
  'Sports': ['NBA 2K', 'Madden NFL', 'EA FC (FIFA)', 'Rocket League', 'MLB The Show', 'NHL'],
  'Fighting': ['Fortnite (Box Fights)', 'Fortnite (Kill Race)', 'Super Smash Bros', 'Mortal Kombat', 'Street Fighter', 'Tekken'],
  'Shooters': ['Call of Duty (1v1)', 'Call of Duty (Search)', 'Apex Legends', 'Valorant', 'Counter-Strike 2'],
  'Racing': ['Mario Kart', 'Gran Turismo', 'Forza'],
  'Other': ['Chess', 'Mario Party', 'Tetris', 'Custom Game']
};

export function TournamentList() {
  const { state, dispatch, activeTournament } = useTournament();
  const [newTournament, setNewTournament] = useState<NewTournament>({
    name: '',
    game: 'NBA 2K',
    customGameName: '',
    customScoringMode: 'higher_score',
    customScoreLabel: 'Points',
    customTargetScore: 3
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showOtherTournaments, setShowOtherTournaments] = useState(false);
  
  const isCustomGame = newTournament.game === 'Custom Game';

  useEffect(() => {
    if (activeTournament) {
      setShowOtherTournaments(false);
    }
  }, [activeTournament]);

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; tournamentId: string | null }>({
    isOpen: false,
    tournamentId: null
  });
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; tournamentId: string | null }>({
    isOpen: false,
    tournamentId: null
  });
  const [managePlayersModal, setManagePlayersModal] = useState<{ isOpen: boolean; tournamentId: string | null }>({
    isOpen: false,
    tournamentId: null
  });
  const [studentName, setStudentName] = useState('');
  const [studentTournamentId, setStudentTournamentId] = useState<string>('');
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentSuccess, setStudentSuccess] = useState<string | null>(null);

  const manageTournament = useMemo(() => {
    if (!managePlayersModal.tournamentId) return null;
    return state.tournaments.find(t => t.id === managePlayersModal.tournamentId) || null;
  }, [managePlayersModal.tournamentId, state.tournaments]);

  const selectedGameConfig = GAME_RULES[newTournament.game];

  // Split tournaments into active and others
  const otherTournaments = useMemo(() => 
    state.tournaments.filter(t => t.id !== activeTournament?.id),
    [state.tournaments, activeTournament?.id]
  );

  const handleCreateTournament = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateTournamentName(newTournament.name);
    if (!validation.valid) {
      setNameError(validation.error || null);
      return;
    }

    // Validate custom game name if using custom game
    if (isCustomGame && !newTournament.customGameName.trim()) {
      setNameError('Please enter a game name');
      return;
    }

    setIsCreating(true);
    setNameError(null);

    try {
      // Use custom settings for Custom Game, otherwise use preset config
      const gameName = isCustomGame ? newTournament.customGameName.trim() : newTournament.game;
      const scoringMode = isCustomGame ? newTournament.customScoringMode : GAME_RULES[newTournament.game].scoringMode;
      const scoreLabel = isCustomGame ? newTournament.customScoreLabel : GAME_RULES[newTournament.game].scoreLabel;
      const targetScore = isCustomGame 
        ? (newTournament.customScoringMode === 'best_of' ? newTournament.customTargetScore : undefined)
        : GAME_RULES[newTournament.game].targetScore;

      await dispatch({
        type: 'CREATE_TOURNAMENT',
        payload: {
          name: newTournament.name.trim(),
          game: gameName,
          scoringMode,
          scoreLabel,
          targetScore
        }
      });
      setNewTournament({ 
        name: '', 
        game: 'NBA 2K',
        customGameName: '',
        customScoringMode: 'higher_score',
        customScoreLabel: 'Points',
        customTargetScore: 3
      });
      setShowCreateForm(false);
    } finally {
      setIsCreating(false);
    }
  }, [newTournament, dispatch, isCustomGame]);

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

  const handleStartTournament = useCallback(async (tournamentId: string) => {
    const tournament = state.tournaments.find(t => t.id === tournamentId);
    if (!tournament || tournament.isStarted || tournament.participants.length < 2) return;

    await dispatch({ type: 'START_TOURNAMENT', payload: tournamentId });
    await dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: tournamentId });
  }, [state.tournaments, dispatch]);

  const handleStudentSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    setStudentSuccess(null);

    const tournament = state.tournaments.find(t => t.id === studentTournamentId);
    if (!tournament) {
      setStudentError('Please select a tournament.');
      return;
    }
    if (tournament.isStarted) {
      setStudentError('That tournament has already started.');
      return;
    }

    const validation = validateParticipantName(studentName, tournament.participants);
    if (!validation.valid) {
      setStudentError(validation.error || 'Invalid name');
      return;
    }

    await dispatch({
      type: 'ADD_PARTICIPANT',
      payload: { tournamentId: tournament.id, name: studentName.trim() }
    });
    setStudentName('');
    setStudentSuccess(`Added to ${tournament.name}`);
  }, [studentName, studentTournamentId, state.tournaments, dispatch]);

  const availableTournaments = useMemo(
    () => state.tournaments.filter(t => !t.isStarted),
    [state.tournaments]
  );

  useEffect(() => {
    if (!studentTournamentId && availableTournaments.length > 0) {
      setStudentTournamentId(availableTournaments[0].id);
    }
  }, [studentTournamentId, availableTournaments]);

  // When viewing a bracket, show compact view
  if (activeTournament) {
    return (
      <div className="space-y-4">
        {/* Active Tournament Bar */}
        <ActiveTournamentBar
          tournament={activeTournament}
          onMinimize={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: null })}
          onManagePlayers={() => setManagePlayersModal({ isOpen: true, tournamentId: activeTournament.id })}
          onStart={() => handleStartTournament(activeTournament.id)}
        />

        {/* Other Tournaments (Collapsible) */}
        {otherTournaments.length > 0 && (
          <div>
            <button
              onClick={() => setShowOtherTournaments(!showOtherTournaments)}
              className="flex items-center gap-2 text-sm text-apple-gray-500 hover:text-apple-gray-700 transition-colors mb-2"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showOtherTournaments ? 'rotate-90' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {otherTournaments.length} other tournament{otherTournaments.length !== 1 ? 's' : ''}
            </button>

            <AnimatePresenceWrapper>
              {showOtherTournaments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {otherTournaments.map(tournament => (
                    <CompactTournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      onSelect={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: tournament.id })}
                      onDelete={() => setDeleteModal({ isOpen: true, tournamentId: tournament.id })}
                      onReset={() => setResetModal({ isOpen: true, tournamentId: tournament.id })}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresenceWrapper>
          </div>
        )}

        {/* Modals */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, tournamentId: null })}
          onConfirm={handleDeleteTournament}
          title="Delete Tournament"
          message="Are you sure you want to delete this tournament? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />

        <ConfirmModal
          isOpen={resetModal.isOpen}
          onClose={() => setResetModal({ isOpen: false, tournamentId: null })}
          onConfirm={handleResetTournament}
          title="Reset Tournament"
          message="This will clear all match progress. Participants will be kept."
          confirmText="Reset"
          variant="warning"
        />

        <Modal
          isOpen={managePlayersModal.isOpen}
          onClose={() => setManagePlayersModal({ isOpen: false, tournamentId: null })}
          title={manageTournament ? `Manage — ${manageTournament.name}` : 'Manage'}
          size="md"
        >
          {manageTournament ? (
            <ParticipantForm tournamentId={manageTournament.id} variant="modal" />
          ) : (
            <div className="text-sm text-apple-gray-500">Tournament not found.</div>
          )}
        </Modal>
      </div>
    );
  }

  // Full view when no bracket is being viewed
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="section-title">Tournaments</h2>
          <p className="section-subtitle">
            {state.tournaments.length} tournament{state.tournaments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary btn-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
          </svg>
          New Tournament
        </button>
      </div>

      {/* Create Tournament Form */}
      <AnimatePresenceWrapper>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateTournament} className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-apple-gray-900">Create Tournament</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 text-apple-gray-400 hover:text-apple-gray-600 rounded-apple hover:bg-apple-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-apple-gray-700 mb-1.5">
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
                      className={`input ${nameError ? 'input-error' : ''}`}
                    />
                    {nameError && <p className="mt-1.5 text-sm text-apple-red">{nameError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-apple-gray-700 mb-1.5">
                      Game Type
                    </label>
                    <select
                      value={newTournament.game}
                      onChange={(e) => setNewTournament({ ...newTournament, game: e.target.value as GameType })}
                      className="select"
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

                {/* Custom Game Options */}
                {isCustomGame ? (
                  <div className="space-y-4 p-4 bg-purple-50/50 rounded-apple-lg border border-purple-200/50">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      <span className="font-medium text-purple-800 text-sm">Custom Game Settings</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Custom Game Name */}
                      <div>
                        <label className="block text-xs font-medium text-purple-700 mb-1">
                          Game Name *
                        </label>
                        <input
                          type="text"
                          value={newTournament.customGameName}
                          onChange={(e) => setNewTournament({ ...newTournament, customGameName: e.target.value })}
                          placeholder="e.g., Uno, Pool, Ping Pong"
                          className="input text-sm"
                        />
                      </div>
                      
                      {/* Score Label */}
                      <div>
                        <label className="block text-xs font-medium text-purple-700 mb-1">
                          Score Label
                        </label>
                        <input
                          type="text"
                          value={newTournament.customScoreLabel}
                          onChange={(e) => setNewTournament({ ...newTournament, customScoreLabel: e.target.value })}
                          placeholder="e.g., Points, Wins, Goals"
                          className="input text-sm"
                        />
                      </div>
                    </div>

                    {/* Scoring Mode */}
                    <div>
                      <label className="block text-xs font-medium text-purple-700 mb-2">
                        How to determine winner
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewTournament({ ...newTournament, customScoringMode: 'higher_score' })}
                          className={`p-2.5 rounded-apple border text-sm font-medium transition-all ${
                            newTournament.customScoringMode === 'higher_score'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-purple-700 border-purple-200 hover:border-purple-400'
                          }`}
                        >
                          Higher Score Wins
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewTournament({ ...newTournament, customScoringMode: 'lower_score' })}
                          className={`p-2.5 rounded-apple border text-sm font-medium transition-all ${
                            newTournament.customScoringMode === 'lower_score'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-purple-700 border-purple-200 hover:border-purple-400'
                          }`}
                        >
                          Lower Score Wins
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewTournament({ ...newTournament, customScoringMode: 'best_of' })}
                          className={`p-2.5 rounded-apple border text-sm font-medium transition-all ${
                            newTournament.customScoringMode === 'best_of'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-purple-700 border-purple-200 hover:border-purple-400'
                          }`}
                        >
                          First to X Wins
                        </button>
                      </div>
                    </div>

                    {/* Target Score (for best_of) */}
                    {newTournament.customScoringMode === 'best_of' && (
                      <div>
                        <label className="block text-xs font-medium text-purple-700 mb-1">
                          First to how many wins?
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="1"
                            max="20"
                            value={newTournament.customTargetScore}
                            onChange={(e) => setNewTournament({ 
                              ...newTournament, 
                              customTargetScore: Math.max(1, Math.min(20, parseInt(e.target.value) || 1))
                            })}
                            className="input text-sm w-20"
                          />
                          <span className="text-sm text-purple-600">
                            (Best of {(newTournament.customTargetScore * 2) - 1})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="pt-2 border-t border-purple-200/50">
                      <p className="text-xs text-purple-600">
                        {newTournament.customScoringMode === 'higher_score' && 
                          `Player with more ${newTournament.customScoreLabel.toLowerCase() || 'points'} wins`}
                        {newTournament.customScoringMode === 'lower_score' && 
                          `Player with fewer ${newTournament.customScoreLabel.toLowerCase() || 'points'} wins`}
                        {newTournament.customScoringMode === 'best_of' && 
                          `First to ${newTournament.customTargetScore} ${newTournament.customScoreLabel.toLowerCase() || 'wins'} advances`}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Game Info - Compact */
                  <div className="p-3 bg-apple-blue/5 rounded-apple-lg border border-apple-blue/10">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-apple-blue/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-apple-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-apple-gray-900 text-sm">{selectedGameConfig.name}</h4>
                        <p className="text-xs text-apple-gray-600 mt-0.5 line-clamp-1">{selectedGameConfig.description}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <span className="badge-blue text-xs">{selectedGameConfig.scoreLabel}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary btn-sm"
                    disabled={!newTournament.name.trim() || (isCustomGame && !newTournament.customGameName.trim()) || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <div className="spinner" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresenceWrapper>

      {/* Quick Sign-Up - More compact */}
      {availableTournaments.length > 0 && (
        <div className="card">
          <div className="p-4">
            <h3 className="text-base font-semibold text-apple-gray-900 mb-3">Quick Sign-Up</h3>
            <form onSubmit={handleStudentSignup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={studentName}
                onChange={(e) => {
                  setStudentName(e.target.value);
                  setStudentError(null);
                  setStudentSuccess(null);
                }}
                className="input flex-1"
                placeholder="Your name"
              />
              <select
                value={studentTournamentId}
                onChange={(e) => {
                  setStudentTournamentId(e.target.value);
                  setStudentError(null);
                  setStudentSuccess(null);
                }}
                className="select sm:w-48"
              >
                <option value="">Select tournament</option>
                {availableTournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!studentName.trim() || !studentTournamentId}
                className="btn-primary btn-sm whitespace-nowrap"
              >
                Join
              </button>
            </form>
            {studentError && <p className="text-sm text-apple-red mt-2">{studentError}</p>}
            {studentSuccess && <p className="text-sm text-apple-green mt-2">{studentSuccess}</p>}
          </div>
        </div>
      )}

      {/* Tournament Grid */}
      {state.tournaments.length > 0 ? (
        <div className="grid-auto-fill gap-4">
          <AnimatePresenceWrapper mode="popLayout">
            {state.tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                isActive={state.activeTournamentId === tournament.id}
                onSelect={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: tournament.id })}
                onMinimize={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: null })}
                onDelete={() => setDeleteModal({ isOpen: true, tournamentId: tournament.id })}
                onManagePlayers={() => setManagePlayersModal({ isOpen: true, tournamentId: tournament.id })}
                onStart={() => handleStartTournament(tournament.id)}
                onReset={() => setResetModal({ isOpen: true, tournamentId: tournament.id })}
              />
            ))}
          </AnimatePresenceWrapper>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state py-12">
            <div className="empty-state-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" 
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-apple-gray-900 mb-2">
              No tournaments yet
            </h3>
            <p className="text-apple-gray-500 mb-4">
              Create your first tournament to get started
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary btn-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
              Create Tournament
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, tournamentId: null })}
        onConfirm={handleDeleteTournament}
        title="Delete Tournament"
        message="Are you sure you want to delete this tournament? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={resetModal.isOpen}
        onClose={() => setResetModal({ isOpen: false, tournamentId: null })}
        onConfirm={handleResetTournament}
        title="Reset Tournament"
        message="This will clear all match progress. Participants will be kept."
        confirmText="Reset"
        variant="warning"
      />

      <Modal
        isOpen={managePlayersModal.isOpen}
        onClose={() => setManagePlayersModal({ isOpen: false, tournamentId: null })}
        title={manageTournament ? `Manage — ${manageTournament.name}` : 'Manage'}
        size="md"
      >
        {manageTournament ? (
          <ParticipantForm tournamentId={manageTournament.id} variant="modal" />
        ) : (
          <div className="text-sm text-apple-gray-500">Tournament not found.</div>
        )}
      </Modal>
    </div>
  );
}
