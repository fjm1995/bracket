import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tournament } from '../types/bracket';
import { useTournament } from '../context/TournamentContext';

const GAME_RULES = {
  '2K': {
    description: 'Select which student won their round in the WINNER column, and the points of both students in the POINTS column.',
    usePointSystem: true,
    scoreType: 'points' as const
  },
  'Fortnite': {
    description: 'Select which student won the round in the WINNER column and the final score (ex: 3-2 kills) in the SCORE column.',
    usePointSystem: true,
    scoreType: 'kills' as const,
    targetScore: 3
  },
  'Mario Kart': {
    description: 'Select which student won their round in the WINNER column, and the points of both students in the POINTS column.',
    usePointSystem: true,
    scoreType: 'gamePoints' as const
  }
};

interface NewTournament {
  name: string;
  game: keyof typeof GAME_RULES;
}

export function TournamentList() {
  const { state, dispatch } = useTournament();
  const [newTournament, setNewTournament] = useState<NewTournament>({
    name: '',
    game: '2K'
  });

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTournament.name.trim()) {
      const gameSettings = GAME_RULES[newTournament.game];
      dispatch({
        type: 'CREATE_TOURNAMENT',
        payload: {
          name: newTournament.name.trim(),
          game: newTournament.game,
          ...gameSettings
        }
      });
      setNewTournament({
        name: '',
        game: '2K'
      });
    }
  };

  const handleAddParticipant = (tournamentId: string) => {
    const name = prompt('Enter participant name:');
    if (name?.trim()) {
      dispatch({
        type: 'ADD_PARTICIPANT',
        payload: { tournamentId, name }
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Active Tournaments</h2>
        {state.activeTournamentId && (
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: null })}
            className="text-blue-600 hover:text-blue-800"
          >
            Show All Tournaments
          </button>
        )}
      </div>

      <form onSubmit={handleCreateTournament} className="mb-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Create New Tournament</h3>
        <div className="flex flex-col space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tournament Name
            </label>
            <input
              type="text"
              value={newTournament.name}
              onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
              placeholder="Enter tournament name"
              className="bracket-input"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Game Type
            </label>
            <select
              value={newTournament.game}
              onChange={(e) => setNewTournament({ ...newTournament, game: e.target.value as keyof typeof GAME_RULES })}
              className="bracket-input"
            >
              {Object.entries(GAME_RULES).map(([game, rules]) => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Game Rules:</h4>
            <p className="text-sm text-blue-700">
              {GAME_RULES[newTournament.game].description}
            </p>
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={!newTournament.name.trim()}
          >
            Create Tournament
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <h3 className="col-span-full text-lg font-semibold mb-2">Tournament List</h3>
        {state.tournaments.map((tournament: Tournament) => (
          <motion.div
            key={tournament.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bracket-node relative transition-all duration-200 hover:shadow-lg ${
              state.activeTournamentId === tournament.id
                ? 'ring-2 ring-blue-500 transform scale-105 bg-blue-50'
                : 'bg-white'
            }`}
          >
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Game: {tournament.game}</p>
                <p>Participants: {tournament.participants.length}</p>
                <p>Current Round: {tournament.currentRound}</p>
                <p>Total Rounds: {tournament.totalRounds}</p>
                {tournament.usePointSystem && tournament.targetScore && (
                  <p>Target Score: {tournament.targetScore}</p>
                )}
              </div>
              <div className="mt-4 flex flex-col space-y-2">
                <button
                  onClick={() => handleAddParticipant(tournament.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100"
                >
                  + Add Participant
                </button>
                {state.activeTournamentId === tournament.id ? (
                  <button
                    onClick={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: null })}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200"
                  >
                    Minimize Bracket
                  </button>
                ) : (
                  <button
                    onClick={() => dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: tournament.id })}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100"
                  >
                    View Bracket
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this tournament?')) {
                      dispatch({ type: 'DELETE_TOURNAMENT', payload: tournament.id });
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 bg-red-50 rounded-full hover:bg-red-100"
                >
                  Delete Tournament
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
