import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { Participant, Tournament, ScoringMode } from '../types/bracket';
import { ConfirmModal, InputModal } from './Modal';
import { validateParticipantName, getParticipantStatus, getBestOfDescription } from '../services/tournamentService';

// Wrapper to fix AnimatePresence TypeScript issue with React 19
const AnimatePresenceWrapper = AnimatePresence as React.FC<{
  children?: React.ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  initial?: boolean;
}>;

interface ParticipantFormProps {
  tournamentId: string;
  variant?: 'panel' | 'modal';
}

interface ParticipantItemProps {
  participant: Participant;
  tournament: Tournament;
  onEdit: () => void;
  onRemove: () => void;
  disableRemove: boolean;
}

const statusConfig = {
  champion: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '🏆', text: 'Champion', color: 'text-amber-700' },
  advanced: { bg: 'bg-apple-green/5', border: 'border-apple-green/20', icon: '✓', text: 'Advanced', color: 'text-apple-green' },
  playing: { bg: 'bg-apple-blue/5', border: 'border-apple-blue/20', icon: '⚡', text: 'Playing', color: 'text-apple-blue' },
  waiting: { bg: 'bg-apple-gray-50', border: 'border-apple-gray-200', icon: '⏳', text: 'Waiting', color: 'text-apple-gray-500' },
  eliminated: { bg: 'bg-apple-red/5', border: 'border-apple-red/10', icon: '✗', text: 'Eliminated', color: 'text-apple-red' },
  bye: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '⏭️', text: 'Bye (Auto-Advanced)', color: 'text-purple-700' }
};

