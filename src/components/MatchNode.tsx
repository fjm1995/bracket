import React from 'react';
import { Match, Tournament } from '../types/bracket';
import { useTournament } from '../context/TournamentContext';

interface MatchNodeProps {
  match: Match;
  tournamentId: string;
}

export function MatchNode({ match, tournamentId }: MatchNodeProps) {
  const { state, dispatch } = useTournament();
  const tournament = state.tournaments.find(t => t.id === tournamentId);
  if (!tournament) return null;

  const handleScoreChange = (participant: 'participant1' | 'participant2', score: string) => {
    const numScore = parseInt(score) || 0;
    const payload = {
      tournamentId,
      matchId: match.id,
      participant1Score: participant === 'participant1' ? numScore : match.participant1Score,
      participant2Score: participant === 'participant2' ? numScore : match.participant2Score
    };

    dispatch({
      type: 'UPDATE_MATCH',
      payload
    });
  };

  const getScoreLabel = () => {
    switch (tournament.scoreType) {
      case 'kills':
        return 'Kills';
      case 'points':
        return 'Points';
      case 'gamePoints':
        return 'Game Points';
      default:
        return 'Score';
    }
  };

  return (
    <div className="match-node bg-white p-3 rounded-lg shadow-sm border border-gray-200" style={{ maxWidth: '280px' }}>
      <div className="space-y-2">
        {/* Participant 1 */}
        <div className={`flex justify-between items-center ${match.winner?.id === match.participant1?.id ? 'bg-green-50 p-1 rounded' : ''}`}>
          <span className="font-medium text-sm truncate max-w-[120px]" title={match.participant1?.name || 'TBD'}>
            {match.participant1?.name || 'TBD'}
          </span>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              min="0"
              value={match.participant1Score}
              onChange={(e) => handleScoreChange('participant1', e.target.value)}
              className="w-12 text-center border rounded text-sm"
              disabled={!match.participant1}
              placeholder={getScoreLabel()}
            />
            <span className="text-xs text-gray-500">
              {getScoreLabel()}
            </span>
          </div>
        </div>

        {/* Participant 2 */}
        <div className={`flex justify-between items-center ${match.winner?.id === match.participant2?.id ? 'bg-green-50 p-1 rounded' : ''}`}>
          <span className="font-medium text-sm truncate max-w-[120px]" title={match.participant2?.name || 'TBD'}>
            {match.participant2?.name || 'TBD'}
          </span>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              min="0"
              value={match.participant2Score}
              onChange={(e) => handleScoreChange('participant2', e.target.value)}
              className="w-12 text-center border rounded text-sm"
              disabled={!match.participant2}
              placeholder={getScoreLabel()}
            />
            <span className="text-xs text-gray-500">
              {getScoreLabel()}
            </span>
          </div>
        </div>

        {/* Winner/Tie Display */}
        {match.participant1Score > 0 || match.participant2Score > 0 ? (
          match.participant1Score === match.participant2Score ? (
            <div className="text-xs text-orange-600 font-medium">
              Tie Game ({match.participant1Score} - {match.participant2Score})
            </div>
          ) : match.winner && (
            <div className="text-xs text-green-600 font-medium">
              Winner: {match.winner.name}
              <span className="ml-1">
                ({match.winner.id === match.participant1?.id ? match.participant1Score : match.participant2Score} {getScoreLabel()})
              </span>
            </div>
          )
        ) : null}

        {/* Target Score Display for Fortnite */}
        {tournament.scoreType === 'kills' && tournament.targetScore && (
          <div className="text-xs text-gray-500">
            First to {tournament.targetScore} kills
          </div>
        )}
      </div>
    </div>
  );
}
