import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Match } from '../types/bracket';
import { useTournament } from '../context/TournamentContext';

interface MatchNodeProps {
  match: Match;
  tournamentId: string;
  isFinal?: boolean;
}

export const MatchNode = memo(function MatchNode({ 
  match, 
  tournamentId, 
  isFinal = false 
}: MatchNodeProps) {
  const { state, dispatch } = useTournament();
  
  const tournament = useMemo(() => 
    state.tournaments.find(t => t.id === tournamentId),
    [state.tournaments, tournamentId]
  );

  // Debounced score update - waits 300ms after user stops typing
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleScoreChange = useCallback((
    participant: 'participant1' | 'participant2', 
    score: number
  ) => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce the dispatch to prevent race conditions
    debounceRef.current = setTimeout(() => {
      dispatch({
        type: 'UPDATE_MATCH',
        payload: {
          tournamentId,
          matchId: match.id,
          participant1Score: participant === 'participant1' ? score : match.participant1Score,
          participant2Score: participant === 'participant2' ? score : match.participant2Score
        }
      });
    }, 300);
  }, [dispatch, tournamentId, match.id, match.participant1Score, match.participant2Score]);
  
  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!tournament) return null;

  // Don't render empty matches (no participants at all)
  if (!match.participant1 && !match.participant2) return null;

  const { scoringMode, targetScore, scoreLabel } = tournament;
  
  const isComplete = match.winner != null;
  const p1Score = match.participant1Score;
  const p2Score = match.participant2Score;
  const p1IsWinner = match.winner?.id === match.participant1?.id;
  const p2IsWinner = match.winner?.id === match.participant2?.id;
  const hasBothParticipants = match.participant1 && match.participant2;
  const isByeMatch = (match.participant1 && !match.participant2) || (!match.participant1 && match.participant2);
  const isByeComplete = isByeMatch && isComplete; // Bye match that auto-advanced
  const hasWildCard = !!match.wildCardParticipant1 || !!match.wildCardParticipant2;

  // Get scoring hint for best-of modes
  const getScoringHint = () => {
    if (scoringMode === 'best_of' && targetScore) {
      return `First to ${targetScore}`;
    }
    if (scoringMode === 'lower_score') {
      return 'Lower wins';
    }
    return null;
  };

  const scoringHint = getScoringHint();

  // Card classes based on state
  const cardClasses = `
    ${isFinal ? 'match-card-final' : isComplete ? 'match-card-complete' : 'match-card'}
    ${isComplete && !isFinal ? 'winner-glow' : ''}
    ${hasWildCard ? 'match-card-wildcard' : ''}
  `;

  return (
    <div className={cardClasses}>
      {/* Final Match Header */}
      {isFinal && (
        <div className="px-4 py-2 bg-gradient-to-r from-amber-100 to-amber-50 border-b border-amber-200/50">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3h14v2h-1v2.6a6.5 6.5 0 01-2.1 4.78L12 16.28l-3.9-3.9A6.5 6.5 0 016 7.6V5H5V3z"/>
            </svg>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Championship
            </span>
          </div>
        </div>
      )}

      {/* Bye Match Header */}
      {isByeComplete && (
        <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-purple-50 border-b border-purple-200/50">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Bye – Auto-Advanced
            </span>
          </div>
        </div>
      )}

      <div className="p-3 sm:p-4">
        {/* Participant 1 */}
        <ParticipantRow
          participant={match.participant1}
          score={p1Score}
          isWinner={p1IsWinner}
          isDisabled={!match.participant1 || !hasBothParticipants}
          scoreLabel={scoreLabel}
          onScoreChange={(score) => handleScoreChange('participant1', score)}
          isWildCard={!!match.wildCardParticipant1}
        />

        {/* VS Divider */}
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-apple-gray-200" />
          <span className="text-xs font-bold text-apple-gray-300 uppercase">vs</span>
          <div className="flex-1 h-px bg-apple-gray-200" />
        </div>

        {/* Participant 2 or Bye Indicator */}
        {isByeMatch && !match.participant2 ? (
          <ByeSlot isAutoAdvanced={!!isByeComplete} />
        ) : (
          <ParticipantRow
            participant={match.participant2}
            score={p2Score}
            isWinner={p2IsWinner}
            isDisabled={!match.participant2 || !hasBothParticipants}
            scoreLabel={scoreLabel}
            onScoreChange={(score) => handleScoreChange('participant2', score)}
            isWildCard={!!match.wildCardParticipant2}
          />
        )}

        {/* Match Status */}
        {isComplete && match.winner && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 py-2 px-3 bg-apple-green/10 rounded-apple text-center"
          >
            <span className="text-sm font-medium text-apple-green">
              {match.winner.name} advances
            </span>
          </motion.div>
        )}

        {/* Scoring Hint */}
        {scoringHint && !isComplete && hasBothParticipants && p1Score === 0 && p2Score === 0 && (
          <div className="mt-3 text-center">
            <span className="text-xs text-apple-gray-400">{scoringHint}</span>
          </div>
        )}

        {/* Tied State */}
        {hasBothParticipants && !isComplete && p1Score === p2Score && p1Score > 0 && (
          <div className="mt-3 py-2 px-3 bg-apple-orange/10 rounded-apple text-center">
            <span className="text-sm font-medium text-apple-orange">
              Tied – Continue playing
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

// Bye Slot Component - shows when a player has no opponent
const ByeSlot = memo(function ByeSlot({ isAutoAdvanced }: { isAutoAdvanced: boolean }) {
  return (
    <div className="participant-row bg-purple-50/50 border border-purple-200/50 opacity-60">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <span className="font-medium text-purple-500 italic">
            No opponent
          </span>
          <span className="text-xs text-purple-400 block">
            {isAutoAdvanced ? 'Bye – Auto-advanced' : 'Bye – Pending'}
          </span>
        </div>
      </div>
    </div>
  );
});

// Participant Row Component
interface ParticipantRowProps {
  participant: { id: string; name: string } | null | undefined;
  score: number;
  isWinner: boolean;
  isDisabled: boolean;
  scoreLabel: string;
  onScoreChange: (score: number) => void;
  isWildCard?: boolean;
}

const ParticipantRow = memo(function ParticipantRow({
  participant,
  score,
  isWinner,
  isDisabled,
  scoreLabel,
  onScoreChange,
  isWildCard = false
}: ParticipantRowProps) {
  // Local state for the input value to prevent "jumping" during typing
  // Show empty string when score is 0 (use placeholder instead)
  const [localValue, setLocalValue] = useState<string>(score > 0 ? score.toString() : '');
  
  // Sync local value when external score changes (e.g., from another device/reload)
  useEffect(() => {
    // Only show actual number if score > 0, otherwise show empty (placeholder will show "0")
    setLocalValue(score > 0 ? score.toString() : '');
  }, [score]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for clearing
    if (value === '') {
      setLocalValue('');
      onScoreChange(0);
      return;
    }
    
    // Only allow valid numbers
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setLocalValue(value);
      onScoreChange(numValue);
    }
  };
  
  // On blur, keep empty if 0 (placeholder handles display)
  const handleBlur = () => {
    const numValue = parseInt(localValue, 10);
    if (localValue === '' || isNaN(numValue)) {
      setLocalValue('');
      onScoreChange(0);
    }
  };

  return (
    <div className={`participant-row ${isWinner ? 'participant-row-winner' : participant ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Winner Icon */}
        {isWinner && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-apple-green flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        
        {/* Avatar */}
        {!isWinner && participant && (
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                          ${isWildCard ? 'bg-purple-500 text-white' : 'bg-apple-gray-200'}`}>
            {isWildCard ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ) : (
              <span className="text-sm font-semibold text-apple-gray-600">
                {participant.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}
        
        {/* Name */}
        <div className="flex-1 min-w-0">
          <span 
            className={`font-medium truncate block ${
              isWinner 
                ? 'text-apple-green' 
                : participant 
                ? 'text-apple-gray-900'
                : 'text-apple-gray-400 italic'
            }`}
            title={participant?.name || 'TBD'}
          >
            {participant?.name || 'Awaiting opponent'}
          </span>
          {isWildCard && !isWinner && (
            <span className="text-xs text-purple-500">Wild Card</span>
          )}
        </div>
      </div>

      {/* Score Input */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          min="0"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`score-input ${isWinner ? 'bg-apple-green/10 border-apple-green/30' : ''}`}
          disabled={isDisabled}
          placeholder="0"
        />
        <span className="text-xs text-apple-gray-400 w-6 truncate" title={scoreLabel}>
          {scoreLabel.slice(0, 4)}
        </span>
      </div>
    </div>
  );
});