const ParticipantItem = memo(function ParticipantItem({
  participant,
  tournament,
  onEdit,
  onRemove,
  disableRemove
}: ParticipantItemProps) {
  const status = getParticipantStatus(participant, tournament);
  const config = statusConfig[status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={`flex items-center gap-3 p-3 rounded-apple border transition-all ${config.bg} ${config.border}
                  ${status === 'eliminated' ? 'opacity-60' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                       ${status === 'champion' 
                         ? 'bg-amber-400 text-white' 
                         : status === 'eliminated'
                         ? 'bg-apple-gray-300 text-white'
                         : 'bg-apple-blue text-white'}`}
      >
        {status === 'champion' ? '👑' : participant.name.charAt(0).toUpperCase()}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${status === 'champion' ? 'text-amber-800' : 'text-apple-gray-900'}`}>
          {participant.name}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${config.color}`}>
            {config.icon} {config.text}
          </span>
          {tournament.isStarted && (
            <span className="text-xs text-apple-gray-400">
              {participant.gamePoints} {tournament.scoreLabel.toLowerCase()}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-2 text-apple-gray-400 hover:text-apple-blue hover:bg-apple-blue/10 
                     rounded-apple transition-colors"
          title="Edit name"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" 
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onRemove}
          disabled={disableRemove}
          className={`p-2 rounded-apple transition-colors ${
            disableRemove
              ? 'text-apple-gray-300 cursor-not-allowed'
              : 'text-apple-gray-400 hover:text-apple-red hover:bg-apple-red/10'
          }`}
          title={disableRemove ? 'Cannot remove after start' : 'Remove participant'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
});

export const ParticipantForm = memo(function ParticipantForm({
  tournamentId,
  variant = 'panel'
}: ParticipantFormProps) {
  const { state, dispatch } = useTournament();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoringMode, setScoringMode] = useState<ScoringMode>('higher_score');
  const [targetScore, setTargetScore] = useState<number>(3);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Modal states
  const [editModal, setEditModal] = useState<{ isOpen: boolean; participant: Participant | null }>({
    isOpen: false,
    participant: null
  });
  const [editError, setEditError] = useState<string | undefined>(undefined);
  const [removeModal, setRemoveModal] = useState<{ isOpen: boolean; participantId: string | null }>({
    isOpen: false,
    participantId: null
  });

  const tournament = useMemo(
    () => state.tournaments.find(t => t.id === tournamentId),
    [state.tournaments, tournamentId]
  );

  useEffect(() => {
    if (!tournament) return;
    setScoringMode(tournament.scoringMode);
    setTargetScore(tournament.targetScore ?? 3);
  }, [tournament]);

  const tournamentStats = useMemo(() => {
    if (!tournament) return null;
    
    const totalMatches = tournament.matches.length;
    const completedMatches = tournament.matches.filter(m => m.winner).length;
    const hasWinner = tournament.matches.some(m => m.round === tournament.totalRounds && m.winner);

    return { totalMatches, completedMatches, hasWinner };
  }, [tournament]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;
    if (tournament.isStarted) {
      setNameError('Registration is closed.');
      return;
    }

    const validation = validateParticipantName(name, tournament.participants);
    if (!validation.valid) {
      setNameError(validation.error || null);
      return;
    }

    setIsSubmitting(true);
    setNameError(null);

    try {
      await dispatch({
        type: 'ADD_PARTICIPANT',
        payload: { tournamentId, name: name.trim() }
      });
      setName('');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, tournament, tournamentId, dispatch]);

  const handleEditSubmit = useCallback(async (newName: string) => {
    if (!editModal.participant || !tournament) return;

    const otherParticipants = tournament.participants.filter(
      p => p.id !== editModal.participant!.id
    );
    const validation = validateParticipantName(newName, otherParticipants);
    
    if (!validation.valid) {
      setEditError(validation.error);
      return;
    }

    await dispatch({
      type: 'UPDATE_PARTICIPANT',
      payload: {
        tournamentId,
        participantId: editModal.participant.id,
        name: newName
      }
    });
    setEditModal({ isOpen: false, participant: null });
    setEditError(undefined);
  }, [editModal.participant, tournament, tournamentId, dispatch]);

  const handleRemove = useCallback(async () => {
    if (!removeModal.participantId) return;

    await dispatch({
      type: 'REMOVE_PARTICIPANT',
      payload: { tournamentId, participantId: removeModal.participantId }
    });
  }, [removeModal.participantId, tournamentId, dispatch]);

  const handleSaveSettings = useCallback(async () => {
    if (!tournament) return;
    if (tournament.isStarted) return;

    setSettingsSaved(false);
    await dispatch({
      type: 'UPDATE_TOURNAMENT_SETTINGS',
      payload: {
        tournamentId,
        scoringMode,
        targetScore: scoringMode === 'best_of' ? targetScore : undefined
      }
    });
    setSettingsSaved(true);
  }, [tournament, tournamentId, scoringMode, targetScore, dispatch]);

  if (!tournament) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={variant === 'modal' ? 'card' : 'card sticky top-24'}
    >
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-apple-gray-900">Participants</h3>
          <span className="badge-blue">
            {tournament.participants.length}
          </span>
        </div>
        <p className="text-sm text-apple-gray-500 mt-1">
          {tournament.isStarted 
            ? 'Tournament in progress' 
            : 'Registration open'
          }
        </p>
        
        {/* Progress Bar */}
        {tournamentStats && tournamentStats.totalMatches > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-apple-gray-500 mb-1.5">
              <span>Matches completed</span>
              <span>{tournamentStats.completedMatches}/{tournamentStats.totalMatches}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${(tournamentStats.completedMatches / tournamentStats.totalMatches) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card-body space-y-5">
        {/* Scoring Settings */}
        <div className="rounded-apple-lg border border-apple-gray-100 p-4 bg-white">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-apple-gray-900">Scoring</h4>
            {tournament.isStarted && (
              <span className="text-xs text-apple-gray-400">Locked</span>
            )}
          </div>
          <p className="text-xs text-apple-gray-500 mt-1">
            Update how winners are determined before the tournament starts.
          </p>

          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={tournament.isStarted}
                onClick={() => {
                  setScoringMode('higher_score');
                  setSettingsSaved(false);
                }}
                className={`px-3 py-2 rounded-apple border text-xs font-medium transition-all ${
                  scoringMode === 'higher_score'
                    ? 'bg-apple-blue text-white border-apple-blue'
                    : 'bg-white text-apple-gray-600 border-apple-gray-200 hover:border-apple-gray-300'
                } ${tournament.isStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Higher score wins
              </button>
              <button
                type="button"
                disabled={tournament.isStarted}
                onClick={() => {
                  setScoringMode('lower_score');
                  setSettingsSaved(false);
                }}
                className={`px-3 py-2 rounded-apple border text-xs font-medium transition-all ${
                  scoringMode === 'lower_score'
                    ? 'bg-apple-blue text-white border-apple-blue'
                    : 'bg-white text-apple-gray-600 border-apple-gray-200 hover:border-apple-gray-300'
                } ${tournament.isStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Lower score wins
              </button>
              <button
                type="button"
                disabled={tournament.isStarted}
                onClick={() => {
                  setScoringMode('best_of');
                  setSettingsSaved(false);
                }}
                className={`px-3 py-2 rounded-apple border text-xs font-medium transition-all ${
                  scoringMode === 'best_of'
                    ? 'bg-apple-blue text-white border-apple-blue'
                    : 'bg-white text-apple-gray-600 border-apple-gray-200 hover:border-apple-gray-300'
                } ${tournament.isStarted ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                First to X wins
              </button>
            </div>

            {scoringMode === 'best_of' && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-apple-gray-600">Target</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="50"
                  value={targetScore}
                  disabled={tournament.isStarted}
                  onChange={(e) => {
                    const next = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                    setTargetScore(next);
                    setSettingsSaved(false);
                  }}
                  className="input text-xs w-20"
                />
                <span className="text-xs text-apple-gray-400">
                  {getBestOfDescription(targetScore)}
                </span>
              </div>
            )}

            {!tournament.isStarted && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="btn-secondary btn-sm"
                >
                  Save Scoring
                </button>
                {settingsSaved && (
                  <span className="text-xs text-apple-green">Saved</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Participant List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto scrollbar-apple -mx-2 px-2">
          <AnimatePresenceWrapper mode="popLayout">
            {tournament.participants.length > 0 ? (
              tournament.participants.map((participant) => (
                <ParticipantItem
                  key={participant.id}
                  participant={participant}
                  tournament={tournament}
                  onEdit={() => setEditModal({ isOpen: true, participant })}
                  onRemove={() => {
                    if (!tournament.isStarted) {
                      setRemoveModal({ isOpen: true, participantId: participant.id });
                    }
                  }}
                  disableRemove={tournament.isStarted}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-10"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-apple-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-apple-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" 
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <p className="text-apple-gray-600 font-medium">No participants yet</p>
                <p className="text-apple-gray-400 text-sm mt-1">Add players to get started</p>
              </motion.div>
            )}
          </AnimatePresenceWrapper>
        </div>

        {/* Add Participant Form */}
        {!tournament.isStarted && (
          <div className="pt-4 border-t border-apple-gray-100">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(null);
                  }}
                  className={`input ${nameError ? 'input-error' : ''}`}
                  placeholder="Enter player name"
                />
                {nameError && (
                  <p className="mt-2 text-sm text-apple-red">{nameError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="w-full btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" />
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                    </svg>
                    Add Participant
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Locked Notice */}
        {tournament.isStarted && (
          <div className="py-3 px-4 bg-apple-gray-50 rounded-apple text-center">
            <p className="text-sm text-apple-gray-500">
              Registration closed — tournament in progress
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <InputModal
        isOpen={editModal.isOpen}
        onClose={() => {
          setEditModal({ isOpen: false, participant: null });
          setEditError(undefined);
        }}
        onSubmit={handleEditSubmit}
        title="Edit Participant"
        label="Player Name"
        placeholder="Enter new name"
        initialValue={editModal.participant?.name || ''}
        submitText="Save"
        error={editError}
      />

      {/* Remove Confirmation Modal */}
      <ConfirmModal
        isOpen={removeModal.isOpen}
        onClose={() => setRemoveModal({ isOpen: false, participantId: null })}
        onConfirm={handleRemove}
        title="Remove Participant"
        message="Are you sure? The bracket will be regenerated."
        confirmText="Remove"
        variant="danger"
      />
    </motion.div>
  );
});
