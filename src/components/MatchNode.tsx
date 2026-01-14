import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Match } from '../types/bracket';
import { useTournament } from '../context/TournamentContext';

interface MatchNodeProps {
  match: Match;
  tournamentId: string;
  isFinal?: boolean;
}

export const MatchNode = memo(function MatchNode({ match, tournamentId, isFinal = false }: MatchNodeProps) {
  const { state, dispatch } = useTournament();
  
  const tournament = useMemo(() => 
    state.tournaments.find(t => t.id === tournamentId),
    [state.tournaments, tournamentId]
  );

  const handleScoreChange = useCallback((participant: 'participant1' | 'participant2', score: string) => {
    const numScore = Math.max(0, parseInt(score) || 0);
    
    dispatch({
      type: 'UPDATE_MATCH',
      payload: {
        tournamentId,
        matchId: match.id,
        participant1Score: participant === 'participant1' ? numScore : match.participant1Score,
        participant2Score: participant === 'participant2' ? numScore : match.participant2Score
      }
    });
  }, [dispatch, tournamentId, match.id, match.participant1Score, match.participant2Score]);

  if (!tournament) return null;

  const { scoringMode, targetScore, scoreLabel } = tournament;
  
  const isComplete = match.winner !== null;
  const p1Score = match.participant1Score;
  const p2Score = match.participant2Score;
  const isTie = p1Score === p2Score && (p1Score > 0 || p2Score > 0);
  const p1IsWinner = match.winner?.id === match.participant1?.id;
  const p2IsWinner = match.winner?.id === match.participant2?.id;

  // Get status message
  const getStatusMessage = () => {
    if (match.winner) {
      return `🏆 ${match.winner.name} wins!`;
    }
    
    if (p1Score === 0 && p2Score === 0) {
      return null;
    }

    switch (scoringMode) {
      case 'best_of':
        if (targetScore) {
          const p1Needed = targetScore - p1Score;
          const p2Needed = targetScore - p2Score;
          if (p1Needed > 0 && p2Needed > 0) {
            return `${match.participant1?.name} needs ${p1Needed}, ${match.participant2?.name} needs ${p2Needed}`;
          }
        }
        return isTie ? 'Tied — Continue playing' : null;
      
      case 'lower_score':
        return isTie ? 'Tied — Enter different positions' : null;
      
      case 'higher_score':
      default:
        return isTie ? 'Tied — Enter different scores' : null;
    }
  };

  // Get helper text for scoring mode
  const getScoringHelp = () => {
    switch (scoringMode) {
      case 'best_of':
        return targetScore ? `First to ${targetScore} ${scoreLabel.toLowerCase()}` : null;
      case 'lower_score':
        return 'Lower position wins';
      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();
  const scoringHelp = getScoringHelp();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`match-card bg-white rounded-xl border overflow-hidden shadow-sm
        ${isFinal ? 'border-yellow-400 shadow-md' : 'border-gray-200'}
        ${isComplete && !isTie ? 'ring-2 ring-green-400/50' : ''}`}
    >
      {isFinal && (
        <div className="bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-1 text-center border-b border-yellow-200">
          <span className="text-xs font-bold text-yellow-700 tracking-wider">CHAMPIONSHIP</span>
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Participant 1 */}
        <div
          className={`flex items-center justify-between p-2 rounded-lg transition-all
            ${p1IsWinner ? 'bg-green-50 border border-green-300' : 
              match.participant1 ? 'bg-gray-50 border border-gray-200' : 'bg-gray-50/50 border border-gray-100'}`}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {p1IsWinner && (
              <span className="text-green-500 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            <span 
              className={`font-medium truncate ${
                match.participant1 
                  ? p1IsWinner ? 'text-green-700' : 'text-gray-900'
                  : 'text-gray-400 italic'
              }`}
              title={match.participant1?.name || 'TBD'}
            >
              {match.participant1?.name || 'TBD'}
            </span>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <input
              type="number"
              min="0"
              value={match.participant1Score || ''}
              onChange={(e) => handleScoreChange('participant1', e.target.value)}
              className="w-14 text-center bg-white border border-gray-300 rounded-md 
                       text-gray-900 text-sm py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-100"
              disabled={!match.participant1}
              placeholder="0"
            />
            <span className="text-xs text-gray-500 w-8">{scoreLabel.slice(0, 3)}</span>
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex items-center justify-center">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="px-3 text-xs font-bold text-gray-400">VS</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Participant 2 */}
        <div
          className={`flex items-center justify-between p-2 rounded-lg transition-all
            ${p2IsWinner ? 'bg-green-50 border border-green-300' : 
              match.participant2 ? 'bg-gray-50 border border-gray-200' : 'bg-gray-50/50 border border-gray-100'}`}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {p2IsWinner && (
              <span className="text-green-500 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            <span 
              className={`font-medium truncate ${
                match.participant2 
                  ? p2IsWinner ? 'text-green-700' : 'text-gray-900'
                  : 'text-gray-400 italic'
              }`}
              title={match.participant2?.name || 'TBD'}
            >
              {match.participant2?.name || 'TBD'}
            </span>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <input
              type="number"
              min="0"
              value={match.participant2Score || ''}
              onChange={(e) => handleScoreChange('participant2', e.target.value)}
              className="w-14 text-center bg-white border border-gray-300 rounded-md 
                       text-gray-900 text-sm py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-100"
              disabled={!match.participant2}
              placeholder="0"
            />
            <span className="text-xs text-gray-500 w-8">{scoreLabel.slice(0, 3)}</span>
          </div>
        </div>

        {/* Status/Result */}
        {statusMessage && (
          <div className={`text-center py-1.5 px-2 rounded-md ${
            match.winner 
              ? 'bg-green-50 border border-green-300' 
              : 'bg-orange-50 border border-orange-300'
          }`}>
            <span className={`text-xs font-medium ${match.winner ? 'text-green-700' : 'text-orange-700'}`}>
              {statusMessage}
            </span>
          </div>
        )}

        {/* Scoring Help */}
        {scoringHelp && !isComplete && (p1Score === 0 && p2Score === 0) && (
          <div className="text-center">
            <span className="text-xs text-gray-500">{scoringHelp}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
});
