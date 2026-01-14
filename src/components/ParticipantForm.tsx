import React, { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { Participant, Tournament } from '../types/bracket';
import { ConfirmModal, InputModal } from './Modal';
import { validateParticipantName, getParticipantStatus } from '../services/tournamentService';

// Wrapper to fix AnimatePresence TypeScript issue with React 19
const AnimatePresenceWrapper = AnimatePresence as React.FC<{
  children?: React.ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  initial?: boolean;
}>;

interface ParticipantFormProps {
  tournamentId: string;
}

interface ParticipantItemProps {
  participant: Participant;
  tournament: Tournament;
  onEdit: () => void;
  onRemove: () => void;
}

const statusConfig = {
  winner: { badge: 'bg-yellow-100 text-yellow-800', icon: '🏆', text: 'Champion' },
  advanced: { badge: 'bg-green-100 text-green-800', icon: '✓', text: 'Advanced' },
  playing: { badge: 'bg-blue-100 text-blue-800', icon: '⚔️', text: 'Playing' },
  waiting: { badge: 'bg-gray-100 text-gray-600', icon: '⏳', text: 'Waiting' },
  eliminated: { badge: 'bg-red-100 text-red-800', icon: '✗', text: 'Eliminated' }
};

const ParticipantItem = memo(function ParticipantItem({
  participant,
  tournament,
  onEdit,
  onRemove
}: ParticipantItemProps) {
  const status = getParticipantStatus(participant, tournament);
  const config = statusConfig[status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`flex items-center justify-between p-3 rounded-lg border transition-all
        ${status === 'winner' 
          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300' 
          : status === 'eliminated' 
          ? 'bg-red-50 border-red-200 opacity-70'
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
          {participant.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-medium truncate ${status === 'winner' ? 'text-yellow-800' : 'text-gray-900'}`}>
            {participant.name}
          </p>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
              {config.icon} {config.text}
            </span>
            <span className="text-xs text-gray-500">
              {participant.gamePoints} {tournament.scoreLabel.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Edit name"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove participant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
});

export const ParticipantForm = memo(function ParticipantForm({ tournamentId }: ParticipantFormProps) {
  const { state, dispatch } = useTournament();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Check for duplicates excluding current participant
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

  if (!tournament) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card sticky top-24"
    >
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Participants</h3>
          <span className="text-sm text-blue-600 font-semibold">
            {tournament.participants.length} players
          </span>
        </div>
        {tournamentStats && tournamentStats.totalMatches > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tournament Progress</span>
              <span>{tournamentStats.completedMatches}/{tournamentStats.totalMatches} matches</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${(tournamentStats.completedMatches / tournamentStats.totalMatches) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card-body space-y-4">
        {/* Participant List */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          <AnimatePresenceWrapper mode="popLayout">
            {tournament.participants.length > 0 ? (
              tournament.participants.map((participant) => (
                <ParticipantItem
                  key={participant.id}
                  participant={participant}
                  tournament={tournament}
                  onEdit={() => setEditModal({ isOpen: true, participant })}
                  onRemove={() => setRemoveModal({ isOpen: true, participantId: participant.id })}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="text-gray-400 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-sm">No participants yet</p>
                <p className="text-gray-400 text-xs">Add players below to start</p>
              </motion.div>
            )}
          </AnimatePresenceWrapper>
        </div>

        {/* Add Form */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Add New Participant</h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                className={`bracket-input ${nameError ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter participant name"
              />
              {nameError && (
                <p className="mt-1 text-sm text-red-600">{nameError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full loading-spinner" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
              <span>{isSubmitting ? 'Adding...' : 'Add Participant'}</span>
            </button>
          </form>
        </div>
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
        label="Participant Name"
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
        message="Are you sure you want to remove this participant? The bracket will be regenerated."
        confirmText="Remove"
        variant="danger"
      />
    </motion.div>
  );
});
