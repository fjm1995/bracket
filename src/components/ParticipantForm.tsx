import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { Tournament, Participant } from '../types/bracket';

interface ParticipantFormProps {
  tournamentId: string;
}

export function ParticipantForm({ tournamentId }: ParticipantFormProps) {
  const { state, dispatch } = useTournament();
  const [name, setName] = useState('');
  
  const tournament = state.tournaments.find(t => t.id === tournamentId);
  if (!tournament) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      dispatch({
        type: 'ADD_PARTICIPANT',
        payload: {
          tournamentId,
          name: name.trim()
        }
      });
      setName('');
    }
  };

  const getParticipantStatus = (participant: Participant) => {
    const participantMatches = tournament.matches.filter(m => 
      m.participant1?.id === participant.id || 
      m.participant2?.id === participant.id
    );

    const currentRoundMatch = participantMatches.find(m => m.round === tournament.currentRound);
    const isEliminated = participantMatches.some(m => 
      m.winner && m.winner.id !== participant.id
    );

    if (isEliminated) return '(Eliminated)';
    if (currentRoundMatch?.winner?.id === participant.id) return '(Advanced)';
    if (currentRoundMatch) return '(Current Round)';
    return '(Waiting)';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white rounded-lg shadow-md"
    >
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Current Participants ({tournament.participants.length})</h3>
          <span className="text-sm text-gray-500">
            {tournament.currentRound > tournament.totalRounds ? 'Tournament Complete' : `Round ${tournament.currentRound} of ${tournament.totalRounds}`}
          </span>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {tournament.participants.map((participant) => (
            <div key={participant.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center">
                  <span>{participant.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {getParticipantStatus(participant)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {participant.gamePoints} points
                  </span>
                  <button
                    onClick={() => {
                      const newName = prompt('Edit participant name:', participant.name);
                      if (newName?.trim()) {
                        dispatch({
                          type: 'UPDATE_PARTICIPANT',
                          payload: {
                            tournamentId,
                            participantId: participant.id,
                            name: newName.trim()
                          }
                        });
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to remove this participant?')) {
                        dispatch({
                          type: 'REMOVE_PARTICIPANT',
                          payload: {
                            tournamentId,
                            participantId: participant.id
                          }
                        });
                      }
                    }}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4">Add Participant</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bracket-input mt-1"
            placeholder="Enter participant name"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Add Participant
        </button>
      </form>
    </motion.div>
  );
}
