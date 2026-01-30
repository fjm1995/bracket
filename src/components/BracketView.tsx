import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useTournament } from '../context/TournamentContext';
import { MatchNode } from './MatchNode';
import { Match, Tournament } from '../types/bracket';
import { canFinalizeRound, getRoundLabel, getByeMatches } from '../services/tournamentService';

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
  const roundLabel = getRoundLabel(round, totalRounds);
  const isFinal = round === totalRounds;
  const isSemiFinal = round === totalRounds - 1;

  // Calculate spacing multiplier based on round
  const spacingMultiplier = Math.pow(2, round - 1);
  
  // Bye info for this round
  const byeMatches = getByeMatches(tournament, round);
  const byeCount = byeMatches.filter(m => m.winner).length; // Count auto-advanced byes

  return (
    <div className="flex flex-col min-w-[320px]">
      {/* Round Header */}
      <div className="bracket-round-header">
        <h3 className={`font-semibold tracking-tight ${
          isFinal 
            ? 'text-xl text-amber-600' 
            : isSemiFinal 
            ? 'text-lg text-apple-gray-800'
            : 'text-base text-apple-gray-700'
        }`}>
          {roundLabel}
        </h3>
        <p className="text-sm text-apple-gray-400 mt-0.5">
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </p>
      </div>

      {/* Bye Info Banner - Shows if there are byes in this round */}
      {round === 1 && byeCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-apple-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-purple-800">
                {byeCount} Player{byeCount !== 1 ? 's' : ''} Auto-Advanced
              </h4>
              <p className="text-xs text-purple-600 mt-0.5">
                Received a bye and advanced to the next round
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Matches */}
      <div 
        className="flex flex-col"
        style={{
          gap: `${spacingMultiplier * 16}px`,
          paddingTop: `${(spacingMultiplier - 1) * 32}px`
        }}
      >
        {matches.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              duration: 0.4, 
              delay: index * 0.05,
              ease: [0.25, 0.1, 0.25, 1]
            }}
          >
            <MatchNode
              match={match}
              tournamentId={tournament.id}
              isFinal={isFinal}
            />
          </motion.div>
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
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.6, bounce: 0.3 }}
      className="champion-banner rounded-apple-2xl p-8 text-center mb-8"
    >
      <div className="trophy-float mb-4">
        <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-apple-md">
          <svg className="w-10 h-10 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3h14v2h-1v2.6a6.5 6.5 0 01-2.1 4.78L12 16.28l-3.9-3.9A6.5 6.5 0 016 7.6V5H5V3zm2 2v2.6a4.5 4.5 0 001.46 3.32L12 14.46l3.54-3.54A4.5 4.5 0 0017 7.6V5H7z"/>
            <path d="M4 7H2v4a2 2 0 002 2h1.17A7.47 7.47 0 014 9.6V7zm16 0v2.6a7.47 7.47 0 01-1.17 3.4H20a2 2 0 002-2V7h-2zM9 20v-2h6v2H9zm2 2v2h2v-2h-2z"/>
          </svg>
        </div>
      </div>
      <p className="text-amber-700 text-sm font-semibold uppercase tracking-wider mb-2">
        Tournament Champion
      </p>
      <h2 className="text-3xl font-bold text-apple-gray-900 mb-3">
        {finalMatch.winner.name}
      </h2>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full">
        <span className="text-apple-gray-500 text-sm">Final Score:</span>
        <span className="font-semibold text-apple-gray-900">
          {winnerScore} – {loserScore}
        </span>
        <span className="text-apple-gray-400 text-sm">{tournament.scoreLabel}</span>
      </div>
    </motion.div>
  );
});

const EmptyBracketState = memo(function EmptyBracketState({ isStarted }: { isStarted: boolean }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      {isStarted ? (
        <>
          <h3 className="text-lg font-semibold text-apple-gray-900 mb-2">
            No Matches Generated
          </h3>
          <p className="text-apple-gray-500 max-w-sm">
            Add at least 2 participants to generate the bracket
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-apple-gray-900 mb-2">
            Ready to Begin
          </h3>
          <p className="text-apple-gray-500 max-w-sm">
            Start the tournament to generate matchups and view the bracket
          </p>
        </>
      )}
    </div>
  );
});

export const BracketView = memo(function BracketView() {
  const { activeTournament, dispatch } = useTournament();

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
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-apple-gray-900 mb-2">
            No Tournament Selected
          </h3>
          <p className="text-apple-gray-500">
            Select or create a tournament to view the bracket
          </p>
        </div>
      </div>
    );
  }

  const hasWinner = activeTournament.matches.some(
    m => m.round === activeTournament.totalRounds && m.winner
  );
  const finalIsFinalized = (activeTournament.finalizedRounds ?? []).includes(activeTournament.totalRounds);

  const completedMatches = activeTournament.matches.filter(m => m.winner).length;
  const totalMatches = activeTournament.matches.length;
  // If tournament is complete (final finalized), show 100%
  const progress = finalIsFinalized 
    ? 100 
    : totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  const currentRound = activeTournament.currentRound;
  const isFinalRound = currentRound >= activeTournament.totalRounds;
  const canFinalize = canFinalizeRound(activeTournament, currentRound);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="card-header">
        <div className="flex flex-col gap-4">
          {/* Title Row */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-apple-gray-900 tracking-tight truncate">
                {activeTournament.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="badge-blue">
                  {activeTournament.game}
                </span>
                <span className="text-sm text-apple-gray-500">
                  {activeTournament.participants.length} players
                </span>
              </div>
            </div>
            
            {/* Progress Ring - Always visible */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="#E8E8ED"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="#0071E3"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 0.942} 94.2`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-apple-gray-700">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          
          {/* Stats Row - Mobile friendly */}
          <div className="flex items-center justify-between text-sm border-t border-apple-gray-100 pt-3 -mb-1">
            <div>
              <span className="text-apple-gray-500">Round </span>
              <span className="font-semibold text-apple-gray-900">{activeTournament.currentRound}</span>
              <span className="text-apple-gray-400"> of {activeTournament.totalRounds}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-apple-gray-500">
                {completedMatches}/{totalMatches} matches done
              </span>
              {activeTournament.isStarted && !finalIsFinalized && (
                <button
                  type="button"
                  onClick={() => dispatch({
                    type: 'FINALIZE_ROUND',
                    payload: { tournamentId: activeTournament.id, round: currentRound }
                  })}
                  className={`btn-primary btn-sm ${!canFinalize ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!canFinalize}
                >
                  {isFinalRound ? 'Crown Champion' : `Finalize Round ${currentRound}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card-body p-6 bg-apple-gray-50/50">
        {/* Winner Banner */}
        {hasWinner && finalIsFinalized && <TournamentWinner tournament={activeTournament} />}

        {/* Bracket */}
        {activeTournament.isStarted && activeTournament.matches.length > 0 ? (
          <div className="bracket-scroll -mx-2 px-2">
            <div 
              className="bracket-rounds"
              style={{ minWidth: `${Object.keys(roundMatches).length * 360}px` }}
            >
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
          <EmptyBracketState isStarted={activeTournament.isStarted} />
        )}
      </div>
    </div>
  );
});
