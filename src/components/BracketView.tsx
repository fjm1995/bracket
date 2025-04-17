import React from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { MatchNode } from './MatchNode';
import { Match } from '../types/bracket';

export function BracketView() {
  const { state } = useTournament();
  const tournament = state.tournaments.find(t => t.id === state.activeTournamentId);

  if (!tournament) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Select or create a tournament to get started</p>
      </div>
    );
  }

  // Sort matches by round and position
  const roundMatches = tournament.matches
    .sort((a, b) => {
      if (a.round === b.round) {
        return a.position - b.position;
      }
      return a.round - b.round;
    })
    .reduce((acc, match) => {
      const round = match.round;
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(match);
      return acc;
    }, {} as Record<number, Match[]>);

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm min-h-[300px] overflow-x-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 space-y-6"
      >
        {/* Tournament Winner Trophy */}
        {tournament.matches.length > 0 && 
          tournament.matches.find(m => m.round === tournament.totalRounds && m.winner) && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center"
          >
            <div className="text-yellow-600 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm10 0l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L15 10.274z" clipRule="evenodd"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-yellow-800 mb-1">Tournament Winner!</h2>
            {(() => {
              const finalMatch = tournament.matches.find(m => m.round === tournament.totalRounds);
              if (finalMatch?.winner) {
                return (
                  <div>
                    <p className="text-xl font-semibold text-yellow-700">{finalMatch.winner.name}</p>
                    <p className="text-sm text-yellow-600 mt-1">
                      Final Score: {finalMatch.winner.id === finalMatch.participant1?.id ? 
                        `${finalMatch.participant1Score}-${finalMatch.participant2Score}` : 
                        `${finalMatch.participant2Score}-${finalMatch.participant1Score}`}
                      {tournament.scoreType === 'kills' ? ' kills' : ' points'}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </motion.div>
        )}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">{tournament.name}</h2>
            <p className="text-gray-600">Game: {tournament.game}</p>
          </div>
          <div>
            <p className="text-gray-600">
              Participants: {tournament.participants.length}
            </p>
            <p className="text-gray-600">
              Round: {tournament.currentRound} of {tournament.totalRounds}
            </p>
          </div>
        </div>

        <div className="flex space-x-16 pb-8 relative" style={{ minWidth: '1200px' }}>
          <div className="absolute inset-0 pointer-events-none">
            {/* Connector lines */}
            {Object.entries(roundMatches).map(([round, matches]) => (
              matches.map((match) => {
                const nextRoundMatches = roundMatches[match.round + 1];
                if (nextRoundMatches) {
                  const nextMatchPosition = Math.ceil(match.position / 2);
                  const nextMatch = nextRoundMatches.find(m => m.position === nextMatchPosition);
                  if (nextMatch) {
                    return (
                      <div
                        key={`${match.id}-connector`}
                        className="absolute border-t-2 border-gray-300"
                        style={{
                          left: `${(parseInt(round) - 1) * 16 + 15}rem`,
                          width: '4rem',
                          top: `${(match.position - 1) * 6 + 3}rem`,
                        }}
                      />
                    );
                  }
                }
                return null;
              })
            ))}
          </div>
          {Object.entries(roundMatches).map(([round, matches]) => (
            <div
              key={round}
              className="flex flex-col space-y-6"
              style={{
                marginTop: `${
                  (Math.pow(2, parseInt(round) - 1) - 1) * 1.5
                }rem`,
              }}
            >
              <div className="relative">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">
                    Round {round} {parseInt(round) === tournament.totalRounds && '(Final)'}
                  </h3>
                  {parseInt(round) > 1 && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <h4 className="text-sm font-medium text-yellow-800">Fill-In Available:</h4>
                      {(() => {
                        const previousRoundMatches = tournament.matches.filter(
                          m => m.round === parseInt(round) - 1 && m.winner
                        );
                        const losers = previousRoundMatches
                          .map(m => {
                            const loser = m.winner?.id === m.participant1?.id ? m.participant2 : m.participant1;
                            const loserScore = m.winner?.id === m.participant1?.id ? 
                              m.participant2Score : 
                              m.participant1Score;
                            return { participant: loser, score: loserScore };
                          })
                          .filter(l => l.participant)
                          .sort((a, b) => b.score - a.score);
                        
                        const highestLoser = losers[0];
                        return highestLoser && highestLoser.participant ? (
                          <div className="text-sm text-yellow-700 mt-1">
                            <span className="font-medium">Fill-in with:</span>{' '}
                            {highestLoser.participant.name} ({highestLoser.score} {tournament.scoreType})
                          </div>
                        ) : (
                          <div className="text-sm text-yellow-700 mt-1">
                            No fill-in available yet
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
              {matches.map((match) => (
                <MatchNode
                  key={match.id}
                  match={match}
                  tournamentId={tournament.id}
                />
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
