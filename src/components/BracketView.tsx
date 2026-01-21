import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { MatchNode } from './MatchNode';
import { Match, Tournament } from '../types/bracket';

interface RoundColumnProps {
  round: number;
  matches: Match[];
  tournament: Tournament;
  totalRounds: number;
}

const RoundColumn = memo(function RoundColumn({ 
  round, 
  matches, 
  tournament, 
  totalRounds 
}: RoundColumnProps) {
  const previousRoundMatches = tournament.matches.filter(
    m => m.round === round - 1 && m.winner
  );

  // Calculate fill-in candidate
  const fillInCandidate = useMemo(() => {
    if (round <= 1) return null;
    
    const losers = previousRoundMatches
      .map(m => {
        const loser = m.winner?.id === m.participant1?.id ? m.participant2 : m.participant1;
        const loserScore = m.winner?.id === m.participant1?.id ? m.participant2Score : m.participant1Score;
        return { participant: loser, score: loserScore };
      })
      .filter(l => l.participant)
      .sort((a, b) => {
        if (tournament.scoringMode === 'lower_score') {
          return a.score - b.score;
        }
        return b.score - a.score;
      });

    return losers[0] || null;
  }, [previousRoundMatches, round]);

  const roundLabels: Record<number, string> = {
    [totalRounds]: 'Final',
    [totalRounds - 1]: 'Semi-Finals',
    [totalRounds - 2]: 'Quarter-Finals'
  };

  const roundLabel = roundLabels[round] || `Round ${round}`;

  return (
    <div
      className="flex flex-col min-w-[280px]"
      style={{
        marginTop: `${(Math.pow(2, round - 1) - 1) * 3}rem`
      }}
    >
      {/* Round Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {roundLabel}
        </h3>
        <p className="text-sm text-gray-500">
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Fill-in Info */}
      {round > 1 && fillInCandidate?.participant && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
          <h4 className="text-xs font-semibold text-yellow-700 mb-1">FILL-IN AVAILABLE</h4>
          <p className="text-sm text-yellow-800">
            {fillInCandidate.participant.name}
            <span className="ml-1 text-yellow-600">
              ({fillInCandidate.score} {tournament.scoreLabel})
            </span>
          </p>
        </div>
      )}

      {/* Matches */}
      <div 
        className="space-y-4"
        style={{
          gap: `${Math.pow(2, round) - 1}rem`
        }}
      >
        {matches.map((match) => (
          <MatchNode
            key={match.id}
            match={match}
            tournamentId={tournament.id}
            isFinal={round === totalRounds}
          />
        ))}
      </div>
    </div>
  );
});

const TournamentWinner = memo(function TournamentWinner({ tournament }: { tournament: Tournament }) {
  const finalMatch = tournament.matches.find(m => m.round === tournament.totalRounds);
  
  if (!finalMatch?.winner) return null;

  const winnerScore = finalMatch.winner.id === finalMatch.participant1?.id
    ? finalMatch.participant1Score
    : finalMatch.participant2Score;
  const loserScore = finalMatch.winner.id === finalMatch.participant1?.id
    ? finalMatch.participant2Score
    : finalMatch.participant1Score;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className="bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 
                 border border-yellow-300 rounded-2xl p-6 text-center mb-8"
    >
      <div className="trophy-icon text-yellow-500 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm10 0l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L15 10.274z" clipRule="evenodd"/>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-yellow-600 mb-2">🎉 Tournament Champion! 🎉</h2>
      <p className="text-3xl font-bold text-gray-900 mb-2">{finalMatch.winner.name}</p>
      <p className="text-lg text-yellow-700">
        Final Score: {winnerScore} - {loserScore} {tournament.scoreLabel}
      </p>
    </motion.div>
  );
});

export const BracketView = memo(function BracketView() {
  const { activeTournament } = useTournament();

  // Organize matches by round
  const roundMatches = useMemo(() => {
    if (!activeTournament) return {};
    
    return activeTournament.matches
      .sort((a, b) => {
        if (a.round === b.round) return a.position - b.position;
        return a.round - b.round;
      })
      .reduce((acc, match) => {
        if (!acc[match.round]) {
          acc[match.round] = [];
        }
        acc[match.round].push(match);
        return acc;
      }, {} as Record<number, Match[]>);
  }, [activeTournament]);

  if (!activeTournament) {
    return (
      <div className="card">
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Tournament Selected</h3>
          <p className="text-gray-500">Select or create a tournament to view the bracket</p>
        </div>
      </div>
    );
  }

  const hasWinner = activeTournament.matches.some(
    m => m.round === activeTournament.totalRounds && m.winner
  );

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{activeTournament.name}</h2>
            <p className="text-gray-500 text-sm">{activeTournament.game}</p>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-gray-600">
              <span className="text-blue-600 font-semibold">{activeTournament.participants.length}</span> players
            </div>
            <div className="text-gray-600">
              Round <span className="text-blue-600 font-semibold">{activeTournament.currentRound}</span> / {activeTournament.totalRounds}
            </div>
          </div>
        </div>
      </div>

      <div className="card-body p-6">
        {/* Winner Banner */}
        {hasWinner && <TournamentWinner tournament={activeTournament} />}

        {/* Bracket */}
        {activeTournament.isStarted && activeTournament.matches.length > 0 ? (
          <div className="bracket-scroll">
            <div className="flex space-x-8 pb-4" style={{ minWidth: `${Object.keys(roundMatches).length * 320}px` }}>
              {Object.entries(roundMatches).map(([round, matches]) => (
                <RoundColumn
                  key={round}
                  round={parseInt(round)}
                  matches={matches}
                  tournament={activeTournament}
                  totalRounds={activeTournament.totalRounds}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            {activeTournament.isStarted ? (
              <>
                <h3 className="text-lg font-medium text-gray-700 mb-1">No Matches Yet</h3>
                <p className="text-gray-500">Add at least 2 participants to generate the bracket</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-700 mb-1">Tournament Not Started</h3>
                <p className="text-gray-500">Start the tournament to generate matchups</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
